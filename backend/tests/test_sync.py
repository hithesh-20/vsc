"""
Offline sync: batch-upload with server-side idempotency, SALE replay,
and ORDER_STATUS reconciliation (including a stale offline ACCEPT racing
a newer server-side ACCEPT).
"""
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, engine
from app.utils.seed_data import seed_database

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield


@pytest.fixture(scope="module")
def vendor_ctx():
    r = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    assert r.status_code == 200
    token = r.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    products = client.get("/api/v1/products", headers=headers).json()["data"]
    return headers, products


def _mut(entity_type, payload, mid=None, ts=None):
    return {
        "client_mutation_id": mid,
        "entity_type": entity_type,
        "payload": payload,
        "client_timestamp": ts or datetime.now(timezone.utc).isoformat(),
    }


def test_lenient_schema_accepts_outbox_without_ids(vendor_ctx):
    """Old frontend outbox items (no client_mutation_id) must NOT 422 on flush."""
    headers, products = vendor_ctx
    p = products[0]
    mut = {
        "entity_type": "SALE",
        "payload": {
            "customer_name": "Offline Kumara",
            "total_amount": 60.0,
            "payment_mode": "CASH",
            "items": [{"product_id": p["id"], "quantity": 2, "unit_price": 30}],
        },
    }
    r = client.post("/api/v1/sync/batch-upload", json={"mutations": [mut]}, headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()["data"]
    assert body["success_count"] == 1
    # request body untouched; the server derived a stable idempotency key itself
    assert mut.get("client_mutation_id") is None
    # Replay the same batch → idempotent, no duplicate sale
    r2 = client.post("/api/v1/sync/batch-upload", json={"mutations": [dict(mut)]}, headers=headers)
    assert r2.status_code == 200
    # identical payload generates the same derived key → replay detected
    assert r2.json()["data"]["results"][0]["error_message"] == "Already processed (Idempotent replay)"


def test_order_status_sync_and_staleness(vendor_ctx):
    headers, _ = vendor_ctx
    orders = client.get("/api/v1/orders/vendor", headers=headers).json()["data"]
    pending = next(o for o in orders if o["status"] == "PENDING")

    # Vendor accepts an order OFFLINE, then goes offline; meanwhile the same
    # accept already happened online. Replay must not error nor regress.
    mut = _mut("ORDER_STATUS", {"order_id": pending["id"], "status": "ACCEPTED"}, mid=f"os-{uuid.uuid4()}")
    r1 = client.post("/api/v1/sync/batch-upload", json={"mutations": [mut]}, headers=headers)
    assert r1.status_code == 200
    assert r1.json()["data"]["success_count"] == 1

    # Order now ACCEPTED; replay same mutation id → idempotent success
    r2 = client.post("/api/v1/sync/batch-upload", json={"mutations": [mut]}, headers=headers)
    assert r2.json()["data"]["results"][0]["error_message"] == "Already processed (Idempotent replay)"

    # A STALE offline 'PENDING' replay must never move the order backwards
    stale = _mut("ORDER_STATUS", {"order_id": pending["id"], "status": "PENDING"}, mid=f"os-stale-{uuid.uuid4()}")
    r3 = client.post("/api/v1/sync/batch-upload", json={"mutations": [stale]}, headers=headers)
    assert r3.json()["data"]["success_count"] == 1  # treated as applied no-op
    final = client.get("/api/v1/orders/vendor", headers=headers).json()["data"]
    still = next(o for o in final if o["id"] == pending["id"])
    assert still["status"] != "PENDING", "stale offline status must not regress the order"


def test_unknown_order_and_bad_status_fail_cleanly(vendor_ctx):
    headers, _ = vendor_ctx
    bad_order = _mut("ORDER_STATUS", {"order_id": "nope-does-not-exist", "status": "ACCEPTED"}, mid=f"os-bad-{uuid.uuid4()}")
    r1 = client.post("/api/v1/sync/batch-upload", json={"mutations": [bad_order]}, headers=headers)
    item = r1.json()["data"]["results"][0]
    assert item["status"] == "FAILED" and "not found" in item["error_message"]

    orders = client.get("/api/v1/orders/vendor", headers=headers).json()["data"]
    real = next(o for o in orders if o["id"])
    bad_status = _mut("ORDER_STATUS", {"order_id": real["id"], "status": "WARP_SPEED"}, mid=f"os-bs-{uuid.uuid4()}")
    r2 = client.post("/api/v1/sync/batch-upload", json={"mutations": [bad_status]}, headers=headers)
    item2 = r2.json()["data"]["results"][0]
    assert item2["status"] == "FAILED" and "Unknown status" in item2["error_message"]


def test_sync_history_returns_items_and_failures(vendor_ctx):
    headers, _ = vendor_ctx
    r = client.get("/api/v1/sync/history?limit=50", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert isinstance(data["items"], list) and len(data["items"]) > 0
    # earlier tests left both successes and failures behind
    statuses = {i["status"] for i in data["items"]}
    assert "PROCESSED" in statuses
    assert data["failed_count"] >= 2
    item = data["items"][0]
    assert {"client_mutation_id", "entity_type", "status"} <= set(item.keys())
    # failure rows carry a human-readable reason
    failed = [i for i in data["items"] if i["status"] in ("FAILED", "CONFLICT")]
    assert failed and all(i["error_message"] for i in failed)


def test_offline_udhaar_sale_creates_ledger(vendor_ctx):
    """A UDHAAR-mode sale synced offline must also create the credit entry
    (parity with the online endpoint) — exactly once, idempotently."""
    headers, products = vendor_ctx
    p = products[0]
    cust = f"Udhaar Sync {uuid.uuid4().hex[:6]}"
    mut = _mut("SALE", {
        "customer_name": cust,
        "total_amount": 100.0,
        "payment_mode": "UDHAAR",
        "udhaar_amount": 100.0,
        "items": [{"product_id": p["id"], "quantity": 2, "unit_price": 50}],
    }, mid=f"udhaar-sale-{uuid.uuid4()}")
    r = client.post("/api/v1/sync/batch-upload", json={"mutations": [mut]}, headers=headers)
    assert r.status_code == 200 and r.json()["data"]["success_count"] == 1

    ledger = client.get("/api/v1/udhaar", headers=headers).json()["data"]["records"]
    entries = [x for x in ledger if x["customer_name"] == cust]
    assert len(entries) == 1, "udhaar ledger entry must be created exactly once by offline sync"
    assert entries[0]["remaining_balance"] == 100.0


def test_offline_voice_order_becomes_real_order(vendor_ctx):
    headers, _ = vendor_ctx
    order_num = f"ORD-OFF-{uuid.uuid4().hex[:6].upper()}"
    mut = _mut("ORDER_CREATE", {
        "order_number": order_num,
        "total_amount": 60.0,  # offline device knows an approximate total
        "payment_mode": "CASH",
        "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg", "unit_price": 30.0, "subtotal": 60.0}],
    }, mid=f"ordc-{uuid.uuid4()}")
    r = client.post("/api/v1/sync/batch-upload", json={"mutations": [mut]}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["data"]["success_count"] == 1
    # Result carries the human-readable outcome (order number + total) so the
    # device can tell the vendor exactly what was accepted after reconnecting.
    res = r.json()["data"]["results"][0]
    assert res["server_order_number"] == order_num
    assert res["server_total_amount"] == 60.0

    orders = client.get("/api/v1/orders/vendor", headers=headers).json()["data"]
    created = [o for o in orders if o["order_number"] == order_num]
    assert len(created) == 1
    assert created[0]["status"] == "PENDING"
    assert created[0]["total_amount"] == 60.0

    # Replay → idempotent, no duplicate order
    r2 = client.post("/api/v1/sync/batch-upload", json={"mutations": [dict(mut)]}, headers=headers)
    assert r2.json()["data"]["results"][0]["error_message"] == "Already processed (Idempotent replay)"
    orders2 = client.get("/api/v1/orders/vendor", headers=headers).json()["data"]
    assert len([o for o in orders2 if o["order_number"] == order_num]) == 1


def test_offline_voice_order_priced_by_server(vendor_ctx):
    """Offline device doesn't know prices (total_amount=0) — the server must
    price the order from its current product catalog, never bill ₹0."""
    headers, _ = vendor_ctx
    order_num = f"ORD-OFF-{uuid.uuid4().hex[:6].upper()}"
    mut = _mut("ORDER_CREATE", {
        "order_number": order_num,
        "total_amount": 0,  # honest offline unknown
        "payment_mode": "CASH",
        "items": [{"product_name": "tomato", "quantity": 2, "unit": "kg"}],
    }, mid=f"ordc-zero-{uuid.uuid4()}")
    r = client.post("/api/v1/sync/batch-upload", json={"mutations": [mut]}, headers=headers)
    assert r.status_code == 200 and r.json()["data"]["success_count"] == 1
    # Server-priced total must also be echoed back to the offline device
    res = r.json()["data"]["results"][0]
    assert res["server_order_number"] == order_num
    assert res["server_total_amount"] and res["server_total_amount"] > 0
    orders = client.get("/api/v1/orders/vendor", headers=headers).json()["data"]
    created = next(o for o in orders if o["order_number"] == order_num)
    assert created["total_amount"] > 0, "server must price offline orders from its catalog"

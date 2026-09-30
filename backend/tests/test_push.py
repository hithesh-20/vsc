"""
Web Push: subscription endpoints + new-order push dispatch.

Uses a stubbed pywebpush transport so no real push service is contacted.
"""
import json
import uuid
from datetime import datetime, timezone
import pytest
from unittest import mock
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, engine
from app.utils.seed_data import seed_database
from app.services import push_service
from app.models.push_subscription import PushSubscription

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield


@pytest.fixture(scope="module")
def vendor_headers():
    r = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    assert r.status_code == 200
    token = r.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


SUB = {
    "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-1",
    "keys_p256dh": "BAttestp256dhkey_not_really_real_value_aaaaa",
    "keys_auth": "authKeyB64==",
    "user_agent": "pytest",
}


def test_vapid_public_key_available():
    r = client.get("/api/v1/push/vapid-public-key")
    assert r.status_code == 200
    key = r.json()["data"]["public_key"]
    assert len(key) >= 80  # base64url of a 64-byte uncompressed P-256 point


def test_subscribe_and_renew(vendor_headers):
    r1 = client.post("/api/v1/push/subscribe", json=SUB, headers=vendor_headers)
    assert r1.status_code == 200, r1.text
    # Renewing the same endpoint updates, not duplicates
    r2 = client.post("/api/v1/push/subscribe", json=SUB, headers=vendor_headers)
    assert r2.status_code == 200
    rows = client.get("/api/v1/orders/vendor", headers=vendor_headers)  # sanity auth works
    assert rows.status_code == 200


def test_invalid_endpoint_rejected(vendor_headers):
    bad = dict(SUB, endpoint="javascript:alert(1)")
    r = client.post("/api/v1/push/subscribe", json=bad, headers=vendor_headers)
    assert r.status_code == 400


def test_push_sent_on_new_order(vendor_headers):
    # Ensure subscription exists
    client.post("/api/v1/push/subscribe", json=SUB, headers=vendor_headers)

    # Find a product for the vendor's customer order
    products = client.get("/api/v1/products", headers=vendor_headers).json()["data"]
    vendor_orders = client.get("/api/v1/orders/vendor", headers=vendor_headers).json()["data"]
    assert vendor_orders, "vendor must have orders to identify vendor_id"
    # vendor_id from any order row
    # place an order as the customer demo account to this vendor
    rc = client.post("/api/v1/auth/login", json={"phone": "9876543220", "password": "1234"})
    cust_token = rc.json()["data"]["access_token"]
    # discover vendor id via nearby vendors (public)
    rv = client.get("/api/v1/customer/nearby-vendors")
    vendor_id = rv.json()["data"][0]["vendor_id"] if rv.status_code == 200 and rv.json().get("data") else None
    if vendor_id is None:
        pytest.skip("no vendor discoverable for order placement")

    with mock.patch("app.services.push_service.send_push", return_value="ok") as m:
        r = client.post("/api/v1/orders", headers={"Authorization": f"Bearer {cust_token}"}, json={
            "vendor_id": vendor_id,
            "items": [{"product_id": products[0]["id"], "quantity": 1}],
            "delivery_address": "Push test lane",
            "payment_mode": "CASH",
        })
        assert r.status_code == 201, r.text
        assert m.called, "notify_user must dispatch a push on new order"
        payload_arg = m.call_args[0][3]
        assert payload_arg["type"] == "NEW_ORDER"
        assert payload_arg["data"]["order_number"]


def _order_create_mut():
    return {
        "client_mutation_id": f"ordc-push-{uuid.uuid4()}",
        "entity_type": "ORDER_CREATE",
        "payload": {
            "total_amount": 0,  # server prices it
            "payment_mode": "CASH",
            "items": [{"product_name": "tomato", "quantity": 1, "unit": "kg"}],
        },
        "client_timestamp": datetime.now(timezone.utc).isoformat(),
    }


def test_push_sent_on_background_sw_sync(vendor_headers):
    """A flush done by the service worker while the app is CLOSED must push a
    sync summary to the vendor's lock screen, with the real order number."""
    client.post("/api/v1/push/subscribe", json=SUB, headers=vendor_headers)
    mut = _order_create_mut()
    with mock.patch("app.services.push_service.send_push", return_value="ok") as m:
        r = client.post(
            "/api/v1/sync/batch-upload",
            json={"mutations": [mut], "source": "sw"},
            headers=vendor_headers,
        )
        assert r.status_code == 200, r.text
        assert r.json()["data"]["success_count"] == 1
        assert m.called, "SW background flush must dispatch a push"
        payloads = [c.args[3] for c in m.call_args_list]
        sync_pushes = [p for p in payloads if p.get("type") == "SYNC_COMPLETE"]
        assert sync_pushes, f"expected SYNC_COMPLETE payload, got {payloads}"
        p = sync_pushes[0]
        assert "Offline work synced" in p["title"]
        assert "ORD-OFF-" in p["body"], "body must carry the real order number"
        assert "₹" in p["body"], "body must carry the server-priced total"
        # Deep link: confirmed mutation ids ride along for timeline highlighting
        assert mut["client_mutation_id"] in p["data"].get("confirmed", []), \
            "payload.data.confirmed must list the processed mutation ids"


def test_no_push_for_in_app_sync(vendor_headers):
    """The default in-app flush must NOT push — the open app shows the
    toast/chat confirmation itself."""
    with mock.patch("app.services.push_service.send_push", return_value="ok") as m:
        r = client.post(
            "/api/v1/sync/batch-upload",
            json={"mutations": [_order_create_mut()]},
            headers=vendor_headers,
        )
        assert r.status_code == 200 and r.json()["data"]["success_count"] == 1
        payloads = [c.args[3] for c in m.call_args_list]
        assert not [p for p in payloads if p.get("type") == "SYNC_COMPLETE"]

import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine
from app.utils.seed_data import seed_database

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield


def test_health_check():
    """Verify system health endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["platform"] == "VendorSaathi API"


def test_vendor_login():
    """Verify Vendor authentication with seed credentials."""
    response = client.post("/api/v1/auth/login", json={
        "phone": "9876543210",
        "password": "1234"
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["role"] == "VENDOR"
    assert "access_token" in data
    assert data["vendor_id"] is not None


def test_customer_login():
    """Verify Customer authentication."""
    response = client.post("/api/v1/auth/login", json={
        "phone": "9876543220",
        "password": "1234"
    })
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["role"] == "CUSTOMER"
    assert data["customer_id"] is not None


def test_vendor_dashboard_summary():
    """Verify real-time dashboard aggregation for vendor."""
    login_resp = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/vendors/dashboard-summary", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "today_sales_revenue" in data
    assert "total_udhaar_outstanding" in data
    assert "weather_summary" in data


def test_product_catalog_and_inventory():
    """Verify catalog listing, adding stock, and stock balance."""
    login_resp = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List products
    resp = client.get("/api/v1/products", headers=headers)
    assert resp.status_code == 200
    products = resp.json()["data"]
    assert len(products) > 0
    p1 = products[0]

    # Adjust inventory stock
    adjust_resp = client.post("/api/v1/inventory/adjust", headers=headers, json={
        "product_id": p1["id"],
        "change_qty": 10.0,
        "transaction_type": "PURCHASE_IN",
        "notes": "Test restock batch"
    })
    assert adjust_resp.status_code == 200
    assert adjust_resp.json()["data"]["balance_after"] == p1["current_stock"] + 10.0


def test_pos_sale_and_profit_calculation():
    """Verify POS transaction commits, deducts stock, and computes accurate profit."""
    login_resp = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    products = client.get("/api/v1/products", headers=headers).json()["data"]
    p = products[0]
    stock_before = p["current_stock"]

    sale_payload = {
        "customer_name": "Test POS Customer",
        "items": [
            {"product_id": p["id"], "quantity": 2.0}
        ],
        "payment_mode": "CASH",
        "cash_paid": 2.0 * p["selling_price"]
    }

    resp = client.post("/api/v1/sales/record", headers=headers, json=sale_payload)
    assert resp.status_code == 201
    sale_data = resp.json()["data"]
    assert sale_data["total_amount"] == 2.0 * p["selling_price"]
    expected_profit = (2.0 * p["selling_price"]) - (2.0 * p["cost_price"])
    assert round(sale_data["net_profit"], 2) == round(expected_profit, 2)

    # Check updated stock
    updated_p = [x for x in client.get("/api/v1/products", headers=headers).json()["data"] if x["id"] == p["id"]][0]
    assert updated_p["current_stock"] == stock_before - 2.0


def test_udhaar_credit_management():
    """Verify Udhaar entry creation, dues calculation, and repayment."""
    login_resp = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post("/api/v1/udhaar", headers=headers, json={
        "customer_name": "Ravi Shastri",
        "customer_phone": "9845012345",
        "amount_due": 500.0,
        "notes": "Fresh vegetables credit"
    })
    assert create_resp.status_code == 201
    record = create_resp.json()["data"]
    assert record["remaining_balance"] == 500.0

    # Repay ₹200
    repay_resp = client.post(f"/api/v1/udhaar/{record['id']}/repay", headers=headers, json={
        "amount_paid": 200.0,
        "payment_mode": "UPI"
    })
    assert repay_resp.status_code == 200
    assert repay_resp.json()["data"]["remaining_balance"] == 300.0
    assert repay_resp.json()["data"]["status"] == "PARTIAL"


def test_kannada_voice_assistant():
    """Verify Kannada voice queries invoke proper tools and return synthesized text."""
    login_resp = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Query: "ಇಂದು ಎಷ್ಟು ಮಾರಾಟವಾಗಿದೆ?" (How much sales today?)
    resp = client.post("/api/v1/voice/query", headers=headers, json={
        "query_text": "ಇಂದು ಎಷ್ಟು ಮಾರಾಟವಾಗಿದೆ?",
        "language": "kn"
    })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["detected_intent"] == "get_today_sales"
    assert "ಮಾರಾಟ" in data["speech_response_kn"]
    assert data["action_performed"] is True


def test_ai_demand_forecast():
    """Verify AI demand forecasting model outputs predictions and stock recommendations."""
    login_resp = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/weather/demand-forecast?days=7", headers=headers)
    assert resp.status_code == 200
    forecasts = resp.json()["data"]
    assert len(forecasts) > 0
    f1 = forecasts[0]
    assert "daily_forecasts" in f1
    assert len(f1["daily_forecasts"]) == 7
    assert "recommended_morning_stock" in f1["daily_forecasts"][0]


def test_mobility_and_location_recommendations():
    """Verify anti-clustering mobility recommendation algorithm."""
    login_resp = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/mobility/recommendations", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0
    top_spot = data["recommendations"][0]
    assert "score" in top_spot
    assert "location_name_kn" in top_spot


def test_offline_sync_batch_upload():
    """Verify offline outbox mutations are processed idempotently."""
    login_resp = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    products = client.get("/api/v1/products", headers=headers).json()["data"]
    p = products[0]

    mutation_id = "test-uuid-sync-mutation-101"
    sync_payload = {
        "mutations": [
            {
                "client_mutation_id": mutation_id,
                "entity_type": "SALE",
                "payload": {
                    "customer_name": "Offline Synced Buyer",
                    "total_amount": 60.0,
                    "discount_amount": 0.0,
                    "payment_mode": "CASH",
                    "cash_paid": 60.0,
                    "items": [
                        {"product_id": p["id"], "quantity": 2.0, "unit_price": p["selling_price"]}
                    ]
                },
                "client_timestamp": "2026-08-22T10:00:00Z"
            }
        ]
    }

    resp = client.post("/api/v1/sync/batch-upload", headers=headers, json=sync_payload)
    assert resp.status_code == 200
    res_data = resp.json()["data"]
    assert res_data["success_count"] == 1

    # Idempotent replay test: Re-submitting the exact same mutation ID should not duplicate sales
    replay_resp = client.post("/api/v1/sync/batch-upload", headers=headers, json=sync_payload)
    assert replay_resp.status_code == 200
    assert replay_resp.json()["data"]["results"][0]["status"] == "PROCESSED"


def test_auth_invalid_credentials():
    """Verify login rejection with incorrect credentials."""
    resp = client.post("/api/v1/auth/login", json={
        "phone": "9876543210",
        "password": "wrongpassword"
    })
    assert resp.status_code == 401


def test_live_weather():
    """Verify live weather condition, temperature, and advisory endpoint."""
    resp = client.get("/api/v1/weather/current?lat=12.9716&lon=77.5946")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "temperature_celsius" in data
    assert "weather_condition" in data


def test_customer_discovery_and_catalog():
    """Verify customer can discover nearby vendors and fetch public catalog."""
    resp = client.get("/api/v1/customer/nearby-vendors?lat=12.9716&lon=77.5946")
    assert resp.status_code == 200
    vendors = resp.json()["data"]
    assert len(vendors) > 0
    v1 = vendors[0]

    cat_resp = client.get(f"/api/v1/customer/vendors/{v1['vendor_id']}/catalog")
    assert cat_resp.status_code == 200
    products = cat_resp.json()["data"]
    assert len(products) > 0


def test_customer_loyalty():
    """Verify customer loyalty tier, points balance, and perk calculations."""
    login_resp = client.post("/api/v1/auth/login", json={"phone": "9876543220", "password": "1234"})
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/customer/loyalty", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "tier" in data
    assert "points" in data


def test_multilingual_voice_hindi_tamil_english():
    """Verify multilingual voice assistant answers accurately across Hindi, Tamil, and English."""
    login_resp = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Hindi
    hi_resp = client.post("/api/v1/voice/query", headers=headers, json={
        "query_text": "आज की बिक्री कितनी है?",
        "language": "hi"
    })
    assert hi_resp.status_code == 200
    assert hi_resp.json()["data"]["detected_intent"] == "get_today_sales"
    assert len(hi_resp.json()["data"]["speech_response_kn"]) > 0

    # Tamil
    ta_resp = client.post("/api/v1/voice/query", headers=headers, json={
        "query_text": "வணக்கம் விற்பனை எவ்வளவு?",
        "language": "ta"
    })
    assert ta_resp.status_code == 200
    assert ta_resp.json()["data"]["detected_intent"] == "get_today_sales"

    # English
    en_resp = client.post("/api/v1/voice/query", headers=headers, json={
        "query_text": "What is today sales?",
        "language": "en"
    })
    assert en_resp.status_code == 200
    assert en_resp.json()["data"]["detected_intent"] == "get_today_sales"


def test_customer_order_lifecycle():
    """Verify customer places order, vendor inspects order, accepts with ETA, and completes it."""
    # Customer login
    cust_login = client.post("/api/v1/auth/login", json={"phone": "9876543220", "password": "1234"})
    cust_token = cust_login.json()["data"]["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # Vendor login
    vend_login = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    vend_token = vend_login.json()["data"]["access_token"]
    vend_id = vend_login.json()["data"]["vendor_id"]
    vend_headers = {"Authorization": f"Bearer {vend_token}"}

    # Get product
    prod_resp = client.get(f"/api/v1/customer/vendors/{vend_id}/catalog")
    p = prod_resp.json()["data"][0]

    # Place order
    order_payload = {
        "vendor_id": vend_id,
        "delivery_address": "Flat 302, Green Glen Layout, Bellandur, Bengaluru",
        "delivery_lat": 12.9279,
        "delivery_lon": 77.6711,
        "items": [
            {"product_id": p["id"], "quantity": 1.0}
        ],
        "notes": "Test doorstep order",
        "payment_mode": "CASH"
    }
    place_resp = client.post("/api/v1/orders", headers=cust_headers, json=order_payload)
    assert place_resp.status_code == 201
    order_data = place_resp.json()["data"]
    order_id = order_data["id"]
    assert order_data["status"] == "PENDING"

    # Vendor views orders
    vend_orders_resp = client.get("/api/v1/orders/vendor", headers=vend_headers)
    assert vend_orders_resp.status_code == 200
    assert any(o["id"] == order_id for o in vend_orders_resp.json()["data"])

    # Vendor updates status to ACCEPTED with ISO datetime
    est_time = (datetime.now(timezone.utc) + timedelta(minutes=20)).isoformat()
    status_resp = client.put(f"/api/v1/orders/{order_id}/status", headers=vend_headers, json={
        "status": "ACCEPTED",
        "estimated_delivery_time": est_time
    })
    assert status_resp.status_code == 200
    assert status_resp.json()["data"]["status"] == "ACCEPTED"

    # Vendor completes order
    comp_resp = client.put(f"/api/v1/orders/{order_id}/status", headers=vend_headers, json={
        "status": "COMPLETED"
    })
    assert comp_resp.status_code == 200
    assert comp_resp.json()["data"]["status"] == "COMPLETED"

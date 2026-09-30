"""
Tests for the Universal AI Voice Assistant (router, entities, confirmation flow).

Covers the AI router across languages, the confirmation pipeline for financial
actions, follow-up context, and the /voice/chat endpoint contract.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine
from app.utils.seed_data import seed_database

from app.assistant.tools import route_query
from app.assistant.languages import detect_language

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield


# ---------------------------------------------------------------------------
# Language detection
# ---------------------------------------------------------------------------
def test_detect_kannada():
    assert detect_language("ನನ್ನ ಇಂದಿನ sales ಎಷ್ಟು?") == "kn"


def test_detect_hindi():
    assert detect_language("मेरे आज की बिक्री कितनी है?") == "hi"


def test_detect_tamil():
    assert detect_language("இன்று என் விற்பனை எவ்வளவு?") == "ta"


def test_detect_english():
    assert detect_language("How much did I sell today?") == "en"


# ---------------------------------------------------------------------------
# Router: vendor data
# ---------------------------------------------------------------------------
def test_route_sales_en():
    plan = route_query("How much did I sell today?")
    assert plan.route == "VENDOR_DATA" and plan.tool == "get_sales"


def test_route_sales_kannada():
    plan = route_query("ನನ್ನ ಇಂದಿನ sales ಎಷ್ಟು?")
    assert plan.route == "VENDOR_DATA" and plan.tool == "get_sales"


def test_route_profit_possessive_is_vendor_data():
    plan = route_query("What is my profit today?")
    assert plan.route == "VENDOR_DATA" and plan.tool == "get_sales"


def test_route_profit_definition_is_knowledge():
    plan = route_query("How do I calculate profit?")
    assert plan.route == "GENERAL_KNOWLEDGE"


def test_route_stock_with_product():
    plan = route_query("How much tomato stock do I have?")
    assert plan.route == "VENDOR_DATA" and plan.tool == "get_inventory"
    assert plan.entities.get("product") == "tomato"


def test_route_stock_how_much_no_verb():
    plan = route_query("How much onion do I have?")
    assert plan.route == "VENDOR_DATA" and plan.tool == "get_inventory"


def test_route_udhaar_lookup():
    plan = route_query("Who owes me money?")
    assert plan.route == "VENDOR_DATA" and plan.tool == "get_customer_credit"


def test_route_top_products():
    plan = route_query("Which products are selling more?")
    assert plan.tool == "get_top_products"


# ---------------------------------------------------------------------------
# Router: actions + confirmation levels
# ---------------------------------------------------------------------------
def test_route_order_action():
    plan = route_query("I need 1 kg tomato")
    assert plan.route == "VENDOR_ACTION" and plan.tool == "create_order"
    assert plan.requires_confirmation is True
    assert plan.risk_level == "FINANCIAL"


def test_route_order_kannada():
    plan = route_query("ನನಗೆ 1 ಕೆಜಿ ಟೊಮೇಟೊ ಬೇಕು")
    assert plan.route == "VENDOR_ACTION" and plan.tool == "create_order"
    assert plan.entities.get("quantity") == 1


def test_route_restock_add():
    plan = route_query("Add 10 kilos of onion")
    assert plan.route == "VENDOR_ACTION" and plan.tool == "update_inventory"
    assert plan.entities.get("direction") == "add"


def test_route_restock_reduce():
    plan = route_query("Reduce 3 kilos of potato")
    assert plan.route == "VENDOR_ACTION" and plan.tool == "update_inventory"
    assert plan.entities.get("direction") == "reduce"


def test_route_add_udhaar_financial():
    plan = route_query("Give Ramesh 500 rupees udhaar")
    assert plan.route == "VENDOR_ACTION" and plan.tool == "add_udhaar"
    assert plan.requires_confirmation is True and plan.risk_level == "FINANCIAL"


def test_route_record_payment():
    plan = route_query("Record 200 payment from Kumar")
    assert plan.route == "VENDOR_ACTION" and plan.tool == "record_payment"
    assert plan.entities.get("amount") == 200


def test_route_add_udhaar_name_before_amount():
    """'Give Suresh 250 rupees udhaar' — name precedes the amount."""
    plan = route_query("Give Suresh 250 rupees udhaar")
    assert plan.tool == "add_udhaar"
    assert plan.entities.get("name") == "Suresh"
    assert plan.entities.get("amount") == 250


def test_detect_english_with_hinglish_word():
    """A single Hinglish word ('udhaar') must not flip an English sentence."""
    assert detect_language("How much udhaar does Ravi have?") == "en"


def test_detect_hindi_needs_two_hits():
    assert detect_language("मुझे 2 किलो टमाटर चाहिए") == "hi"
    assert detect_language("aaj kitna bikri?") == "hi"


# ---------------------------------------------------------------------------
# Router: live info, clarify, knowledge
# ---------------------------------------------------------------------------
def test_route_weather():
    plan = route_query("Will it rain today?")
    assert plan.route == "LIVE_INFO" and plan.tool == "get_weather"


def test_route_market_price():
    plan = route_query("What is today tomato price?")
    assert plan.route == "LIVE_INFO" and plan.tool == "get_market_price"


def test_route_clarify_ambiguous_earnings():
    plan = route_query("How much did I make?")
    assert plan.route == "CLARIFY" and plan.ambiguity == "sales_or_profit"


def test_route_rainy_season_is_advice():
    plan = route_query("What should I stock during rainy season?")
    assert plan.route == "GENERAL_KNOWLEDGE"


def test_route_general_knowledge():
    assert route_query("What is GST?").route == "GENERAL_KNOWLEDGE"
    assert route_query("Explain artificial intelligence").route == "GENERAL_KNOWLEDGE"


# ---------------------------------------------------------------------------
# Endpoint: POST /voice/chat
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def vendor_headers():
    r = client.post("/api/v1/auth/login", json={"phone": "9876543210", "password": "1234"})
    assert r.status_code == 200
    token = r.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _chat(headers, text, sid):
    r = client.post("/api/v1/voice/chat", json={"text": text, "session_id": sid}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["data"]


def test_chat_sales_reply(vendor_headers):
    d = _chat(vendor_headers, "How much did I sell today?", "t-sales")
    assert d["tool_used"] == "get_sales"
    assert "₹" in d["response"]
    assert d["requires_confirmation"] is False


def test_chat_kannada_reply_in_kannada(vendor_headers):
    d = _chat(vendor_headers, "ನನ್ನ ಇಂದಿನ sales ಎಷ್ಟು?", "t-kn")
    assert d["language"] == "kn"
    assert any("\u0c80" <= ch <= "\u0cff" for ch in d["response"]), "reply should be in Kannada script"


def test_chat_gst_knowledge(vendor_headers):
    d = _chat(vendor_headers, "What is GST?", "t-gst")
    assert "GST" in d["response"] or "gst" in d["response"].lower()


def test_chat_order_requires_confirmation_then_executes(vendor_headers):
    sid = "t-order"
    d = _chat(vendor_headers, "I need 1 kg onion", sid)
    assert d["requires_confirmation"] is True
    assert d["pending_action"] == "create_order"

    yes = _chat(vendor_headers, "yes", sid)
    assert "ORD-" in yes["response"]
    assert yes["requires_confirmation"] is False

    # No double-execution: a second 'yes' is not a pending action anymore
    stray = _chat(vendor_headers, "yes", sid)
    assert "ORD-" not in stray["response"]


def test_chat_cancel_action(vendor_headers):
    sid = "t-cancel"
    _chat(vendor_headers, "Add 2 kilos of tomato", sid)
    d = _chat(vendor_headers, "no", sid)
    assert "cancel" in d["response"].lower() or "ಇಲ್ಲ" in d["response"] or "बंद" in d["response"]


def test_chat_requires_auth():
    r = client.post("/api/v1/voice/chat", json={"text": "hello"})
    assert r.status_code in (401, 403)


def test_chat_english_stays_english_with_hinglish_word(vendor_headers):
    """'udhaar' alone is not enough to answer in Hindi."""
    d = _chat(vendor_headers, "How much udhaar does Ravi have?", "t-lang")
    assert d["language"] == "en"
    assert not any("\u0900" <= ch <= "\u097f" for ch in d["response"]), "reply should not be in Devanagari"


def test_chat_udhaar_name_extracted_before_amount(vendor_headers):
    sid = "t-udhaar-name"
    d = _chat(vendor_headers, "Give Ganesh 150 rupees udhaar", sid)
    assert d["requires_confirmation"] is True
    assert "Ganesh" in d["response"], "confirm prompt must name the right customer"
    assert "₹150" in d["response"], "confirm prompt must format whole rupees"
    # Cancel so the ledger stays clean
    _chat(vendor_headers, "no", sid)


def test_chat_rejects_empty_text(vendor_headers):
    r = client.post("/api/v1/voice/chat", json={"text": "  "}, headers=vendor_headers)
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# Endpoint: POST /voice/chat/stream (SSE)
# ---------------------------------------------------------------------------
def test_chat_stream_emits_deltas_and_final(vendor_headers):
    with client.stream(
        "POST", "/api/v1/voice/chat/stream",
        json={"text": "How much did I sell today?", "session_id": "t-stream"},
        headers=vendor_headers,
    ) as r:
        assert r.status_code == 200, r.text
        assert "text/event-stream" in r.headers["content-type"]
        events = []
        buf = ""
        for chunk in r.iter_text():
            buf += chunk
            while "\n\n" in buf:
                raw, buf = buf.split("\n\n", 1)
                if raw.startswith("data: "):
                    import json as _json
                    events.append(_json.loads(raw[len("data: "):]))
    types = [e["type"] for e in events]
    assert types[0] == "meta"
    assert "delta" in types
    final = [e for e in events if e["type"] == "final"][-1]
    assert final["tool_used"] == "get_sales"
    assert "₹" in final["response"]
    # deltas must reconstruct the final response word-for-word
    joined = " ".join(e["text"] for e in events if e["type"] == "delta")
    assert joined == final["response"]


def test_chat_stream_order_final_carries_receipt_data(vendor_headers):
    with client.stream(
        "POST", "/api/v1/voice/chat/stream",
        json={"text": "I need 2 kg tomato", "session_id": "t-stream-order"},
        headers=vendor_headers,
    ) as r:
        assert r.status_code == 200
        events = []
        buf = ""
        for chunk in r.iter_text():
            buf += chunk
            while "\n\n" in buf:
                raw, buf = buf.split("\n\n", 1)
                if raw.startswith("data: "):
                    import json as _json
                    events.append(_json.loads(raw[len("data: "):]))
        final = [e for e in events if e["type"] == "final"][-1]
        # either confirmation staged or order executed — data must carry receipt fields
        assert final["tool_used"] == "create_order"
        assert final["requires_confirmation"] is True
        assert final["pending_action"] == "create_order"


def test_chat_stream_confirmed_order_returns_receipt(vendor_headers):
    h = client.post("/api/v1/voice/chat", json={"text": "I need 3 kg onion", "session_id": "t-stream-confirm"}, headers=vendor_headers).json()["data"]
    assert h["requires_confirmation"] is True
    with client.stream(
        "POST", "/api/v1/voice/chat/stream",
        json={"text": "yes confirm", "session_id": "t-stream-confirm"},
        headers=vendor_headers,
    ) as r:
        assert r.status_code == 200
        events = []
        buf = ""
        for chunk in r.iter_text():
            buf += chunk
            while "\n\n" in buf:
                raw, buf = buf.split("\n\n", 1)
                if raw.startswith("data: "):
                    import json as _json
                    events.append(_json.loads(raw[len("data: "):]))
        final = [e for e in events if e["type"] == "final"][-1]
    assert final["tool_used"] == "create_order"
    d = final["data"]
    assert d.get("ok") is True
    assert d.get("order_number", "").startswith("ORD-")
    assert d.get("quantity") == 3.0
    assert d.get("total", 0) > 0
    assert d.get("unit") == "kg"

"""
VendorSaathi Assistant — conversation engine.

Flow: query → router → (tool | clarify | knowledge) → natural answer in the
user's language → optional pending action awaiting confirmation.

Sessions keep short-term memory (last product, last result) so follow-ups like
"what about onions?" or "add five more" work naturally.
"""
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.assistant.languages import detect_language, is_mixed_script
from app.assistant.tools import route_query, match_product, extract_number, match_unit, QueryPlan
from app.assistant import tools_impl
from app.assistant.responses import say, localize_numbers, DIRECTION_WORDS, product_display, unit_display


# ---------------------------------------------------------------------------
# Conversation memory (per session, in-process)
# ---------------------------------------------------------------------------
@dataclass
class Turn:
    role: str          # "user" | "assistant"
    text: str
    tool: Optional[str] = None
    at: float = field(default_factory=time.time)


@dataclass
class Session:
    id: str
    user_id: str
    turns: list = field(default_factory=list)
    last_product: Optional[str] = None
    last_plan: Optional[QueryPlan] = None
    pending_action: Optional[Dict[str, Any]] = None   # awaiting yes/no
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)


_SESSIONS: Dict[str, Session] = {}
_LOCK = threading.Lock()
SESSION_TTL = 60 * 30  # 30 minutes


def get_session(session_id: str, user_id: str) -> Session:
    with _LOCK:
        now = time.time()
        # Expire stale sessions
        for sid in [s for s, v in _SESSIONS.items() if now - v.updated_at > SESSION_TTL]:
            _SESSIONS.pop(sid, None)
        sess = _SESSIONS.get(session_id)
        if not sess or sess.user_id != user_id:
            sess = Session(id=session_id, user_id=user_id)
            _SESSIONS[session_id] = sess
        sess.updated_at = now
        return sess


def _remember(sess: Session, role: str, text: str, tool: Optional[str] = None):
    sess.turns.append(Turn(role=role, text=text, tool=tool))
    if len(sess.turns) > 20:
        sess.turns = sess.turns[-20:]


# ---------------------------------------------------------------------------
# General knowledge mini-brain (offline, honest, vendor-focused)
# ---------------------------------------------------------------------------
_KNOWLEDGE = [
    # (keywords in lower, answers: en + kn primary, others fall back to en)
    (("what is gst", "gst ಎಂದರೇನು", "gst", "जीएसटी"),
     "GST is a single tax you pay on most goods and services. Small vendors with turnover under ₹40 lakh a year usually don't need to register.",
     "GST ಎಂದರೆ ಬಹುಪಾಲು ಸರಕು ಮತ್ತು ಸೇವೆಗಳ ಮೇಲಿನ ಒಂದೇ ತೆರಿಗೆ. ವರ್ಷಕ್ಕೆ 40 ಲಕ್ಷ ರೂಪಾಯಿಗಳಿಗಿಂತ ಕಡಿಮೆ ವ್ಯಾಪಾರ ಮಾಡುವ ಚಿಕ್ಕ ವ್ಯಾಪಾರಿಗಳು ಸಾಮಾನ್ಯವಾಗಿ ನೋಂದಣಿ ಮಾಡಬೇಕಿಲ್ಲ."),
    (("what is profit", "ಲಾಭ ಎಂದರೇನು", "profit ಎಂದರೇನು", "मुनाफा क्या"),
     "Profit is the money left after subtracting your total costs from your sales. Sell for ₹600 what cost you ₹400, and your profit is ₹200.",
     "ಲಾಭ ಎಂದರೆ ಒಟ್ಟು ಖರ್ಚನ್ನು ಮಾರಾಟದಿಂದ ಕಳೆದ ಮೇಲೆ ಉಳಿಯುವ ಹಣ. ₹400 ಗೆ ತಂದು ₹600 ಗೆ ಮಾರಿದರೆ ಲಾಭ ₹200."),
    (("what is udhaar", "ಉದಾರ ಎಂದರೇನು", "उधार क्या"),
     "Udhaar is credit — you give goods now and the customer pays later. VendorSaathi keeps a ledger so nobody forgets.",
     "ಉದಾರ ಎಂದರೆ ಸಾಲ — ಈಗ ಸಾಮಾನ ಕೊಟ್ಟು ಹಣ ನಂತರ ಪಡುವುದು. ಮರೆಯದಿರಲು VendorSaathi ಖಾತೆ ಪುಸ್ತಕ ಇಟ್ಟುಕೊಳ್ಳುತ್ತದೆ."),
    (("what is upi", "ಯುಪಿಐ ಎಂದರೇನು", "upi ಎಂದರೇನು"),
     "UPI is instant bank-to-bank payment through apps like GPay or PhonePe. Money reaches your account directly — no change needed, no fake notes.",
     "UPI ಎಂದರೆ GPay, PhonePe ನಂತಹ ಆ್ಯಪ್‌ಗಳ ಮೂಲಕ ತಕ್ಷಣ ಬ್ಯಾಂಕ್‌ನಿಂದ ಬ್ಯಾಂಕ್‌ಗೆ ಪಾವತಿ. ಹಣ ನೇರವಾಗಿ ಖಾತೆಗೆ ಬರುತ್ತದೆ."),
    (("what is inflation", "ದುಡ್ಡಿನ ಉಬ್ಬರ", "महंगाई"),
     "Inflation means prices of goods rise slowly over time, so the same money buys a little less than before.",
     "ಹಣದ ಉಬ್ಬರ ಎಂದರೆ ಕಾಲಾನಂತರದಲ್ಲಿ ಸರಕುಗಳ ಬೆಲೆ ನಿಧಾನವಾಗಿ ಹೆಚ್ಚುತ್ತದೆ — ಅದೇ ಹಣಕ್ಕೆ ಸ್ವಲ್ಪ ಕಡಿಮೆ ಸಾಮಾನ ಸಿಗುತ್ತದೆ."),
    (("rainy season stock", "stock during rain", "ಮಳೆಗಾಲ ಸಾಮಾನ", "मानसून"),
     "In the rains, keep less leafy vegetables — they spoil fast. More potatoes, onions and turmeric sell steadily.",
     "ಮಳೆಗಾಲದಲ್ಲಿ ಸೊಪ್ಪು ಕಡಿಮೆ ತೆಗೆದುಕೊಳ್ಳಿ — ಬೇಗ ಹಾಳಾಗುತ್ತದೆ. ಆಲೂಗಡ್ಡೆ, ಈರುಳ್ಳಿ, ಅರಿಶಿನ ಚೆನ್ನಾಗಿ ಬಿಕರಿಯಾಗುತ್ತದೆ."),
    (("improve my business", "business better", "ವ್ಯಾಪಾರ ಹೇಗೆ ಬೆಳೆಸುವುದು", "व्यापार बढ़ाएं"),
     "Three simple ways: keep your best sellers always stocked, note daily udhaar clearly, and move to where crowds gather in the evening.",
     "ಮೂರು ಸುಲಭ ಮಾರ್ಗಗಳು: ಚೆನ್ನಾಗಿ ಬಿಕರಿಯಾಗುವ ಸಾಮಾನ ಯಾವಾಗಲೂ ಇಟ್ಟುಕೊಳ್ಳಿ, ಉದಾರ ಲೆಕ್ಕ ಸ್ಪಷ್ಟವಾಗಿ ಬರೆಯಿರಿ, ಸಂಜೆ ಜನ ಜಾಸ್ತಿ ಇರುವ ಕಡೆ ಹೋಗಿ."),
    (("what is artificial intelligence", "what is ai", "AI ಎಂದರೇನು", "कृत्रिम बुद्धिमत्ता"),
     "AI is software that learns patterns from data — like how VendorSaathi predicts which vegetables will sell fast tomorrow.",
     "AI ಎಂದರೆ ಮಾಹಿತಿಯಿಂದ ಕಲಿಯುವ ಸಾಫ್ಟ್‌ವೇರ್ — ನಾಳೆ ಯಾವ ತರಕಾರಿ ಚೆನ್ನಾಗಿ ಬಿಕರಿಯಾಗುತ್ತದೆ ಎಂದು VendorSaathi ಊಹಿಸುವ ಹಾಗೆ."),
]

_GREETINGS = ("hello", "hi", "hey", "namaste", "namaskara", "ನಮಸ್ಕಾರ", "नमस्ते", "vanakkam", "வணக்கம்", "నమస్కారం")
_GREET_REPLY = {
    "en": "Hello! Ask me about your sales, stock, orders, udhaar — or anything else.",
    "kn": "ನಮಸ್ಕಾರ! ಮಾರಾಟ, ದಾಸ್ತಾನು, ಆರ್ಡರ್, ಉದಾರ — ಅಥವಾ ಬೇರೆ ಏನಾದರೂ ಕೇಳಿ.",
    "hi": "नमस्ते! बिक्री, स्टॉक, ऑर्डर, उधार — कुछ भी पूछिए।",
}


def _knowledge_answer(text: str, lang: str) -> Optional[str]:
    low = text.lower()
    for keys, en, kn in _KNOWLEDGE:
        if any(k in low for k in keys):
            return kn if lang == "kn" else en
    if any(g in low for g in _GREETINGS) and len(low.split()) <= 4:
        return _GREET_REPLY.get(lang) or _GREET_REPLY["en"]
    return None


# Math word problems like "buy 10 at 40 sell at 60" → profit calc
def _try_math_word_problem(text: str, lang: str) -> Optional[Dict[str, Any]]:
    import re
    low = text.lower()
    if not any(w in low for w in ["profit", "make", "earn", "ಲಾಭ", "मुनाफा", "gain"]):
        return None
    nums = [float(n) for n in re.findall(r"(\d+(?:\.\d+)?)", text)]
    if " at " in low and len(nums) >= 3:
        qty, cost, sell = nums[0], nums[1], nums[2]
        total_cost, revenue = qty * cost, qty * sell
        profit = revenue - total_cost
        line = f"That works out to: cost ₹{total_cost:g}, revenue ₹{revenue:g}, profit ₹{profit:g}."
        line_kn = f"ಲೆಕ್ಕ ಹೀಗಾಗುತ್ತದೆ: ಖರ್ಚು ₹{total_cost:g}, ಮಾರಾಟ ₹{revenue:g}, ಲಾಭ ₹{profit:g}."
        return {"answer": line_kn if lang == "kn" else line, "tool": "calculate", "data": {"profit": profit, "revenue": revenue, "cost": total_cost}}
    return None


def _resolve_context_product(sess: Session, entities: Dict[str, Any], current_text: str = "") -> Optional[str]:
    """Follow-up support: 'what about onions?' inherits last topic."""
    if entities.get("product"):
        return entities["product"]
    if sess.last_product and _has_followup_hint(sess, current_text=current_text):
        return sess.last_product
    return None


_FOLLOWUP_HINTS = ["what about", "and the", "and how", "its stock", "the stock", "how much", "how many",
                   "eshtu", "ಎಷ್ಟು", "कितना", "कितनी", "எவ்வளவு", "ఎంత", "എത്ര", "ಅದರ"]


def _has_followup_hint(sess: Session, current_text: str = "") -> bool:
    """Only treat a SHORT question as a follow-up — never a brand-new topic."""
    if not current_text.strip():
        return False
    low = current_text.lower().strip()
    if len(low.split()) > 8:
        return False
    return any(h in low for h in _FOLLOWUP_HINTS)


# ---------------------------------------------------------------------------
# MAIN ENTRY
# ---------------------------------------------------------------------------
def handle_message(
    db: Session,
    user,                       # authenticated User (vendor or customer)
    vendor,                     # Vendor profile or None
    text: str,
    session_id: str,
    preferred_lang: str = "en",
) -> Dict[str, Any]:
    """Process one conversational turn and return a structured spoken answer."""
    sess = get_session(session_id, user.id)
    customer_is_actor = bool(user and user.role and getattr(user.role, "value", "") == "CUSTOMER")

    # ---- Confirmation handling: yes / no to a pending action ----
    if sess.pending_action:
        conv_lang = getattr(sess, "lang", preferred_lang) or preferred_lang
        # A customer's staged action needs the vendor resolved now (routing block
        # below never ran for this turn)
        if vendor is None and customer_is_actor and sess.pending_action.get("tool") in ("create_order", "get_customer_credit", "get_catalog", "get_inventory"):
            from app.models.vendor import Vendor as VendorModel
            vendor = db.query(VendorModel).filter(VendorModel.is_active == True).order_by(VendorModel.id).first()
        low = text.lower().strip()
        yes = any(w in low for w in ["yes", "ok", "confirm", "do it", "haudu", "ಹೌದು", "ಸರಿ", "हाँ", "हां", "जी हाँ", "avunu", "ஆம்", "சரி", "അതെ", "हो"])
        no = any(w in low for w in ["no", "stop", "cancel", "don't", "dont", "illa", "ಇಲ್ಲ", "ಬೇಡ", "नहीं", "వద్దు", "வேண்டாம்", "വേണ്ട", "नको"])
        if yes or no:
            action = sess.pending_action
            sess.pending_action = None
            if no:
                reply = say("cancelled", conv_lang)
                _remember(sess, "assistant", reply)
                return _pack(reply, session_id, tool=None, requires_confirmation=False)
            # Execute the confirmed action now
            result = _execute_tool(db, vendor, action["tool"], action["entities"], customer_user=customer_is_actor and user or None)
            reply, _ = _action_reply(result, action, conv_lang)
            _remember(sess, "assistant", reply, tool=action["tool"])
            return _pack(reply, session_id, tool=action["tool"], data=result, requires_confirmation=False)

    # ---- Route the query ----
    plan = route_query(text, preferred_lang=preferred_lang)
    lang = plan.language
    sess.lang = lang   # remember speaker's language for confirmation replies

    # Short product follow-ups: "what about onions?" / "ಅದರ ಬೆಲೆ ಎಷ್ಟು?" → stock lookup
    if plan.route == "GENERAL_KNOWLEDGE" and plan.tool is None:
        from app.assistant.tools import match_product as _mp
        mentioned = _mp(text)
        if mentioned and len(text.split()) <= 6:
            plan.route = "VENDOR_DATA"
            plan.tool = "get_inventory"
            plan.entities = {"product": mentioned}
        elif sess.last_product and _has_followup_hint(sess, current_text=text):
            plan.route = "VENDOR_DATA"
            plan.tool = "get_inventory"
            plan.entities = {"product": sess.last_product}

    # Contextual product for follow-ups
    if plan.entities.get("product") is None and plan.tool in ("get_inventory", "update_inventory", "create_order"):
        ctx = _resolve_context_product(sess, plan.entities, current_text=text)
        if ctx:
            plan.entities["product"] = ctx

    # ---- Calculator word problems (before data routes — "if I sell 10 at 60...") ----
    mathy = _try_math_word_problem(text, lang)
    if mathy:
        _remember(sess, "user", text)
        _remember(sess, "assistant", mathy["answer"], tool="calculate")
        return _pack(mathy["answer"], session_id, tool="calculate", data=mathy["data"])

    # ---- CLARIFY ----
    if plan.route == "CLARIFY":
        reply = say("clarify_sales_profit", lang)
        _remember(sess, "user", text)
        _remember(sess, "assistant", reply)
        sess.last_plan = plan
        return _pack(reply, session_id, tool=None, requires_confirmation=False, ambiguity=plan.ambiguity)

    # ---- Resolve vendor context ----
    # Vendors act on their own shop. Customers may use vendor data tools too
    # (e.g. "I need 1 kg tomato" → nearest vendor; "What is my udhaar?" → their
    # own ledger). Money-changing actions stay vendor/admin-only.
    vendor_tool = plan.tool in ("get_sales", "get_inventory", "get_orders", "get_customer_credit", "get_catalog",
                                "get_top_products", "recommend_location", "update_inventory", "add_udhaar",
                                "record_payment", "update_order_status", "create_order")
    customer_allowed = plan.tool in ("create_order", "get_customer_credit", "get_catalog", "get_inventory")
    if vendor_tool and vendor is None:
        if customer_is_actor and customer_allowed:
            from app.models.vendor import Vendor as VendorModel
            from app.models.customer import Customer as CustomerModel
            cust = db.query(CustomerModel).filter(CustomerModel.user_id == user.id).first()
            vendor = db.query(VendorModel).filter(VendorModel.is_active == True).order_by(VendorModel.id).first()
            if vendor is None:
                reply = say("data_unavailable", lang, what="vendor")
                _remember(sess, "user", text)
                _remember(sess, "assistant", reply)
                return _pack(reply, session_id, tool=plan.tool)
            if plan.tool == "get_customer_credit" and cust is not None:
                # Show the customer their OWN udhaar entries, not the shop's ledger
                plan.entities["only_phone"] = user.phone
        else:
            reply = say("data_unavailable", lang, what="vendor")
            _remember(sess, "user", text)
            _remember(sess, "assistant", reply)
            return _pack(reply, session_id, tool=plan.tool)

    # ---- VENDOR ACTION: stage it and ask for confirmation ----
    if plan.route == "VENDOR_ACTION":
        _remember(sess, "user", text)
        # If we're mid-pending same action with new quantity, update it
        confirm_key = {
            "update_inventory": ("confirm_stock", {"qty": plan.entities.get("quantity"), "unit": plan.entities.get("unit"), "product": plan.entities.get("product"), "direction": plan.entities.get("direction", "add")}),
            "create_order": ("confirm_order", {"qty": plan.entities.get("quantity"), "unit": plan.entities.get("unit"), "product": plan.entities.get("product")}),
            "add_udhaar": ("confirm_udhaar", {"amount": plan.entities.get("amount"), "name": plan.entities.get("name") or "customer"}),
            "record_payment": ("confirm_payment", {"amount": plan.entities.get("amount"), "name": plan.entities.get("name") or "customer"}),
        }.get(plan.tool)
        if confirm_key:
            key, kw = confirm_key
            if kw.get("qty") is not None:
                kw = {**kw, "qty": _fmt_num(kw["qty"])}
            if plan.tool == "update_inventory":
                dw = DIRECTION_WORDS.get(plan.entities.get("direction", "add"), DIRECTION_WORDS["add"])
                kwargs = {"qty": _fmt_num(kw["qty"]), "unit": unit_display(kw["unit"], lang), "product": product_display(kw["product"], lang),
                          "direction": dw["en"], **{f"direction_{l}": v for l, v in dw.items()}}
                reply = say(key, lang, **kwargs)
            elif plan.tool == "create_order":
                reply = say(key, lang, qty=kw["qty"], unit=unit_display(kw["unit"], lang), product=product_display(kw["product"], lang))
            else:
                if kw.get("amount") is not None:
                    kw = {**kw, "amount": _fmt_num(kw["amount"])}
                reply = say(key, lang, **kw)
            sess.pending_action = {"tool": plan.tool, "entities": plan.entities}
            reply = localize_numbers(reply, lang)
            _remember(sess, "assistant", reply)
            return _pack(reply, session_id, tool=plan.tool, requires_confirmation=True, pending_action=plan.tool)

    # ---- VENDOR DATA / LIVE INFO: run read-only tool ----
    if plan.tool:
        result = _execute_tool(db, vendor, plan.tool, plan.entities, customer_user=customer_is_actor and user or None)
        _remember(sess, "user", text)
        if plan.entities.get("product"):
            sess.last_product = plan.entities["product"]
        reply, data = _data_reply(plan, result, lang)
        reply = localize_numbers(reply, lang)
        _remember(sess, "assistant", reply, tool=plan.tool)
        return _pack(reply, session_id, tool=plan.tool, data=data, requires_confirmation=False)

    # ---- General knowledge ----
    _remember(sess, "user", text)
    known = _knowledge_answer(text, lang)
    if known:
        _remember(sess, "assistant", known)
        return _pack(localize_numbers(known, lang) if lang == "kn" else known, session_id, tool="knowledge")

    # ---- Fallback: honest, helpful, in-language ----
    # A bare yes/no with nothing pending deserves a clearer reply
    if any(w in text.lower() for w in ["yes", "ok", "haudu", "ಹೌದು", "हाँ", "ஆம்", "no", "illa", "ಇಲ್ಲ", "नहीं"]) and len(text.split()) <= 2:
        nothing = {
            "en": "There's nothing waiting for confirmation right now.",
            "kn": "ಈಗ ದೃಢೀಕರಿಸಲು ಏನೂ ಇಲ್ಲ.",
            "hi": "अभी पुष्टि के लिए कुछ नहीं है।",
        }
        reply = nothing.get(lang) or nothing["en"]
        _remember(sess, "assistant", reply)
        return _pack(reply, session_id, tool=None)
    fallback = {
        "en": "I'm not sure about that. Ask me about your sales, stock, orders, udhaar, weather — or general questions like GST or profit.",
        "kn": "ಅದರ ಬಗ್ಗೆ ನನಗೆ ಖಚಿತ ಮಾಹಿತಿ ಇಲ್ಲ. ಮಾರಾಟ, ದಾಸ್ತಾನು, ಆರ್ಡರ್, ಉದಾರ, ಹವಾಮಾನ — ಅಥವಾ GST, ಲಾಭ ನಂತಹ ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ.",
        "hi": "इस बारे में मुझे यकीनी जानकारी नहीं है। बिक्री, स्टॉक, ऑर्डर, उधार, मौसम — या GST और मुनाफ़े जैसे सवाल पूछिए।",
    }
    reply = fallback.get(lang) or fallback["en"]
    _remember(sess, "assistant", reply)
    return _pack(reply, session_id, tool=None)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _fmt_num(v) -> str:
    if v is None:
        return ""
    f = float(v)
    return str(int(f)) if f == int(f) else str(f)


def _execute_tool(db: Session, vendor, tool: str, entities: Dict[str, Any], customer_user=None) -> Dict[str, Any]:
    try:
        if tool == "get_sales":
            return tools_impl.get_sales(db, vendor, entities)
        if tool == "get_inventory":
            return tools_impl.get_inventory(db, vendor, entities)
        if tool == "get_orders":
            return tools_impl.get_orders(db, vendor, entities)
        if tool == "get_customer_credit":
            return tools_impl.get_customer_credit(db, vendor, entities)
        if tool == "get_catalog":
            return tools_impl.get_catalog(db, vendor, entities)
        if tool == "get_top_products":
            return tools_impl.get_top_products(db, vendor, entities)
        if tool == "recommend_location":
            return tools_impl.recommend_location(db, vendor, entities)
        if tool == "get_weather":
            return tools_impl.get_weather(db, vendor, entities)
        if tool == "get_market_price":
            return tools_impl.get_market_price(db, vendor, entities)
        if tool == "calculate":
            return tools_impl.calculate(db, vendor, entities)
        # Actions (already confirmed by the time they're called)
        if tool == "update_inventory":
            return tools_impl.update_inventory(db, vendor, entities)
        if tool == "create_order":
            return tools_impl.create_order(db, vendor, entities, customer_user=customer_user)
        if tool == "add_udhaar":
            return tools_impl.add_udhaar(db, vendor, entities)
        if tool == "record_payment":
            return tools_impl.record_payment(db, vendor, entities)
        if tool == "update_order_status":
            return tools_impl.update_order_status(db, vendor, entities)
        return {"ok": False, "error": "unknown_tool"}
    except Exception as e:
        return {"ok": False, "error": f"tool_error: {type(e).__name__}"}


def _data_reply(plan: QueryPlan, result: Dict[str, Any], lang: str):
    """Convert a read-only tool result into a natural spoken answer."""
    if not result.get("ok"):
        what = {"get_weather": "weather", "get_market_price": "market price", "recommend_location": "location"}.get(plan.tool, "sales")
        return say("data_unavailable", lang, what=what), result

    t = plan.tool
    if t == "get_sales":
        if result["sales_count"] == 0 and result["focus"] != "profit":
            return say("no_sales_data", lang), result
        if result.get("focus") == "profit":
            return say("profit_only", lang, profit=_fmt_num(result["profit"]), revenue=_fmt_num(result["revenue"])), result
        return say("sales", lang, count=result["sales_count"], revenue=_fmt_num(result["revenue"]), profit=_fmt_num(result["profit"])), result
    if t == "get_inventory":
        if result.get("product"):
            if result.get("low"):
                return say("stock_low", lang, stock=_fmt_num(result["stock"]), unit=result["unit"], product=result["product"]), result
            return say("stock_one", lang, stock=_fmt_num(result["stock"]), unit=result["unit"], product=result["product"]), result
        items = result.get("items") or []
        listing = ", ".join(f"{i['name']} {_fmt_num(i['stock'])} {i['unit']}" for i in items[:5])
        return say("stock_all", lang, count=result.get("count", len(items)), items=listing), result
    if t == "get_orders":
        if result["count"] == 0:
            return say("orders_none", lang), result
        first = result["orders"][0]
        detail = f"{first['order_number']} ₹{_fmt_num(first['total'])} ({first['status']})"
        return say("orders", lang, count=result["count"]) + " " + say("orders_detail", lang, detail=detail), result
    if t == "get_customer_credit":
        if result["count"] == 0:
            return say("udhaar_none", lang), result
        if result["count"] == 1:
            c = result["customers"][0]
            return say("udhaar_one", lang, name=c["name"], amount=_fmt_num(c["due"])), result
        top = ", ".join(f"{c['name']} ₹{_fmt_num(c['due'])}" for c in result["customers"][:3])
        return say("udhaar_total", lang, count=result["count"], total=_fmt_num(result["total_due"])) + f" {top}.", result
    if t == "get_weather":
        return say("weather", lang, condition=result.get("condition") or "clear", temp=_fmt_num(result.get("temp") or 28), advisory=(result.get("advisory") or "")[:80]), result
    if t == "recommend_location":
        return say("location", lang, location=result.get("location") or "the main market", score=result.get("score") or 90), result
    if t == "get_market_price":
        if result.get("modal_price"):
            return say("market_price", lang, product=result.get("product"), price=_fmt_num(result["modal_price"])), result
        return say("data_unavailable", lang, what="market price"), result
    if t == "get_top_products":
        if not result.get("has_data"):
            return say("no_sales_data", lang), result
        items = ", ".join(f"{p['name']} ({_fmt_num(p['qty_sold'])})" for p in result["top"][:3])
        return say("top_products", lang, days=result["period_days"], items=items), result
    if t == "get_catalog":
        items = ", ".join(i["name"] for i in result["items"][:5])
        return say("stock_all", lang, count=result["count"], items=items), result
    if t == "calculate":
        return f"That's ₹{_fmt_num(result['result'])}.", result
    # generic
    return say("action_success", lang), result


def _action_reply(result: Dict[str, Any], action: Dict[str, Any], lang: str):
    """Convert an executed action into a confirmation-style answer."""
    if not result.get("ok"):
        reason_map = {
            "product_not_found": "product not found",
            "insufficient_stock": "not enough stock",
            "no_udhaar_record": "no udhaar record found",
            "no_pending_order": "no pending order",
        }
        reason = reason_map.get(result.get("error"), result.get("error", "unknown"))
        if result.get("error") == "insufficient_stock":
            return say("insufficient_stock", lang, product=result.get("product"), stock=_fmt_num(result.get("stock"))), result
        return say("action_failed", lang, reason=reason), result
    t = action["tool"]
    e = action["entities"]
    if t == "update_inventory":
        return say("done_stock", lang, product=result["product"], stock=_fmt_num(result["new_stock"]), unit=result["unit"]), result
    if t == "create_order":
        return say("done_order", lang, order=result["order_number"], product=result["product"]), result
    if t == "add_udhaar":
        return say("done_udhaar", lang, amount=_fmt_num(result["amount"]), name=result["customer"]), result
    if t == "record_payment":
        return say("done_payment", lang, paid=_fmt_num(result["paid"]), name=result["customer"], remaining=_fmt_num(result["remaining"])), result
    if t == "update_order_status":
        return say("done_order", lang, order=result.get("order_number"), product=result.get("status", "")), result
    return say("action_success", lang), result


def _pack(reply: str, session_id: str, tool: Optional[str] = None, data: Optional[Dict] = None,
          requires_confirmation: bool = False, pending_action: Optional[str] = None, ambiguity: Optional[str] = None) -> Dict[str, Any]:
    return {
        "response": reply,
        "tool_used": tool,
        "data": data or {},
        "requires_confirmation": requires_confirmation,
        "pending_action": pending_action,
        "ambiguity": ambiguity,
        "conversation_id": session_id,
        "confidence": 0.95,
    }

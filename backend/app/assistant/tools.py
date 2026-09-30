"""
VendorSaathi Assistant — Tool registry & AI router.

The router decides how to answer a query:
  VENDOR_DATA       → query the vendor's real data (sales/stock/orders/udhaar)
  VENDOR_ACTION     → perform an action (add stock, create order, record udhaar...)
  LIVE_INFO         → weather / market prices / date-time (never from model memory)
  GENERAL_KNOWLEDGE → answered by the knowledge engine directly

Actions go through confirmation levels:
  READ_ONLY (no confirmation) / LOW_RISK (confirm) / FINANCIAL (always confirm)
"""
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.assistant.languages import detect_language, SUPPORTED_LANGUAGES


# ---------------------------------------------------------------------------
# Product alias map — matches spoken product names in many languages/scripts
# ---------------------------------------------------------------------------
PRODUCT_ALIASES: Dict[str, List[str]] = {
    "tomato": ["tomato", "tamatar", "thakkali", "tamata", "ಟೊಮೇಟೊ", "ಟಮೇಟೊ", "टमाटर", "தக்காளி", "టమోటా", "തക്കാളി", "टोमॅटो", "টমেটো", "ટામેટાં", "ਟਮਾਟਰ", "ଟମାଟୋ"],
    "onion": ["onion", "pyaaz", "pirjai", "eerulli", "ಈರುಳ್ಳಿ", "प्याज", "प्याज़", "வெங்காயம்", "ఉల్లిపాయ", "ഉള്ളി", "कांदा", "পেঁয়াজ", "ડુંગળી", "ਪਿਆਜ਼", "ପିଆଜ"],
    "potato": ["potato", "aalu", "alu", "batata", "alugadde", "ಆಲೂಗಡ್ಡೆ", "आलू", "आलु", "உருளைக்கிழங்கு", "బంగాళాదుంప", "ഉരുളക്കിഴങ്ങ്", "बटाटा", "আলু", "બટાટા", "ਆਲੂ", "ଆଳୁ"],
    "rice": ["rice", "chawal", "akki", "ಅಕ್ಕಿ", "चावल", "அரிசி", "వరి", "അരി", "भात", "চাল", "ચોખા", "ਚਾਵल"],
    "wheat": ["wheat", "atta", "godhi", "ಗೋಧಿ", "गेहूं", "गेहूँ", "கோதுமை", "గోధుమ", "ഗോതമ്പ്", "गहूं", "গম", "ઘઉં"],
    "turmeric": ["turmeric", "haldi", "arishina", "ಅರಿಶಿನ", "हल्दी", "மஞ்சள்", "పసుపు", "മഞ്ഞൾ", "हळद", "হলুদ", "હળદર"],
    "chilli": ["chilli", "chili", "pepper powder", "menasinakai", "mensinkai", "ಮೆಣಸಿನಕಾಯಿ", "ಮೆಣಸಿನ ಪುಡಿ", "मिर्च", "मिर्ची", "மிளகாய்", "మిర్చి", "മുളക്", "লঙ্কা", "મરચી", "ਮਿਰਚ"],
    "coriander": ["coriander", "dhania", "kottambari", "kothamalli", "ಕೊತ್ತಂಬರಿ", "धनिया", "கொத்தமல்லி", "కొత్తిమీర", "മല്ലി", "কোথমবির", "કોથમીર"],
    "carrot": ["carrot", "gajar", "carrot", "ಕ್ಯಾರೆಟ್", "गाजर", "கேரட்", "క్యారెట్", "കാരറ്റ്", "गाजर", "গাজর", "કેરેટ"],
    "cucumber": ["cucumber", "kheera", "sautekayi", "ಸೌತೆಕಾಯಿ", "खीरा", "வெள்ளரி", "దోస", "വെള്ളരി", " kakdi", "শশা", "કાકડી"],
    "dal": ["dal", "daal", "toor dal", "togari", "thogari", "ತೊಗರಿ", "ಬೇಳೆ", "दाल", "பருப்பு", "పప్పు", "പരിപ്പ്", "डाळ", "ডাল", "દાળ"],
    "milk": ["milk", "doodh", "haalu", "ಹಾಲು", "दूध", "பால்", "పాలు", "പാൽ", "दूध", "দুধ", "દૂધ", "ਦੁੱਧ"],
    "ghee": ["ghee", "tuppa", "ತುಪ್ಪ", "घी", "நெய்", "నెయ్యి", "നെയ്യ്", "तूप", "ঘি", "ઘી", "ਘਿਓ"],
    "eggs": ["egg", "eggs", "anda", "motte", "ಮೊಟ್ಟೆ", "अंडा", "अंडे", "முட்டை", "గుడ్డ", "മുട്ട", "ઈંડા", "ডিম", "ਅੰਡੇ"],
    "sugar": ["sugar", "cheeni", "sakre", "khanda", "ಸಕ್ಕರೆ", "चीनी", "சர்க்கரை", "చక్కెర", "പഞ്ചസാര", "साखर", "চিনি", "ખાંડ"],
    "oil": ["oil", "tel", "enne", "ಎಣ್ಣೆ", "तेल", "எண்ணெய்", "నూనె", "എണ്ണ", "তেল", "તેલ"],
    "apple": ["apple", "seb", "sebu", "ಸೇಬು", "सेब", "ஆப்பிள்", "ఆపిల్", "ആപ്പിൾ", "सफरचंद", "আপেল", "સફરજન"],
    "banana": ["banana", "kela", "bale", "ಬಾಳೆ", "केला", "வாழை", "అరటి", "വാഴപ്പഴം", "केळी", "কলা", "કેળા"],
    "paneer": ["paneer", "பனீர்", "ಪನೀರ್", "पनीर", "పనీర్", "പനീർ"],
    "curd": ["curd", "yogurt", "dahi", "mosaru", "ಮೊಸರು", "दही", "தயிர்", "పెరుగు", "തൈര്", "लोणी", "দই", "દહીં"],
}

# Unit keywords: unit → aliases (spoken forms)
UNIT_ALIASES: Dict[str, List[str]] = {
    "kg": ["kg", "kilo", "kilos", "kilogram", "kilograms", "kgs", "किलो", "ಕೆಜಿ", "కిలో", "கிலோ", "കിലോ", "কেজি", "કિલો"],
    "g": ["gram", "grams", "g", "ग्राम", "ಗ್ರಾಂ", "கிராம்"],
    "packet": ["packet", "packets", "pack", "pkt", "पैकेट", "ಪ್ಯಾಕೆಟ್", "ಪೊಟ್ಟಣ"],
    "bunch": ["bunch", "bunches", "गट्ठा", "ಕಟ್ಟು"],
    "piece": ["piece", "pieces", "nos", "पीस", "ತುಂಡು"],
    "dozen": ["dozen", "doz", "ಡಜನ್", "दर्जन"],
    "liter": ["liter", "litre", "l", "ltr", "लीटर", "ಲೀಟರ್", "லிட்டர்"],
}

# Money words
AMOUNT_WORDS = ["rupees", "rupee", "rs", "₹", "रुपये", "रुपया", "ರೂಪಾಯಿ", "ರೂ", "रु.", "ரூபாய்", "రూపాయలు", "টাকা", "રૂપિયા"]

WORD_NUMBERS: Dict[str, int] = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "twenty": 20, "thirty": 30, "fifty": 50, "hundred": 100, "thousand": 1000,
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "das": 10, "bees": 20, "tees": 30, "pachaas": 50, "sau": 100,
    "onde": 1, "eradu": 2, "ooru": 2, "mooru": 3, "naalku": 4, "aidu": 5, "aaru": 6, "hatthu": 10, "nuru": 100,
    "onru": 1, "irandu": 2, "moonru": 3, "naalu": 4, "ainthu": 5, "paththu": 10, "nooru": 100,
}

ACTION_WORDS_EN = ["add", "update", "set", "increase", "decrease", "reduce", "order", "buy", "record", "pay", "repay", "delete", "cancel", "remove"]
ACTION_WORDS_MULTI = ["ಸೇರಿಸಿ", "ಹಾಕಿ", "ಕೊಡಿ", "जोड़ो", "जोड़े", "बढ़ाओ", "दर्ज", "चुकाएं", "జోడించు", "சேர்க்க", "ചേർക്കുക", "जोडा", "যুক্ত", "ઉમેરો", "ਜੋੜੋ"]


@dataclass
class QueryPlan:
    """Result of routing a query."""
    route: str                              # VENDOR_DATA / VENDOR_ACTION / LIVE_INFO / GENERAL_KNOWLEDGE
    tool: Optional[str] = None              # tool id from TOOL_SCHEMAS
    entities: Dict[str, Any] = field(default_factory=dict)
    requires_confirmation: bool = False
    risk_level: str = "READ_ONLY"           # READ_ONLY / LOW_RISK / FINANCIAL
    ambiguity: Optional[str] = None         # e.g. "sales_or_profit"
    language: str = "en"
    reason: str = ""


def extract_number(text: str) -> Optional[float]:
    m = re.search(r"(\d+(?:\.\d+)?)", text.replace(",", ""))
    if m:
        return float(m.group(1))
    lower = text.lower()
    for w, v in WORD_NUMBERS.items():
        if re.search(rf"\b{w}\b", lower):
            return float(v)
    return None


def extract_amount(text: str) -> Optional[float]:
    """Extract a money amount (₹500, 500 rupees, ₹ 500)."""
    m = re.search(r"(?:₹|rs\.?|रुपये|ರೂ)\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    if m:
        return float(m.group(1))
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:rupees|rupee|रुपये|ರೂಪಾಯಿ|ரூபாய்|টাকা)", text, re.IGNORECASE)
    if m:
        return float(m.group(1))
    return None


def match_product(text: str) -> Optional[str]:
    """Return canonical product key if the text mentions a known product."""
    low = text.lower()
    # Longer aliases first to avoid 'chilli powder' matching 'chilli' early
    best_key, best_len = None, 0
    for key, aliases in PRODUCT_ALIASES.items():
        for a in aliases:
            if a in low and len(a) > best_len:
                best_key, best_len = key, len(a)
    return best_key


def match_unit(text: str) -> str:
    low = " " + text.lower() + " "
    best_unit, best_len = "kg", 0
    for unit, aliases in UNIT_ALIASES.items():
        for a in aliases:
            pad = f" {a} "
            if pad in low and len(a) > best_len:
                best_unit, best_len = unit, len(a)
    return best_unit


def _has_any(text_lower: str, words: List[str]) -> bool:
    return any(w in text_lower for w in words)


# Intent keyword tables — multilingual
_KW = {
    "sales": ["sales", "revenue", "sold", "sell", "how much did i sell", "how much did i make", "how much money", "how much did i earn", "bikri", "vikri", "ಮಾರಾಟ", "ಮಾರಾಟವಾಗಿದೆ", "ದುಡ್ಡು", "बिक्री", "விற்பனை", "అమ్మకాలు", "വിൽപ്പന", "বিক্রি", "વેચાણ", "duddu"],
    "profit": ["profit", "margin", "laabha", "laabam", "labham", "ಲಾಭ", "मुनाफा", "मुनाफ़ा", "लाभ", "லாபம்", "లాభం", "ലാഭം", "নাফা", "નફો", "munafa", "nafa"],
    "stock": ["stock", "inventory", "daastaanu", "ದಾಸ್ತಾನು", "ಸ್ಟಾಕ್", "स्टॉक", "सूची", "இருப்பு", "స్టాక్", "സ്റ്റോക്ക്", "মজুদ", "સ્ટોક", "how much stock", "eshtu", "kitna stock", "ಎಷ್ಟು ದಾಸ್ತಾನು"],
    "orders": ["order", "orders", "ಆರ್ಡರ್", "ऑर्डर", "ஆர்டர்", "ఆర్డర్", "ഓർഡർ"],
    "udhaar": ["udhaar", "udhaar", "credit", "baaki", "kadan", "ಉದಾರ", "ಬಾಕಿ", "उधार", "उधारी", "கடன்", "బాకీ", "കടം", "বাকি", "ઉધાર"],
    "customers": ["customer", "customers", "who owes", "ಗ್ರಾಹಕ", "ग्राहक", "வாடிக்கையாளர்", "కస్టమర్"],
    "weather": ["weather", "rain", "mausam", "ಹವಾಮಾನ", "ಮಳೆ", "मौसम", "बारिश", "வானிலை", "மழை", "వాతావరణం", "കാലാവസ്ഥ", "আবহাওয়া", "हवामान"],
    "location": ["where should", "location", "route", "go tomorrow", "hogabeku", "ಎಲ್ಲಿ", "ಹೋಗಬೇಕು", "ಸ್ಥಳ", "कहाँ", "எங்கு", "ఎక్కడ", "എവിടെ", "कुठे", "कोठे"],
    "market": ["market price", "mandi", "wholesale", "ಮಾರುಕಟ್ಟೆ", "मंडी", "भाव", "சந்தை", "price of", "today price", "today's price", "current price"],
    "payment": ["record payment", "received payment", "paid", "payment", "చెల్లింపు", "पेमेंट", "ಪಾವತಿ"],
    "catalog": ["products", "catalog", "items", "ಐಟಂಗಳು", "ವಸ್ತುಗಳು", "उत्पाद", "பொருட்கள்"],
}

_RISK = {
    "update_inventory": "LOW_RISK",
    "record_payment": "FINANCIAL",
    "add_udhaar": "FINANCIAL",
    "repay_udhaar": "FINANCIAL",
    "create_order": "FINANCIAL",
    "update_order_status": "LOW_RISK",
    "delete_product": "FINANCIAL",
}


def route_query(text: str, preferred_lang: str = "en") -> QueryPlan:
    """AI router: decide the route, tool, entities and confirmation requirement."""
    lang = detect_language(text, fallback=preferred_lang)
    low = " " + text.lower() + " "
    plan = QueryPlan(route="GENERAL_KNOWLEDGE", language=lang)

    # ---------- 1. Explicit vendor ACTIONS ----------
    product = match_product(text)
    is_action = _has_any(low, ACTION_WORDS_EN) or _has_any(low, ACTION_WORDS_MULTI)
    has_number = extract_number(text) is not None

    # Customer-order phrasing: "I need 1 kg tomato", "give me 2 kg onion", "ನನಗೆ 1 ಕೆಜಿ ಟೊಮೇಟೊ ಬೇಕು"
    order_phrases = [" i need ", "i want", "give me", "get me", "order", "ಬೇಕು", "ಕೊಡಿ", "चाहिए", "दीजिए", "కావాలి", "வேண்டும்", "വേണം"]
    restock_verbs = [" add ", " reduce ", " decrease ", " increase ", " remove ", " set "]
    if product and has_number and (_has_any(low, order_phrases) or _has_any(low, restock_verbs) or _has_any(low, ACTION_WORDS_MULTI)):
        qty = extract_number(text)
        unit = match_unit(text)
        # "add stock" (vendor restock) vs customer order — 'add' + product + number with no 'to my' → treat as restock
        if (_has_any(low, restock_verbs) or _has_any(low, ACTION_WORDS_MULTI)) and not _has_any(low, [" i need ", "i want", "give me", "ಬೇಕು", "चाहिए", "కావాలి", "வேண்டும்", "വേണം"]):
            plan.route = "VENDOR_ACTION"
            plan.tool = "update_inventory"
            plan.entities = {"product": product, "quantity": qty, "unit": unit, "direction": "add" if not _has_any(low, ["reduce", "decrease", "ಕಡಿಮೆ", "घटाओ"]) else "reduce"}
            plan.risk_level = _RISK[plan.tool]
            plan.requires_confirmation = True
            plan.reason = "vendor restock request"
            return plan
        # else: customer-style order
        plan.route = "VENDOR_ACTION"
        plan.tool = "create_order"
        plan.entities = {"product": product, "quantity": qty, "unit": unit}
        plan.risk_level = _RISK[plan.tool]
        plan.requires_confirmation = True
        plan.reason = "customer order request"
        return plan

    if _has_any(low, ["record ", "received ", "mark "]) and _has_any(low, ["payment", "pay", "paid", "చెల్లింపు", "पेमेंट", "ಪಾವತಿ"]):
        amount = extract_amount(text) or extract_number(text)
        if amount:
            plan.route = "VENDOR_ACTION"
            plan.tool = "record_payment"
            plan.entities = {"amount": amount, "name": _extract_name(text)}
            plan.risk_level = "FINANCIAL"
            plan.requires_confirmation = True
            return plan

    # Bare money queries with profit/earning words: "how much did I make today"
    if _has_any(low, ["how much did i make", "how much did i earn", "how much money did i make", "how much did i get", "कमाई", "ದುಡ್ಡು ಎಷ್ಟು"]):
        plan.ambiguity = "sales_or_profit"
        plan.route = "CLARIFY"
        plan.reason = "sales vs profit ambiguous"
        return plan

    # Udhaar / payment actions — need an amount + action verb; bare money mentions
    # ("how much udhaar do I have") fall through to the data routes below.
    if _has_any(low, ["give ", "add ", "record ", "take ", "ಕೊಡಿ", "ಸೇರಿಸಿ"]) and extract_amount(text):
        if _has_any(low, _KW["udhaar"] + ["credit"]):
            plan.route = "VENDOR_ACTION"
            plan.tool = "add_udhaar"
            plan.entities = {"amount": extract_amount(text), "name": _extract_name(text)}
            plan.risk_level = "FINANCIAL"
            plan.requires_confirmation = True
            return plan
        if _has_any(low, ["payment", "pay", "received", "చెల్లింపు", "पेमेंट", "ಪಾವತಿ"]):
            plan.route = "VENDOR_ACTION"
            plan.tool = "record_payment"
            plan.entities = {"amount": extract_amount(text), "name": _extract_name(text)}
            plan.risk_level = "FINANCIAL"
            plan.requires_confirmation = True
            return plan

    # Order status: "accept the order", "mark order delivered"
    if "order" in low and _has_any(low, ["accept", "deliver", "cancel", "complete", "pack"]):
        plan.route = "VENDOR_ACTION"
        plan.tool = "update_order_status"
        plan.entities = {"action": next(w for w in ["accept", "deliver", "cancel", "complete", "pack"] if w in low)}
        plan.risk_level = "LOW_RISK"
        plan.requires_confirmation = True
        return plan

    # ---------- 2. LIVE INFORMATION ----------
    if _has_any(low, _KW["weather"]):
        # "What should I stock during rainy season?" is advice, not a weather lookup
        if _has_any(low, ["stock", "ದಾಸ್ತಾನು", "स्टॉक", "what should i", "ಏನು ತರಬೇಕು"]):
            plan.route = "GENERAL_KNOWLEDGE"
            plan.reason = "business advice question"
            return plan
        plan.route = "LIVE_INFO"
        plan.tool = "get_weather"
        plan.reason = "weather is real-time"
        return plan
    if product and _has_any(low, ["selling more", "selling fast", "best selling", "most selling", "which product", "top product", "ಹೆಚ್ಚು ಮಾರಾಟ", "कौन बिकता"]):
        plan.route = "VENDOR_DATA"
        plan.tool = "get_top_products"
        return plan
    if _has_any(low, ["selling more", "selling fast", "best selling", "most selling", "which product", "top product"]):
        plan.route = "VENDOR_DATA"
        plan.tool = "get_top_products"
        return plan
    # "How do I calculate profit?" — a knowledge question, not "what is my profit"
    # (possessives like "my profit" mean the vendor wants THEIR numbers → vendor data)
    if not _has_any(low, ["my ", "ನನ್ನ", "मेरा", "मेरी", "मेरे", "माझा", "माझे", "నా ", "என் "]) and _has_any(low, ["how do i", "how to", "what is", "explain", "define"]) and _has_any(low, _KW["profit"] + _KW["udhaar"]):
        plan.route = "GENERAL_KNOWLEDGE"
        plan.reason = "explanation request"
        return plan
    if _has_any(low, _KW["market"]) or ("price" in low and product and not _has_any(low, ["my ", "ನನ್ನ", "मेरे", "माझे", "stock", "ದಾಸ್ತಾನು"])):
        plan.route = "LIVE_INFO"
        plan.tool = "get_market_price"
        plan.entities = {"product": product}
        plan.reason = "market prices are real-time"
        return plan

    # ---------- 3. VENDOR DATA ----------
    if _has_any(low, _KW["udhaar"]):
        plan.route = "VENDOR_DATA"
        plan.tool = "get_customer_credit"
        plan.entities = {"name": _extract_name(text)}
        plan.reason = "udhaar ledger lookup"
        return plan
    if _has_any(low, _KW["orders"]):
        plan.route = "VENDOR_DATA"
        plan.tool = "get_orders"
        plan.reason = "orders lookup"
        return plan
    if _has_any(low, _KW["customers"]) and "owe" in low:
        plan.route = "VENDOR_DATA"
        plan.tool = "get_customer_credit"
        return plan
    if _has_any(low, _KW["profit"]):
        plan.route = "VENDOR_DATA"
        plan.tool = "get_sales"
        plan.entities = {"focus": "profit"}
        return plan
    if _has_any(low, _KW["sales"]):
        plan.route = "VENDOR_DATA"
        plan.tool = "get_sales"
        plan.entities = {"focus": "revenue"}
        return plan
    # "How much onion do I have?" — 'how much' + product with no action verb = stock check
    if product and _has_any(low, ["how much", "how many", "ಎಷ್ಟು", "कितना", "कितनी", "எவ்வளவு", "ఎంత", "എത്ര"]) and not is_action:
        plan.route = "VENDOR_DATA"
        plan.tool = "get_inventory"
        plan.entities = {"product": product}
        plan.reason = "stock lookup via how-much phrasing"
        return plan
    if _has_any(low, _KW["stock"]) and product:
        plan.route = "VENDOR_DATA"
        plan.tool = "get_inventory"
        plan.entities = {"product": product}
        plan.reason = "stock lookup for product"
        return plan
    if _has_any(low, _KW["stock"]):
        plan.route = "VENDOR_DATA"
        plan.tool = "get_inventory"
        plan.entities = {"product": product} if product else {}
        return plan
    if _has_any(low, _KW["location"]):
        plan.route = "VENDOR_DATA"
        plan.tool = "recommend_location"
        return plan
    if _has_any(low, _KW["catalog"]):
        plan.route = "VENDOR_DATA"
        plan.tool = "get_catalog"
        return plan

    # ---------- 4. Everything else → GENERAL_KNOWLEDGE ----------
    plan.reason = "no vendor data or action required"
    return plan


def _extract_name(text: str) -> Optional[str]:
    """Best-effort person-name extraction for udhaar/payment — handles every
    natural word order: 'Give Suresh 250 rupees udhaar', 'Add udhaar for Ramesh',
    'Record 200 payment from Kumar'."""
    m = re.search(r"(?:to|from|for)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)", text)
    if m:
        return m.group(1)
    # Name before the amount: 'Give Suresh 250 rupees udhaar' / 'Suresh udhaar 250'
    m = re.search(r"\b([A-Z][a-z]{2,})\s+(?:\d+(?:\.\d+)?|₹|rs\.?\s)", text)
    if m:
        return m.group(1)
    # 'Add 250 udhaar to Suresh' / '250 rupees udhaar for Suresh' — name after
    # a money keyword ('rupees', 'rs', '₹')
    m = re.search(r"(?:rupees?|rs\.?|₹)\s+\S+\s+\S+\s+([A-Z][a-z]{2,})", text)
    if m:
        return m.group(1)
    return None

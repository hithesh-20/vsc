"""
Universal language detection for VendorSaathi Voice Assistant.

Detects all Indian languages supported by the platform by Unicode script
ranges (instant, offline, reliable) with transliteration keyword fallback.
"""
import re
from typing import List

# All platform languages: code -> (name, BCP-47 speech tag)
SUPPORTED_LANGUAGES = {
    "kn": "Kannada", "en": "English", "hi": "Hindi", "te": "Telugu",
    "ta": "Tamil", "mr": "Marathi", "bn": "Bengali", "gu": "Gujarati",
    "pa": "Punjabi", "ml": "Malayalam", "or": "Odia", "as": "Assamese",
    "ur": "Urdu", "sd": "Sindhi", "ne": "Nepali", "mai": "Maithili",
    "sa": "Sanskrit", "ks": "Kashmiri", "doi": "Dogri", "kok": "Konkani",
    "mni": "Meitei", "bho": "Bhojpuri",
}

# Unicode script ranges -> canonical language
_SCRIPT_RANGES: List[tuple] = [
    (re.compile(r"[\u0B80-\u0BFF]"), "ta"),      # Tamil
    (re.compile(r"[\u0C80-\u0CFF]"), "kn"),      # Kannada
    (re.compile(r"[\u0C00-\u0C7F]"), "te"),      # Telugu
    (re.compile(r"[\u0D00-\u0D7F]"), "ml"),      # Malayalam
    (re.compile(r"[\u0980-\u09FF]"), "bn"),      # Bengali (also Assamese/Manipuri)
    (re.compile(r"[\u0A80-\u0AFF]"), "gu"),      # Gujarati
    (re.compile(r"[\u0A00-\u0A7F]"), "pa"),      # Punjabi (Gurmukhi)
    (re.compile(r"[\u0600-\u06FF\u0750-\u077F]"), "ur"),  # Arabic script (Urdu/Sindhi/Kashmiri)
    (re.compile(r"[\u0900-\u097F]"), "hi"),      # Devanagari family
]

# Devanagari sub-language keywords (checked before defaulting to Hindi).
# Only fire on STRONG evidence: generic words like "आज"/"के" appear in Hindi too,
# so we require 2+ distinct hint hits (or one highly distinctive marker).
_DISTINCTIVE_DEVANAGARI = {  # a single marker is enough
    "ne": ["गर्छ", "भयो"],
    "kok": ["म्हाका", "म्हजें", "कितलें"],
    "mai": ["अछि", "हमरा"],
    "bho": ["बहुते", "कइसन"],
    "doi": ["मैंनू", "साड़े"],
    "sa": ["अस्ति", "वयं"],
}
_GENERIC_DEVANAGARI = {  # need 2+ hits to leave Hindi
    "mr": ["नाही", "आहे", "आहेत", "मला", "तुम्ही", "माझे", "माझ्या", "काय", "आजची", "कशी"],
    "ne": ["कति", "मलाई", "मेरो", "आजको"],
    "kok": ["आज", "किदे"],
    "mai": ["जाए", "कएना"],
    "bho": ["बा", "हई", "हमार"],
    "sa": ["कति", "मम"],
}
_DEPRECATED_DEVANAGARI_HINTS_UNUSED = None

# Romanized (transliterated) keyword hints per language
_ROMAN_HINTS = {
    "kn": ["eshtu", "estu", "namaskara", "beku", "ide", "idhe", "madthidini", "hogabeku", "tarakari", "eerulli", "alugadde", "laabha", "maarata", "duddu", "anna", "sathiya", "yenu", "elli", "ninna"],
    "ta": ["vanakkam", "evvalavu", "irukku", "vendum", "thakkali", "vengayam", "laabam", "virpanai", "enna", "eppadi", "sertha", "kadan"],
    "te": ["entha", "undhi", "kavali", "namaskaram", "tamata", "ullipaya", "labham", "ammakaalu", "ela", "undi", "cheppu"],
    "ml": ["ethra", "undu", "venam", "namaskaram", "thakkali", "ulli", "labham", "vilpana", "engott", "engane"],
    "hi": ["kitna", "kitni", "hai", "chahiye", "bikri", "munafa", "aaj", "batao", "kya", "tamatar", "pyaaz", "udhaar", "kaise", "mere", "mera", "meri", "dhan"],
    "mr": ["kiti", "ahe", "pahije", "namaskar", "bhaji", "kanda", "batata", "nafa", "vikri", "kasa", "mazha", "udar"],
    "bn": ["koto", "ache", "dorkar", "nomoshkar", "torkari", "peyaj", "laav", "bikri", "kemon", "acho", "amar"],
    "gu": ["ketla", "che", "joie", "kemcho", "tameta", "dungli", "nafo", "vechan", "kevi", "maru"],
    "pa": ["kinna", "hai", "chahida", "satsriakal", "sabzi", "pyaz", "munafa", "vikri", "kiven", "mera"],
    "bho": ["ba", "hau", "kahile", "hamar", "kaisan"],
    "ur": ["kitna", "hai", "chahiye", "bikri", "munafa", "salam", "kya", "kaise"],
    "or": ["kete", "achhi", "darkar", "namaskar", "khaibaku", "padiba", "labha", "bikri"],
    "as": ["kimaan", "aase", "lagise", "nomoskar", "masur", "labh", "bikri"],
    "en": ["what", "how", "much", "many", "sales", "today", "stock", "profit", "price", "order", "orders", "help", "weather", "my", "is", "the", "give", "add", "record", "show", "did", "does", "have", "has", "need", "want", "tell", "should", "owe", "paid"],
}


def detect_language(text: str, fallback: str = "en") -> str:
    """Return the language code for a query. Script detection first, romanized hints second."""
    if not text or not text.strip():
        return fallback if fallback in SUPPORTED_LANGUAGES else "en"

    for rx, code in _SCRIPT_RANGES:
        if rx.search(text):
            if code == "hi":
                # Disambiguate Devanagari family (Marathi/Nepali/Konkani...) by keywords,
                # defaulting to Hindi unless the evidence is strong.
                for sub, hints in _DISTINCTIVE_DEVANAGARI.items():
                    if any(h in text for h in hints):
                        return sub
                best_sub, best_hits = None, 0
                for sub, hints in _GENERIC_DEVANAGARI.items():
                    hits = sum(1 for h in hints if re.search(rf"(?:^|\s){re.escape(h)}(?:\s|[?,.!]|$)", text))
                    if hits > best_hits:
                        best_sub, best_hits = sub, hits
                if best_sub and best_hits >= 2:
                    return best_sub
                return "hi"
            if code == "bn":
                # Assamese shares the Bengali script
                if "ৰ" in text:
                    return "as"
                return "bn"
            return code

    lower = text.lower()

    def _hits(hints) -> int:
        return sum(1 for h in hints if f" {h} " in f" {lower} " or lower.startswith(h + " ") or lower.endswith(" " + h))

    en_score = _hits(_ROMAN_HINTS["en"])
    best_lang, best_score = None, 0
    for lang, hints in _ROMAN_HINTS.items():
        if lang == "en":
            continue
        score = _hits(hints)
        if score > best_score:
            best_lang, best_score = lang, score

    # A single shared Hinglish word ("udhaar", "hai", "kya") must not flip an
    # otherwise-English sentence — require 2+ hits AND an outright win to leave
    # English. Ties resolve to the caller's preferred language.
    if best_lang and best_score >= 2 and best_score > en_score:
        return best_lang
    if en_score >= 2:
        return "en"

    # Mixed Kannada-English etc. (script + Latin): script detection already caught the script part.
    return fallback if fallback in SUPPORTED_LANGUAGES else "en"


def is_mixed_script(text: str) -> bool:
    """True when the text mixes an Indic script with Latin (code-mixed speech)."""
    has_indic = any(r.search(text) for _, r in _SCRIPT_RANGES)
    has_latin = bool(re.search(r"[A-Za-z]", text))
    return has_indic and has_latin

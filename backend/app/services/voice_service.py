"""
VendorSaathi — shared voice plumbing.

This module used to hold a second, parallel voice "brain" (its own intent
router, slot filler and response DB). That brain is retired: every voice
entrypoint now routes through the ONE universal assistant engine
(app.assistant.engine.handle_message) with its shared router, tools,
confirmation flow and session memory.

What remains here is the plumbing both worlds still share:
- gTTS speech synthesis (base64 MP3) — used by /voice/chat, /voice/chat/stream
  and the legacy-compatible /voice/query adapter.
- Indic numeral localization for regional-script replies.
"""

import io
import base64
from typing import Optional

# Indic numerals dictionary for numerals localization
INDIC_NUMERALS = {
    "kn": ["೦", "೧", "೨", "೩", "೪", "೫", "೬", "೭", "೮", "೯"],
    "hi": ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
    "mr": ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
    "te": ["౦", "౧", "౨", "౩", "౪", "౫", "౬", "౭", "౮", "౯"],
    "ta": ["௦", "௧", "௨", "௩", "௪", "௫", "௬", "௭", "௮", "௯"],
    "ml": ["൦", "൧", "൨", "൩", "൪", "൫", "൬", "൭", "൮", "൯"],
    "bn": ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"],
    "gu": ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"],
    "pa": ["੦", "੧", "੨", "੩", "੪", "੫", "੬", "੭", "੮", "੯"],
    "en": ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
}

def localize_numbers_in_text(text: str, lang: str) -> str:
    digits = INDIC_NUMERALS.get(lang, INDIC_NUMERALS["en"])
    if lang == "en":
        return text
    result = []
    for ch in text:
        if ch.isdigit():
            result.append(digits[int(ch)])
        else:
            result.append(ch)
    return "".join(result)


class KannadaVoiceService:
    @staticmethod
    def synthesize_speech_base64(text: str, lang: str = "kn") -> Optional[str]:
        """Synthesizes text into MP3 base64 audio in the target language."""
        try:
            from gtts import gTTS
            tts_lang = lang if lang in [
                'kn', 'hi', 'te', 'ta', 'ml', 'mr', 'bn', 'gu', 'pa', 'en'
            ] else 'en'
            tts = gTTS(text=text, lang=tts_lang, slow=False)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return base64.b64encode(fp.read()).decode("utf-8")
        except Exception:
            return None

from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_vendor
from app.models.vendor import Vendor
from app.assistant.engine import handle_message
from app.assistant.languages import detect_language
from app.services.voice_service import KannadaVoiceService
from app.schemas.voice import VoiceQueryRequest, VoiceActionResponse, VoiceGuidanceResponse
from app.schemas.common import APIResponse

router = APIRouter()

# Educational feature walkthrough explanations
FEATURE_GUIDANCE_DB = {
    "inventory": {
        "title_en": "Inventory & Stock",
        "title_kn": "ದಾಸ್ತಾನು ಮತ್ತು ಸರಕು",
        "desc_en": "Here you can see how much stock of each item you have left, add new stock when you purchase, and get warnings when stock is low.",
        "desc_kn": "ಇಲ್ಲಿ ನೀವು ನಿಮ್ಮ ಬಳಿ ಎಷ್ಟು ಸರಕು ಉಳಿದಿದೆ ಎಂದು ನೋಡಬಹುದು, ಹೊಸದಾಗಿ ಖರೀದಿಸಿದಾಗ ಸೇರಿಸಬಹುದು ಮತ್ತು ದಾಸ್ತಾನು ಕಡಿಮೆಯಾದಾಗ ಎಚ್ಚರಿಕೆ ಪಡೆಯಬಹುದು."
    },
    "sales": {
        "title_en": "Quick Sales & POS",
        "title_kn": "ತ್ವರಿತ ಮಾರಾಟ ಬಿಲ್",
        "desc_en": "Touch the product buttons to quickly add items to a bill, accept Cash or UPI, and record sales in 2 seconds.",
        "desc_kn": "ವಸ್ತುಗಳ ಬಟನ್ ಒತ್ತಿ ಸುಲಭವಾಗಿ ಬಿಲ್ ಮಾಡಿ, ನಗದು ಅಥವಾ ಯುಪಿಐ ಹಣ ಸ್ವೀಕರಿಸಿ, ಕೇವಲ 2 ಸೆಕೆಂಡಿನಲ್ಲಿ ಮಾರಾಟ ದಾಖಲಿಸಿ."
    },
    "udhaar": {
        "title_en": "Udhaar (Credit) Ledger",
        "title_kn": "ಉದಾರ್ ಖಾತೆ ಪುಸ್ತಕ",
        "desc_en": "Never forget customer credit dues. Save debtor names, amounts, and send WhatsApp reminder messages with one click.",
        "desc_kn": "ಗ್ರಾಹಕರು ನೀಡಬೇಕಾದ ಸಾಲದ ಹಣವನ್ನು ಮರೆಯಬೇಡಿ. ಹೆಸರು ಮತ್ತು ಮೊತ್ತ ಉಳಿಸಿ, ಒಂದೇ ಕ್ಲಿಕ್‌ನಲ್ಲಿ ವಾಟ್ಸಾಪ್ ಸಂದೇಶ ಕಳುಹಿಸಿ."
    },
    "mobility": {
        "title_en": "Smart Location & Mobility",
        "title_kn": "ಸ್ಮಾರ್ಟ್ ಸ್ಥಳ ಮತ್ತು ಮಾರ್ಗ",
        "desc_en": "See which village or market has the highest customer demand today with zero competing vendors, saving you time and fuel.",
        "desc_kn": "ಯಾವ ಹಳ್ಳಿ ಅಥವಾ ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಇಂದು ಹೆಚ್ಚು ಬೇಡಿಕೆ ಇದೆ ಮತ್ತು ಕಡಿಮೆ ಸ್ಪರ್ಧೆ ಇದೆ ಎಂದು ತಿಳಿಯಿರಿ, ಸಮಯ ಮತ್ತು ಇಂಧನ ಉಳಿಸಿ."
    },
    "analytics": {
        "title_en": "Profit & Daily Analytics",
        "title_kn": "ಲಾಭ ಮತ್ತು ದಿನದ ಲೆಕ್ಕಾಚಾರ",
        "desc_en": "Automatically calculates: Total Revenue minus Item Purchase Cost equals Exact Net Profit in your pocket.",
        "desc_kn": "ಸ್ವಯಂಚಾಲಿತ ಲೆಕ್ಕಾಚಾರ: ಒಟ್ಟು ಮಾರಾಟ ಹಣದಿಂದ ಖರೀದಿ ವೆಚ್ಚ ಕಳೆದ ಮೇಲೆ ಉಳಿಯುವ ನಿವ್ವಳ ಲಾಭ."
    }
}

# Universal-engine tool names → legacy detected_intent names. /voice/query
# predates the universal assistant and some clients/tests assert the old
# intent vocabulary, so the adapter translates on the way out.
_LEGACY_INTENT = {
    "get_sales": "get_today_sales",
    "get_orders": "get_pending_orders",
    "get_customer_credit": "get_udhaar",
    "update_inventory": "add_inventory",
}


@router.post("/query", response_model=APIResponse[VoiceActionResponse])
async def process_voice_query(
    request: VoiceQueryRequest,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Process a voice/text query in any Indian regional language.

    ONE brain: this endpoint now routes through the same universal assistant
    engine that powers POST /voice/chat and /voice/chat/stream (shared intent
    router, tools, confirmation flow, session memory). It remains a thin
    legacy-compatible adapter — the request shape (query_text/language) and
    response shape (detected_intent/speech_response_kn/action_performed) are
    unchanged, so older clients keep working.
    """
    if not request.query_text or not request.query_text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query text required")

    text = request.query_text.strip()
    req_lang = request.language or "en"
    # Stateless per-request sessions: /voice/query never promised conversation
    # memory, and old clients don't resend confirmations.
    session_id = f"vq-{vendor.user_id}-{text[:12]}"

    result = handle_message(
        db=db,
        user=vendor.user,
        vendor=vendor,
        text=text,
        session_id=session_id,
        preferred_lang=req_lang,
    )

    reply = result["response"]
    reply_lang = detect_language(reply, fallback=req_lang)

    # Same TTS the streaming endpoint uses — one voice pipeline app-wide.
    audio_base64 = KannadaVoiceService.synthesize_speech_base64(reply, lang=reply_lang)

    tool_used = result.get("tool_used")
    detected_intent = _LEGACY_INTENT.get(tool_used or "", tool_used or "general_help")
    requires_confirmation = bool(result.get("requires_confirmation", False))

    data_payload: Dict = {
        "tool_used": tool_used,
        "data": result.get("data") or {},
        "requires_confirmation": requires_confirmation,
        "pending_action": result.get("pending_action"),
        "conversation_id": result.get("conversation_id") or session_id,
    }

    return APIResponse(
        data=VoiceActionResponse(
            recognized_text=text,
            detected_intent=detected_intent,
            language=reply_lang,
            # The engine answers in the speaker's language (English fallback
            # inside the engine), so both text fields carry the same reply.
            speech_response_text=reply,
            speech_response_kn=reply,
            # True only when something was actually done — a read-only lookup
            # or a pending (unconfirmed) money action is not a performed action.
            action_performed=bool(tool_used) and not requires_confirmation,
            data_payload=data_payload,
            audio_base64_response=audio_base64,
        )
    )


@router.get("/guidance/{feature_key}", response_model=APIResponse[VoiceGuidanceResponse])
def get_feature_guidance(feature_key: str):
    """Provide simple audio/visual explanation of a feature in Kannada and English."""
    key = feature_key.lower().strip()
    entry = FEATURE_GUIDANCE_DB.get(key)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown feature")

    return APIResponse(
        data=VoiceGuidanceResponse(
            feature_key=key,
            feature_title_en=entry["title_en"],
            feature_title_kn=entry["title_kn"],
            explanation_en=entry["desc_en"],
            explanation_kn=entry["desc_kn"],
            audio_url=None,
        )
    )

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_vendor
from app.models.vendor import Vendor
from app.schemas.voice import VoiceQueryRequest, VoiceActionResponse, VoiceGuidanceResponse
from app.schemas.common import APIResponse
from app.services.voice_service import KannadaVoiceService

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
        "desc_kn": "ಯಾವ ಹಳ್ಳಿ ಅಥವಾ ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಇಂದು ಹೆಚ್ಚು ಬೇಡಿಕೆ ಇದೆ ಮತ್ತು ಕಡಿಮೆ ಸ್ಪರ್ಧೆ ಇದೆ ಎಂದು ತಿಳಿದುಕೊಳ್ಳಿ."
    },
    "analytics": {
        "title_en": "Profit & Daily Analytics",
        "title_kn": "ಲಾಭ ಮತ್ತು ದಿನದ ಲೆಕ್ಕಾಚಾರ",
        "desc_en": "Automatically calculates: Total Revenue minus Item Purchase Cost equals Exact Net Profit in your pocket.",
        "desc_kn": "ಸ್ವಯಂಚಾಲಿತ ಲೆಕ್ಕಾಚಾರ: ಒಟ್ಟು ಮಾರಾಟ ಹಣದಿಂದ ಖರೀದಿ ವೆಚ್ಚ ಕಳೆದು ನಿಮ್ಮ ನಿವ್ವಳ ಲಾಭವನ್ನು ತೋರಿಸುತ್ತದೆ."
    }
}


@router.post("/query", response_model=APIResponse[VoiceActionResponse])
async def process_voice_query(
    request: VoiceQueryRequest,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Process voice/text query in any selected Indian regional language and execute tool with audio response."""
    if not request.query_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query text required")

    req_lang = request.language or "kn"

    result = await KannadaVoiceService.process_voice_query(
        db=db,
        vendor=vendor,
        query_text=request.query_text,
        preferred_lang=req_lang,
        language=req_lang
    )

    # Synthesize native speech audio in the detected regional language
    detected_lang = result.get("language") or req_lang
    native_text = result.get("speech_response_native") or result.get("speech_response_kn") or result.get("speech_response_text", "")
    audio_base64 = KannadaVoiceService.synthesize_speech_base64(native_text, lang=detected_lang)

    response_data = VoiceActionResponse(
        recognized_text=result["recognized_text"],
        detected_intent=result["detected_intent"],
        language=result["language"],
        speech_response_text=result["speech_response_text"],
        speech_response_kn=native_text,
        action_performed=result["action_performed"],
        data_payload=result["data_payload"],
        audio_base64_response=audio_base64
    )

    return APIResponse(data=response_data)


@router.get("/guidance/{feature_key}", response_model=APIResponse[VoiceGuidanceResponse])
def get_feature_guidance(feature_key: str):
    """Provide simple audio/visual explanation of a feature in Kannada and English."""
    key = feature_key.lower().strip()
    if key not in FEATURE_GUIDANCE_DB:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature guidance not found")

    item = FEATURE_GUIDANCE_DB[key]
    guidance = VoiceGuidanceResponse(
        feature_key=key,
        feature_title_en=item["title_en"],
        feature_title_kn=item["title_kn"],
        explanation_en=item["desc_en"],
        explanation_kn=item["desc_kn"]
    )
    return APIResponse(data=guidance)

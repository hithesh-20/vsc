from typing import Optional, Dict, Any
from pydantic import BaseModel


class VoiceQueryRequest(BaseModel):
    query_text: Optional[str] = None
    language: str = "kn"  # kn, en, hi
    audio_base64: Optional[str] = None


class VoiceActionResponse(BaseModel):
    recognized_text: str
    detected_intent: str
    language: str
    speech_response_text: str
    speech_response_kn: str
    action_performed: bool
    data_payload: Optional[Dict[str, Any]] = None
    audio_base64_response: Optional[str] = None  # Synthesized TTS audio if requested


class VoiceGuidanceResponse(BaseModel):
    feature_key: str
    feature_title_en: str
    feature_title_kn: str
    explanation_en: str
    explanation_kn: str
    audio_url: Optional[str] = None

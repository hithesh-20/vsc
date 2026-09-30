"""
Universal AI Voice Assistant endpoint.

POST /api/v1/voice/chat — natural conversational turn for ANY authenticated
user (vendor or customer). Auto-detects language, routes to tools / live info
/ general knowledge, stages actions behind confirmation, and returns spoken
text plus synthesized audio.
"""
import json
from typing import Any, Dict, Generator, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User, UserRole
from app.models.vendor import Vendor
from app.assistant.engine import handle_message
from app.services.voice_service import KannadaVoiceService
from app.schemas.voice_chat import VoiceChatRequest, VoiceChatResponse, VoiceChatHistoryResponse, VoiceChatHistoryItem
from app.schemas.common import APIResponse

import uuid

router = APIRouter()

# gTTS supports a subset of our language codes
_TTS_LANGS = {"kn", "hi", "te", "ta", "ml", "mr", "bn", "gu", "pa", "en"}


@router.post("/chat", response_model=APIResponse[VoiceChatResponse])
async def voice_chat(
    request: VoiceChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """One conversational turn with the universal VendorSaathi AI assistant."""
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text is required")

    vendor: Optional[Vendor] = None
    if current_user.role == UserRole.VENDOR:
        vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()

    session_id = request.session_id or f"sess-{uuid.uuid4().hex[:10]}"

    result = handle_message(
        db=db,
        user=current_user,
        vendor=vendor,
        text=text,
        session_id=session_id,
        preferred_lang=request.language or "en",
    )

    # Re-detect the language of the reply text for correct TTS voice
    from app.assistant.languages import detect_language
    reply_lang = detect_language(result["response"], fallback=request.language or "en")

    audio = None
    try:
        tts_lang = reply_lang if reply_lang in _TTS_LANGS else "en"
        audio = KannadaVoiceService.synthesize_speech_base64(result["response"], lang=tts_lang)
    except Exception:
        audio = None  # frontend falls back to browser speechSynthesis

    return APIResponse(data=VoiceChatResponse(
        transcript=text,
        response=result["response"],
        language=reply_lang,
        tool_used=result.get("tool_used"),
        data=result.get("data") or {},
        requires_confirmation=result.get("requires_confirmation", False),
        pending_action=result.get("pending_action"),
        ambiguity=result.get("ambiguity"),
        conversation_id=result.get("conversation_id") or session_id,
        confidence=result.get("confidence", 0.95),
        audio_base64=audio,
    ))


@router.post("/chat/stream")
def voice_chat_stream(
    request: VoiceChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Streaming variant of POST /voice/chat.

    Server-Sent Events — one JSON object per line prefixed with `data: `:
      {"type":"meta","language":"kn"}                          — once, first
      {"type":"delta","text":"ಇಂದಿನ"}                          — one per word
      {"type":"audio_chunk","seq":0,"audio_base64":"..."}      — per sentence (gTTS)
      {"type":"final","response":"...","tool_used":"create_order",
       "data":{...},"requires_confirmation":false,...}          — once, last
    The frontend renders each delta as it arrives and starts playing audio for
    the FIRST sentence while the rest of the reply is still being received.
    """
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Text is required")

    vendor: Optional[Vendor] = None
    if current_user.role == UserRole.VENDOR:
        vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()

    session_id = request.session_id or f"sess-{uuid.uuid4().hex[:10]}"

    def event(payload: Dict[str, Any]) -> str:
        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

    def generate() -> Generator[str, None, None]:
        try:
            result = handle_message(
                db=db,
                user=current_user,
                vendor=vendor,
                text=text,
                session_id=session_id,
                preferred_lang=request.language or "en",
            )
        except Exception as e:
            yield event({"type": "error", "detail": f"{type(e).__name__}"})
            return

        from app.assistant.languages import detect_language
        reply_lang = detect_language(result["response"], fallback=request.language or "en")
        reply = result["response"]

        yield event({"type": "meta", "language": reply_lang})

        # Word-by-word deltas so the UI starts painting immediately
        for w in reply.split():
            yield event({"type": "delta", "text": w})

        # Per-sentence TTS: the first sentence's audio is ready long before the
        # whole reply would have been synthesized (the slow part of gTTS).
        tts_lang = reply_lang if reply_lang in _TTS_LANGS else "en"
        sentences = [s.strip() for s in _split_sentences(reply) if s.strip()]
        for seq, sent in enumerate(sentences):
            try:
                b64 = KannadaVoiceService.synthesize_speech_base64(sent, lang=tts_lang)
            except Exception:
                b64 = None
            if b64:
                yield event({"type": "audio_chunk", "seq": seq, "audio_base64": b64, "text": sent})

        yield event({
            "type": "final",
            "response": reply,
            "language": reply_lang,
            "tool_used": result.get("tool_used"),
            "data": result.get("data") or {},
            "requires_confirmation": result.get("requires_confirmation", False),
            "pending_action": result.get("pending_action"),
            "ambiguity": result.get("ambiguity"),
            "conversation_id": result.get("conversation_id") or session_id,
            "confidence": result.get("confidence", 0.95),
        })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def _split_sentences(text: str):
    """Split a reply into sentences (Latin + Indic full stop, ?, !, |)."""
    import re
    parts = re.split(r"(?<=[.?!।|])\s+", text)
    return [p for p in parts if p and p.strip()]


@router.get("/chat/history/{session_id}", response_model=APIResponse[VoiceChatHistoryResponse])
def voice_chat_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """Short-term conversation memory for a session."""
    from app.assistant.engine import get_session
    sess = get_session(session_id, current_user.id)
    return APIResponse(data=VoiceChatHistoryResponse(
        session_id=session_id,
        turns=[VoiceChatHistoryItem(role=t.role, text=t.text, tool=t.tool) for t in sess.turns],
    ))

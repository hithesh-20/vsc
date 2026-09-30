from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class VoiceChatRequest(BaseModel):
    text: str
    session_id: Optional[str] = None
    language: Optional[str] = None  # hint; auto-detected when absent


class VoiceChatResponse(BaseModel):
    transcript: str
    response: str
    language: str
    tool_used: Optional[str] = None
    data: Dict[str, Any] = {}
    requires_confirmation: bool = False
    pending_action: Optional[str] = None
    ambiguity: Optional[str] = None
    conversation_id: str
    confidence: float = 0.95
    audio_base64: Optional[str] = None


class VoiceChatHistoryItem(BaseModel):
    role: str
    text: str
    tool: Optional[str] = None


class VoiceChatHistoryResponse(BaseModel):
    session_id: str
    turns: List[VoiceChatHistoryItem] = []

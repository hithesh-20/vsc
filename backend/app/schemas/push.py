from typing import Optional
from pydantic import BaseModel


class PushSubscribeRequest(BaseModel):
    """Browser PushSubscription.toJSON() + optional device label."""
    endpoint: str
    keys_p256dh: str
    keys_auth: str
    user_agent: Optional[str] = None


class PushSubscribeResponse(BaseModel):
    ok: bool = True
    endpoint: str
    message: str = "Subscribed to order alerts"


class VapidPublicKeyResponse(BaseModel):
    public_key: str

"""
Web Push endpoints.

GET  /push/vapid-public-key — the browser needs this before PushManager.subscribe
POST /push/subscribe        — store/refresh the PushSubscription for this user
POST /push/unsubscribe      — browser unsubscribed itself; deactivate here
POST /push/test             — send a test notification to all of the user's devices
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.models.push_subscription import PushSubscription
from app.schemas.push import PushSubscribeRequest, PushSubscribeResponse, VapidPublicKeyResponse
from app.schemas.common import APIResponse
from app.services import push_service

router = APIRouter()


@router.get("/vapid-public-key", response_model=APIResponse[VapidPublicKeyResponse])
def get_vapid_public_key():
    """Public VAPID key (safe to expose — it identifies our server to push services)."""
    key = push_service.vapid_public_key()
    if not key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Push not configured")
    return APIResponse(data=VapidPublicKeyResponse(public_key=key))


@router.post("/subscribe", response_model=APIResponse[PushSubscribeResponse])
def subscribe(
    body: PushSubscribeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register (or refresh) this browser's push subscription for the signed-in user."""
    if not body.endpoint.startswith(("http://", "https://")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid push endpoint")

    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == body.endpoint).first()
    if existing:
        existing.user_id = current_user.id
        existing.p256dh = body.keys_p256dh
        existing.auth = body.keys_auth
        existing.is_active = True
        existing.failure_count = 0
        sub = existing
    else:
        sub = PushSubscription(
            user_id=current_user.id,
            endpoint=body.endpoint,
            p256dh=body.keys_p256dh,
            auth=body.keys_auth,
            user_agent=(body.user_agent or request.headers.get("user-agent", ""))[:255],
        )
        db.add(sub)
    db.commit()

    return APIResponse(data=PushSubscribeResponse(endpoint=body.endpoint))


@router.post("/unsubscribe", response_model=APIResponse[dict])
def unsubscribe(
    body: PushSubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark the given endpoint inactive (browser revoked permission or unsubscribed)."""
    row = db.query(PushSubscription).filter(PushSubscription.endpoint == body.endpoint).first()
    if row:
        row.is_active = False
        db.commit()
    return APIResponse(data={"ok": True})


@router.post("/test", response_model=APIResponse[dict])
async def send_test_push(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a test notification to every device of the current user."""
    payload = push_service.new_order_payload(
        order_number="TEST-1234",
        customer_name="Saathi",
        total=0,
        order_id="",
    )
    payload["title"] = "✅ VendorSaathi alerts enabled"
    payload["body"] = "You'll get a loud alert here whenever a customer places an order."
    payload["requireInteraction"] = False
    active = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == current_user.id, PushSubscription.is_active == True)  # noqa: E712
        .count()
    )
    if active == 0:
        return APIResponse(data={"ok": False, "sent": 0, "message": "No registered devices — tap Enable Alerts first"})
    sent = push_service.notify_user(db, current_user.id, payload)
    if sent == 0:
        return APIResponse(data={"ok": False, "sent": 0, "message": f"{active} device(s) registered but delivery failed — re-enable alerts on this device"})
    return APIResponse(data={"ok": True, "sent": sent, "message": f"Test push sent to {sent} device(s)"})

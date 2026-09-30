"""
Web Push (VAPID) service — sends RFC 8291 encrypted push messages to browsers.

VAPID key management, in order of preference:
  1. VAPID_PRIVATE_KEY / VAPID_PUBLIC_KEY env vars (production; persistent)
  2. backend/.vapid_keys.json (auto-generated once, survives restarts)
  3. ephemeral in-memory keys (dev fallback — subscriptions break on restart)
"""
import base64
import json
import logging
import os
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger("vendorsathi.push")

_KEYS_FILE = Path(__file__).resolve().parent.parent.parent / ".vapid_keys.json"

_vapid_public: Optional[str] = None
_vapid_private: Optional[str] = None


def _b64url_raw(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _ensure_keys() -> None:
    """Load or create stable VAPID keys. Public key is exposed to browsers."""
    global _vapid_public, _vapid_private
    if _vapid_public and _vapid_private:
        return

    env_pub = os.environ.get("VAPID_PUBLIC_KEY")
    env_priv = os.environ.get("VAPID_PRIVATE_KEY")
    if env_pub and env_priv:
        _vapid_public, _vapid_private = env_pub, env_priv
        return

    try:
        if _KEYS_FILE.exists():
            data = json.loads(_KEYS_FILE.read_text())
            _vapid_public = data.get("public_key")
            _vapid_private = data.get("private_key")
            if _vapid_public and _vapid_private:
                return
    except Exception:
        pass

    # Generate once and persist so subscriptions survive restarts.
    # ecdsa is a hard dependency of pywebpush, so it is always available.
    try:
        import ecdsa

        sk = ecdsa.SigningKey.generate(curve=ecdsa.NIST256p)
        _vapid_private = _b64url_raw(sk.to_string())
        _vapid_public = _b64url_raw(sk.get_verifying_key().to_string())
    except Exception as e:
        logger.error("Could not generate VAPID keys: %s", e)
        _vapid_private = _vapid_private or ""
        _vapid_public = _vapid_public or ""

    if _vapid_public and _vapid_private:
        try:
            _KEYS_FILE.write_text(json.dumps({
                "public_key": _vapid_public,
                "private_key": _vapid_private,
            }))
            logger.info("Generated VAPID keys -> %s", _KEYS_FILE)
        except Exception:
            pass


def vapid_public_key() -> str:
    """Base64url P-256 public key for PushManager.subscribe({applicationServerKey})."""
    _ensure_keys()
    return _vapid_public or ""


def _vapid_claims(endpoint: str) -> dict:
    from urllib.parse import urlparse

    audience = f"{urlparse(endpoint).scheme}://{urlparse(endpoint).netloc}"
    return {
        "aud": audience,
        "sub": "mailto:support@vendorsathi.app",
        "exp": None,  # pywebpush fills a sensible default
    }


def send_push(endpoint: str, p256dh: str, auth: str, payload: dict) -> str:
    """Send one encrypted push. Returns 'ok' | 'gone' (dead subscription) | 'error'."""
    _ensure_keys()
    if not (_vapid_public and _vapid_private):
        return "error"
    try:
        from pywebpush import webpush, WebPushException

        webpush(
            subscription_info={
                "endpoint": endpoint,
                "keys": {"p256dh": p256dh, "auth": auth},
            },
            data=json.dumps(payload),
            vapid_private_key=_vapid_private,
            vapid_claims=_vapid_claims(endpoint),
        )
        return "ok"
    except WebPushException as e:
        status = getattr(getattr(e, "response", None), "status_code", None)
        if status in (404, 410):
            return "gone"
        logger.warning("Push failed (%s): %s", status, e)
        return "error"
    except Exception as e:
        logger.warning("Push error: %s", e)
        return "error"


def notify_user(db, user_id: str, payload: dict) -> int:
    """Send to every active device of a user; deactivate dead endpoints. Returns sent count."""
    from app.models.push_subscription import PushSubscription
    from datetime import datetime, timezone

    subs: List[PushSubscription] = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == user_id, PushSubscription.is_active == True)  # noqa: E712
        .all()
    )
    if not subs:
        return 0

    sent = 0
    dead_ids = []
    for s in subs:
        outcome = send_push(s.endpoint, s.p256dh, s.auth, payload)
        if outcome == "ok":
            sent += 1
            s.last_used_at = datetime.now(timezone.utc)
            s.failure_count = 0
        elif outcome == "gone":
            dead_ids.append(s.id)
        else:
            s.failure_count = (s.failure_count or 0) + 1
            if s.failure_count >= 5:
                dead_ids.append(s.id)
    for sid in dead_ids:
        row = db.query(PushSubscription).filter(PushSubscription.id == sid).first()
        if row:
            row.is_active = False
    db.commit()
    return sent


def new_order_payload(order_number: str, customer_name: str, total: float, order_id: str, origin: str = "/") -> dict:
    """Standard NEW_ORDER push payload. 'origin' deep-links notificationclick."""
    return {
        "type": "NEW_ORDER",
        "title": "🔔 New Order!",
        "body": f"{customer_name} ordered ₹{total:g} — tap to accept",
        "tag": f"order-{order_number}",
        "requireInteraction": True,
        "data": {"order_id": order_id, "order_number": order_number, "origin": origin},
    }

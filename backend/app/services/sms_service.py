"""
SMS / OTP delivery for VendorSaathi.

Two providers are supported and auto-selected by which credentials are present:

  1. Fast2SMS (India, closest thing to "free") — sign up, copy the Dev API key
     into FAST2SMS_API_KEY. The OTP route does NOT require DLT registration and
     can reach any Indian number. Fast2SMS gives ~₹50 free credit on signup.

  2. MSG91 (India, production) — set MSG91_AUTH_KEY + MSG91_TEMPLATE_ID. Requires
     a DLT-registered Sender ID and template for reliable delivery.

If neither is configured (or delivery fails while DEMO_MODE is on) the caller
falls back to returning the OTP inline so the flow keeps working.
"""
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("vendorsathi.sms")


def active_provider() -> str:
    """Return 'fast2sms', 'msg91' or 'none' based on configured credentials."""
    if settings.FAST2SMS_API_KEY:
        return "fast2sms"
    if settings.MSG91_AUTH_KEY and settings.MSG91_TEMPLATE_ID:
        return "msg91"
    return "none"


def is_configured() -> bool:
    """True when some provider is ready to attempt real delivery."""
    return active_provider() != "none"


def send_otp_sms(phone: str, code: str) -> bool:
    """
    Send an OTP SMS through the configured provider.

    Returns True when the provider accepted the message, False otherwise (the
    caller then decides whether to surface the demo code).
    """
    provider = active_provider()
    if provider == "fast2sms":
        return _send_fast2sms(phone, code)
    if provider == "msg91":
        return _send_msg91(phone, code)
    logger.info("No SMS provider configured — OTP SMS skipped (demo fallback).")
    return False


def _normalize(phone: str) -> str:
    return phone[-10:]


def _send_fast2sms(phone: str, code: str) -> bool:
    """Fast2SMS bulkV2 OTP route. Delivers as 'Your OTP: {code}'."""
    payload = {
        "route": settings.FAST2SMS_ROUTE,
        "variables_values": code,
        "numbers": _normalize(phone),
    }
    headers = {
        "authorization": settings.FAST2SMS_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(settings.FAST2SMS_API_URL, data=payload, headers=headers)
    except httpx.HTTPError as exc:
        logger.warning("Fast2SMS request failed for %s: %s", phone, exc)
        return False

    try:
        body = response.json()
    except Exception:
        body = {}

    ok = response.status_code == 200 and body.get("return") is True
    if ok:
        logger.info("Fast2SMS OTP accepted for %s", _normalize(phone))
    else:
        logger.warning(
            "Fast2SMS rejected OTP for %s (HTTP %s): %s",
            _normalize(phone),
            response.status_code,
            body,
        )
    return ok


def _send_msg91(phone: str, code: str) -> bool:
    """MSG91 Flow API. Delivers the template with the OTP variable filled in."""
    mobile = f"{settings.MSG91_COUNTRY_CODE}{_normalize(phone)}"
    payload = {
        "template_id": settings.MSG91_TEMPLATE_ID,
        "short_url": "0",
        "mobiles": mobile,
        settings.MSG91_OTP_VAR: code,
    }
    headers = {"authkey": settings.MSG91_AUTH_KEY, "Content-Type": "application/json"}
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(settings.MSG91_API_URL, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        logger.warning("MSG91 request failed for %s: %s", mobile, exc)
        return False

    try:
        body = response.json()
    except Exception:
        body = {}

    ok = response.status_code == 200 and str(body.get("type", "")).lower() != "error"
    if ok:
        logger.info("MSG91 OTP accepted for %s", mobile)
    else:
        logger.warning(
            "MSG91 rejected OTP for %s (HTTP %s): %s", mobile, response.status_code, body
        )
    return ok

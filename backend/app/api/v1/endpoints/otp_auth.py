import re
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_password_hash, create_access_token
from app.models.user import User, UserRole, LanguagePreference
from app.models.customer import Customer
from app.models.vendor import Vendor
from app.models.otp import OtpChallenge, OtpPurpose
from app.schemas.otp import (
    OtpRequest, OtpRequestResponse, OtpVerifyRequest, OtpVerifyResponse,
    OtpSignupRequest, CompleteResponse,
)
from app.schemas.common import APIResponse, MessageResponse
from app.services import sms_service

router = APIRouter()

OTP_TTL_SECONDS = 300       # 5 minutes
RESEND_COOLDOWN_SECONDS = 30

_LANGS = {"kn", "en", "hi", "te", "ta", "mr", "bn", "gu", "pa", "ml",
          "or", "as", "ur", "sd", "ne", "mai", "sa", "ks", "doi", "kok", "ond"}


def _normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) > 10:
        digits = digits[-10:]
    if len(digits) != 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid 10-digit Indian mobile number")
    return digits


def _mask(phone: str) -> str:
    return f"+91 {phone[:2]}XXXXXX{phone[-2:]}"


@router.post("/request", response_model=APIResponse[OtpRequestResponse])
def request_otp(payload: OtpRequest, db: Session = Depends(get_db)):
    """Send an OTP to the given mobile number (demo mode returns the code inline)."""
    phone = _normalize_phone(payload.phone)

    # Basic cooldown: reuse the newest unconsumed, unexpired challenge if it is fresh
    latest = (
        db.query(OtpChallenge)
        .filter(OtpChallenge.phone == phone, OtpChallenge.is_consumed == False)  # noqa: E712
        .order_by(OtpChallenge.created_at.desc())
        .first()
    )
    now = datetime.now(timezone.utc)
    if latest and latest.expires_at.replace(tzinfo=timezone.utc) > now:
        age = (now - latest.created_at.replace(tzinfo=timezone.utc)).total_seconds()
        if age < RESEND_COOLDOWN_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {int(RESEND_COOLDOWN_SECONDS - age)}s before requesting a new code",
            )

    code = f"{secrets.randbelow(900000) + 100000}"  # secure 6-digit code
    challenge = OtpChallenge(
        phone=phone,
        code_hash=get_password_hash(code),
        purpose=OtpPurpose.LOGIN,
        attempts=0,
        max_attempts=5,
        expires_at=now + timedelta(seconds=OTP_TTL_SECONDS),
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    # Send the code via the configured SMS gateway (MSG91). When delivery is not
    # possible (no credentials, or the provider fails) and DEMO_MODE is on, the
    # code is returned inline so the flow still works during demos/testing.
    sent = sms_service.send_otp_sms(phone, code)
    demo_code = code if (settings.DEMO_MODE and not sent) else None

    is_new_user = not db.query(User).filter(User.phone == phone).first()
    return APIResponse(
        message=f"OTP sent to {_mask(phone)}",
        data=OtpRequestResponse(
            request_id=challenge.id,
            phone=phone,
            masked_phone=_mask(phone),
            expires_in_seconds=OTP_TTL_SECONDS,
            resend_in_seconds=RESEND_COOLDOWN_SECONDS,
            is_new_user=is_new_user,
            demo_code=demo_code,
        ),
    )


@router.post("/verify", response_model=APIResponse[OtpVerifyResponse])
def verify_otp(payload: OtpVerifyRequest, db: Session = Depends(get_db)):
    """Verify the OTP. Issues a token immediately for existing users, or a signup ticket for new numbers."""
    challenge = db.query(OtpChallenge).filter(OtpChallenge.id == payload.request_id).first()
    if not challenge or challenge.is_consumed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP session. Request a new code.")

    now = datetime.now(timezone.utc)
    if challenge.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired. Request a new code.")

    if challenge.attempts >= challenge.max_attempts:
        challenge.is_consumed = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Too many wrong attempts. Request a new code.")

    if not verify_code(payload.code, challenge.code_hash):
        challenge.attempts += 1
        db.commit()
        remaining = challenge.max_attempts - challenge.attempts
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Incorrect OTP. {remaining} attempt(s) remaining.")

    challenge.is_verified = True
    challenge.is_consumed = True
    db.commit()

    user = db.query(User).filter(User.phone == challenge.phone).first()
    if user:
        return APIResponse(message="OTP verified", data=OtpVerifyResponse(
            verified=True,
            access_token=create_access_token(subject=user.id),
            role=user.role.value,
            user_id=user.id,
            vendor_id=user.vendor.id if user.vendor else None,
            customer_id=user.customer.id if user.customer else None,
            name=(user.vendor.business_name if user.vendor else None) or (user.customer.full_name if user.customer else None),
            language_pref=user.language_pref.value,
        ))

    # New number: continue to signup completion
    return APIResponse(message="OTP verified. Complete your profile to continue.", data=OtpVerifyResponse(verified=True))


def verify_code(plain: str, hashed: str) -> bool:
    from app.core.security import verify_password
    return verify_password(plain.strip(), hashed)


@router.post("/complete", response_model=APIResponse[CompleteResponse])
def complete_signup(payload: OtpSignupRequest, db: Session = Depends(get_db)):
    """Finish registration for a verified new number by creating the User + role profile."""
    challenge = db.query(OtpChallenge).filter(OtpChallenge.id == payload.request_id).first()
    # is_consumed is set by a successful verify; signup only requires a verified challenge
    if not challenge or not challenge.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verify the OTP first to complete signup.")

    if db.query(User).filter(User.phone == challenge.phone).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This number is already registered. Please login.")

    lang = payload.language_pref if payload.language_pref in _LANGS else "en"
    role = UserRole.VENDOR if payload.role == "VENDOR" else UserRole.CUSTOMER

    user = User(
        phone=challenge.phone,
        hashed_password=get_password_hash(secrets.token_urlsafe(24)),  # passwordless accounts get a random secret
        role=role,
        language_pref=LanguagePreference(lang),
        is_active=True,
    )
    db.add(user)
    db.flush()

    vendor_id = customer_id = None
    name = payload.full_name.strip()
    if role == UserRole.VENDOR:
        vendor = Vendor(user_id=user.id, business_name=name, business_category="General Store",
                        operating_location="Main Market", current_lat=12.9716, current_lon=77.5946)
        db.add(vendor)
        db.flush()
        vendor_id = vendor.id
    else:
        customer = Customer(user_id=user.id, full_name=name, delivery_address="Bengaluru",
                            default_lat=12.9716, default_lon=77.5946)
        db.add(customer)
        db.flush()
        customer_id = customer.id

    db.commit()

    return APIResponse(message="Welcome to VendorSaathi!", data=CompleteResponse(
        access_token=create_access_token(subject=user.id),
        role=role.value,
        user_id=user.id,
        vendor_id=vendor_id,
        customer_id=customer_id,
        name=name,
        language_pref=lang,
    ))

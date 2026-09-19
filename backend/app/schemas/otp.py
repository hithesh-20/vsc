from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class OtpRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15, description="Mobile number with or without +91")
    role_hint: Optional[str] = None  # VENDOR / CUSTOMER


class OtpRequestResponse(BaseModel):
    request_id: str
    phone: str
    masked_phone: str
    expires_in_seconds: int
    resend_in_seconds: int
    is_new_user: bool
    # DEMO_MODE convenience so testers can complete the flow without an SMS provider
    demo_code: Optional[str] = None


class OtpVerifyRequest(BaseModel):
    request_id: str
    code: str = Field(..., min_length=4, max_length=8)


class OtpVerifyResponse(BaseModel):
    verified: bool
    # Returned only when the phone is already registered
    access_token: Optional[str] = None
    token_type: str = "bearer"
    role: Optional[str] = None
    user_id: Optional[str] = None
    vendor_id: Optional[str] = None
    customer_id: Optional[str] = None
    name: Optional[str] = None
    language_pref: Optional[str] = None


class OtpSignupRequest(BaseModel):
    request_id: str
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = Field("CUSTOMER", pattern="^(CUSTOMER|VENDOR)$")
    language_pref: str = Field("en", pattern="^(kn|en|hi|te|ta|mr|bn|gu|pa|ml|or|as|ur|sd|ne|mai|sa|ks|doi|kok|mni|bho)$")


class CompleteResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    vendor_id: Optional[str] = None
    customer_id: Optional[str] = None
    name: str
    language_pref: str

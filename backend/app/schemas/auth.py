from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.user import UserRole, LanguagePreference


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    vendor_id: Optional[str] = None
    customer_id: Optional[str] = None
    name: str
    language_pref: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None


class UserRegisterRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15, description="Mobile number with or without country code")
    password: str = Field(..., min_length=4, description="Password or PIN")
    role: UserRole = UserRole.VENDOR
    language_pref: LanguagePreference = LanguagePreference.KN
    
    # Vendor-specific registration details
    business_name: Optional[str] = None
    business_category: Optional[str] = "General Store"
    operating_location: Optional[str] = "Main Market"
    
    # Customer-specific registration details
    full_name: Optional[str] = None
    delivery_address: Optional[str] = None


class UserLoginRequest(BaseModel):
    phone: str
    password: str


class UserResponse(BaseModel):
    id: str
    phone: str
    role: UserRole
    language_pref: LanguagePreference
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Integer, Enum as SQLEnum, Boolean, Index
from app.core.database import Base, generate_uuid


class OtpPurpose(str, enum.Enum):
    LOGIN = "LOGIN"


class OtpChallenge(Base):
    """Short-lived OTP challenge for phone-number passwordless authentication."""
    __tablename__ = "otp_challenges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    phone = Column(String(15), nullable=False, index=True)
    code_hash = Column(String(255), nullable=False)
    purpose = Column(SQLEnum(OtpPurpose), default=OtpPurpose.LOGIN, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=5, nullable=False)
    is_consumed = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_otp_phone_active", "phone", "is_consumed"),
    )

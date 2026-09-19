import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base, generate_uuid


class UserRole(str, enum.Enum):
    VENDOR = "VENDOR"
    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"


class LanguagePreference(str, enum.Enum):
    """All 22 scheduled languages of India plus English.

    NOTE: SQLite stores enum values by name, so renaming members is safe for
    existing rows; new members are additive.
    """
    KN = "kn"    # Kannada
    EN = "en"    # English
    HI = "hi"    # Hindi
    TE = "te"    # Telugu
    TA = "ta"    # Tamil
    MR = "mr"    # Marathi
    BN = "bn"    # Bengali
    GU = "gu"    # Gujarati
    PA = "pa"    # Punjabi
    ML = "ml"    # Malayalam
    OR = "or"    # Odia
    AS = "as"    # Assamese
    UR = "ur"    # Urdu
    SD = "sd"    # Sindhi
    NE = "ne"    # Nepali
    MAI = "mai"  # Maithili
    SA = "sa"    # Sanskrit
    KS = "ks"    # Kashmiri
    DOI = "doi"  # Dogri
    KOK = "kok"  # Konkani
    MNI = "mni"  # Meitei (Manipuri)
    BHO = "bho"  # Bhojpuri (additional, widely spoken)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    phone = Column(String(15), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.VENDOR, nullable=False, index=True)
    language_pref = Column(SQLEnum(LanguagePreference), default=LanguagePreference.KN, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    vendor = relationship("Vendor", back_populates="user", uselist=False, cascade="all, delete-orphan")
    customer = relationship("Customer", back_populates="user", uselist=False, cascade="all, delete-orphan")

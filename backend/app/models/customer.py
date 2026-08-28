import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base, generate_uuid


class LoyaltyTier(str, enum.Enum):
    BRONZE = "BRONZE"
    SILVER = "SILVER"
    GOLD = "GOLD"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    delivery_address = Column(String(255), nullable=True)
    default_lat = Column(Float, nullable=True)
    default_lon = Column(Float, nullable=True)
    loyalty_points = Column(Integer, default=0, nullable=False)
    tier = Column(SQLEnum(LoyaltyTier), default=LoyaltyTier.BRONZE, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="customer")
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
    loyalty_history = relationship("LoyaltyLedger", back_populates="customer", cascade="all, delete-orphan")

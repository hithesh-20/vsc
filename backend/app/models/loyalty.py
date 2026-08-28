import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base, generate_uuid


class LoyaltyActionType(str, enum.Enum):
    EARNED = "EARNED"
    REDEEMED = "REDEEMED"
    BONUS = "BONUS"
    EXPIRED = "EXPIRED"


class LoyaltyLedger(Base):
    __tablename__ = "loyalty_ledger"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True)
    points_change = Column(Integer, nullable=False)  # Positive for earned, negative for redeemed
    balance_after = Column(Integer, nullable=False)
    action_type = Column(SQLEnum(LoyaltyActionType), default=LoyaltyActionType.EARNED, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="loyalty_history")

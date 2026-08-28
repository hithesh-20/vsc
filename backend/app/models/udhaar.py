import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base, generate_uuid


class UdhaarStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"
    SETTLED = "SETTLED"


class UdhaarLedger(Base):
    __tablename__ = "udhaar_ledger"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_name = Column(String(100), nullable=False, index=True)
    customer_phone = Column(String(15), nullable=True, index=True)
    
    amount_due = Column(Float, nullable=False, default=0.0)
    amount_paid = Column(Float, nullable=False, default=0.0)
    remaining_balance = Column(Float, nullable=False, default=0.0)
    status = Column(SQLEnum(UdhaarStatus), default=UdhaarStatus.UNPAID, nullable=False, index=True)
    
    notes = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    last_reminder_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    vendor = relationship("Vendor", back_populates="udhaar_records")

import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base, generate_uuid


class SyncEntityType(str, enum.Enum):
    SALE = "SALE"
    INVENTORY = "INVENTORY"
    UDHAAR = "UDHAAR"
    PRODUCT = "PRODUCT"


class SyncStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    CONFLICT = "CONFLICT"
    FAILED = "FAILED"


class SyncQueue(Base):
    __tablename__ = "sync_queue"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    client_mutation_id = Column(String(36), unique=True, nullable=False, index=True)
    entity_type = Column(SQLEnum(SyncEntityType), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(SQLEnum(SyncStatus), default=SyncStatus.PENDING, nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    vendor = relationship("Vendor", back_populates="sync_entries")

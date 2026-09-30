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
    ORDER_STATUS = "ORDER_STATUS"  # vendor accepted/packed/delivered while offline
    ORDER_CREATE = "ORDER_CREATE"  # voice order placed while offline

# NOTE: SQLite (demo DB) does not enforce VARCHAR length, so the 12-char
# "ORDER_STATUS" value is stored fine in the entity_type VARCHAR(9) column.
# For PostgreSQL, run: ALTER TABLE sync_queue ALTER COLUMN entity_type TYPE varchar(16);


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

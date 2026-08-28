import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base, generate_uuid


class InventoryTransactionType(str, enum.Enum):
    INITIAL = "INITIAL"
    PURCHASE_IN = "PURCHASE_IN"      # Restock / Buy
    SALE_OUT = "SALE_OUT"            # Sold via POS or Order
    WASTE_ADJUST = "WASTE_ADJUST"    # Perished / Spoilage
    RETURN = "RETURN"                # Customer Return
    CORRECTION = "CORRECTION"        # Manual count fix


class InventoryLedger(Base):
    __tablename__ = "inventory_ledger"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    change_qty = Column(Float, nullable=False)  # Positive for addition, negative for deduction
    transaction_type = Column(SQLEnum(InventoryTransactionType), nullable=False)
    balance_after = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    product = relationship("Product", back_populates="inventory_logs")

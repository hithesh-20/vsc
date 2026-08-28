import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base, generate_uuid


class PaymentMode(str, enum.Enum):
    CASH = "CASH"
    UPI = "UPI"
    UDHAAR = "UDHAAR"
    HYBRID = "HYBRID"


class Sale(Base):
    __tablename__ = "sales"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_name = Column(String(100), default="Walk-in Customer")
    customer_phone = Column(String(15), nullable=True, index=True)
    
    total_amount = Column(Float, nullable=False, default=0.0)
    total_cost = Column(Float, nullable=False, default=0.0)  # COGS for instant profit calculation
    discount_amount = Column(Float, nullable=False, default=0.0)
    net_amount = Column(Float, nullable=False, default=0.0)
    net_profit = Column(Float, nullable=False, default=0.0)
    
    payment_mode = Column(SQLEnum(PaymentMode), default=PaymentMode.CASH, nullable=False)
    cash_paid = Column(Float, default=0.0)
    upi_paid = Column(Float, default=0.0)
    udhaar_amount = Column(Float, default=0.0)
    
    is_synced = Column(Boolean, default=True, nullable=False)
    client_mutation_id = Column(String(36), nullable=True, unique=True, index=True)
    client_timestamp = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    vendor = relationship("Vendor", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    sale_id = Column(String(36), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    product_name_snapshot = Column(String(150), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False, default="kg")
    unit_cost_price = Column(Float, nullable=False, default=0.0)
    unit_selling_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    profit = Column(Float, nullable=False, default=0.0)

    # Relationships
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")

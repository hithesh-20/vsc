import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base, generate_uuid


class ProductUnit(str, enum.Enum):
    KG = "kg"
    GRAM = "g"
    PIECE = "piece"
    DOZEN = "dozen"
    PACKET = "packet"
    LITER = "liter"
    BUNCH = "bunch"


class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    name_kn = Column(String(100), nullable=True)
    icon_name = Column(String(50), default="basket")
    description = Column(String(255), nullable=True)

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    
    name_en = Column(String(150), nullable=False, index=True)
    name_kn = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    unit = Column(SQLEnum(ProductUnit), default=ProductUnit.KG, nullable=False)
    
    cost_price = Column(Float, nullable=False, default=0.0)  # Purchase cost per unit
    selling_price = Column(Float, nullable=False, default=0.0)  # Selling price per unit
    current_stock = Column(Float, nullable=False, default=0.0)
    low_stock_threshold = Column(Float, nullable=False, default=5.0)
    
    image_url = Column(String(500), nullable=True)
    is_available = Column(Boolean, default=True, nullable=False)
    is_perishable = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    vendor = relationship("Vendor", back_populates="products")
    category = relationship("Category", back_populates="products")
    inventory_logs = relationship("InventoryLedger", back_populates="product", cascade="all, delete-orphan")
    sale_items = relationship("SaleItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
    demand_predictions = relationship("DemandPrediction", back_populates="product", cascade="all, delete-orphan")

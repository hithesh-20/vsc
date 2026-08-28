from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base, generate_uuid


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    business_name = Column(String(150), nullable=False, index=True)
    business_name_kn = Column(String(150), nullable=True)
    business_category = Column(String(100), nullable=False, default="General", index=True)
    operating_location = Column(String(200), nullable=False, default="Local Market")
    current_lat = Column(Float, nullable=True, index=True)
    current_lon = Column(Float, nullable=True, index=True)
    operating_radius_km = Column(Float, default=10.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_accepting_orders = Column(Boolean, default=True, nullable=False)
    rating_avg = Column(Float, default=4.8, nullable=False)
    rating_count = Column(Float, default=1.0, nullable=False)
    working_hours = Column(String(100), default="06:00 AM - 08:00 PM")
    upi_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="vendor")
    products = relationship("Product", back_populates="vendor", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="vendor", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="vendor", cascade="all, delete-orphan")
    udhaar_records = relationship("UdhaarLedger", back_populates="vendor", cascade="all, delete-orphan")
    locations = relationship("VendorLocation", back_populates="vendor", cascade="all, delete-orphan")
    demand_predictions = relationship("DemandPrediction", back_populates="vendor", cascade="all, delete-orphan")
    sync_entries = relationship("SyncQueue", back_populates="vendor", cascade="all, delete-orphan")

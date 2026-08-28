from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Float, DateTime, Date, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base, generate_uuid


class DemandPrediction(Base):
    __tablename__ = "demand_predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    prediction_date = Column(Date, default=date.today, nullable=False, index=True)
    
    predicted_qty = Column(Float, nullable=False)
    recommended_stock = Column(Float, nullable=False)
    confidence_score = Column(Float, default=0.85, nullable=False)
    factors = Column(JSON, nullable=True)  # Store features: weather, day_of_week, trend
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    vendor = relationship("Vendor", back_populates="demand_predictions")
    product = relationship("Product", back_populates="demand_predictions")

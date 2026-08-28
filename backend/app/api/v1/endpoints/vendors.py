from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_vendor
from app.models.vendor import Vendor
from app.models.sale import Sale
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.udhaar import UdhaarLedger, UdhaarStatus
from app.schemas.vendor import VendorProfileResponse, VendorProfileUpdate, DashboardSummary
from app.schemas.common import APIResponse
from app.services.weather_service import WeatherService

router = APIRouter()


@router.get("/profile", response_model=APIResponse[VendorProfileResponse])
def get_vendor_profile(vendor: Vendor = Depends(get_current_vendor)):
    """Get active vendor's business profile."""
    return APIResponse(data=VendorProfileResponse.model_validate(vendor))


@router.put("/profile", response_model=APIResponse[VendorProfileResponse])
def update_vendor_profile(
    update_data: VendorProfileUpdate,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Update vendor business details, location radius, or status."""
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(vendor, field, value)
    
    db.commit()
    db.refresh(vendor)
    return APIResponse(message="Profile updated successfully", data=VendorProfileResponse.model_validate(vendor))


@router.get("/dashboard-summary", response_model=APIResponse[DashboardSummary])
async def get_vendor_dashboard(
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Aggregated real-time metrics for Vendor Home Screen."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. Today Sales & Profit
    today_sales = db.query(Sale).filter(
        Sale.vendor_id == vendor.id,
        Sale.created_at >= today_start
    ).all()
    today_rev = sum(s.net_amount for s in today_sales)
    today_profit = sum(s.net_profit for s in today_sales)

    # 2. Pending Orders
    pending_orders = db.query(Order).filter(
        Order.vendor_id == vendor.id,
        Order.status.in_([OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PACKED])
    ).count()

    # 3. Outstanding Udhaar
    unpaid_udhaar = db.query(UdhaarLedger).filter(
        UdhaarLedger.vendor_id == vendor.id,
        UdhaarLedger.status != UdhaarStatus.SETTLED
    ).all()
    total_udhaar = sum(u.remaining_balance for u in unpaid_udhaar)

    # 4. Low stock count
    low_stock = db.query(Product).filter(
        Product.vendor_id == vendor.id,
        Product.is_available == True,
        Product.current_stock <= Product.low_stock_threshold
    ).count()

    # 5. Live Weather & Advisory
    weather = await WeatherService.get_current_weather(
        vendor.current_lat or 12.9716,
        vendor.current_lon or 77.5946
    )

    # 6. AI Quick Recommendation
    ai_recom = f"High demand for {vendor.business_category} expected today at Gandhi Circle." if low_stock == 0 else f"Restock {low_stock} items running low to prevent missed sales."

    summary = DashboardSummary(
        today_sales_revenue=round(today_rev, 2),
        today_sales_count=len(today_sales),
        today_net_profit=round(today_profit, 2),
        pending_orders_count=pending_orders,
        total_udhaar_outstanding=round(total_udhaar, 2),
        low_stock_items_count=low_stock,
        ai_recommendation_short=ai_recom,
        weather_summary=f"{weather['weather_condition']} ({weather['temperature_celsius']}°C)",
        weather_warning=weather.get("advisory_kn") if not weather.get("is_outdoor_favorable") else None
    )

    return APIResponse(data=summary)

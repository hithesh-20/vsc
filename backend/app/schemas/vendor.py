from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class VendorProfileResponse(BaseModel):
    id: str
    user_id: str
    business_name: str
    business_name_kn: Optional[str] = None
    business_category: str
    operating_location: str
    current_lat: Optional[float] = None
    current_lon: Optional[float] = None
    operating_radius_km: float
    is_active: bool
    is_accepting_orders: bool
    rating_avg: float
    rating_count: float
    working_hours: str
    upi_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class VendorProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    business_name_kn: Optional[str] = None
    business_category: Optional[str] = None
    operating_location: Optional[str] = None
    operating_radius_km: Optional[float] = None
    is_accepting_orders: Optional[bool] = None
    working_hours: Optional[str] = None
    upi_id: Optional[str] = None


class DashboardSummary(BaseModel):
    today_sales_revenue: float
    today_sales_count: int
    today_net_profit: float
    pending_orders_count: int
    total_udhaar_outstanding: float
    low_stock_items_count: int
    ai_recommendation_short: str
    weather_summary: str
    weather_warning: Optional[str] = None

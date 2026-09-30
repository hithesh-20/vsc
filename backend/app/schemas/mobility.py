from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class LocationBroadcastRequest(BaseModel):
    latitude: float
    longitude: float
    speed: float = 0.0
    heading: float = 0.0
    battery_level: float = 100.0


class NearbyVendorItem(BaseModel):
    vendor_id: str
    business_name: str
    business_name_kn: Optional[str] = None
    business_category: str
    latitude: float
    longitude: float
    distance_km: float
    rating_avg: float
    is_accepting_orders: bool
    working_hours: str
    product_count: int


class LocationRecommendation(BaseModel):
    location_name: str
    location_name_kn: str
    latitude: float
    longitude: float
    distance_km: float
    score: float
    demand_level: str  # High, Moderate, Low
    active_competitors_count: int
    expected_customers_density: str
    recommendation_reason: str
    recommendation_reason_kn: str
    weather_condition: str
    # Rendered on the vendor dashboard's Smart Route card — omitted from the
    # response model they used to be filtered out and the card showed ₹NaN.
    estimated_turnover_inr: int = 0
    high_demand_products: List[str] = []
    saturated_products: List[str] = []
    # Consumed by the Route AI tab: server-computed Maps deep link, saturation
    # risk %, and the OPTIMAL_PRIMARY / ALTERNATIVE_REROUTE strategy. The Maps
    # button silently lost its driving-optimized URL until these were declared.
    cannibalization_risk_percent: float = 0.0
    route_strategy: str = "OPTIMAL_PRIMARY"
    google_maps_url: str = ""


class LocationRecommendationResponse(BaseModel):
    vendor_id: str
    vendor_category: str
    recommendations: List[LocationRecommendation]
    cluster_warning: Optional[str] = None
    generated_at: datetime


class Waypoint(BaseModel):
    name: str
    latitude: float
    longitude: float
    is_completed: bool = False


class RouteOptimizeRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    destination_points: List[Waypoint]


class RouteOptimizeResponse(BaseModel):
    total_distance_km: float
    estimated_time_minutes: int
    optimized_waypoints: List[Waypoint]
    polyline_coordinates: List[List[float]]  # [[lat, lon], ...]
    fuel_saving_percentage: float

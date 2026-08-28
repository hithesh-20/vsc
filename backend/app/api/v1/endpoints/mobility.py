from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.vendor import Vendor
from app.models.location import VendorLocation
from app.schemas.mobility import (
    LocationBroadcastRequest, LocationRecommendationResponse, RouteOptimizeRequest, RouteOptimizeResponse
)
from app.schemas.common import APIResponse, MessageResponse
from app.services.mobility_service import MobilityService
from app.services.map_service import MapService

router = APIRouter()


def get_current_or_default_vendor(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Vendor:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        from app.core.security import decode_access_token
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            vendor = db.query(Vendor).filter(Vendor.id == payload["sub"]).first()
            if vendor:
                return vendor
    
    # Fallback to first vendor or create demo vendor
    vendor = db.query(Vendor).first()
    if not vendor:
        vendor = Vendor(
            phone_number="9876543210",
            business_name="Ramesh Fresh Vegetables",
            business_name_kn="ರಮೇಶ್ ತಾಜಾ ತರಕಾರಿಗಳು",
            owner_name="Ramesh Kumar",
            owner_name_kn="ರಮೇಶ್ ಕುಮಾರ್",
            business_category="Vegetables",
            current_lat=12.9716,
            current_lon=77.5946
        )
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
    return vendor


@router.post("/broadcast", response_model=MessageResponse)
def broadcast_vendor_gps(
    gps: LocationBroadcastRequest,
    vendor: Vendor = Depends(get_current_or_default_vendor),
    db: Session = Depends(get_db)
):
    """Update vendor's real-time GPS coordinates and record location trace."""
    vendor.current_lat = gps.latitude
    vendor.current_lon = gps.longitude

    loc_log = VendorLocation(
        vendor_id=vendor.id,
        latitude=gps.latitude,
        longitude=gps.longitude,
        speed=gps.speed,
        heading=gps.heading,
        battery_level=gps.battery_level
    )
    db.add(loc_log)
    db.commit()

    return MessageResponse(message="GPS location updated successfully")


@router.get("/recommendations", response_model=APIResponse[LocationRecommendationResponse])
async def get_smart_location_recommendations(
    vendor: Vendor = Depends(get_current_or_default_vendor),
    db: Session = Depends(get_db)
):
    """Calculate and return ranked optimal selling spots with anti-clustering coordination."""
    result = await MobilityService.recommend_optimal_locations(db, vendor)
    return APIResponse(data=LocationRecommendationResponse(**result))


@router.get("/predict-location")
async def predict_next_vendor_location(
    lat: float = 12.9716,
    lon: float = 77.5946,
    vendor: Vendor = Depends(get_current_or_default_vendor),
    db: Session = Depends(get_db)
):
    """AI-powered next location prediction with turn-by-turn Google Maps navigation."""
    result = await MobilityService.predict_next_optimal_location(db, vendor, current_lat=lat, current_lon=lon)
    return APIResponse(data=result)


@router.get("/fleet-dispatch")
def get_fleet_spatial_temporal_dispatch(
    vendor: Vendor = Depends(get_current_or_default_vendor),
    db: Session = Depends(get_db)
):
    """
    AI Spatial-Temporal Fleet & People Management Dispatch System:
    Solves time-gap collision (e.g. Ramesh sells out BTM at 4 PM -> Suresh rerouted to HSR Layout at 6:30 PM).
    """
    result = MobilityService.get_fleet_dispatch_schedule(db, vendor)
    return APIResponse(data=result)


@router.post("/route-optimize", response_model=APIResponse[RouteOptimizeResponse])
async def optimize_travel_route(request: RouteOptimizeRequest):
    """Compute shortest, fuel-optimized route for mobile vendors visiting customer waypoints."""
    origin = (request.origin_lat, request.origin_lon)
    destinations = [(w.latitude, w.longitude) for w in request.destination_points]

    route_data = await MapService.get_optimized_route(origin, destinations)

    return APIResponse(data=RouteOptimizeResponse(
        total_distance_km=route_data["total_distance_km"],
        estimated_time_minutes=route_data["estimated_time_minutes"],
        optimized_waypoints=request.destination_points,
        polyline_coordinates=route_data["polyline_coordinates"],
        fuel_saving_percentage=route_data["fuel_saving_percentage"]
    ))


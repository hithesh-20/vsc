from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_vendor
from app.models.vendor import Vendor
from app.schemas.common import APIResponse
from app.services.weather_service import WeatherService
from app.services.demand_service import DemandPredictionService

router = APIRouter()


@router.get("/current", response_model=APIResponse[Dict[str, Any]])
async def get_live_weather(
    lat: float = Query(12.9716, description="Latitude"),
    lon: float = Query(77.5946, description="Longitude")
):
    """Retrieve current temperature, rain likelihood, and Kannada street-vendor advisory."""
    data = await WeatherService.get_current_weather(lat, lon)
    return APIResponse(data=data)


@router.get("/demand-forecast", response_model=APIResponse[List[Dict[str, Any]]])
def get_ai_demand_forecast(
    days: int = Query(7, ge=1, le=14),
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """AI Machine Learning model forecasting product-level demand and morning stock recommendations."""
    forecasts = DemandPredictionService.generate_demand_forecast(db, vendor.id, days_ahead=days)
    return APIResponse(data=forecasts)

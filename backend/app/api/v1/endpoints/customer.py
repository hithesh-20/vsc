from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.models.customer import Customer
from app.models.vendor import Vendor
from app.models.product import Product
from app.schemas.mobility import NearbyVendorItem
from app.schemas.product import ProductResponse
from app.schemas.customer import LoyaltyStatusResponse
from app.schemas.common import APIResponse
from app.services.map_service import MapService

router = APIRouter()


@router.get("/nearby-vendors", response_model=APIResponse[List[NearbyVendorItem]])
def find_nearby_vendors(
    lat: float = Query(12.9716, description="Customer latitude"),
    lon: float = Query(77.5946, description="Customer longitude"),
    category: Optional[str] = None,
    max_radius_km: float = 15.0,
    db: Session = Depends(get_db)
):
    """Customer discovers local and mobile street vendors nearby on live map."""
    query = db.query(Vendor).filter(Vendor.is_active == True)
    if category:
        query = query.filter(Vendor.business_category == category)

    all_vendors = query.all()
    results = []

    for v in all_vendors:
        v_lat = v.current_lat or 12.9716
        v_lon = v.current_lon or 77.5946
        dist = MapService.calculate_haversine_distance(lat, lon, v_lat, v_lon)

        if dist <= max_radius_km:
            prod_count = db.query(Product).filter(
                Product.vendor_id == v.id,
                Product.is_available == True
            ).count()

            results.append(NearbyVendorItem(
                vendor_id=v.id,
                business_name=v.business_name,
                business_name_kn=v.business_name_kn,
                business_category=v.business_category,
                latitude=v_lat,
                longitude=v_lon,
                distance_km=dist,
                rating_avg=v.rating_avg,
                is_accepting_orders=v.is_accepting_orders,
                working_hours=v.working_hours,
                product_count=prod_count
            ))

    results.sort(key=lambda x: x.distance_km)
    return APIResponse(data=results)


@router.get("/vendors/{vendor_id}/catalog", response_model=APIResponse[List[ProductResponse]])
def get_vendor_public_catalog(vendor_id: str, db: Session = Depends(get_db)):
    """Customer views product catalog of a specific local vendor."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    products = db.query(Product).filter(
        Product.vendor_id == vendor.id,
        Product.is_available == True
    ).all()

    return APIResponse(data=[ProductResponse.model_validate(p) for p in products])


@router.get("/loyalty", response_model=APIResponse[LoyaltyStatusResponse])
def get_customer_loyalty(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve customer loyalty points, current tier (Bronze/Silver/Gold), and discount perks."""
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Only registered customers can access loyalty")

    points = customer.loyalty_points
    if points >= 500:
        tier = "GOLD"
        next_tier = None
        points_needed = 0
        perks = ["15% extra discount on local orders", "Priority preparation", "Free local doorstep delivery"]
    elif points >= 200:
        tier = "SILVER"
        next_tier = "GOLD"
        points_needed = 500 - points
        perks = ["10% extra discount on local orders", "Extended credit eligibility"]
    else:
        tier = "BRONZE"
        next_tier = "SILVER"
        points_needed = 200 - points
        perks = ["5% discount on checkout with 100 points", "Earn 1 pt per ₹20 spent"]

    return APIResponse(data=LoyaltyStatusResponse(
        points=points,
        tier=tier,
        next_tier=next_tier,
        points_to_next_tier=points_needed,
        discount_per_100_points=10.0,
        perks=perks
    ))

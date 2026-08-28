from typing import Optional, List
from pydantic import BaseModel
from app.models.customer import LoyaltyTier


class CustomerResponse(BaseModel):
    id: str
    user_id: str
    full_name: str
    delivery_address: Optional[str] = None
    default_lat: Optional[float] = None
    default_lon: Optional[float] = None
    loyalty_points: int
    tier: LoyaltyTier

    class Config:
        from_attributes = True


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    delivery_address: Optional[str] = None
    default_lat: Optional[float] = None
    default_lon: Optional[float] = None


class LoyaltyStatusResponse(BaseModel):
    points: int
    tier: LoyaltyTier
    next_tier: Optional[str] = None
    points_to_next_tier: int = 0
    discount_per_100_points: float = 10.0
    perks: List[str] = []

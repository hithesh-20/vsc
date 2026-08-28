from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.order import OrderStatus, PaymentStatus


class OrderItemCreate(BaseModel):
    product_id: str
    quantity: float


class OrderCreate(BaseModel):
    vendor_id: str
    items: List[OrderItemCreate]
    delivery_address: Optional[str] = None
    delivery_lat: Optional[float] = None
    delivery_lon: Optional[float] = None
    payment_mode: str = "UPI"
    special_instructions: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: str
    product_id: Optional[str] = None
    product_name_snapshot: str
    quantity: float
    unit: str
    unit_price: float
    subtotal: float

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    estimated_delivery_time: Optional[datetime] = None


class OrderResponse(BaseModel):
    id: str
    order_number: str
    customer_id: str
    vendor_id: str
    status: OrderStatus
    payment_status: PaymentStatus
    payment_mode: str
    total_amount: float
    delivery_address: Optional[str] = None
    delivery_lat: Optional[float] = None
    delivery_lon: Optional[float] = None
    special_instructions: Optional[str] = None
    estimated_delivery_time: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True

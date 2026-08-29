from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.sale import PaymentMode


class SaleItemCreate(BaseModel):
    product_id: str
    quantity: float
    unit_price: Optional[float] = None  # If None, vendor's selling_price is used


class SaleCreate(BaseModel):
    customer_name: Optional[str] = "Walk-in Customer"
    customer_phone: Optional[str] = None
    items: List[SaleItemCreate]
    payment_mode: PaymentMode = PaymentMode.CASH
    discount_amount: float = 0.0
    cash_paid: float = 0.0
    upi_paid: float = 0.0
    udhaar_amount: float = 0.0
    client_mutation_id: Optional[str] = None
    client_timestamp: Optional[datetime] = None


class SaleItemResponse(BaseModel):
    id: str
    product_id: Optional[str] = None
    product_name_snapshot: str
    quantity: float
    unit: str
    unit_cost_price: float
    unit_selling_price: float
    subtotal: float
    profit: float

    model_config = ConfigDict(from_attributes=True)


class SaleResponse(BaseModel):
    id: str
    vendor_id: str
    customer_name: str
    customer_phone: Optional[str] = None
    total_amount: float
    total_cost: float
    discount_amount: float
    net_amount: float
    net_profit: float
    payment_mode: PaymentMode
    cash_paid: float
    upi_paid: float
    udhaar_amount: float
    is_synced: bool
    client_mutation_id: Optional[str] = None
    created_at: datetime
    items: List[SaleItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ProfitTrendPoint(BaseModel):
    date: str
    revenue: float
    cost: float
    profit: float
    orders_count: int


class ProductProfitRank(BaseModel):
    product_name: str
    total_qty_sold: float
    unit: str
    total_revenue: float
    total_profit: float
    profit_margin_pct: float


class ProfitAnalyticsResponse(BaseModel):
    total_revenue: float
    total_cost: float
    total_net_profit: float
    overall_profit_margin_pct: float
    trends: List[ProfitTrendPoint]
    top_selling_products: List[ProductProfitRank]
    top_profitable_products: List[ProductProfitRank]

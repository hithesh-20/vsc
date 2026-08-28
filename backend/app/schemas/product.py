from typing import Optional, List
from pydantic import BaseModel
from app.models.product import ProductUnit


class CategoryResponse(BaseModel):
    id: str
    name: str
    name_kn: Optional[str] = None
    icon_name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    category_id: Optional[str] = None
    name_en: str
    name_kn: str
    description: Optional[str] = None
    unit: ProductUnit = ProductUnit.KG
    cost_price: float
    selling_price: float
    current_stock: float = 0.0
    low_stock_threshold: float = 5.0
    image_url: Optional[str] = None
    is_perishable: bool = True


class ProductUpdate(BaseModel):
    category_id: Optional[str] = None
    name_en: Optional[str] = None
    name_kn: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[ProductUnit] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    current_stock: Optional[float] = None
    low_stock_threshold: Optional[float] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    is_perishable: Optional[bool] = None


class ProductResponse(BaseModel):
    id: str
    vendor_id: str
    category_id: Optional[str] = None
    name_en: str
    name_kn: str
    description: Optional[str] = None
    unit: ProductUnit
    cost_price: float
    selling_price: float
    current_stock: float
    low_stock_threshold: float
    image_url: Optional[str] = None
    is_available: bool
    is_perishable: bool

    class Config:
        from_attributes = True

from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.inventory import InventoryTransactionType


class StockAdjustRequest(BaseModel):
    product_id: str
    change_qty: float  # Positive to add stock, negative to reduce
    transaction_type: InventoryTransactionType = InventoryTransactionType.PURCHASE_IN
    cost_price: Optional[float] = None
    notes: Optional[str] = None


class InventoryLedgerResponse(BaseModel):
    id: str
    product_id: str
    change_qty: float
    transaction_type: InventoryTransactionType
    balance_after: float
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_vendor
from app.models.vendor import Vendor
from app.models.product import Product
from app.models.inventory import InventoryLedger, InventoryTransactionType
from app.schemas.inventory import StockAdjustRequest, InventoryLedgerResponse
from app.schemas.common import APIResponse

router = APIRouter()


@router.post("/adjust", response_model=APIResponse[InventoryLedgerResponse])
def adjust_inventory_stock(
    adjust_in: StockAdjustRequest,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Restock or adjust inventory level and commit ledger log."""
    product = db.query(Product).filter(
        Product.id == adjust_in.product_id,
        Product.vendor_id == vendor.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if adjust_in.cost_price and adjust_in.cost_price > 0:
        product.cost_price = adjust_in.cost_price

    # Apply quantity change
    product.current_stock += adjust_in.change_qty
    if product.current_stock < 0:
        product.current_stock = 0.0

    ledger_entry = InventoryLedger(
        product_id=product.id,
        change_qty=adjust_in.change_qty,
        transaction_type=adjust_in.transaction_type,
        balance_after=product.current_stock,
        notes=adjust_in.notes or f"Manual stock adjustment ({adjust_in.transaction_type.value})"
    )
    db.add(ledger_entry)
    db.commit()
    db.refresh(ledger_entry)

    return APIResponse(
        message=f"Stock updated to {product.current_stock} {product.unit.value}",
        data=InventoryLedgerResponse.model_validate(ledger_entry)
    )


@router.get("/history/{product_id}", response_model=APIResponse[List[InventoryLedgerResponse]])
def get_product_inventory_history(
    product_id: str,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Retrieve audit ledger history for a product."""
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.vendor_id == vendor.id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    logs = db.query(InventoryLedger).filter(
        InventoryLedger.product_id == product.id
    ).order_by(InventoryLedger.created_at.desc()).all()

    return APIResponse(data=[InventoryLedgerResponse.model_validate(l) for l in logs])

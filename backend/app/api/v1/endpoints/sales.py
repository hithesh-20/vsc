from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_vendor
from app.models.vendor import Vendor
from app.models.product import Product
from app.models.sale import Sale, SaleItem, PaymentMode
from app.models.inventory import InventoryLedger, InventoryTransactionType
from app.models.udhaar import UdhaarLedger, UdhaarStatus
from app.schemas.sale import (
    SaleCreate, SaleResponse, ProfitAnalyticsResponse, ProfitTrendPoint, ProductProfitRank
)
from app.schemas.common import APIResponse

router = APIRouter()


@router.post("/record", response_model=APIResponse[SaleResponse], status_code=status.HTTP_201_CREATED)
def record_pos_sale(
    sale_in: SaleCreate,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Record a quick POS sale with automatic inventory deduction and profit calculation."""
    if not sale_in.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sale must contain at least one item")

    total_gross = 0.0
    total_cogs = 0.0

    # Validate items and calculate subtotal
    item_objects = []
    for itm in sale_in.items:
        product = db.query(Product).filter(
            Product.id == itm.product_id,
            Product.vendor_id == vendor.id
        ).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product ID {itm.product_id} not found"
            )

        unit_selling = itm.unit_price if itm.unit_price is not None else product.selling_price
        subtotal = round(itm.quantity * unit_selling, 2)
        cogs = round(itm.quantity * product.cost_price, 2)
        item_profit = round(subtotal - cogs, 2)

        total_gross += subtotal
        total_cogs += cogs

        # Deduct product stock
        product.current_stock = max(0.0, product.current_stock - itm.quantity)

        # Inventory ledger log
        db.add(InventoryLedger(
            product_id=product.id,
            change_qty=-itm.quantity,
            transaction_type=InventoryTransactionType.SALE_OUT,
            balance_after=product.current_stock,
            notes=f"POS Sale"
        ))

        item_objects.append(SaleItem(
            product_id=product.id,
            product_name_snapshot=product.name_en,
            quantity=itm.quantity,
            unit=product.unit.value,
            unit_cost_price=product.cost_price,
            unit_selling_price=unit_selling,
            subtotal=subtotal,
            profit=item_profit
        ))

    net_total = max(0.0, total_gross - sale_in.discount_amount)
    net_profit = net_total - total_cogs

    sale = Sale(
        vendor_id=vendor.id,
        customer_name=sale_in.customer_name or "Walk-in Customer",
        customer_phone=sale_in.customer_phone,
        total_amount=total_gross,
        total_cost=total_cogs,
        discount_amount=sale_in.discount_amount,
        net_amount=net_total,
        net_profit=net_profit,
        payment_mode=sale_in.payment_mode,
        cash_paid=sale_in.cash_paid,
        upi_paid=sale_in.upi_paid,
        udhaar_amount=sale_in.udhaar_amount,
        is_synced=True,
        client_mutation_id=sale_in.client_mutation_id,
        client_timestamp=sale_in.client_timestamp
    )
    db.add(sale)
    db.flush()

    for itm_obj in item_objects:
        itm_obj.sale_id = sale.id
        db.add(itm_obj)

    # If Udhaar/Credit was extended, automatically log into UdhaarLedger
    if sale_in.udhaar_amount > 0:
        udhaar_entry = UdhaarLedger(
            vendor_id=vendor.id,
            customer_name=sale_in.customer_name or "Walk-in Customer",
            customer_phone=sale_in.customer_phone,
            amount_due=sale_in.udhaar_amount,
            amount_paid=0.0,
            remaining_balance=sale_in.udhaar_amount,
            status=UdhaarStatus.UNPAID,
            notes=f"Generated from POS Sale #{sale.id[:8]}"
        )
        db.add(udhaar_entry)

    db.commit()
    db.refresh(sale)

    return APIResponse(
        message="Sale recorded successfully",
        data=SaleResponse.model_validate(sale)
    )


@router.get("/history", response_model=APIResponse[List[SaleResponse]])
def list_sales_history(
    limit: int = 50,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """List recent sales transactions."""
    sales = db.query(Sale).filter(
        Sale.vendor_id == vendor.id
    ).order_by(Sale.created_at.desc()).limit(limit).all()

    return APIResponse(data=[SaleResponse.model_validate(s) for s in sales])


@router.get("/analytics/profit", response_model=APIResponse[ProfitAnalyticsResponse])
def get_profit_analytics(
    days: int = 7,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Aggregate revenue, cost, profit margins, 7-day trend, and top profitable products."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    sales = db.query(Sale).filter(
        Sale.vendor_id == vendor.id,
        Sale.created_at >= start_date
    ).all()

    total_rev = sum(s.net_amount for s in sales)
    total_cost = sum(s.total_cost for s in sales)
    total_profit = sum(s.net_profit for s in sales)
    margin_pct = round((total_profit / total_rev * 100.0), 1) if total_rev > 0 else 0.0

    # 7-day trends
    trends_map = {}
    for d in range(days):
        day_str = (datetime.now(timezone.utc).date() - timedelta(days=d)).isoformat()
        trends_map[day_str] = {"rev": 0.0, "cost": 0.0, "profit": 0.0, "count": 0}

    for s in sales:
        d_str = s.created_at.date().isoformat()
        if d_str in trends_map:
            trends_map[d_str]["rev"] += s.net_amount
            trends_map[d_str]["cost"] += s.total_cost
            trends_map[d_str]["profit"] += s.net_profit
            trends_map[d_str]["count"] += 1

    trend_points = [
        ProfitTrendPoint(
            date=k,
            revenue=round(v["rev"], 2),
            cost=round(v["cost"], 2),
            profit=round(v["profit"], 2),
            orders_count=v["count"]
        ) for k, v in sorted(trends_map.items())
    ]

    # Product profit breakdown
    sale_items = db.query(SaleItem).join(Sale, Sale.id == SaleItem.sale_id).filter(
        Sale.vendor_id == vendor.id,
        Sale.created_at >= start_date
    ).all()

    prod_map = {}
    for item in sale_items:
        pname = item.product_name_snapshot
        if pname not in prod_map:
            prod_map[pname] = {"qty": 0.0, "unit": item.unit, "rev": 0.0, "profit": 0.0}
        prod_map[pname]["qty"] += item.quantity
        prod_map[pname]["rev"] += item.subtotal
        prod_map[pname]["profit"] += item.profit

    product_ranks = [
        ProductProfitRank(
            product_name=pname,
            total_qty_sold=round(v["qty"], 1),
            unit=v["unit"],
            total_revenue=round(v["rev"], 2),
            total_profit=round(v["profit"], 2),
            profit_margin_pct=round((v["profit"] / v["rev"] * 100.0), 1) if v["rev"] > 0 else 0.0
        ) for pname, v in prod_map.items()
    ]

    top_selling = sorted(product_ranks, key=lambda x: x.total_qty_sold, reverse=True)[:5]
    top_profitable = sorted(product_ranks, key=lambda x: x.total_profit, reverse=True)[:5]

    return APIResponse(data=ProfitAnalyticsResponse(
        total_revenue=round(total_rev, 2),
        total_cost=round(total_cost, 2),
        total_net_profit=round(total_profit, 2),
        overall_profit_margin_pct=margin_pct,
        trends=trend_points,
        top_selling_products=top_selling,
        top_profitable_products=top_profitable
    ))

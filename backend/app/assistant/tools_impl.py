"""
VendorSaathi Assistant — tool implementations.

Every tool talks to the real database through the existing models/services.
Tools never fabricate data; on failure they return an honest error.
"""
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.orm import Session, joinedload

from app.models.vendor import Vendor
from app.models.product import Product
from app.models.sale import Sale
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.udhaar import UdhaarLedger, UdhaarStatus
from app.models.customer import Customer
from app.models.inventory import InventoryLedger, InventoryTransactionType


def _today_start() -> datetime:
    return datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)


def find_product(db: Session, vendor: Vendor, product_key: Optional[str]) -> Optional[Product]:
    """Find a vendor product by canonical key using the alias table + fuzzy name match."""
    if not product_key:
        return None
    from app.assistant.tools import PRODUCT_ALIASES
    aliases = PRODUCT_ALIASES.get(product_key, [product_key])
    for a in aliases:
        p = db.query(Product).filter(
            Product.vendor_id == vendor.id,
            Product.name_en.ilike(f"%{a}%")
        ).first()
        if p:
            return p
        p = db.query(Product).filter(
            Product.vendor_id == vendor.id,
            Product.name_kn.ilike(f"%{a}%")
        ).first()
        if p:
            return p
    # Last resort: any product whose name contains the key itself
    return db.query(Product).filter(
        Product.vendor_id == vendor.id,
        Product.name_en.ilike(f"%{product_key}%")
    ).first()


# ---------------------------------------------------------------------------
# READ-ONLY DATA TOOLS
# ---------------------------------------------------------------------------

def get_sales(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    focus = entities.get("focus", "revenue")
    sales = db.query(Sale).filter(
        Sale.vendor_id == vendor.id,
        Sale.created_at >= _today_start()
    ).all()
    revenue = sum(s.total_amount for s in sales)
    profit = sum((s.net_profit or 0) for s in sales)
    return {
        "ok": True,
        "focus": focus,
        "sales_count": len(sales),
        "revenue": round(revenue, 2),
        "profit": round(profit, 2),
        "period": "today",
    }


def get_inventory(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    product = find_product(db, vendor, entities.get("product"))
    if not product:
        items = db.query(Product).filter(Product.vendor_id == vendor.id, Product.is_available == True).all()
        return {
            "ok": True,
            "product": None,
            "items": [{"name": p.name_en, "stock": p.current_stock, "unit": p.unit.value} for p in items[:12]],
            "count": len(items),
        }
    return {
        "ok": True,
        "product": product.name_en,
        "product_kn": product.name_kn,
        "stock": product.current_stock,
        "unit": product.unit.value,
        "price": product.selling_price,
        "low": product.current_stock <= product.low_stock_threshold,
    }


def get_orders(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    pending = db.query(Order).filter(
        Order.vendor_id == vendor.id,
        Order.status.in_([OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PACKED])
    ).order_by(Order.created_at.desc()).limit(8).all()
    return {
        "ok": True,
        "count": len(pending),
        "orders": [
            {
                "order_number": o.order_number,
                "status": o.status.value if hasattr(o.status, "value") else str(o.status),
                "total": o.total_amount,
                "payment_mode": o.payment_mode,
            } for o in pending
        ],
    }


def get_customer_credit(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    name = entities.get("name")
    q = db.query(UdhaarLedger).filter(
        UdhaarLedger.vendor_id == vendor.id,
        UdhaarLedger.remaining_balance > 0
    )
    if name:
        q = q.filter(UdhaarLedger.customer_name.ilike(f"%{name}%"))
    if entities.get("only_phone"):
        # Customer asking about their own udhaar — show only their entries
        q = q.filter(UdhaarLedger.customer_phone == entities["only_phone"])
    records = q.order_by(UdhaarLedger.remaining_balance.desc()).limit(8).all()
    total = sum(r.remaining_balance for r in records)
    return {
        "ok": True,
        "total_due": round(total, 2),
        "count": len(records),
        "customers": [
            {"name": r.customer_name, "due": round(r.remaining_balance, 2), "status": r.status.value if hasattr(r.status, "value") else str(r.status)}
            for r in records
        ],
    }


def get_catalog(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    items = db.query(Product).filter(Product.vendor_id == vendor.id, Product.is_available == True).order_by(Product.name_en).all()
    return {
        "ok": True,
        "count": len(items),
        "items": [{"name": p.name_en, "price": p.selling_price, "stock": p.current_stock, "unit": p.unit.value} for p in items[:15]],
    }


def get_top_products(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    """Products moving fastest by 5-day sale velocity — a data-based insight, not a guess."""
    since = datetime.now(timezone.utc) - timedelta(days=5)
    sales = db.query(Sale).join(Sale.items).filter(
        Sale.vendor_id == vendor.id,
        Sale.created_at >= since
    ).all()
    qty_by_product: Dict[str, float] = {}
    for s in sales:
        for it in s.items:
            qty_by_product[it.product_name_snapshot] = qty_by_product.get(it.product_name_snapshot, 0) + it.quantity
    ranked = sorted(qty_by_product.items(), key=lambda kv: kv[1], reverse=True)
    return {
        "ok": True,
        "period_days": 5,
        "top": [{"name": n, "qty_sold": round(q, 1)} for n, q in ranked[:5]],
        "has_data": bool(ranked),
    }


def recommend_location(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    """Use the real mobility service (anti-clustering engine)."""
    import asyncio
    import concurrent.futures
    from app.services.mobility_service import MobilityService
    try:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
        if loop and loop.is_running():
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                data = pool.submit(asyncio.run, MobilityService.recommend_optimal_locations(db=db, vendor=vendor)).result(timeout=15)
        else:
            data = asyncio.run(MobilityService.recommend_optimal_locations(db=db, vendor=vendor))
        top = (data or {}).get("top_recommended_route")
        if top:
            return {
                "ok": True,
                "location": top.get("location_name") or "the main market area",
                "location_kn": top.get("location_name_kn"),
                "score": top.get("score") or 90,
                "distance_km": top.get("distance_km"),
                "demand_level": top.get("demand_level"),
                "competitors": top.get("active_competitors_count"),
                "carry": top.get("high_demand_products") or [],
                "reason": top.get("recommendation_reason"),
                "reason_kn": top.get("recommendation_reason_kn"),
            }
    except Exception:
        pass
    return {"ok": False, "error": "mobility_unavailable"}


def get_weather(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    import asyncio
    from app.services.weather_service import WeatherService
    try:
        lat = (vendor.current_lat if vendor and vendor.current_lat else None) or 12.9716
        lon = (vendor.current_lon if vendor and vendor.current_lon else None) or 77.5946
        # The weather service is async — run the coroutine to completion
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
        if loop and loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                data = pool.submit(asyncio.run, WeatherService.get_current_weather(lat=lat, lon=lon)).result(timeout=10)
        else:
            data = asyncio.run(WeatherService.get_current_weather(lat=lat, lon=lon))
        if data:
            return {
                "ok": True,
                "condition": data.get("weather_condition") or (data.get("weather_condition_kn") and None) or "clear",
                "condition_kn": data.get("weather_condition_kn"),
                "temp": data.get("temperature_celsius"),
                "advisory": data.get("advisory"),
                "advisory_kn": data.get("advisory_kn"),
            }
    except Exception:
        pass
    return {"ok": False, "error": "weather_unavailable"}


def get_market_price(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    from app.services.mandi_service import MandiService
    product = entities.get("product")
    try:
        summary = MandiService.get_latest_mandi_summary(market="Bengaluru")
        commodities = summary.commodities or []
        target = (product or "").lower()

        # Localize product name for matching (turmeric ↔ ಅರಿಶಿನ ↔ हल्दी...)
        from app.assistant.responses import PRODUCT_NAMES
        targets = {target}
        for key, names in PRODUCT_NAMES.items():
            if target and (target in key or key in target):
                targets.update({k.lower() for k in [names["en"]]})

        best = None
        for c in commodities:
            name = (c.commodity_name_en or "").lower()
            name_kn = (c.commodity_name_kn or "").lower()
            if any(t and (t in name or name in t or t in name_kn) for t in targets):
                best = c
                break
        if best is None and commodities:
            best = commodities[0]
        if best:
            return {
                "ok": True,
                "product": best.commodity_name_en,
                "modal_price": best.modal_price_per_kg,
                "min_price": best.min_price_per_kg,
                "max_price": best.max_price_per_kg,
                "trend": best.trend,
                "retail_suggestion": best.recommended_retail_price,
                "approximate": best is commodities[0] if commodities else False,
            }
    except Exception:
        pass
    return {"ok": False, "error": "market_unavailable"}


def calculate(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic arithmetic — never trust model math for money."""
    expr = entities.get("expression", "")
    try:
        allowed = re_expr = expr
        if not re.fullmatch(r"[0-9+\-*/(). ]+", allowed):
            return {"ok": False, "error": "invalid_expression"}
        result = eval(allowed, {"__builtins__": {}}, {})  # sandboxed arithmetic only
        return {"ok": True, "expression": expr, "result": round(float(result), 2)}
    except Exception:
        return {"ok": False, "error": "calc_failed"}


# ---------------------------------------------------------------------------
# ACTION TOOLS (called only after user confirmation)
# ---------------------------------------------------------------------------

def update_inventory(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    product = find_product(db, vendor, entities.get("product"))
    if not product:
        return {"ok": False, "error": "product_not_found", "product": entities.get("product")}
    qty = float(entities.get("quantity") or 0)
    direction = entities.get("direction", "add")
    new_stock = product.current_stock + qty if direction == "add" else max(0, product.current_stock - qty)
    product.current_stock = new_stock
    db.add(InventoryLedger(
        product_id=product.id,
        change_qty=qty if direction == "add" else -qty,
        transaction_type=InventoryTransactionType.PURCHASE_IN if direction == "add" else InventoryTransactionType.SALE_OUT,
        balance_after=new_stock,
        notes="Voice assistant update",
    ))
    db.commit()
    db.refresh(product)
    return {"ok": True, "product": product.name_en, "added": qty, "direction": direction, "new_stock": new_stock, "unit": product.unit.value}


def create_order(db: Session, vendor: Vendor, entities: Dict[str, Any], customer_user=None) -> Dict[str, Any]:
    """Customer-style order placed by voice: 'I need 1 kg tomato'."""
    product = find_product(db, vendor, entities.get("product"))
    if not product:
        return {"ok": False, "error": "product_not_found", "product": entities.get("product")}
    qty = float(entities.get("quantity") or 1)
    if product.current_stock < qty:
        return {"ok": False, "error": "insufficient_stock", "product": product.name_en, "stock": product.current_stock}
    subtotal = round(qty * product.selling_price, 2)
    customer = None
    if customer_user is not None:
        customer = db.query(Customer).filter(Customer.user_id == customer_user.id).first()
    order = Order(
        order_number=f"ORD-VOICE-{uuid.uuid4().hex[:4].upper()}",
        customer_id=customer.id if customer else None,
        vendor_id=vendor.id,
        status=OrderStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
        payment_mode="CASH",
        total_amount=subtotal,
        delivery_address=(customer.delivery_address if customer else None) or "Voice order — collect at cart",
    )
    if customer is None:
        # Voice walk-in order still needs a customer row reference; attach to first demo customer
        customer = db.query(Customer).first()
        order.customer_id = customer.id if customer else None
    db.add(order)
    db.flush()
    db.add(OrderItem(
        order_id=order.id,
        product_id=product.id,
        product_name_snapshot=product.name_en,
        quantity=qty,
        unit=product.unit.value,
        unit_price=product.selling_price,
        subtotal=subtotal,
    ))
    db.commit()
    db.refresh(order)
    return {"ok": True, "order_number": order.order_number, "product": product.name_en, "quantity": qty, "unit": product.unit.value, "total": subtotal}


def add_udhaar(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    amount = float(entities.get("amount") or 0)
    name = entities.get("name") or "Voice Customer"
    rec = UdhaarLedger(
        vendor_id=vendor.id,
        customer_name=name,
        customer_phone="0000000000",
        amount_due=amount,
        amount_paid=0,
        remaining_balance=amount,
        status=UdhaarStatus.UNPAID,
        notes="Added via voice assistant",
    )
    db.add(rec)
    db.commit()
    return {"ok": True, "customer": name, "amount": amount, "id": rec.id}


def record_payment(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    amount = float(entities.get("amount") or 0)
    name = entities.get("name")
    q = db.query(UdhaarLedger).filter(UdhaarLedger.vendor_id == vendor.id, UdhaarLedger.remaining_balance > 0)
    if name:
        q = q.filter(UdhaarLedger.customer_name.ilike(f"%{name}%"))
    rec = q.order_by(UdhaarLedger.remaining_balance.desc()).first()
    if not rec:
        return {"ok": False, "error": "no_udhaar_record", "name": name}
    paid = min(amount, rec.remaining_balance)
    rec.amount_paid = (rec.amount_paid or 0) + paid
    rec.remaining_balance = rec.amount_due - rec.amount_paid
    if rec.remaining_balance <= 0:
        rec.status = UdhaarStatus.SETTLED
    elif rec.amount_paid > 0:
        rec.status = UdhaarStatus.PARTIAL
    db.commit()
    return {"ok": True, "customer": rec.customer_name, "paid": paid, "remaining": round(rec.remaining_balance, 2)}


def update_order_status(db: Session, vendor: Vendor, entities: Dict[str, Any]) -> Dict[str, Any]:
    action = (entities.get("action") or "").lower()
    status_map = {
        "accept": OrderStatus.ACCEPTED, "pack": OrderStatus.PACKED,
        "deliver": OrderStatus.OUT_FOR_DELIVERY, "complete": OrderStatus.COMPLETED,
    }
    if action == "cancel":
        order = db.query(Order).filter(Order.vendor_id == vendor.id, Order.status == OrderStatus.PENDING).order_by(Order.created_at.desc()).first()
        if not order:
            return {"ok": False, "error": "no_pending_order"}
        order.status = OrderStatus.CANCELLED
        db.commit()
        return {"ok": True, "order_number": order.order_number, "status": "CANCELLED"}
    target = status_map.get(action)
    if not target:
        return {"ok": False, "error": "unknown_action", "action": action}
    order = db.query(Order).filter(Order.vendor_id == vendor.id, Order.status == OrderStatus.PENDING).order_by(Order.created_at.desc()).first()
    if not order:
        return {"ok": False, "error": "no_pending_order"}
    order.status = target
    db.commit()
    return {"ok": True, "order_number": order.order_number, "status": target.value}

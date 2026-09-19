from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User, LanguagePreference
from app.models.product import Product
from app.models.customer import Customer
from app.models.vendor import Vendor
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.udhaar import UdhaarLedger, UdhaarStatus
from app.schemas.order import OrderResponse
from app.schemas.udhaar import UdhaarResponse
from app.schemas.common import APIResponse
from app.services.payment_service import PaymentService
import uuid


router = APIRouter()


def _get_customer(user: User, db: Session) -> Customer:
    customer = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only customer accounts can access this")
    return customer


# ---------------------------------------------------------------------------
# My Orders (B2C self-service)
# ---------------------------------------------------------------------------

@router.get("/orders/my", response_model=APIResponse[List[OrderResponse]])
def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Orders placed by the logged-in customer, newest first."""
    customer = _get_customer(current_user, db)
    orders = (
        db.query(Order)
        .filter(Order.customer_id == customer.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return APIResponse(data=[OrderResponse.model_validate(o) for o in orders])


@router.get("/orders/my/{order_id}", response_model=APIResponse[OrderResponse])
def get_my_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = _get_customer(current_user, db)
    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == customer.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return APIResponse(data=OrderResponse.model_validate(order))


@router.post("/orders/my/{order_id}/pay", response_model=APIResponse[dict])
def pay_my_order(
    order_id: str,
    mode: str = Query("UPI", pattern="^(UPI|CASH)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Settle an order's payment: UPI generates an intent link + marks PAID (demo), CASH pays on delivery."""
    customer = _get_customer(current_user, db)
    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == customer.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    vendor = db.query(Vendor).filter(Vendor.id == order.vendor_id).first()

    if mode == "CASH":
        order.payment_mode = "CASH"
        order.payment_status = PaymentStatus.PENDING
        db.commit()
        return APIResponse(message="Cash on delivery selected", data={
            "order_id": order.id, "payment_mode": "CASH", "payment_status": "PENDING",
        })

    order.payment_mode = "UPI"
    order.payment_status = PaymentStatus.COMPLETED
    link = PaymentService.generate_upi_payment_link(
        vpa_id=(vendor.upi_id if vendor else None) or "vendorsaathi@upi",
        payee_name=(vendor.business_name if vendor else "VendorSaathi Vendor"),
        amount=order.total_amount,
        transaction_note=f"Order {order.order_number}",
        transaction_ref=order.order_number.replace("-", ""),
    )
    settlement = PaymentService.process_mock_sandbox_settlement(order.total_amount, "UPI")
    db.commit()
    return APIResponse(message="UPI payment initiated", data={
        "order_id": order.id,
        "payment_mode": "UPI",
        "payment_status": "COMPLETED",
        "upi_intent_uri": link["upi_intent_uri"],
        "qr_payload": link["qr_payload"],
        "transaction_id": settlement["transaction_id"],
        "amount": order.total_amount,
        "vpa": link["vpa"],
        "payee_name": link["payee_name"],
    })


# ---------------------------------------------------------------------------
# Order placement with Udhaar (buy now, pay later) support
# ---------------------------------------------------------------------------

@router.post("/orders/udhaar", response_model=APIResponse[OrderResponse], status_code=status.HTTP_201_CREATED)
def place_udhaar_order(
    order_in: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Place an order and record the bill in the vendor's Udhaar ledger (BNPL for local shopping)."""
    from app.schemas.order import OrderCreate

    customer = _get_customer(current_user, db)
    try:
        create = OrderCreate(**order_in)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order payload")

    vendor = db.query(Vendor).filter(Vendor.id == create.vendor_id, Vendor.is_active == True).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    total_amount = 0.0
    items_to_add = []
    for itm in create.items:
        product = db.query(Product).filter(Product.id == itm.product_id, Product.vendor_id == vendor.id).first()
        if not product or not product.is_available:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product {itm.product_id} is unavailable")
        subtotal = round(itm.quantity * product.selling_price, 2)
        total_amount += subtotal
        items_to_add.append(OrderItem(
            product_id=product.id,
            product_name_snapshot=product.name_en,
            quantity=itm.quantity,
            unit=product.unit.value,
            unit_price=product.selling_price,
            subtotal=subtotal,
        ))

    order_num = f"ORD-{datetime.now().strftime('%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    order = Order(
        order_number=order_num,
        customer_id=customer.id,
        vendor_id=vendor.id,
        status=OrderStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
        payment_mode="UDHAAR",
        total_amount=total_amount,
        delivery_address=create.delivery_address or customer.delivery_address,
        delivery_lat=create.delivery_lat,
        delivery_lon=create.delivery_lon,
        special_instructions=create.special_instructions,
    )
    db.add(order)
    db.flush()
    for item in items_to_add:
        item.order_id = order.id
        db.add(item)

    # Credit ledger entry on the vendor's books
    ledger = UdhaarLedger(
        vendor_id=vendor.id,
        customer_name=customer.full_name,
        customer_phone=current_user.phone,
        amount_due=total_amount,
        amount_paid=0.0,
        remaining_balance=total_amount,
        status=UdhaarStatus.UNPAID,
        notes=f"App order {order_num} (Udhaar/BNPL)",
    )
    db.add(ledger)
    db.commit()
    db.refresh(order)
    return APIResponse(message="Order placed on Udhaar", data=OrderResponse.model_validate(order))


# ---------------------------------------------------------------------------
# My Udhaar accounts (what I owe across vendors) + self-service repayment
# ---------------------------------------------------------------------------

@router.get("/udhaar/my", response_model=APIResponse[List[UdhaarResponse]])
def get_my_udhaar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """All Udhaar (credit) ledger entries linked to my phone number across vendors."""
    customer = _get_customer(current_user, db)
    records = (
        db.query(UdhaarLedger)
        .filter(UdhaarLedger.customer_phone == current_user.phone)
        .order_by(UdhaarLedger.created_at.desc())
        .all()
    )
    _ = customer  # customer auth is still required
    return APIResponse(data=[UdhaarResponse.model_validate(r) for r in records])


@router.post("/udhaar/my/{record_id}/repay", response_model=APIResponse[dict])
def repay_my_udhaar(
    record_id: str,
    mode: str = Query("UPI", pattern="^(UPI|CASH)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer repays (fully) one of their Udhaar accounts; UPI returns a payment link."""
    record = db.query(UdhaarLedger).filter(UdhaarLedger.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Udhaar account not found")
    if record.customer_phone != current_user.phone:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This Udhaar account belongs to another number")

    vendor = db.query(Vendor).filter(Vendor.id == record.vendor_id).first()
    pay_amount = record.remaining_balance

    if mode == "CASH":
        return APIResponse(message="Show this screen to the vendor to settle in cash", data={
            "record_id": record.id, "amount": pay_amount, "mode": "CASH",
            "vendor_name": vendor.business_name if vendor else "Vendor",
        })

    link = PaymentService.generate_upi_payment_link(
        vpa_id=(vendor.upi_id if vendor else None) or "vendorsaathi@upi",
        payee_name=(vendor.business_name if vendor else "VendorSaathi Vendor"),
        amount=pay_amount,
        transaction_note=f"Udhaar repayment {record.id[:8]}",
        transaction_ref=record.id.replace("-", "")[:20],
    )
    record.amount_paid += pay_amount
    record.remaining_balance = 0.0
    record.status = UdhaarStatus.SETTLED
    db.commit()
    settlement = PaymentService.process_mock_sandbox_settlement(pay_amount, "UPI")
    return APIResponse(message=f"₹{pay_amount:.0f} Udhaar cleared!", data={
        "record_id": record.id,
        "amount": pay_amount,
        "mode": "UPI",
        "payment_status": "COMPLETED",
        "upi_intent_uri": link["upi_intent_uri"],
        "qr_payload": link["qr_payload"],
        "transaction_id": settlement["transaction_id"],
        "vpa": link["vpa"],
        "vendor_name": vendor.business_name if vendor else "Vendor",
    })


# ---------------------------------------------------------------------------
# Profile & language preference
# ---------------------------------------------------------------------------

@router.get("/profile", response_model=APIResponse[dict])
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    customer = _get_customer(current_user, db)
    return APIResponse(data={
        "phone": current_user.phone,
        "name": customer.full_name,
        "address": customer.delivery_address,
        "loyalty_points": customer.loyalty_points,
        "language_pref": current_user.language_pref.value,
    })


@router.put("/profile/language", response_model=APIResponse[dict])
def update_language(
    lang: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed = {m.value for m in LanguagePreference}
    if lang not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported language: {lang}")
    current_user.language_pref = LanguagePreference(lang)
    db.commit()
    return APIResponse(message="Language preference updated", data={"language_pref": lang})

import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user, get_current_vendor
from app.models.user import User, UserRole
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.inventory import InventoryLedger, InventoryTransactionType
from app.models.loyalty import LoyaltyLedger, LoyaltyActionType
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate
from app.schemas.common import APIResponse

router = APIRouter()


# Active WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, key: str, websocket: WebSocket):
        await websocket.accept()
        if key not in self.active_connections:
            self.active_connections[key] = []
        self.active_connections[key].append(websocket)

    def disconnect(self, key: str, websocket: WebSocket):
        if key in self.active_connections:
            self.active_connections[key].remove(websocket)

    async def broadcast_to_vendor(self, vendor_id: str, message: dict):
        if vendor_id in self.active_connections:
            for conn in self.active_connections[vendor_id]:
                await conn.send_json(message)


ws_manager = ConnectionManager()


@router.post("", response_model=APIResponse[OrderResponse], status_code=status.HTTP_201_CREATED)
async def place_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Customer places an order from a local vendor."""
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only registered customers can place orders")

    vendor = db.query(Vendor).filter(Vendor.id == order_in.vendor_id, Vendor.is_active == True).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found or not accepting orders")

    total_amount = 0.0
    items_to_add = []

    for itm in order_in.items:
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
            subtotal=subtotal
        ))

    order_num = f"ORD-{datetime.now().strftime('%m%d')}-{uuid.uuid4().hex[:4].upper()}"

    order = Order(
        order_number=order_num,
        customer_id=customer.id,
        vendor_id=vendor.id,
        status=OrderStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
        payment_mode=order_in.payment_mode,
        total_amount=total_amount,
        delivery_address=order_in.delivery_address or customer.delivery_address,
        delivery_lat=order_in.delivery_lat,
        delivery_lon=order_in.delivery_lon,
        special_instructions=order_in.special_instructions
    )
    db.add(order)
    db.flush()

    for item in items_to_add:
        item.order_id = order.id
        db.add(item)

    # Award Loyalty points: 1 point per ₹20 spent
    earned_points = max(1, int(total_amount / 20))
    customer.loyalty_points += earned_points
    db.add(LoyaltyLedger(
        customer_id=customer.id,
        order_id=order.id,
        points_change=earned_points,
        balance_after=customer.loyalty_points,
        action_type=LoyaltyActionType.EARNED,
        description=f"Points earned on Order {order_num}"
    ))

    db.commit()
    db.refresh(order)

    # Real-time WebSocket Alert to Vendor
    await ws_manager.broadcast_to_vendor(vendor.id, {
        "event": "NEW_ORDER",
        "order_id": order.id,
        "order_number": order.order_number,
        "total_amount": order.total_amount,
        "customer_name": customer.full_name
    })

    return APIResponse(message="Order placed successfully", data=OrderResponse.model_validate(order))


@router.get("/vendor", response_model=APIResponse[List[OrderResponse]])
def get_vendor_orders(
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Retrieve active and historical customer orders for the vendor."""
    orders = db.query(Order).filter(Order.vendor_id == vendor.id).order_by(Order.created_at.desc()).all()
    return APIResponse(data=[OrderResponse.model_validate(o) for o in orders])


@router.put("/{order_id}/status", response_model=APIResponse[OrderResponse])
def update_order_status(
    order_id: str,
    status_in: OrderStatusUpdate,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Transition order status: PENDING -> ACCEPTED -> PACKED -> OUT_FOR_DELIVERY -> COMPLETED."""
    order = db.query(Order).filter(Order.id == order_id, Order.vendor_id == vendor.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order.status = status_in.status
    if status_in.estimated_delivery_time:
        order.estimated_delivery_time = status_in.estimated_delivery_time

    if status_in.status == OrderStatus.COMPLETED:
        order.completed_at = datetime.now(timezone.utc)
        order.payment_status = PaymentStatus.COMPLETED

        # Deduct product inventory on completion
        for item in order.items:
            if item.product_id:
                p = db.query(Product).filter(Product.id == item.product_id).first()
                if p:
                    p.current_stock = max(0.0, p.current_stock - item.quantity)
                    db.add(InventoryLedger(
                        product_id=p.id,
                        change_qty=-item.quantity,
                        transaction_type=InventoryTransactionType.SALE_OUT,
                        balance_after=p.current_stock,
                        notes=f"Order {order.order_number} Completed"
                    ))

    db.commit()
    db.refresh(order)
    return APIResponse(message=f"Order status changed to {order.status.value}", data=OrderResponse.model_validate(order))


@router.websocket("/ws/{vendor_id}")
async def vendor_websocket_endpoint(websocket: WebSocket, vendor_id: str):
    """Realtime WebSocket endpoint for instant order alerts and delivery updates."""
    await ws_manager.connect(vendor_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(vendor_id, websocket)

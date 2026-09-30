from datetime import datetime, timezone
from typing import List, Dict, Any
import logging
from sqlalchemy.orm import Session

logger = logging.getLogger("vendorsathi.sync")
from app.models.sync_queue import SyncQueue, SyncEntityType, SyncStatus
from app.models.product import Product
from app.models.sale import Sale, SaleItem, PaymentMode
from app.models.inventory import InventoryLedger, InventoryTransactionType
from app.models.udhaar import UdhaarLedger, UdhaarStatus
from app.schemas.sync import SyncMutationItem, SyncProcessedItem, SyncBatchResponse


class SyncService:
    """Processes offline outbox mutations idempotently when network connectivity resumes."""

    @classmethod
    def process_offline_batch(
        cls,
        db: Session,
        vendor_id: str,
        mutations: List[SyncMutationItem],
        source: str = "app",
    ) -> SyncBatchResponse:
        results = []
        success_count = 0
        conflict_count = 0
        # Long ids (>36 chars) are md5-hashed for storage below; remember the
        # mapping so the sync push can deep-link with the ids the DEVICE knows.
        id_unhash: Dict[str, str] = {}

        for item in mutations:
            # Lenient ingestion: older outbox items may omit the idempotency key
            # and client timestamp — derive stable values so replays stay safe.
            if not item.client_mutation_id:
                p = item.payload
                if item.entity_type == SyncEntityType.SALE:
                    items_sig = "-".join(
                        f"{i.get('product_id')}x{i.get('quantity')}" for i in p.get("items", [])
                    )
                    item.client_mutation_id = (
                        f"sale-{p.get('customer_name', 'walkin')}-{p.get('total_amount')}-"
                        f"{items_sig}-"
                        f"{item.client_timestamp.isoformat() if item.client_timestamp else ''}"
                    )
                else:
                    sig = ""
                    if item.entity_type == SyncEntityType.ORDER_CREATE:
                        # include items so two different offline orders never collapse
                        sig = "-".join(
                            f"{i.get('product_name')}x{i.get('quantity')}" for i in p.get("items", [])
                        )
                    item.client_mutation_id = (
                        f"{item.entity_type.value.lower()}-{p.get('order_id', p.get('product_id', 'x'))}-"
                        f"{p.get('status', p.get('change_qty', ''))}-{sig}"
                    )
            if item.client_mutation_id and len(item.client_mutation_id) > 36:
                # Column is VARCHAR(36); stable hash fallback for long keys
                import hashlib
                id_unhash[hashlib.md5(item.client_mutation_id.encode()).hexdigest()] = item.client_mutation_id
                item.client_mutation_id = hashlib.md5(item.client_mutation_id.encode()).hexdigest()  # noqa: S324

            # 1. Idempotency Check: if client_mutation_id is already in sync_queue, return previous status
            existing_sync = db.query(SyncQueue).filter(
                SyncQueue.client_mutation_id == item.client_mutation_id
            ).first()

            if existing_sync:
                results.append(SyncProcessedItem(
                    client_mutation_id=item.client_mutation_id,
                    status=existing_sync.status,
                    server_entity_id=None,
                    error_message="Already processed (Idempotent replay)"
                ))
                if existing_sync.status == SyncStatus.PROCESSED:
                    success_count += 1
                else:
                    conflict_count += 1
                continue

            # Record in sync queue
            sync_entry = SyncQueue(
                vendor_id=vendor_id,
                client_mutation_id=item.client_mutation_id,
                entity_type=item.entity_type,
                payload=item.payload,
                status=SyncStatus.PENDING
            )
            db.add(sync_entry)

            try:
                # 2. Process SALE Mutation
                if item.entity_type == SyncEntityType.SALE:
                    p = item.payload
                    items_data = p.get("items", [])
                    
                    subtotal = float(p.get("total_amount", 0.0))
                    discount = float(p.get("discount_amount", 0.0))
                    net_amount = subtotal - discount
                    total_cogs = 0.0

                    sale = Sale(
                        vendor_id=vendor_id,
                        customer_name=p.get("customer_name", "Walk-in Customer"),
                        customer_phone=p.get("customer_phone"),
                        total_amount=subtotal,
                        discount_amount=discount,
                        net_amount=net_amount,
                        payment_mode=PaymentMode(p.get("payment_mode", "CASH")),
                        cash_paid=float(p.get("cash_paid", 0.0)),
                        upi_paid=float(p.get("upi_paid", 0.0)),
                        udhaar_amount=float(p.get("udhaar_amount", 0.0)),
                        is_synced=True,
                        client_mutation_id=item.client_mutation_id,
                        client_timestamp=item.client_timestamp
                    )
                    db.add(sale)
                    db.flush()

                    for itm in items_data:
                        product = db.query(Product).filter(Product.id == itm.get("product_id")).first()
                        qty = float(itm.get("quantity", 1.0))
                        unit_cost = product.cost_price if product else 0.0
                        unit_price = float(itm.get("unit_price") or (product.selling_price if product else 0.0))
                        item_subtotal = qty * unit_price
                        item_cogs = qty * unit_cost
                        item_profit = item_subtotal - item_cogs
                        total_cogs += item_cogs

                        if product:
                            product.current_stock = max(0.0, product.current_stock - qty)
                            # Ledger log
                            db.add(InventoryLedger(
                                product_id=product.id,
                                change_qty=-qty,
                                transaction_type=InventoryTransactionType.SALE_OUT,
                                balance_after=product.current_stock,
                                notes=f"Offline Sale Sync #{sale.id[:8]}"
                            ))

                        db.add(SaleItem(
                            sale_id=sale.id,
                            product_id=product.id if product else None,
                            product_name_snapshot=itm.get("product_name") or (product.name_en if product else "Item"),
                            quantity=qty,
                            unit=itm.get("unit") or (product.unit.value if product else "kg"),
                            unit_cost_price=unit_cost,
                            unit_selling_price=unit_price,
                            subtotal=item_subtotal,
                            profit=item_profit
                        ))

                    sale.total_cost = total_cogs
                    sale.net_profit = net_amount - total_cogs

                    # Match the ONLINE sales endpoint: a UDHAAR-mode sale must
                    # also create its credit-ledger entry (was silently lost before).
                    udhaar_amt = float(p.get("udhaar_amount", 0.0))
                    if udhaar_amt > 0:
                        db.add(UdhaarLedger(
                            vendor_id=vendor_id,
                            customer_name=p.get("customer_name") or "Walk-in Customer",
                            customer_phone=p.get("customer_phone"),
                            amount_due=udhaar_amt,
                            amount_paid=0.0,
                            remaining_balance=udhaar_amt,
                            status=UdhaarStatus.UNPAID,
                            notes=f"Offline sale sync #{sale.id[:8]}",
                        ))

                    sync_entry.status = SyncStatus.PROCESSED
                    sync_entry.processed_at = datetime.now(timezone.utc)
                    db.commit()

                    results.append(SyncProcessedItem(
                        client_mutation_id=item.client_mutation_id,
                        status=SyncStatus.PROCESSED,
                        server_entity_id=sale.id
                    ))
                    success_count += 1

                # 3. Process INVENTORY Mutation
                elif item.entity_type == SyncEntityType.INVENTORY:
                    p = item.payload
                    product = db.query(Product).filter(Product.id == p.get("product_id")).first()
                    if product:
                        change_qty = float(p.get("change_qty", 0.0))
                        product.current_stock += change_qty
                        db.add(InventoryLedger(
                            product_id=product.id,
                            change_qty=change_qty,
                            transaction_type=InventoryTransactionType(p.get("transaction_type", "PURCHASE_IN")),
                            balance_after=product.current_stock,
                            notes=p.get("notes", "Offline Inventory Sync")
                        ))
                        sync_entry.status = SyncStatus.PROCESSED
                        sync_entry.processed_at = datetime.now(timezone.utc)
                        db.commit()

                        results.append(SyncProcessedItem(
                            client_mutation_id=item.client_mutation_id,
                            status=SyncStatus.PROCESSED,
                            server_entity_id=product.id
                        ))
                        success_count += 1
                    else:
                        sync_entry.status = SyncStatus.FAILED
                        sync_entry.error_message = "Product not found on server"
                        db.commit()
                        results.append(SyncProcessedItem(
                            client_mutation_id=item.client_mutation_id,
                            status=SyncStatus.FAILED,
                            error_message="Product not found on server"
                        ))
                        conflict_count += 1

                # 3.4 Process ORDER_CREATE Mutation — a voice order placed while
                # offline ("I need 2 kg tomato" with no network). Finds the
                # product by name (fuzzy, mirrors the assistant), prices it at
                # the CURRENT server price, and creates a real PENDING order.
                elif item.entity_type == SyncEntityType.ORDER_CREATE:
                    from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus

                    p = item.payload
                    # orders.customer_id is NOT NULL — attach a walk-in customer
                    # row (same fallback the live voice assistant uses).
                    from app.models.customer import Customer as _Cust
                    walkin = db.query(_Cust).order_by(_Cust.id).first()
                    import uuid as _uuid
                    order = Order(
                        # unique per synced order — never collide on the unique index
                        order_number=p.get("order_number") or f"ORD-OFF-{_uuid.uuid4().hex[:6].upper()}",
                        customer_id=walkin.id if walkin else None,
                        vendor_id=vendor_id,
                        status=OrderStatus.PENDING,
                        payment_status=PaymentStatus.PENDING,
                        payment_mode=p.get("payment_mode", "CASH"),
                        total_amount=round(float(p.get("total_amount") or 0.0), 2),
                        delivery_address=p.get("delivery_address") or "Voice order (offline) — collect at cart",
                    )
                    db.add(order)
                    db.flush()
                    computed_total = 0.0
                    for itm in p.get("items", []):
                        product = None
                        pname = itm.get("product_name")
                        if pname:
                            from app.assistant.tools_impl import find_product as _fp
                            class _T:  # tiny adapter: find_product expects a Vendor ORM object
                                id = vendor_id
                            try:
                                product = _fp(db, _T(), pname)
                            except Exception:
                                product = None
                        item_unit_price = float(itm.get("unit_price") or (product.selling_price if product else 0.0))
                        item_subtotal = float(itm.get("subtotal") or ((itm.get("quantity") or 1) * item_unit_price))
                        computed_total += item_subtotal
                        db.add(OrderItem(
                            order_id=order.id,
                            product_id=product.id if product else None,
                            product_name_snapshot=itm.get("product_name") or (product.name_en if product else "Item"),
                            quantity=float(itm.get("quantity") or 1),
                            unit=itm.get("unit") or (product.unit.value if product else "kg"),
                            unit_price=item_unit_price,
                            subtotal=item_subtotal,
                        ))
                    if not p.get("total_amount"):
                        # Offline device doesn't know prices — the server does.
                        order.total_amount = round(computed_total, 2)
                    sync_entry.status = SyncStatus.PROCESSED
                    sync_entry.processed_at = datetime.now(timezone.utc)
                    db.commit()
                    results.append(SyncProcessedItem(
                        client_mutation_id=item.client_mutation_id,
                        status=SyncStatus.PROCESSED,
                        server_entity_id=order.id,
                        server_order_number=order.order_number,
                        server_total_amount=order.total_amount,
                    ))
                    success_count += 1

                # 3.5 Process ORDER_STATUS Mutation — vendor accepted/packed/
                # delivered an order while offline. Applied idempotently: an
                # already-advanced order is never moved backwards.
                elif item.entity_type == SyncEntityType.ORDER_STATUS:
                    from app.models.order import Order, OrderStatus

                    p = item.payload
                    order = None
                    oid = p.get("order_id")
                    if oid:
                        order = db.query(Order).filter(Order.id == oid, Order.vendor_id == vendor_id).first()
                    if order is None and p.get("order_number"):
                        order = db.query(Order).filter(
                            Order.order_number == p["order_number"], Order.vendor_id == vendor_id
                        ).first()
                    if order is None:
                        sync_entry.status = SyncStatus.FAILED
                        sync_entry.error_message = "Order not found on server"
                        db.commit()
                        results.append(SyncProcessedItem(
                            client_mutation_id=item.client_mutation_id,
                            status=SyncStatus.FAILED,
                            error_message="Order not found on server"
                        ))
                        conflict_count += 1
                    else:
                        try:
                            target = OrderStatus(p.get("status"))
                        except ValueError:
                            target = None
                        if target is None:
                            sync_entry.status = SyncStatus.FAILED
                            sync_entry.error_message = f"Unknown status {p.get('status')}"
                            db.commit()
                            results.append(SyncProcessedItem(
                                client_mutation_id=item.client_mutation_id,
                                status=SyncStatus.FAILED,
                                error_message=f"Unknown status {p.get('status')}"
                            ))
                            conflict_count += 1
                        else:
                            rank = {OrderStatus.PENDING: 0, OrderStatus.ACCEPTED: 1, OrderStatus.PACKED: 2,
                                    OrderStatus.OUT_FOR_DELIVERY: 3, OrderStatus.COMPLETED: 4, OrderStatus.CANCELLED: 4}
                            if rank.get(order.status, 0) >= rank.get(target, 0) and order.status != OrderStatus.PENDING:
                                # Already further along (or cancelled) — keep server state
                                sync_entry.status = SyncStatus.PROCESSED
                                sync_entry.processed_at = datetime.now(timezone.utc)
                                db.commit()
                                results.append(SyncProcessedItem(
                                    client_mutation_id=item.client_mutation_id,
                                    status=SyncStatus.PROCESSED,
                                    server_entity_id=order.id,
                                    error_message=None
                                ))
                                success_count += 1
                            else:
                                order.status = target
                                sync_entry.status = SyncStatus.PROCESSED
                                sync_entry.processed_at = datetime.now(timezone.utc)
                                db.commit()
                                results.append(SyncProcessedItem(
                                    client_mutation_id=item.client_mutation_id,
                                    status=SyncStatus.PROCESSED,
                                    server_entity_id=order.id
                                ))
                                success_count += 1

                # 4. Process UDHAAR Mutation
                elif item.entity_type == SyncEntityType.UDHAAR:
                    p = item.payload
                    amount_due = float(p.get("amount_due", 0.0))
                    udhaar = UdhaarLedger(
                        vendor_id=vendor_id,
                        customer_name=p.get("customer_name", "Customer"),
                        customer_phone=p.get("customer_phone"),
                        amount_due=amount_due,
                        amount_paid=0.0,
                        remaining_balance=amount_due,
                        status=UdhaarStatus.UNPAID,
                        notes=p.get("notes", "Offline Udhaar Entry")
                    )
                    db.add(udhaar)
                    sync_entry.status = SyncStatus.PROCESSED
                    sync_entry.processed_at = datetime.now(timezone.utc)
                    db.commit()

                    results.append(SyncProcessedItem(
                        client_mutation_id=item.client_mutation_id,
                        status=SyncStatus.PROCESSED,
                        server_entity_id=udhaar.id
                    ))
                    success_count += 1

            except Exception as e:
                db.rollback()
                sync_entry.status = SyncStatus.CONFLICT
                sync_entry.error_message = str(e)
                db.commit()
                results.append(SyncProcessedItem(
                    client_mutation_id=item.client_mutation_id,
                    status=SyncStatus.CONFLICT,
                    error_message=str(e)
                ))
                conflict_count += 1

        response = SyncBatchResponse(
            processed_count=len(mutations),
            success_count=success_count,
            conflict_count=conflict_count,
            results=results,
            synced_at=datetime.now(timezone.utc)
        )

        # Background flush (service worker, app closed): the vendor can't see
        # the in-app toast/chat, so reach their lock screen with a short Web
        # Push summary of what just synced. Best-effort — never fails the sync.
        if source == "sw" and response.success_count > 0:
            try:
                cls._send_sync_push(db, vendor_id, response, id_unhash)
            except Exception as e:  # noqa: BLE001
                logger.warning("sync-summary push failed: %s", e)

        return response

    @staticmethod
    def _send_sync_push(db: Session, vendor_id: str, response: SyncBatchResponse, id_unhash: Dict[str, str] = None) -> None:
        from app.models.vendor import Vendor
        from app.services.push_service import notify_user

        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if vendor is None:
            return

        lines: List[str] = []
        for r in response.results:
            if r.status == SyncStatus.PROCESSED and r.server_order_number:
                total = f" ₹{r.server_total_amount:g}" if r.server_total_amount else ""
                lines.append(f"Order {r.server_order_number}{total}")
            elif r.status == SyncStatus.PROCESSED and r.client_mutation_id.startswith("sale-"):
                lines.append("POS sale")
            elif r.status == SyncStatus.PROCESSED:
                lines.append(r.entity_type.value.replace("_", "").title())

        if not lines:
            return
        shown = lines[:3]
        body = " · ".join(shown)
        if len(lines) > 3:
            body += f" +{len(lines) - 3} more"

        # Deep-link with the ids the DEVICE used (un-hash any long ones)
        unhash = id_unhash or {}
        confirmed_ids = [
            unhash.get(r.client_mutation_id, r.client_mutation_id)
            for r in response.results if r.status == SyncStatus.PROCESSED
        ]
        notify_user(db, vendor.user_id, {
            "type": "SYNC_COMPLETE",
            "title": "✓ Offline work synced",
            "body": body,
            "tag": "vs-outbox-sync",
            # Tapping the push lands on the synced timeline with these exact
            # mutations highlighted (SW forwards them via postMessage, or as a
            # ?confirmed= URL param on cold start).
            "data": {"origin": "/?screen=sync", "confirmed": confirmed_ids},
        })

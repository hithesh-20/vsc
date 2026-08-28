from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
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
        mutations: List[SyncMutationItem]
    ) -> SyncBatchResponse:
        results = []
        success_count = 0
        conflict_count = 0

        for item in mutations:
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

        return SyncBatchResponse(
            processed_count=len(mutations),
            success_count=success_count,
            conflict_count=conflict_count,
            results=results,
            synced_at=datetime.now(timezone.utc)
        )

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_vendor
from app.models.vendor import Vendor
from app.models.sync_queue import SyncQueue, SyncStatus
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse, SyncHistoryItem, SyncHistoryResponse
from app.schemas.common import APIResponse
from app.services.sync_service import SyncService

router = APIRouter()


@router.post("/batch-upload", response_model=APIResponse[SyncBatchResponse])
def process_offline_sync_batch(
    batch: SyncBatchRequest,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Process offline queued POS sales, stock additions, and Udhaar ledger items upon network reconnection."""
    if not batch.mutations:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Batch contains no mutations")

    result = SyncService.process_offline_batch(db, vendor.id, batch.mutations, source=batch.source)

    return APIResponse(
        message=f"Sync completed: {result.success_count} succeeded, {result.conflict_count} conflicts/duplicates",
        data=result
    )


@router.get("/history", response_model=APIResponse[SyncHistoryResponse])
def get_sync_history(
    limit: int = Query(default=25, ge=1, le=100),
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db),
):
    """Audit trail: recent offline mutations and how the server resolved them
    (PROCESSED / FAILED / CONFLICT with the exact error reason)."""
    rows = (
        db.query(SyncQueue)
        .filter(SyncQueue.vendor_id == vendor.id)
        .order_by(SyncQueue.created_at.desc())
        .limit(limit)
        .all()
    )
    items = [
        SyncHistoryItem(
            client_mutation_id=r.client_mutation_id,
            entity_type=r.entity_type.value if hasattr(r.entity_type, "value") else str(r.entity_type),
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            error_message=r.error_message,
            created_at=r.created_at,
            processed_at=r.processed_at,
            payload=r.payload or {},
        )
        for r in rows
    ]
    failed = (
        db.query(SyncQueue)
        .filter(SyncQueue.vendor_id == vendor.id, SyncQueue.status.in_([SyncStatus.FAILED, SyncStatus.CONFLICT]))
        .count()
    )
    return APIResponse(data=SyncHistoryResponse(items=items, failed_count=failed))

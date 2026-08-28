from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_vendor
from app.models.vendor import Vendor
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse
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

    result = SyncService.process_offline_batch(db, vendor.id, batch.mutations)

    return APIResponse(
        message=f"Sync completed: {result.success_count} succeeded, {result.conflict_count} conflicts/duplicates",
        data=result
    )

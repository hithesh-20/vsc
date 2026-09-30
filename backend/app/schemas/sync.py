from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.models.sync_queue import SyncEntityType, SyncStatus


class SyncMutationItem(BaseModel):
    """One offline action from the device outbox.

    Lenient on purpose: older frontend builds (and the current POS outbox)
    send only {entity_type, payload, created_at}. The server fills in the
    idempotency key and timestamp when absent so nothing ever 422s on flush.
    """
    client_mutation_id: Optional[str] = None
    entity_type: SyncEntityType
    payload: Dict[str, Any]
    client_timestamp: Optional[datetime] = None


class SyncBatchRequest(BaseModel):
    mutations: List[SyncMutationItem]
    # 'app' (default) = the vendor app is open and will show the in-chat
    # confirmation + toast itself. 'sw' = the service worker is flushing while
    # the app is CLOSED, so the server should reach the vendor's lock screen
    # with a Web Push summary instead.
    source: str = "app"


class SyncProcessedItem(BaseModel):
    client_mutation_id: str
    status: SyncStatus
    server_entity_id: Optional[str] = None
    error_message: Optional[str] = None
    # Human-friendly outcome details so the offline device can tell the vendor
    # exactly WHAT was accepted (e.g. "ORD-OFF-3138AF · ₹120") without an
    # extra fetch. Populated for ORDER_CREATE results.
    server_order_number: Optional[str] = None
    server_total_amount: Optional[float] = None


class SyncBatchResponse(BaseModel):
    processed_count: int
    success_count: int
    conflict_count: int
    results: List[SyncProcessedItem]
    synced_at: datetime


class SyncHistoryItem(BaseModel):
    client_mutation_id: str
    entity_type: str
    status: str
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    payload: Dict[str, Any] = {}


class SyncHistoryResponse(BaseModel):
    items: List[SyncHistoryItem] = []
    failed_count: int = 0

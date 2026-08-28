from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.models.sync_queue import SyncEntityType, SyncStatus


class SyncMutationItem(BaseModel):
    client_mutation_id: str
    entity_type: SyncEntityType
    payload: Dict[str, Any]
    client_timestamp: datetime


class SyncBatchRequest(BaseModel):
    mutations: List[SyncMutationItem]


class SyncProcessedItem(BaseModel):
    client_mutation_id: str
    status: SyncStatus
    server_entity_id: Optional[str] = None
    error_message: Optional[str] = None


class SyncBatchResponse(BaseModel):
    processed_count: int
    success_count: int
    conflict_count: int
    results: List[SyncProcessedItem]
    synced_at: datetime

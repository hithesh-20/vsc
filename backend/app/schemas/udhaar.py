from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.udhaar import UdhaarStatus


class UdhaarCreate(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    amount_due: float
    notes: Optional[str] = None
    due_date: Optional[datetime] = None


class UdhaarRepaymentRequest(BaseModel):
    amount_paid: float
    payment_mode: str = "CASH"  # CASH or UPI
    notes: Optional[str] = None


class UdhaarResponse(BaseModel):
    id: str
    vendor_id: str
    customer_name: str
    customer_phone: Optional[str] = None
    amount_due: float
    amount_paid: float
    remaining_balance: float
    status: UdhaarStatus
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
    last_reminder_sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UdhaarSummary(BaseModel):
    total_outstanding_udhaar: float
    total_repaid_udhaar: float
    total_debtors_count: int
    unpaid_accounts_count: int
    records: List[UdhaarResponse] = []

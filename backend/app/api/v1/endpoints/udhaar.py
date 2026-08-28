from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_vendor
from app.models.vendor import Vendor
from app.models.udhaar import UdhaarLedger, UdhaarStatus
from app.schemas.udhaar import UdhaarCreate, UdhaarRepaymentRequest, UdhaarResponse, UdhaarSummary
from app.schemas.common import APIResponse, MessageResponse

router = APIRouter()


@router.get("", response_model=APIResponse[UdhaarSummary])
def get_udhaar_ledger(
    status_filter: Optional[str] = None,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Retrieve full credit ledger with outstanding dues and customer balances."""
    query = db.query(UdhaarLedger).filter(UdhaarLedger.vendor_id == vendor.id)
    if status_filter:
        query = query.filter(UdhaarLedger.status == status_filter)

    records = query.order_by(UdhaarLedger.created_at.desc()).all()

    total_outstanding = sum(r.remaining_balance for r in records)
    total_repaid = sum(r.amount_paid for r in records)
    unpaid_count = sum(1 for r in records if r.status != UdhaarStatus.SETTLED)

    summary = UdhaarSummary(
        total_outstanding_udhaar=round(total_outstanding, 2),
        total_repaid_udhaar=round(total_repaid, 2),
        total_debtors_count=len(records),
        unpaid_accounts_count=unpaid_count,
        records=[UdhaarResponse.model_validate(r) for r in records]
    )

    return APIResponse(data=summary)


@router.post("", response_model=APIResponse[UdhaarResponse], status_code=status.HTTP_201_CREATED)
def create_udhaar_entry(
    udhaar_in: UdhaarCreate,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Create a new Udhaar/credit record for a customer."""
    record = UdhaarLedger(
        vendor_id=vendor.id,
        customer_name=udhaar_in.customer_name,
        customer_phone=udhaar_in.customer_phone,
        amount_due=udhaar_in.amount_due,
        amount_paid=0.0,
        remaining_balance=udhaar_in.amount_due,
        status=UdhaarStatus.UNPAID,
        notes=udhaar_in.notes,
        due_date=udhaar_in.due_date
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return APIResponse(
        message=f"Udhaar of ₹{record.amount_due} recorded for {record.customer_name}",
        data=UdhaarResponse.model_validate(record)
    )


@router.post("/{udhaar_id}/repay", response_model=APIResponse[UdhaarResponse])
def record_udhaar_repayment(
    udhaar_id: str,
    repay_in: UdhaarRepaymentRequest,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Record partial or full credit repayment."""
    record = db.query(UdhaarLedger).filter(
        UdhaarLedger.id == udhaar_id,
        UdhaarLedger.vendor_id == vendor.id
    ).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Udhaar record not found")

    record.amount_paid += repay_in.amount_paid
    record.remaining_balance = max(0.0, record.amount_due - record.amount_paid)

    if record.remaining_balance == 0.0:
        record.status = UdhaarStatus.SETTLED
    else:
        record.status = UdhaarStatus.PARTIAL

    db.commit()
    db.refresh(record)

    return APIResponse(
        message=f"Payment of ₹{repay_in.amount_paid} recorded. Remaining: ₹{record.remaining_balance}",
        data=UdhaarResponse.model_validate(record)
    )


@router.post("/{udhaar_id}/send-reminder", response_model=MessageResponse)
def send_udhaar_reminder(
    udhaar_id: str,
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Generate WhatsApp/SMS reminder deep link."""
    record = db.query(UdhaarLedger).filter(
        UdhaarLedger.id == udhaar_id,
        UdhaarLedger.vendor_id == vendor.id
    ).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Udhaar record not found")

    record.last_reminder_sent_at = datetime.now(timezone.utc)
    db.commit()

    msg = f"ನಮಸ್ಕಾರ {record.customer_name}, {vendor.business_name} ನಿಂದ ನಿಮ್ಮ ಬಾಕಿ ₹{record.remaining_balance}. ದಯವಿಟ್ಟು ಪಾವತಿಸಿ."
    return MessageResponse(message=f"Reminder queued: '{msg}'")

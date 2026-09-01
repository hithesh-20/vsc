from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_vendor
from app.models.vendor import Vendor
from app.schemas.common import APIResponse
from app.schemas.mandi import MandiMarketSummaryResponse, VendorCreditScorecardResponse
from app.services.mandi_service import MandiService

router = APIRouter()


@router.get("/rates", response_model=APIResponse[MandiMarketSummaryResponse])
def get_mandi_wholesale_rates(
    market: str = Query("Bengaluru", description="Target APMC Mandi Wholesale Market Name")
):
    """Retrieve today's live wholesale APMC Mandi commodity rates and buying advisory."""
    summary = MandiService.get_latest_mandi_summary(market=market)
    return APIResponse(
        message=f"Live Mandi wholesale commodity rates retrieved for {market}",
        data=summary
    )


@router.get("/credit-scorecard", response_model=APIResponse[VendorCreditScorecardResponse])
def get_vendor_microcredit_scorecard(
    vendor: Vendor = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """
    Calculate and generate AI-driven Mudra / PM SVANidhi Creditworthiness Scorecard
    (300 to 900) based on verified POS transactions, Udhaar recovery, and digital UPI volume.
    """
    scorecard = MandiService.compute_vendor_credit_scorecard(db, vendor)
    return APIResponse(
        message="Vendor PM SVANidhi micro-credit scorecard calculated successfully",
        data=scorecard
    )

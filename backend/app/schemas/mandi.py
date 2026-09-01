from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class MandiCommodityRate(BaseModel):
    commodity_name_en: str
    commodity_name_kn: str
    commodity_name_hi: str
    category: str
    market_name: str
    market_name_kn: str
    min_price_per_kg: float
    max_price_per_kg: float
    modal_price_per_kg: float
    unit: str = "kg"
    trend: str  # UP, DOWN, STABLE
    price_change_pct: float
    recommended_retail_price: float
    expected_profit_margin_pct: float

    model_config = ConfigDict(from_attributes=True)


class MandiMarketSummaryResponse(BaseModel):
    market_name: str
    market_location: str
    reported_date: str
    total_commodities_tracked: int
    top_gainers: List[str]
    top_losers: List[str]
    commodities: List[MandiCommodityRate]
    buyer_advisory_kn: str
    buyer_advisory_en: str

    model_config = ConfigDict(from_attributes=True)


class VendorCreditScorecardResponse(BaseModel):
    vendor_id: str
    business_name: str
    credit_score: int  # 300 - 900
    rating_category: str  # Excellent, Good, Moderate, Basic
    repayment_reliability_pct: float
    daily_revenue_consistency_pct: float
    digital_transaction_ratio_pct: float
    eligible_svanidhi_loan_tier: str  # Tier 1 (₹10k), Tier 2 (₹20k), Tier 3 (₹50k)
    max_preapproved_loan_amount: float
    interest_subsidy_eligible: bool
    scheme_name: str
    key_strengths_kn: List[str]
    improvement_tips_kn: List[str]

    model_config = ConfigDict(from_attributes=True)

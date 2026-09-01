from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.vendor import Vendor
from app.models.sale import Sale
from app.models.udhaar import UdhaarLedger, UdhaarStatus
from app.schemas.mandi import (
    MandiCommodityRate, MandiMarketSummaryResponse, VendorCreditScorecardResponse
)


class MandiService:
    """APMC Wholesale Mandi Intelligence & Agricultural Marketing Price Index."""

    SAMPLE_MANDI_DATA = [
        {
            "commodity_name_en": "Tomato (Hybrid)",
            "commodity_name_kn": "ಟೊಮೇಟೊ (ಹೈಬ್ರಿಡ್)",
            "commodity_name_hi": "टमाटर (हाइब्रिड)",
            "category": "Vegetables",
            "market_name": "Yeshwanthpur APMC Mandi, Bengaluru",
            "market_name_kn": "ಯಶವಂತಪುರ ಎಪಿಎಂಸಿ ಮಂಡಿ, ಬೆಂಗಳೂರು",
            "min_price_per_kg": 18.0,
            "max_price_per_kg": 24.0,
            "modal_price_per_kg": 20.0,
            "unit": "kg",
            "trend": "DOWN",
            "price_change_pct": -8.5,
            "recommended_retail_price": 35.0,
            "expected_profit_margin_pct": 75.0
        },
        {
            "commodity_name_en": "Onion (Medium)",
            "commodity_name_kn": "ಈರುಳ್ಳಿ (ಮಧ್ಯಮ)",
            "commodity_name_hi": "प्याज़ (मध्यम)",
            "category": "Vegetables",
            "market_name": "KR Market Mandi, Bengaluru",
            "market_name_kn": "ಕೆ.ಆರ್. ಮಾರ್ಕೆಟ್ ಮಂಡಿ, ಬೆಂಗಳೂರು",
            "min_price_per_kg": 22.0,
            "max_price_per_kg": 28.0,
            "modal_price_per_kg": 25.0,
            "unit": "kg",
            "trend": "UP",
            "price_change_pct": 12.0,
            "recommended_retail_price": 40.0,
            "expected_profit_margin_pct": 60.0
        },
        {
            "commodity_name_en": "Potato (Jyoti)",
            "commodity_name_kn": "ಆಲೂಗಡ್ಡೆ (ಜ್ಯೋತಿ)",
            "commodity_name_hi": "आलू (ज्योति)",
            "category": "Vegetables",
            "market_name": "Yeshwanthpur APMC Mandi, Bengaluru",
            "market_name_kn": "ಯಶವಂತಪುರ ಎಪಿಎಂಸಿ ಮಂಡಿ, ಬೆಂಗಳೂರು",
            "min_price_per_kg": 15.0,
            "max_price_per_kg": 20.0,
            "modal_price_per_kg": 18.0,
            "unit": "kg",
            "trend": "STABLE",
            "price_change_pct": 0.0,
            "recommended_retail_price": 30.0,
            "expected_profit_margin_pct": 66.7
        },
        {
            "commodity_name_en": "Green Chilli",
            "commodity_name_kn": "ಹಸಿ ಮೆಣಸಿನಕಾಯಿ",
            "commodity_name_hi": "हरी मिर्च",
            "category": "Vegetables",
            "market_name": "KR Market Mandi, Bengaluru",
            "market_name_kn": "ಕೆ.ಆರ್. ಮಾರ್ಕೆಟ್ ಮಂಡಿ, ಬೆಂಗಳೂರು",
            "min_price_per_kg": 35.0,
            "max_price_per_kg": 45.0,
            "modal_price_per_kg": 40.0,
            "unit": "kg",
            "trend": "UP",
            "price_change_pct": 15.2,
            "recommended_retail_price": 70.0,
            "expected_profit_margin_pct": 75.0
        },
        {
            "commodity_name_en": "Coriander / Greens",
            "commodity_name_kn": "ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು",
            "commodity_name_hi": "धनिया पत्ता",
            "category": "Leafy Greens",
            "market_name": "KR Market Mandi, Bengaluru",
            "market_name_kn": "ಕೆ.ಆರ್. ಮಾರ್ಕೆಟ್ ಮಂಡಿ, ಬೆಂಗಳೂರು",
            "min_price_per_kg": 6.0,
            "max_price_per_kg": 10.0,
            "modal_price_per_kg": 8.0,
            "unit": "bunch",
            "trend": "DOWN",
            "price_change_pct": -10.0,
            "recommended_retail_price": 15.0,
            "expected_profit_margin_pct": 87.5
        },
        {
            "commodity_name_en": "Robusta Banana",
            "commodity_name_kn": "ರೋಬಸ್ಟಾ ಬಾಳೆಹಣ್ಣು",
            "commodity_name_hi": "रोबस्टा केला",
            "category": "Fruits",
            "market_name": "Binny Mill Fruit APMC, Bengaluru",
            "market_name_kn": "ಬಿನ್ನಿ ಮಿಲ್ ಹಣ್ಣಿನ ಎಪಿಎಂಸಿ, ಬೆಂಗಳೂರು",
            "min_price_per_kg": 25.0,
            "max_price_per_kg": 32.0,
            "modal_price_per_kg": 28.0,
            "unit": "kg",
            "trend": "STABLE",
            "price_change_pct": 2.1,
            "recommended_retail_price": 45.0,
            "expected_profit_margin_pct": 60.7
        }
    ]

    @classmethod
    def get_latest_mandi_summary(cls, market: str = "Bengaluru") -> MandiMarketSummaryResponse:
        """Fetch today's APMC wholesale Mandi report with vendor buying intelligence."""
        commodities = [MandiCommodityRate(**item) for item in cls.SAMPLE_MANDI_DATA]
        gainers = [c.commodity_name_en for c in commodities if c.trend == "UP"]
        losers = [c.commodity_name_en for c in commodities if c.trend == "DOWN"]

        return MandiMarketSummaryResponse(
            market_name=f"APMC Mandi Wholesale Hub ({market})",
            market_location=f"{market}, Karnataka",
            reported_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            total_commodities_tracked=len(commodities),
            top_gainers=gainers,
            top_losers=losers,
            commodities=commodities,
            buyer_advisory_kn="ಟೊಮೇಟೊ ಮತ್ತು ಕೊತ್ತಂಬರಿ ಬೆಲೆ ಇಳಿಕೆಯಾಗಿದೆ. ಇಂದು ಹೆಚ್ಚಿನ ಪ್ರಮಾಣದಲ್ಲಿ ಖರೀದಿಸಿ ಮಾರಾಟ ಮಾಡಿದರೆ ಅಧಿಕ ಲಾಭ ಪಡೆಯಬಹುದು.",
            buyer_advisory_en="Tomato and Coriander wholesale prices dropped today. Ideal time to stock up for higher retail margins."
        )

    @classmethod
    def compute_vendor_credit_scorecard(cls, db: Session, vendor: Vendor) -> VendorCreditScorecardResponse:
        """
        Calculate Mudra / PM SVANidhi micro-credit creditworthiness score (300 to 900)
        from actual POS ledger transactions, digital UPI ratio, and Udhaar recovery rate.
        """
        sales = db.query(Sale).filter(Sale.vendor_id == vendor.id).all()
        udhaar_records = db.query(UdhaarLedger).filter(UdhaarLedger.vendor_id == vendor.id).all()

        total_sales_count = len(sales)
        total_rev = sum(s.net_amount for s in sales)
        upi_sales = [s for s in sales if s.payment_mode == "UPI" or s.upi_paid > 0]
        digital_ratio = (len(upi_sales) / total_sales_count * 100.0) if total_sales_count > 0 else 50.0

        # Udhaar recovery calculation
        total_udhaar_issued = sum(u.amount_due for u in udhaar_records)
        total_udhaar_recovered = sum(u.amount_paid for u in udhaar_records)
        repayment_reliability = (total_udhaar_recovered / total_udhaar_issued * 100.0) if total_udhaar_issued > 0 else 85.0

        # Credit Score Base: 300
        # Sales Volume contribution: up to 250 points
        sales_pts = min(250, int(total_sales_count * 15 + (total_rev / 100)))
        # Digital UPI adoption contribution: up to 180 points
        digital_pts = int((digital_ratio / 100.0) * 180)
        # Udhaar Recovery Reliability: up to 170 points
        recovery_pts = int((repayment_reliability / 100.0) * 170)

        raw_score = 300 + sales_pts + digital_pts + recovery_pts
        final_score = min(900, max(300, raw_score))

        if final_score >= 750:
            category = "Excellent (ಉತ್ತಮ)"
            tier = "Tier 3 — ₹50,000 (3ನೇ ಹಂತ)"
            max_loan = 50000.0
            interest_subsidy = True
        elif final_score >= 650:
            category = "Good (ಉತ್ತಮ)"
            tier = "Tier 2 — ₹20,000 (2ನೇ ಹಂತ)"
            max_loan = 20000.0
            interest_subsidy = True
        else:
            category = "Standard (ಪ್ರಾರಂಭಿಕ)"
            tier = "Tier 1 — ₹10,000 (1ನೇ ಹಂತ)"
            max_loan = 10000.0
            interest_subsidy = True

        return VendorCreditScorecardResponse(
            vendor_id=vendor.id,
            business_name=vendor.business_name,
            credit_score=final_score,
            rating_category=category,
            repayment_reliability_pct=round(repayment_reliability, 1),
            daily_revenue_consistency_pct=round(min(98.0, 75.0 + total_sales_count * 1.2), 1),
            digital_transaction_ratio_pct=round(digital_ratio, 1),
            eligible_svanidhi_loan_tier=tier,
            max_preapproved_loan_amount=max_loan,
            interest_subsidy_eligible=interest_subsidy,
            scheme_name="PM SVANidhi Micro-Credit Street Vendor Loan Scheme (7% Interest Subsidy)",
            key_strengths_kn=[
                "ನಿಯಮಿತ ಯುಪಿಐ ಡಿಜಿಟಲ್ ವ್ಯಾಪಾರ",
                "ಗ್ರಾಹಕರ ಸಾಲ (ಉದ್ರಿ) ವಸೂಲಾತಿ ಉತ್ತಮವಾಗಿದೆ",
                "ದೈನಂದಿನ ಮಾರಾಟ ಸ್ಥಿರತೆ"
            ],
            improvement_tips_kn=[
                "ಹೆಚ್ಚಿನ ಡಿಜಿಟಲ್ ಕ್ಯೂಆರ್ ಕೋಡ್ ಪಾವತಿಗಳನ್ನು ಸ್ವೀಕರಿಸಿ",
                "ದಿನಕ್ಕೆ 10 ಕ್ಕಿಂತ ಹೆಚ್ಚು ಮಾರಾಟಗಳನ್ನು ದಾಖಲಿಸಿ"
            ]
        )

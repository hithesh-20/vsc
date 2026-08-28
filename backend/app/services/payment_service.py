import urllib.parse
from typing import Dict, Any, Optional


class PaymentService:
    """Payment Gateway Hub supporting UPI Intent Deep Linking, QR generation, and Cash settling."""

    @staticmethod
    def generate_upi_payment_link(
        vpa_id: str,
        payee_name: str,
        amount: float,
        transaction_note: str = "VendorSaathi Bill",
        transaction_ref: str = ""
    ) -> Dict[str, Any]:
        """Generate standard NPCI UPI Intent URI for Google Pay, PhonePe, Paytm, and BHIM."""
        params = {
            "pa": vpa_id or "vendor@upi",
            "pn": payee_name,
            "am": f"{amount:.2f}",
            "cu": "INR",
            "tn": transaction_note
        }
        if transaction_ref:
            params["tr"] = transaction_ref

        encoded_params = urllib.parse.urlencode(params)
        upi_uri = f"upi://pay?{encoded_params}"

        return {
            "upi_intent_uri": upi_uri,
            "amount": amount,
            "vpa": vpa_id,
            "payee_name": payee_name,
            "qr_payload": upi_uri,
            "payment_modes_supported": ["GPay", "PhonePe", "Paytm", "BHIM", "Cash"]
        }

    @staticmethod
    def process_mock_sandbox_settlement(amount: float, payment_mode: str) -> Dict[str, Any]:
        """Sandbox simulated settlement for instant testing."""
        return {
            "status": "SUCCESS",
            "transaction_id": f"TXN_{urllib.parse.quote(str(int(amount * 100)))}",
            "settled_amount": amount,
            "mode": payment_mode,
            "gateway_message": "Payment verified via simulated UPI/Cash gateway."
        }

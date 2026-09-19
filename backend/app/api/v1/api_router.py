from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, vendors, products, inventory, sales, udhaar, orders, voice, mobility, weather, customer, sync, mandi, otp_auth, customer_app
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(otp_auth.router, prefix="/auth/otp", tags=["OTP Authentication"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["Vendors"])
api_router.include_router(products.router, prefix="/products", tags=["Products & Catalog"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory Ledger"])
api_router.include_router(sales.router, prefix="/sales", tags=["Sales POS & Profit Analytics"])
api_router.include_router(udhaar.router, prefix="/udhaar", tags=["Udhaar Credit Ledger"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders & Live WebSocket"])
api_router.include_router(voice.router, prefix="/voice", tags=["Kannada Voice Assistant"])
api_router.include_router(mobility.router, prefix="/mobility", tags=["GPS Intelligent Mobility"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather Advisory & AI Demand"])
api_router.include_router(customer.router, prefix="/customer", tags=["Customer Discovery & Loyalty"])
api_router.include_router(sync.router, prefix="/sync", tags=["Offline Synchronization"])
api_router.include_router(mandi.router, prefix="/mandi", tags=["Mandi APMC & Micro-Credit Scorecard"])
api_router.include_router(customer_app.router, prefix="/app", tags=["Customer App (B2C)"])


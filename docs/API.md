# VendorSaathi API Reference

Base URL: `http://localhost:8002/api/v1` — interactive docs: `/docs` (Swagger UI), `/redoc`.
All endpoints except `/auth/login`, `/auth/register` and `/auth/otp/*` require the header `Authorization: Bearer <JWT>`.

## Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health Check |

## Customer App (B2C)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/app/orders/my` | Get My Orders |
| `GET` | `/api/v1/app/orders/my/{order_id}` | Get My Order |
| `POST` | `/api/v1/app/orders/my/{order_id}/pay` | Pay My Order |
| `POST` | `/api/v1/app/orders/udhaar` | Place Udhaar Order |
| `GET` | `/api/v1/app/profile` | Get Profile |
| `PUT` | `/api/v1/app/profile/language` | Update Language |
| `GET` | `/api/v1/app/udhaar/my` | Get My Udhaar |
| `POST` | `/api/v1/app/udhaar/my/{record_id}/repay` | Repay My Udhaar |

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | Login User |
| `GET` | `/api/v1/auth/me` | Get Me |
| `POST` | `/api/v1/auth/register` | Register User |

## OTP Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/otp/complete` | Complete Signup |
| `POST` | `/api/v1/auth/otp/request` | Request Otp |
| `POST` | `/api/v1/auth/otp/verify` | Verify Otp |

## Customer Discovery & Loyalty

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/customer/loyalty` | Get Customer Loyalty |
| `GET` | `/api/v1/customer/nearby-vendors` | Find Nearby Vendors |
| `GET` | `/api/v1/customer/vendors/{vendor_id}/catalog` | Get Vendor Public Catalog |

## Inventory Ledger

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/inventory/adjust` | Adjust Inventory Stock |
| `GET` | `/api/v1/inventory/history/{product_id}` | Get Product Inventory History |

## Mandi APMC & Micro-Credit Scorecard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/mandi/credit-scorecard` | Get Vendor Microcredit Scorecard |
| `GET` | `/api/v1/mandi/rates` | Get Mandi Wholesale Rates |

## GPS Intelligent Mobility

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/mobility/broadcast` | Broadcast Vendor Gps |
| `GET` | `/api/v1/mobility/fleet-dispatch` | Get Fleet Spatial Temporal Dispatch |
| `GET` | `/api/v1/mobility/predict-location` | Predict Next Vendor Location |
| `GET` | `/api/v1/mobility/recommendations` | Get Smart Location Recommendations |
| `POST` | `/api/v1/mobility/route-optimize` | Optimize Travel Route |

## Orders & Live WebSocket

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/orders` | Place Order |
| `GET` | `/api/v1/orders/vendor` | Get Vendor Orders |
| `PUT` | `/api/v1/orders/{order_id}/status` | Update Order Status |

## Products & Catalog

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/products` | List Vendor Products |
| `POST` | `/api/v1/products` | Create Product |
| `GET` | `/api/v1/products/categories` | Get Categories |
| `PUT` | `/api/v1/products/{product_id}` | Update Product |
| `DELETE` | `/api/v1/products/{product_id}` | Delete Product |

## Sales POS & Profit Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/sales` | Record Pos Sale |
| `GET` | `/api/v1/sales/analytics/profit` | Get Profit Analytics |
| `GET` | `/api/v1/sales/history` | List Sales History |
| `POST` | `/api/v1/sales/record` | Record Pos Sale |

## Offline Synchronization

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/sync/batch-upload` | Process Offline Sync Batch |

## Udhaar Credit Ledger

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/udhaar` | Get Udhaar Ledger |
| `POST` | `/api/v1/udhaar` | Create Udhaar Entry |
| `POST` | `/api/v1/udhaar/{udhaar_id}/repay` | Record Udhaar Repayment |
| `POST` | `/api/v1/udhaar/{udhaar_id}/send-reminder` | Send Udhaar Reminder |

## Vendors

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/vendors/dashboard-summary` | Get Vendor Dashboard |
| `GET` | `/api/v1/vendors/profile` | Get Vendor Profile |
| `PUT` | `/api/v1/vendors/profile` | Update Vendor Profile |

## Universal AI Voice Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/voice/chat` | Voice Chat |
| `GET` | `/api/v1/voice/chat/history/{session_id}` | Voice Chat History |

## Kannada Voice Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/voice/guidance/{feature_key}` | Get Feature Guidance |
| `POST` | `/api/v1/voice/query` | Process Voice Query |

## Weather Advisory & AI Demand

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/weather/current` | Get Live Weather |
| `GET` | `/api/v1/weather/demand-forecast` | Get Ai Demand Forecast |

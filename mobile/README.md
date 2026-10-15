# VendorSaathi (ವೆಂಡರ್ಸಾಥಿ) — Mobile App (Flutter)

VendorSaathi is a native Flutter mobile application built for rural and roadside push-cart, bicycle, and tempo-truck vendors in Karnataka and across India.

---

## 🌟 Key Features & Modules

1. **Strict Single-Language Localization (100% Kannada ↔ English)**
   - Instant language switching with zero bilingual text mixing.
   - Designed for low-literacy and vernacular-speaking vendors.

2. **Quick POS Sales & Stock Decrement**
   - Extra-large tap targets for single-hand roadside operation.
   - Unit-aware pricing (`kg`, `bunch`, `piece`).
   - Cash, UPI, and Udhaar credit toggling.
   - Instant stock decrement on sale with low-stock warnings.

3. **Digital Udhaar (Credit) Ledger**
   - Replaces paper khata books with automated customer running balances.
   - One-tap WhatsApp deep link payment reminders with Kannada/English templates.

4. **APMC Mandi Intelligence & PM SVANidhi Credit Score**
   - Live wholesale commodity price feeds across Yeshwanthpur, KR Market, Mysore, and Hubballi.
   - Real-time Arbitrage Profit Margin calculator (`Retail Street Price - APMC Wholesale Price`).
   - Circular PM SVANidhi Micro-Credit Scorecard Gauge (0–1000) showing loan tier eligibility (up to ₹50,000 with 7% interest subsidy).

5. **Offline-First Delta Sync Engine**
   - Local Outbox queues all sales, stock adjustments, and Udhaar records when network is down.
   - Auto-flushes mutations to `/api/v1/sync/batch-upload` and `/api/v1/sync/delta` on reconnect.

6. **AI Voice Assistant (Kannada + English)**
   - Spoken slot extraction & intent execution for sales ("೨ ಕೆಜಿ ಈರುಳ್ಳಿ ೬೦ ರೂ ಮಾರಾಟ", "Record sale of 2 kg onions for 60 rupees cash"), stock queries, and credit updates.
   - Spoken TTS confirmation responses back to the vendor.

7. **Smart Mobility & Anti-Clustering**
   - GPS distance calculation to detect nearby same-category vendors.
   - Green Lane recommendations to avoid destructive price wars.

8. **Street Megaphone (ಬೀದಿ ಧ್ವನಿವರ್ಧಕ)**
   - Hands-free looping audio broadcast of synthesized Kannada street calls (e.g., "ತಾಜಾ ತರಕಾರಿಗಳು ಬಂತು!").

9. **Customer Portal Experience**
   - Village Cart Live GPS Tracker with audio arrival cue.
   - Direct storefront browsing and ordering.
   - Loyalty rewards points balance and redemption.
   - 1-Tap Emergency SOS broadcast.

---

## 🚀 How to Run the App

### Prerequisites
- Flutter SDK (>= 3.0.0)
- Android Studio / Android SDK (for Android builds) or Chrome/Windows runner for desktop testing

### 1. Start the FastAPI Backend (Optional / Resilient)
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```
*Note: The app contains offline fallbacks and local caches, so it works seamlessly even if the backend is temporarily offline.*

### 2. Run the Flutter App
```bash
cd mobile
flutter pub get
flutter run
```

### 3. Demo / Reviewer Quick Accounts
- **Vendor Mode:** Ramesh (Vegetables) — PIN: `1234`
- **Peer Vendor:** Manjunath (Chaat & Snacks) — PIN: `1234`
- **Customer Mode:** Priya Sharma (Resident Shopper) — PIN: `1234`
*(Easily toggle roles using the swap button in the top navigation bar).*

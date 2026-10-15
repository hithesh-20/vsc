# VendorSaathi (ವೆಂಡರ್‌ಸಾಥಿ)
### AI-Driven Voice Commerce & Intelligent Mobility Platform for Village & Roadside Vendors

---

## 🌟 Executive Summary & Innovation Highlights
**VendorSaathi** is a production-grade, globally deployable full-stack ecosystem designed specifically for rural, village, and roadside mobile vendors (selling on push carts, mopeds, bicycles, and mini-trucks).

1. **🎙️ Universal "Ask Saathi AI" Voice Assistant**: One conversational AI for vendors *and* customers across 11 Indic languages (Kannada, Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati, Punjabi, Malayalam + English). Speak naturally — *"Add 5 kg tomatoes"*, *"How much Udhaar does Ravi have?"*, *"ನನಗೆ 1 ಕೆಜಿ ಟೊಮೇಟೊ ಬೇಕು"* — and it detects the language, queries real data or performs the action (money-changing actions require spoken yes/no confirmation), and replies with spoken audio + localized numerals. Works offline by replaying the last-synced cached answers, clearly marked "offline — last synced".
2. **📍 Live Village GPS Radar & Route Tracker**: Real-time GPS detection, animated roadside mobile cart movement across village lanes, and traditional arrival bell chime (*"ತರಕಾರಿ ಬಂತು ತರಕಾರಿ!"*).
3. **🧠 AI-Driven Demand Forecasting & Perishable Protection**: Random Forest & XGBoost time-series modeling incorporating weather, day-of-week, and historical sales velocity.
4. **📍 Intelligent Mobility & Anti-Clustering**: Multi-vendor spatial optimization to prevent market saturation and optimize travel routes.
5. **📒 Digital Udhaar (Credit) Ledger**: Automatic balance tracking with one-click WhatsApp reminder deep links.
6. **⚡ Offline-First Architecture**: Outbox mutation queue allowing sales and stock updates in zero-connectivity zones with automatic conflict-free synchronization upon reconnection.
7. **🌍 Worldwide Production & Cloud Ready**: Multi-stage Dockerized containers for 1-command cloud hosting on AWS, Render, Railway, or DigitalOcean.

---

## 🏗️ System Architecture

```
                                  CUSTOMER WEB PORTAL (React / Vite / Tailwind)
                                                 │
                                                 ▼
                                  FASTAPI CENTRAL BACKEND SERVER (Python)
                                                 │
    ┌───────────────────────┬────────────────────┴───────────────────┬───────────────────────┐
    ▼                       ▼                                        ▼                       ▼
Database Layer         Voice Processing Engine                  AI/ML Engine            Mobility & Routing
- PostgreSQL / SQLite  - STT Pipeline (Web Speech/Whisper)      - Demand Prediction      - Anti-Clustering Alg
- Sales / Udhaar       - Intent & Slot Extraction               - Profit Analytics       - OSRM / Haversine
- Outbox Sync Queue    - Kannada TTS Synthesis (gTTS)           - Stock Optimizer        - Weather Advisory
                                                 ▲
                                                 │ (REST & Offline Delta Sync)
                                  VENDOR ANDROID APP (Flutter)
```

---

## 🚀 Quick Start & Local Run (Windows 11)

### 1. One-Click Batch Launch
Double-click:
📂 **`start_vendorsathi.bat`**

### 2. Manual Terminal Launch

**Start Backend (Port 8002):**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8002
```
- **Backend API Root**: `http://localhost:8002`
- **Interactive Swagger Documentation**: `http://localhost:8002/docs`

**Start Frontend (Port 3000):**
```powershell
cd frontend
npm run dev
```
- **Customer Web Portal**: `http://localhost:3000`

---

## 🌐 Worldwide Production Cloud Deployment (Docker)

To deploy VendorSaathi on any cloud provider (AWS EC2, DigitalOcean, Railway, Render, GCP):

```bash
docker-compose up --build -d
```
- Automatically builds the FastAPI backend and Nginx production frontend.
- Proxies API traffic and WebSockets with Gzip compression and zero-configuration networking.

---

## 🔑 Pre-Configured Demonstration Accounts

| Role | Mobile Number | Password / PIN | Description |
| :--- | :--- | :--- | :--- |
| **Vendor** | `9876543210` | `1234` | **Ramesh Fresh Vegetables Cart** (Pre-populated with 8 products, 5-day sales history, and active Udhaar ledger) |
| **Vendor (Peer)** | `9876543211` | `1234` | **Manjunath Seasonal Fruits** (Active competitor for mobility anti-clustering demo) |
| **Customer** | `9876543220` | `1234` | **Priya Sharma** (Silver tier member with 340 loyalty points) |

---

## 🎓 Academic IEEE References (2025–2026)
1. E. Dritsas and M. Trigka, “Machine Learning in E-Commerce: Trends, Applications, and Future Challenges,” *IEEE Access*, vol. 13, pp. 99048–99049, 2025.
2. G. Gupta, W. M. Lim, N. Chaudhuri, and D. Sharma, “Alexa, it’s not just us! Voice commerce through the lens of service providers and consumers,” *Journal of Service Management*, vol. 37, no. 1, pp. 105–140, 2026.
3. A. Wasilewski, Y. Chawla, and E. Pralat, “Enhanced E-Commerce Personalization Through AI-Powered Content Generation Tools,” *IEEE Access*, vol. 13, pp. 48083–48083, 2025.
4. M. S. Nule, P. Tondewad, and M. Dhanvijay, “E-Commerce Engineering Navigating Web Development Based Voice for Local,” in *Proc. IEEE 5th Int. Conf. on Cybernetics, Cognition and Machine Learning Applications (ICCCMLA)*, 2023, pp. 540–544.
5. A. S. Tulshan and S. N. Dhage, “Survey on Virtual Assistant: Google Assistant, Siri, Cortana, Alexa,” in *Proc. Int. Symp. Signal Processing and Intelligent Recognition Systems*, Springer, 2019, pp. 190–201.
6. D. S. Zwakman, D. Pal, and C. Arpnikanondt, “Usability Evaluation of AI-Based Voice Assistants: The Case of Amazon Alexa,” *Social Network Computing Sciences*, vol. 2, no. 1, 2021.
7. A. Natto, C. Begg, and G. McRobbie, “Simple Social Commerce for Microenterprises: Initial Investigations of a Global Phenomenon,” in *Proc. SAI Computing Conf.*, 2016, pp. 115–162.
8. C. N. Kiran and G. N. Kumar, “Reliable OSPM Schema for Secure Transaction Using Mobile Agent in Micropayment System,” in *Proc. 4th Int. Conf. on Computing, Communication and Networking Technologies (ICCCNT)*, 2013, pp. 1–7.

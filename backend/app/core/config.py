from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_PATH = (BACKEND_DIR / "vendorsathi.db").as_posix()


class Settings(BaseSettings):
    PROJECT_NAME: str = "VendorSaathi Backend API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "vendorsathi_jwt_secret_key_change_in_production_987654321"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    ALGORITHM: str = "HS256"

    # Database connection URL.
    # Default: SQLite file anchored to backend/vendorsathi.db (zero-setup demo).
    # MySQL Workbench/server: create backend/.env with a line like
    #   DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/vendorsathi?charset=utf8mb4
    # (requires `pip install pymysql` — see docs/MYSQL_WORKBENCH_SETUP.md)
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH}"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8002",
        "http://127.0.0.1:8002",
        "*",
    ]

    # Operational Mode
    DEMO_MODE: bool = True

    # Port the frontend dev server runs on (used for the login-screen QR that
    # encodes the phone URL, e.g. http://<lan-ip>:3000)
    FRONTEND_PORT: int = 3000

    # External APIs
    OPENWEATHER_API_KEY: str = ""
    OPENROUTESERVICE_API_KEY: str = ""
    BHASHINI_API_KEY: str = ""
    BHASHINI_USER_ID: str = ""

    # SMS / OTP delivery (MSG91 — India)
    # Leave AUTH_KEY empty to keep OTP delivery in demo mode (code returned in the API response).
    # To send real SMS set AUTH_KEY, SENDER_ID and TEMPLATE_ID (all DLT-registered in India).
    MSG91_AUTH_KEY: str = ""
    MSG91_SENDER_ID: str = ""
    MSG91_TEMPLATE_ID: str = ""
    MSG91_ROUTE: str = "4"           # 4 = transactional
    MSG91_OTP_VAR: str = "VAR1"      # template variable that carries the OTP
    MSG91_COUNTRY_CODE: str = "91"
    MSG91_API_URL: str = "https://control.msg91.com/api/v5/flow/"

    # SMS / OTP delivery via Fast2SMS (India, free ₹50 credit, OTP route needs no DLT).
    # Sign up at fast2sms.com, copy the Dev API authorization key, and set FAST2SMS_API_KEY.
    # This takes priority over MSG91 when both are configured.
    FAST2SMS_API_KEY: str = ""
    FAST2SMS_ROUTE: str = "otp"      # Fast2SMS reaches any Indian number on this route
    FAST2SMS_API_URL: str = "https://www.fast2sms.com/dev/bulkV2"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

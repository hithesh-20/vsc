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
        "http://localhost:8000",
        "http://127.0.0.1:8000",
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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

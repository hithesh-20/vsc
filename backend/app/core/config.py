from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "VendorSaathi Backend API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "vendorsathi_jwt_secret_key_change_in_production_987654321"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    ALGORITHM: str = "HS256"

    # Database connection URL
    DATABASE_URL: str = "sqlite:///./vendorsathi.db"

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

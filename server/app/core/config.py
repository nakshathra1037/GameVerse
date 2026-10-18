
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "GameVerse API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Server settings
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # MongoDB connection
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "gameverse"

    # JWT Authentication
    JWT_SECRET_KEY: str = "gameverse_super_secret_jwt_key_2026_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # Short-lived access token
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7     # Long-lived refresh token

    # Rate Limiting
    RATE_LIMIT_LOGIN_MAX_ATTEMPTS: int = 5
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

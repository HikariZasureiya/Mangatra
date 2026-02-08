from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

class Settings(BaseSettings):
    BASE_DIR: Path = Path(__file__).resolve().parent.parent

    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    DATABASE_URI: str
    model_config = SettingsConfigDict(
        case_sensitive=True, env_file=".env", extra="ignore"
    )

settings = Settings()

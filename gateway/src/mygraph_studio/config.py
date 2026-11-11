from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mygraph_host: str = "localhost"
    mygraph_port: int = 6660
    mygraph_timeout: float = 30.0
    studio_db_path: Path = Path("studio.db")
    cors_origins: list[str] = []
    static_dir: Path | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()

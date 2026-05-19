import os
from functools import lru_cache
from pydantic import BaseModel


class Settings(BaseModel):
    database_url: str
    markitdown_url: str
    unstructured_url: str
    flashcard_gen_url: str
    firebase_credentials_path: str


def _load_settings() -> Settings:
    return Settings(
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://user:password@db/dbname",
        ),
        markitdown_url=os.getenv(
            "MARKITDOWN_URL",
            "http://markitdown:8490/process_file",
        ),
        unstructured_url=os.getenv(
            "UNSTRUCTURED_URL",
            "http://unstructured:8000/general/v0/general",
        ),
        flashcard_gen_url=os.getenv(
            "FLASHCARD_GEN_URL",
            "http://flashcard-gen:8000/generate",
        ),
        firebase_credentials_path=os.getenv(
            "FIREBASE_CREDENTIALS_PATH",
            "serviceAccountKey.json",
        ),
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Restituisce un singleton di Settings, così non rileggiamo le env ogni volta.
    """
    return _load_settings()

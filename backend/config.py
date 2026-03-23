from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/translator.db"
    upload_dir: str = "./uploads"
    cover_dir: str = "./covers"
    pages_dir: str = "./pages"
    max_chunk_chars: int = 1800
    tesseract_languages: str = "eng"
    cors_origins: str = "http://localhost:5173"
    ollama_url: str = "http://ollama:11434"
    ollama_model: str = "translategemma"

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    def ensure_dirs(self):
        for d in [self.upload_dir, self.cover_dir, self.pages_dir, "data"]:
            Path(d).mkdir(parents=True, exist_ok=True)


settings = Settings()

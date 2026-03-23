from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .config import settings
from .database import engine
from .models import book, translation  # noqa: F401 - ensure models are imported for create_all
from .database import Base
from .routers import books, translations, viewer

settings.ensure_dirs()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Tradutor de Histórias", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(books.router)
app.include_router(translations.router)
app.include_router(viewer.router)

# Serve uploaded files and covers
for dir_path, mount_path in [
    (settings.upload_dir, "/uploads"),
    (settings.cover_dir, "/covers"),
    (settings.pages_dir, "/pages"),
]:
    p = Path(dir_path)
    p.mkdir(parents=True, exist_ok=True)
    app.mount(mount_path, StaticFiles(directory=str(p)), name=mount_path.strip("/"))


@app.get("/health")
def health():
    return {"status": "ok"}

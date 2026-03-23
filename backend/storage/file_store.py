import shutil
from pathlib import Path
from fastapi import UploadFile
from ..config import settings

CHUNK_SIZE = 1024 * 1024  # 1 MB


def page_image_url(image_path: str) -> str:
    """Convert an absolute image_path to a URL served by the /pages static mount."""
    try:
        pages_dir = Path(settings.pages_dir).resolve()
        rel = Path(image_path).resolve().relative_to(pages_dir)
        return f"/pages/{rel.as_posix()}"
    except (ValueError, TypeError):
        return ""


ALLOWED_FORMATS = {
    ".pdf": "pdf",
    ".epub": "epub",
    ".cbz": "cbz",
    ".cbr": "cbr",
    ".jpg": "image",
    ".jpeg": "image",
    ".png": "image",
    ".webp": "image",
}


def detect_format(filename: str) -> str | None:
    ext = Path(filename).suffix.lower()
    return ALLOWED_FORMATS.get(ext)


async def save_upload(file: UploadFile, book_uuid: str) -> str:
    ext = Path(file.filename).suffix.lower()
    upload_dir = Path(settings.upload_dir) / book_uuid
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / f"original{ext}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f, length=CHUNK_SIZE)
    return str(dest)


async def save_page_image(file: UploadFile, book_uuid: str, page_num: int) -> str:
    ext = Path(file.filename).suffix.lower()
    pages_dir = Path(settings.pages_dir) / book_uuid
    pages_dir.mkdir(parents=True, exist_ok=True)
    dest = pages_dir / f"page_{page_num:04d}{ext}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f, length=CHUNK_SIZE)
    return str(dest)


def delete_book_files(book_uuid: str) -> None:
    for base_dir in [settings.upload_dir, settings.pages_dir, settings.cover_dir]:
        path = Path(base_dir) / book_uuid
        if path.exists():
            shutil.rmtree(path, ignore_errors=True)
    # Also remove cover file if it exists as a direct file
    cover = Path(settings.cover_dir) / f"{book_uuid}.jpg"
    if cover.exists():
        cover.unlink(missing_ok=True)

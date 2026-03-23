from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.book import Book, Chapter, Page
from ..storage.file_store import page_image_url

router = APIRouter(prefix="/api/viewer", tags=["viewer"])


@router.get("/{book_uuid}/text")
def get_text_content(
    book_uuid: str,
    chapter_id: Optional[int] = Query(None),
    side: str = Query("both"),
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.uuid == book_uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")

    if chapter_id:
        chapter = db.query(Chapter).filter(
            Chapter.id == chapter_id, Chapter.book_id == book.id
        ).first()
    else:
        chapter = (
            db.query(Chapter)
            .filter(Chapter.book_id == book.id)
            .order_by(Chapter.index)
            .first()
        )

    if not chapter:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado.")

    result = {
        "chapter": {
            "id": chapter.id,
            "index": chapter.index,
            "title": chapter.title,
            "translation_status": chapter.translation_status,
        }
    }
    if side in ("original", "both"):
        result["original_text"] = chapter.original_text
    if side in ("translated", "both"):
        result["translated_text"] = chapter.translated_text
    return result


@router.get("/{book_uuid}/page")
def get_page_content(
    book_uuid: str,
    page_number: int = Query(1),
    side: str = Query("both"),
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.uuid == book_uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")

    page = db.query(Page).filter(
        Page.book_id == book.id, Page.page_number == page_number
    ).first()

    if not page:
        raise HTTPException(status_code=404, detail="Página não encontrada.")

    result = {
        "page": {
            "id": page.id,
            "page_number": page.page_number,
            "translation_status": page.translation_status,
            "image_url": page_image_url(page.image_path) if page.image_path else None,
        }
    }
    if side in ("original", "both"):
        result["original_text"] = page.original_text
    if side in ("translated", "both"):
        result["translated_text"] = page.translated_text
    return result

from datetime import datetime
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models.book import Book, Chapter, Page
from ..models.translation import TranslationJob
from ..services.chunker import chunk_text
from ..services.translator import translate_chunk
from ..config import settings


def _is_cancelled(db: Session, job_id: int) -> bool:
    db.expire_all()
    job = db.get(TranslationJob, job_id)
    return job is None or job.status == "cancelled"


def run_translation(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.get(TranslationJob, job_id)
        if job is None:
            return

        job.status = "running"
        db.commit()

        book = db.get(Book, job.book_id)
        book.translation_status = "translating"
        db.commit()

        if book.format in ("pdf", "epub"):
            _translate_chapters(db, job, book)
        else:
            _translate_pages(db, job, book)

        job = db.get(TranslationJob, job_id)
        if job.status != "cancelled":
            job.status = "done"
            job.finished_at = datetime.utcnow()
            book = db.get(Book, job.book_id)
            book.translation_status = "done"
            book.updated_at = datetime.utcnow()
            db.commit()

    except Exception as e:
        try:
            job = db.get(TranslationJob, job_id)
            if job:
                job.status = "error"
                job.error_message = str(e)
                job.finished_at = datetime.utcnow()
                book = db.get(Book, job.book_id)
                if book:
                    book.translation_status = "error"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _translate_chapters(db: Session, job: TranslationJob, book: Book) -> None:
    if job.scope == "chapter" and job.scope_id:
        units = [db.get(Chapter, job.scope_id)]
    else:
        units = db.query(Chapter).filter(
            Chapter.book_id == book.id,
            Chapter.translation_status == "pending",
        ).order_by(Chapter.index).all()

    total_chunks = sum(
        len(chunk_text(c.original_text or "", settings.max_chunk_chars))
        for c in units
    )
    job.progress_total = total_chunks
    db.commit()

    completed = 0
    for chapter in units:
        if _is_cancelled(db, job.id):
            return

        chunks = chunk_text(chapter.original_text or "", settings.max_chunk_chars)
        translated_parts = []

        for chunk in chunks:
            if _is_cancelled(db, job.id):
                return
            translated = translate_chunk(chunk)
            translated_parts.append(translated)
            completed += 1
            job = db.get(TranslationJob, job.id)
            job.progress_current = completed
            db.commit()

        chapter.translated_text = "\n\n".join(translated_parts)
        chapter.translation_status = "done"
        chapter.translated_at = datetime.utcnow()
        db.commit()


def _translate_pages(db: Session, job: TranslationJob, book: Book) -> None:
    if job.scope == "page" and job.scope_id:
        units = [db.get(Page, job.scope_id)]
    else:
        units = db.query(Page).filter(
            Page.book_id == book.id,
            Page.translation_status == "pending",
        ).order_by(Page.page_number).all()

    total_chunks = sum(
        len(chunk_text(p.original_text or "", settings.max_chunk_chars))
        for p in units
    )
    job.progress_total = max(total_chunks, 1)
    db.commit()

    completed = 0
    for page in units:
        if _is_cancelled(db, job.id):
            return

        chunks = chunk_text(page.original_text or "", settings.max_chunk_chars)
        if not chunks:
            page.translated_text = ""
            page.translation_status = "done"
            page.translated_at = datetime.utcnow()
            completed += 1
            job = db.get(TranslationJob, job.id)
            job.progress_current = completed
            db.commit()
            continue

        translated_parts = []
        for chunk in chunks:
            if _is_cancelled(db, job.id):
                return
            translated = translate_chunk(chunk)
            translated_parts.append(translated)
            completed += 1
            job = db.get(TranslationJob, job.id)
            job.progress_current = completed
            db.commit()

        page.translated_text = "\n\n".join(translated_parts)
        page.translation_status = "done"
        page.translated_at = datetime.utcnow()
        db.commit()

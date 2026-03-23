import threading
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.book import Book
from ..models.translation import TranslationJob
from ..schemas.translation import TranslationJobSchema, StartTranslationSchema
from ..tasks.translation_task import run_translation

router = APIRouter(prefix="/api/translations", tags=["translations"])


@router.post("/{book_uuid}/start", response_model=TranslationJobSchema)
def start_translation(
    book_uuid: str,
    data: StartTranslationSchema,
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.uuid == book_uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")

    job = TranslationJob(
        book_id=book.id,
        scope=data.scope,
        scope_id=data.scope_id,
        status="queued",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    t = threading.Thread(target=run_translation, args=(job.id,), daemon=True)
    t.start()

    return job


@router.get("/{book_uuid}/job/{job_id}", response_model=TranslationJobSchema)
def get_job(book_uuid: str, job_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.uuid == book_uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    job = db.query(TranslationJob).filter(
        TranslationJob.id == job_id, TranslationJob.book_id == book.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return job


@router.post("/{book_uuid}/job/{job_id}/cancel", status_code=200)
def cancel_job(book_uuid: str, job_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.uuid == book_uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    job = db.query(TranslationJob).filter(
        TranslationJob.id == job_id, TranslationJob.book_id == book.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    if job.status in ("done", "error"):
        raise HTTPException(status_code=400, detail="Job já finalizado.")
    job.status = "cancelled"
    book.translation_status = "pending"
    db.commit()
    return {"ok": True}


@router.get("/{book_uuid}/jobs", response_model=list[TranslationJobSchema])
def list_jobs(book_uuid: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.uuid == book_uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    return (
        db.query(TranslationJob)
        .filter(TranslationJob.book_id == book.id)
        .order_by(TranslationJob.created_at.desc())
        .all()
    )

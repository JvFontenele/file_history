import shutil
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.book import Book, Chapter, Page, Tag
from ..schemas.book import BookSchema, ChapterSchema, PageSchema, BookUpdateSchema, ReorderPagesSchema, PreviewPageSchema
from ..storage.file_store import detect_format, save_upload, save_page_image, delete_book_files, page_image_url
from ..services.extraction.image_extractor import ImageExtractor, ocr_image
from ..config import settings

router = APIRouter(prefix="/api/books", tags=["books"])


def _get_extractor(fmt: str, book_id: int, db: Session):
    if fmt == "pdf":
        from ..services.extraction.pdf_extractor import PDFExtractor
        return PDFExtractor(book_id, db)
    elif fmt == "epub":
        from ..services.extraction.epub_extractor import EPUBExtractor
        return EPUBExtractor(book_id, db)
    elif fmt == "cbz":
        from ..services.extraction.cbz_extractor import CBZExtractor
        return CBZExtractor(book_id, db)
    elif fmt == "cbr":
        from ..services.extraction.cbz_extractor import CBRExtractor
        return CBRExtractor(book_id, db)
    elif fmt == "image":
        return ImageExtractor(book_id, db)
    return None


def _run_extraction(book_id: int, file_path: str, fmt: str):
    from ..database import SessionLocal
    db = SessionLocal()
    try:
        extractor = _get_extractor(fmt, book_id, db)
        if extractor:
            extractor.extract(file_path)
    except Exception as e:
        book = db.get(Book, book_id)
        if book:
            book.translation_status = "error"
            db.commit()
    finally:
        db.close()


_CHUNK_TMP = Path("/tmp/book_chunks")


@router.post("/upload/chunk")
async def upload_chunk(
    session_id: str = Form(...),
    chunk_index: int = Form(...),
    file: UploadFile = File(...),
):
    chunk_dir = _CHUNK_TMP / session_id
    chunk_dir.mkdir(parents=True, exist_ok=True)
    with open(chunk_dir / f"{chunk_index:06d}", "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"ok": True}


@router.post("/upload/finalize", response_model=BookSchema)
async def finalize_upload(
    session_id: str = Form(...),
    filename: str = Form(...),
    total_chunks: int = Form(...),
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    tags: list[str] = Form(default=[]),
    db: Session = Depends(get_db),
):
    fmt = detect_format(filename)
    if not fmt:
        raise HTTPException(status_code=400, detail="Formato de arquivo não suportado.")

    book = Book(
        title=title or Path(filename).stem,
        author=author,
        format=fmt,
        translation_status="pending",
    )
    db.add(book)
    db.commit()
    db.refresh(book)

    chunk_dir = _CHUNK_TMP / session_id
    ext = Path(filename).suffix.lower()
    upload_dir = Path(settings.upload_dir) / book.uuid
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / f"original{ext}"

    with open(dest, "wb") as out:
        for i in range(total_chunks):
            with open(chunk_dir / f"{i:06d}", "rb") as chunk_f:
                shutil.copyfileobj(chunk_f, out)
    shutil.rmtree(str(chunk_dir), ignore_errors=True)

    book.file_path = str(dest)
    db.commit()
    _apply_tags(db, book, tags)

    t = threading.Thread(target=_run_extraction, args=(book.id, str(dest), fmt), daemon=True)
    t.start()

    db.refresh(book)
    return book


@router.post("/upload", response_model=BookSchema)
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    tags: list[str] = Form(default=[]),
    db: Session = Depends(get_db),
):
    fmt = detect_format(file.filename or "")
    if not fmt:
        raise HTTPException(status_code=400, detail="Formato de arquivo não suportado.")

    book = Book(
        title=title or Path(file.filename).stem,
        author=author,
        format=fmt,
        translation_status="pending",
    )
    db.add(book)
    db.commit()
    db.refresh(book)

    file_path = await save_upload(file, book.uuid)
    book.file_path = file_path
    db.commit()

    _apply_tags(db, book, tags)

    # Run extraction in background thread (FastAPI BackgroundTasks don't support blocking I/O well)
    t = threading.Thread(target=_run_extraction, args=(book.id, file_path, fmt), daemon=True)
    t.start()

    db.refresh(book)
    return book


@router.post("/create-hq", response_model=BookSchema)
async def create_hq(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    author: Optional[str] = Form(None),
    tags: list[str] = Form(default=[]),
    pages: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    book = Book(
        title=title,
        author=author,
        format="image_collection",
        translation_status="extracting",
    )
    db.add(book)
    db.commit()
    db.refresh(book)

    _apply_tags(db, book, tags)

    # Save pages and start OCR in background
    saved_paths = []
    for i, page_file in enumerate(pages, start=1):
        path = await save_page_image(page_file, book.uuid, i)
        saved_paths.append((i, path))

    if saved_paths:
        book.cover_path = saved_paths[0][1]
        db.commit()

    def _ocr_all(book_id: int, paths: list[tuple[int, str]]):
        from ..database import SessionLocal
        inner_db = SessionLocal()
        try:
            b = inner_db.get(Book, book_id)
            for page_num, img_path in paths:
                try:
                    text = ocr_image(img_path)
                except Exception:
                    text = ""
                p = Page(
                    book_id=book_id,
                    page_number=page_num,
                    image_path=img_path,
                    original_text=text,
                    translation_status="pending",
                )
                inner_db.add(p)
                inner_db.commit()
            b.total_pages = len(paths)
            b.translation_status = "pending"
            b.updated_at = datetime.utcnow()
            inner_db.commit()
        finally:
            inner_db.close()

    t = threading.Thread(target=_ocr_all, args=(book.id, saved_paths), daemon=True)
    t.start()

    db.refresh(book)
    return book


@router.get("", response_model=list[BookSchema])
def list_books(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    fmt: Optional[str] = Query(None, alias="format"),
    tag: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Book)
    if search:
        like = f"%{search}%"
        q = q.filter((Book.title.ilike(like)) | (Book.author.ilike(like)))
    if status:
        q = q.filter(Book.translation_status == status)
    if fmt:
        q = q.filter(Book.format == fmt)
    if tag:
        q = q.join(Book.tags).filter(Tag.name == tag)
    q = q.order_by(Book.created_at.desc())
    return q.offset((page - 1) * limit).limit(limit).all()


@router.get("/{uuid}", response_model=BookSchema)
def get_book(uuid: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.uuid == uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    return book


@router.patch("/{uuid}", response_model=BookSchema)
def update_book(uuid: str, data: BookUpdateSchema, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.uuid == uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    if data.title is not None:
        book.title = data.title
    if data.author is not None:
        book.author = data.author
    if data.tags is not None:
        _apply_tags(db, book, data.tags)
    book.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(book)
    return book


@router.delete("/{uuid}", status_code=204)
def delete_book(uuid: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.uuid == uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    delete_book_files(uuid)
    db.delete(book)
    db.commit()


@router.get("/{uuid}/preview", response_model=list[PreviewPageSchema])
def get_book_preview(uuid: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.uuid == uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    result = []
    for page in book.pages:
        snippet = None
        if page.original_text:
            snippet = page.original_text[:300].strip()
        result.append(PreviewPageSchema(
            page_number=page.page_number,
            image_url=page_image_url(page.image_path) if page.image_path else None,
            text_snippet=snippet,
        ))
    return result


@router.get("/{uuid}/chapters", response_model=list[ChapterSchema])
def list_chapters(uuid: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.uuid == uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    return book.chapters


@router.get("/{uuid}/chapters/{chapter_id}", response_model=ChapterSchema)
def get_chapter(uuid: str, chapter_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.uuid == uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id, Chapter.book_id == book.id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado.")
    return chapter


@router.get("/{uuid}/pages", response_model=list[PageSchema])
def list_pages(uuid: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.uuid == uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    return book.pages


@router.get("/{uuid}/pages/{page_id}", response_model=PageSchema)
def get_page(uuid: str, page_id: int, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.uuid == uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    page = db.query(Page).filter(Page.id == page_id, Page.book_id == book.id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Página não encontrada.")
    return page


@router.patch("/{uuid}/pages/reorder", status_code=200)
def reorder_pages(uuid: str, data: ReorderPagesSchema, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.uuid == uuid).first()
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    for new_num, page_id in enumerate(data.order, start=1):
        page = db.query(Page).filter(Page.id == page_id, Page.book_id == book.id).first()
        if page:
            page.page_number = new_num
    db.commit()
    return {"ok": True}


def _apply_tags(db: Session, book: Book, tag_names: list[str]):
    book.tags = []
    for name in tag_names:
        name = name.strip()
        if not name:
            continue
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            db.flush()
        book.tags.append(tag)
    db.commit()

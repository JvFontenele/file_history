import shutil
from pathlib import Path
from datetime import datetime
import fitz  # pymupdf
from sqlalchemy.orm import Session
from ...models.book import Book, Chapter, Page
from ...config import settings
from .base import BaseExtractor


class PDFExtractor(BaseExtractor):
    def extract(self, file_path: str) -> None:
        doc = fitz.open(file_path)
        book = self.db.get(Book, self.book_id)
        book.translation_status = "extracting"
        self.db.commit()

        self._extract_cover(doc, book)
        self._extract_chapters(doc, book)
        self._render_pages(doc, book)

        book.updated_at = datetime.utcnow()
        self.db.commit()
        doc.close()

    def _extract_chapters(self, doc: fitz.Document, book: Book) -> None:
        chapters = []
        current_title = "Início"
        current_text_blocks = []
        chapter_index = 0
        toc = doc.get_toc()

        if toc:
            toc_map = {entry[2] - 1: entry[1] for entry in toc}
            for page_num in range(len(doc)):
                if page_num in toc_map:
                    if current_text_blocks:
                        chapters.append((chapter_index, current_title, "\n\n".join(current_text_blocks)))
                        chapter_index += 1
                    current_title = toc_map[page_num]
                    current_text_blocks = []
                page = doc[page_num]
                text = page.get_text("text").strip()
                if text:
                    current_text_blocks.append(text)
            if current_text_blocks:
                chapters.append((chapter_index, current_title, "\n\n".join(current_text_blocks)))
        else:
            PAGES_PER_CHAPTER = 10
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text("text").strip()
                if text:
                    current_text_blocks.append(text)
                if (page_num + 1) % PAGES_PER_CHAPTER == 0 or page_num == len(doc) - 1:
                    if current_text_blocks:
                        chapters.append((
                            chapter_index,
                            f"Capítulo {chapter_index + 1}",
                            "\n\n".join(current_text_blocks)
                        ))
                        chapter_index += 1
                        current_text_blocks = []

        total_chars = 0
        for idx, title, text in chapters:
            chapter = Chapter(
                book_id=self.book_id,
                index=idx,
                title=title,
                original_text=text,
                char_count=len(text),
                translation_status="pending",
            )
            self.db.add(chapter)
            total_chars += len(text)

        book.total_chapters = len(chapters)
        book.total_chars = total_chars
        book.translation_status = "pending"
        self.db.commit()

    def _render_pages(self, doc: fitz.Document, book: Book) -> None:
        """Render each PDF page as a JPEG thumbnail and create Page records."""
        pages_dir = Path(settings.pages_dir) / book.uuid
        pages_dir.mkdir(parents=True, exist_ok=True)

        # Scale: 1.0 gives ~72dpi; use 1.5 for a readable preview (~108dpi)
        matrix = fitz.Matrix(1.5, 1.5)

        for page_num in range(len(doc)):
            page = doc[page_num]
            img_path = pages_dir / f"page_{page_num + 1:04d}.jpg"
            try:
                pix = page.get_pixmap(matrix=matrix)
                pix.save(str(img_path), jpg_quality=75)
            except Exception:
                continue

            text = page.get_text("text").strip()

            page_record = Page(
                book_id=self.book_id,
                page_number=page_num + 1,
                image_path=str(img_path),
                original_text=text or None,
                translation_status="pending",
            )
            self.db.add(page_record)

        book.total_pages = len(doc)
        self.db.commit()

    def _extract_cover(self, doc: fitz.Document, book: Book) -> None:
        if len(doc) == 0:
            return
        try:
            page = doc[0]
            pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
            cover_dir = Path(settings.cover_dir)
            cover_dir.mkdir(parents=True, exist_ok=True)
            cover_path = cover_dir / f"{book.uuid}.jpg"
            pix.save(str(cover_path))
            book.cover_path = str(cover_path)
            self.db.commit()
        except Exception:
            pass

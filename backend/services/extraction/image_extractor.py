from datetime import datetime
from pathlib import Path
import pytesseract
from PIL import Image
from sqlalchemy.orm import Session
from ...models.book import Book, Page
from ...config import settings
from .base import BaseExtractor


def ocr_image(image_path: str) -> str:
    img = Image.open(image_path).convert("L")  # grayscale
    # Mild threshold to improve OCR on comic art
    img = img.point(lambda x: 0 if x < 128 else 255, "1")
    text = pytesseract.image_to_string(img, lang=settings.tesseract_languages)
    return text.strip()


class ImageExtractor(BaseExtractor):
    """Extractor for a single image file uploaded as a book."""

    def extract(self, file_path: str) -> None:
        book_orm = self.db.get(Book, self.book_id)
        book_orm.translation_status = "extracting"
        self.db.commit()

        text = ocr_image(file_path)

        page = Page(
            book_id=self.book_id,
            page_number=1,
            image_path=file_path,
            original_text=text,
            translation_status="pending",
        )
        self.db.add(page)

        book_orm.total_pages = 1
        book_orm.cover_path = file_path
        book_orm.translation_status = "pending"
        book_orm.updated_at = datetime.utcnow()
        self.db.commit()

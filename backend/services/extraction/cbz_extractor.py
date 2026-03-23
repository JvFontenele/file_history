import zipfile
import shutil
from datetime import datetime
from pathlib import Path
from natsort import natsorted
from sqlalchemy.orm import Session
from ...models.book import Book, Page
from ...config import settings
from .base import BaseExtractor
from .image_extractor import ocr_image

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"}


class CBZExtractor(BaseExtractor):
    def extract(self, file_path: str) -> None:
        book_orm = self.db.get(Book, self.book_id)
        book_orm.translation_status = "extracting"
        self.db.commit()

        pages_dir = Path(settings.pages_dir) / book_orm.uuid
        pages_dir.mkdir(parents=True, exist_ok=True)

        # Unpack ZIP (CBZ)
        with zipfile.ZipFile(file_path, "r") as zf:
            image_names = natsorted([
                n for n in zf.namelist()
                if Path(n).suffix.lower() in IMAGE_EXTS
            ])
            zf.extractall(str(pages_dir))

        page_num = 1
        cover_set = False
        for name in image_names:
            img_path = pages_dir / name
            if not img_path.exists():
                continue

            if not cover_set:
                book_orm.cover_path = str(img_path)
                self.db.commit()
                cover_set = True

            try:
                text = ocr_image(str(img_path))
            except Exception:
                text = ""

            page = Page(
                book_id=self.book_id,
                page_number=page_num,
                image_path=str(img_path),
                original_text=text,
                translation_status="pending",
            )
            self.db.add(page)
            self.db.commit()
            page_num += 1

        book_orm.total_pages = page_num - 1
        book_orm.translation_status = "pending"
        book_orm.updated_at = datetime.utcnow()
        self.db.commit()


class CBRExtractor(BaseExtractor):
    def extract(self, file_path: str) -> None:
        try:
            import rarfile
        except ImportError:
            raise RuntimeError("rarfile not installed")

        book_orm = self.db.get(Book, self.book_id)
        book_orm.translation_status = "extracting"
        self.db.commit()

        pages_dir = Path(settings.pages_dir) / book_orm.uuid
        pages_dir.mkdir(parents=True, exist_ok=True)

        with rarfile.RarFile(file_path) as rf:
            image_names = natsorted([
                n for n in rf.namelist()
                if Path(n).suffix.lower() in IMAGE_EXTS
            ])
            rf.extractall(str(pages_dir))

        page_num = 1
        cover_set = False
        for name in image_names:
            img_path = pages_dir / name
            if not img_path.exists():
                continue

            if not cover_set:
                book_orm.cover_path = str(img_path)
                self.db.commit()
                cover_set = True

            try:
                text = ocr_image(str(img_path))
            except Exception:
                text = ""

            page = Page(
                book_id=self.book_id,
                page_number=page_num,
                image_path=str(img_path),
                original_text=text,
                translation_status="pending",
            )
            self.db.add(page)
            self.db.commit()
            page_num += 1

        book_orm.total_pages = page_num - 1
        book_orm.translation_status = "pending"
        book_orm.updated_at = datetime.utcnow()
        self.db.commit()

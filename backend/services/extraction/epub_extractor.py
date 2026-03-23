from datetime import datetime
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from ...models.book import Book, Chapter
from .base import BaseExtractor


def _html_to_text(html_content: str) -> str:
    soup = BeautifulSoup(html_content, "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    return soup.get_text(separator="\n").strip()


class EPUBExtractor(BaseExtractor):
    def extract(self, file_path: str) -> None:
        book_orm = self.db.get(Book, self.book_id)
        book_orm.translation_status = "extracting"
        self.db.commit()

        book = epub.read_epub(file_path, options={"ignore_ncx": True})

        chapters = []
        chapter_index = 0
        for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
            text = _html_to_text(item.get_content().decode("utf-8", errors="ignore"))
            if len(text) < 50:
                continue
            title = item.get_name().replace("/", " > ").replace(".xhtml", "").replace(".html", "")
            chapters.append((chapter_index, title, text))
            chapter_index += 1

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

        book_orm.total_chapters = len(chapters)
        book_orm.total_chars = total_chars
        book_orm.translation_status = "pending"
        book_orm.updated_at = datetime.utcnow()
        self.db.commit()

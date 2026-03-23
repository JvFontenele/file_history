from abc import ABC, abstractmethod
from sqlalchemy.orm import Session


class BaseExtractor(ABC):
    def __init__(self, book_id: int, db: Session):
        self.book_id = book_id
        self.db = db

    @abstractmethod
    def extract(self, file_path: str) -> None:
        """Extract text from file and persist chapters/pages to DB."""
        ...

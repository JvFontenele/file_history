from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base


class TranslationJob(Base):
    __tablename__ = "translation_jobs"

    id = Column(Integer, primary_key=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    scope = Column(String(20), nullable=False)  # full, chapter, page
    scope_id = Column(Integer)  # chapter.id or page.id
    status = Column(String(20), nullable=False, default="queued")  # queued, running, done, cancelled, error
    progress_current = Column(Integer, default=0)
    progress_total = Column(Integer, default=0)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)

    book = relationship("Book", back_populates="translation_jobs")

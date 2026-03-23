import uuid as uuid_lib
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Text, ForeignKey, Table
)
from sqlalchemy.orm import relationship
from ..database import Base


book_tags = Table(
    "book_tags",
    Base.metadata,
    Column("book_id", Integer, ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    books = relationship("Book", secondary=book_tags, back_populates="tags")


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True)
    uuid = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid_lib.uuid4()))
    title = Column(String(500), nullable=False)
    author = Column(String(300))
    # pdf, epub, cbz, cbr, image, image_collection
    format = Column(String(20), nullable=False)
    source_language = Column(String(10), default="auto")
    file_path = Column(Text)
    cover_path = Column(Text)
    total_pages = Column(Integer)
    total_chapters = Column(Integer)
    total_chars = Column(Integer)
    translation_status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tags = relationship("Tag", secondary=book_tags, back_populates="books")
    chapters = relationship("Chapter", back_populates="book", cascade="all, delete-orphan", order_by="Chapter.index")
    pages = relationship("Page", back_populates="book", cascade="all, delete-orphan", order_by="Page.page_number")
    translation_jobs = relationship("TranslationJob", back_populates="book", cascade="all, delete-orphan")


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    index = Column(Integer, nullable=False)
    title = Column(String(500))
    original_text = Column(Text)
    translated_text = Column(Text)
    char_count = Column(Integer)
    translation_status = Column(String(20), nullable=False, default="pending")
    translated_at = Column(DateTime)

    book = relationship("Book", back_populates="chapters")


class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=False)
    image_path = Column(Text)
    original_text = Column(Text)
    translated_text = Column(Text)
    translation_status = Column(String(20), nullable=False, default="pending")
    translated_at = Column(DateTime)

    book = relationship("Book", back_populates="pages")

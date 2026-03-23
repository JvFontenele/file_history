from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TagSchema(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ChapterSchema(BaseModel):
    id: int
    index: int
    title: Optional[str]
    char_count: Optional[int]
    translation_status: str
    translated_at: Optional[datetime]
    original_text: Optional[str] = None
    translated_text: Optional[str] = None

    model_config = {"from_attributes": True}


class PageSchema(BaseModel):
    id: int
    page_number: int
    image_path: Optional[str]
    translation_status: str
    translated_at: Optional[datetime]
    original_text: Optional[str] = None
    translated_text: Optional[str] = None

    model_config = {"from_attributes": True}


class BookSchema(BaseModel):
    id: int
    uuid: str
    title: str
    author: Optional[str]
    format: str
    source_language: str
    cover_path: Optional[str]
    total_pages: Optional[int]
    total_chapters: Optional[int]
    total_chars: Optional[int]
    translation_status: str
    created_at: datetime
    updated_at: datetime
    tags: list[TagSchema] = []

    model_config = {"from_attributes": True}


class BookUpdateSchema(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    tags: Optional[list[str]] = None


class ReorderPagesSchema(BaseModel):
    order: list[int]  # list of page IDs in new order

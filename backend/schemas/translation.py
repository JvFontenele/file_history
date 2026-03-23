from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TranslationJobSchema(BaseModel):
    id: int
    book_id: int
    scope: str
    scope_id: Optional[int]
    mode: str
    status: str
    progress_current: int
    progress_total: int
    error_message: Optional[str]
    created_at: datetime
    finished_at: Optional[datetime]

    model_config = {"from_attributes": True}


class StartTranslationSchema(BaseModel):
    scope: str = "full"        # full, chapter, page
    scope_id: Optional[int] = None
    mode: str = "chapter"      # chapter, page

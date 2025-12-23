from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class GlossaryTermCreate(BaseModel):
    source_term: str
    target_term: str
    context: Optional[str] = None
    notes: Optional[str] = None


class GlossaryTermResponse(BaseModel):
    id: int
    source_term: str
    target_term: str
    context: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class GlossaryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    industry: str
    source_language: str
    target_language: str


class GlossaryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    industry: str
    source_language: str
    target_language: str
    is_system: bool
    created_at: datetime
    terms: Optional[List[GlossaryTermResponse]] = None

    class Config:
        from_attributes = True


class GlossaryListResponse(BaseModel):
    glossaries: List[GlossaryResponse]
    total: int


class GlossaryImport(BaseModel):
    terms: List[GlossaryTermCreate]


class CSVImportResultResponse(BaseModel):
    """Response for CSV glossary import."""
    glossaries_created: int
    glossaries_updated: int
    terms_added: int
    terms_skipped: int
    errors: List[str]
    details: List[Dict[str, Any]]

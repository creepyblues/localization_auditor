from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, HttpUrl


class AuditCreate(BaseModel):
    original_url: str
    audit_url: str
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    industry: Optional[str] = None
    glossary_id: Optional[int] = None


class AuditResultResponse(BaseModel):
    id: int
    dimension: str
    score: int
    findings: Optional[List[Any]] = None
    good_examples: Optional[List[Any]] = None
    recommendations: Optional[List[str]] = None

    class Config:
        from_attributes = True


class AuditResponse(BaseModel):
    id: int
    original_url: str
    audit_url: str
    source_language: Optional[str]
    target_language: Optional[str]
    industry: Optional[str]
    status: str
    error_message: Optional[str]
    overall_score: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]
    results: Optional[List[AuditResultResponse]] = None
    content_pairs: Optional[Any] = None

    class Config:
        from_attributes = True


class AuditListResponse(BaseModel):
    audits: List[AuditResponse]
    total: int

from datetime import datetime
from enum import Enum
from typing import Optional, List, Any
from pydantic import BaseModel, HttpUrl, model_validator


class AuditMode(str, Enum):
    """Audit analysis mode."""
    AUTO = "auto"           # Try text scraping, fallback to screenshot on failure
    TEXT = "text"           # Text scraping only (original behavior)
    SCREENSHOT = "screenshot"  # Screenshot-based visual analysis only
    COMBINED = "combined"   # Both text and screenshot analysis, merged results


class AuditType(str, Enum):
    """Type of audit - comparison or standalone."""
    COMPARISON = "comparison"  # Compare original URL with localized URL
    STANDALONE = "standalone"  # Assess back-translation quality of single URL


class AuditCreate(BaseModel):
    audit_type: AuditType = AuditType.COMPARISON
    original_url: Optional[str] = None  # Required for comparison mode
    audit_url: str
    source_language: Optional[str] = None  # Required for standalone mode
    target_language: Optional[str] = None
    industry: Optional[str] = None
    glossary_id: Optional[int] = None
    audit_mode: AuditMode = AuditMode.AUTO

    @model_validator(mode='after')
    def validate_audit_type_requirements(self):
        if self.audit_type == AuditType.COMPARISON and not self.original_url:
            raise ValueError('original_url is required for comparison audits')
        if self.audit_type == AuditType.STANDALONE and not self.source_language:
            raise ValueError('source_language is required for standalone audits')
        return self


class GlossaryTermInfo(BaseModel):
    """Glossary term info for audit response."""
    source_term: str
    target_term: str
    context: Optional[str] = None

    class Config:
        from_attributes = True


class GlossaryInfo(BaseModel):
    """Glossary info embedded in audit response."""
    id: int
    name: str
    description: Optional[str] = None
    industry: str
    source_language: str
    target_language: str
    is_system: bool
    terms: Optional[List[GlossaryTermInfo]] = None

    class Config:
        from_attributes = True


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
    audit_type: str = "comparison"
    original_url: Optional[str] = None  # None for standalone audits
    audit_url: str
    source_language: Optional[str]
    target_language: Optional[str]
    industry: Optional[str]
    audit_mode: Optional[str] = None
    actual_audit_mode: Optional[str] = None
    glossary_id: Optional[int] = None
    status: str
    error_message: Optional[str]
    progress_message: Optional[str] = None
    progress_step: Optional[int] = None
    progress_total: Optional[int] = None
    overall_score: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]
    results: Optional[List[AuditResultResponse]] = None
    content_pairs: Optional[Any] = None
    original_screenshot: Optional[str] = None
    audit_screenshot: Optional[str] = None
    glossary: Optional[GlossaryInfo] = None

    # API usage and cost
    api_cost_usd: Optional[float] = None
    api_input_tokens: Optional[int] = None
    api_output_tokens: Optional[int] = None
    api_duration_ms: Optional[int] = None

    class Config:
        from_attributes = True


class AuditListResponse(BaseModel):
    audits: List[AuditResponse]
    total: int

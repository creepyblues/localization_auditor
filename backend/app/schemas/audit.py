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
    IMAGE_UPLOAD = "image_upload"  # User-uploaded screenshot images


class ImageLabel(str, Enum):
    """Label for uploaded images."""
    ORIGINAL = "original"
    LOCALIZED = "localized"


class UploadedImageInfo(BaseModel):
    """Metadata for an uploaded image (includes base64 data for display)."""
    label: ImageLabel
    filename: str
    data: Optional[str] = None  # Base64-encoded image data


class AuditType(str, Enum):
    """Type of audit - comparison, standalone, or proficiency."""
    COMPARISON = "comparison"  # Compare original URL with localized URL
    STANDALONE = "standalone"  # Assess back-translation quality of single URL
    PROFICIENCY = "proficiency"  # Language proficiency test only


class AuditCreate(BaseModel):
    audit_type: AuditType = AuditType.COMPARISON
    original_url: Optional[str] = None  # Required for comparison mode (unless image_upload)
    audit_url: Optional[str] = None  # Required unless image_upload mode
    source_language: Optional[str] = None  # Required for standalone mode
    target_language: Optional[str] = None
    industry: Optional[str] = None
    glossary_id: Optional[int] = None
    audit_mode: AuditMode = AuditMode.AUTO

    @model_validator(mode='after')
    def validate_audit_type_requirements(self):
        # For image_upload mode, URLs are not required
        if self.audit_mode == AuditMode.IMAGE_UPLOAD:
            # URL fields are optional for image uploads
            pass
        else:
            # URL-based audits require audit_url
            if not self.audit_url:
                raise ValueError('audit_url is required for URL-based audits')
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
    audit_url: Optional[str] = None  # None for image_upload mode
    source_language: Optional[str]
    target_language: Optional[str]
    industry: Optional[str]
    audit_mode: Optional[str] = None
    actual_audit_mode: Optional[str] = None
    glossary_id: Optional[int] = None
    status: str
    error_message: Optional[str]
    blocked_reason: Optional[str] = None
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
    uploaded_images: Optional[List[UploadedImageInfo]] = None  # Image upload mode
    glossary: Optional[GlossaryInfo] = None

    # API usage and cost
    api_cost_usd: Optional[float] = None
    api_input_tokens: Optional[int] = None
    api_output_tokens: Optional[int] = None
    api_duration_ms: Optional[int] = None

    class Config:
        from_attributes = True

    @model_validator(mode='before')
    @classmethod
    def transform_uploaded_images(cls, data):
        """Transform uploaded_images from DB format to response format (include base64 data)."""
        if hasattr(data, '__dict__'):
            # SQLAlchemy model object
            if hasattr(data, 'uploaded_images') and data.uploaded_images:
                data = dict(data.__dict__)
                data['uploaded_images'] = [
                    {'label': img['label'], 'filename': img['filename'], 'data': img.get('data')}
                    for img in data['uploaded_images']
                ]
        elif isinstance(data, dict) and 'uploaded_images' in data and data['uploaded_images']:
            data['uploaded_images'] = [
                {'label': img['label'], 'filename': img['filename'], 'data': img.get('data')}
                for img in data['uploaded_images']
            ]
        return data


class AuditListResponse(BaseModel):
    audits: List[AuditResponse]
    total: int


class ProficiencyFinding(BaseModel):
    """A single finding from proficiency test."""
    issue: str
    text: str
    suggestion: str
    severity: str  # high, medium, low


class ProficiencyTestResponse(BaseModel):
    """Response for language proficiency test."""
    id: int
    status: str  # pending, analyzing, completed, failed
    url: Optional[str] = None
    score: Optional[int] = None  # 0-100
    verdict: Optional[str] = None  # Native/Near-Native/Competent/Developing/Needs Improvement
    findings: Optional[List[ProficiencyFinding]] = None
    good_examples: Optional[List[dict]] = None
    recommendations: Optional[List[str]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

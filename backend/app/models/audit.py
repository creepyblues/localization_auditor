from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AuditStatus(str, Enum):
    PENDING = "pending"
    SCRAPING = "scraping"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"  # Page access blocked (CAPTCHA, Cloudflare, etc.)


class AuditType(str, Enum):
    """Type of audit - comparison, standalone, or proficiency."""
    COMPARISON = "comparison"  # Compare original URL with localized URL
    STANDALONE = "standalone"  # Assess back-translation quality of single URL
    PROFICIENCY = "proficiency"  # Language proficiency test only


class AuditDimension(str, Enum):
    CORRECTNESS = "correctness"
    CULTURAL_RELEVANCE = "cultural_relevance"
    INDUSTRY_EXPERTISE = "industry_expertise"
    FLUENCY = "fluency"
    CONSISTENCY = "consistency"
    COMPLETENESS = "completeness"
    UI_UX = "ui_ux"
    SEO = "seo"


class Audit(Base):
    __tablename__ = "audits"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Audit type: comparison (requires original_url) or standalone (only audit_url)
    audit_type: Mapped[str] = mapped_column(String(20), default=AuditType.COMPARISON.value)

    # URLs to audit (optional for image_upload mode)
    original_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)  # Required for comparison, None for standalone
    audit_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)  # Optional for image_upload mode

    # Metadata
    source_language: Mapped[str] = mapped_column(String(10), nullable=True)  # e.g., "en"
    target_language: Mapped[str] = mapped_column(String(10), nullable=True)  # e.g., "ko"
    industry: Mapped[str] = mapped_column(String(100), nullable=True)  # e.g., "ecommerce", "adtech", "wellness"

    # Audit mode: auto, text, screenshot, combined (user selection)
    audit_mode: Mapped[str] = mapped_column(String(20), default="auto", nullable=True)

    # Actual analysis method used (set by auditor after determining method)
    actual_audit_mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Glossary used for analysis
    glossary_id: Mapped[int] = mapped_column(ForeignKey("glossaries.id"), nullable=True)

    # Status tracking
    status: Mapped[str] = mapped_column(String(50), default=AuditStatus.PENDING.value)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    blocked_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Why page was blocked

    # Progress tracking
    progress_message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    progress_step: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    progress_total: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Overall score (average of all dimensions)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=True)

    # Raw scraped content (stored for reference)
    original_content: Mapped[dict] = mapped_column(JSON, nullable=True)
    audit_content: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Aligned content pairs for side-by-side comparison
    content_pairs: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Screenshots (base64-encoded PNG images)
    original_screenshot: Mapped[str] = mapped_column(Text, nullable=True)
    audit_screenshot: Mapped[str] = mapped_column(Text, nullable=True)

    # Uploaded images for image_upload mode
    # JSON array of {label: "original"|"localized", data: base64, filename: str}
    uploaded_images: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # API usage and cost tracking
    api_cost_usd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    api_input_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    api_output_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    api_duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="audits")
    results = relationship("AuditResult", back_populates="audit", cascade="all, delete-orphan")
    glossary = relationship("Glossary", back_populates="audits")


class AuditResult(Base):
    __tablename__ = "audit_results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    audit_id: Mapped[int] = mapped_column(ForeignKey("audits.id"), nullable=False)

    # Scoring dimension
    dimension: Mapped[str] = mapped_column(String(50), nullable=False)  # AuditDimension value
    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-100

    # Detailed findings
    findings: Mapped[dict] = mapped_column(JSON, nullable=True)  # List of specific issues found
    good_examples: Mapped[dict] = mapped_column(JSON, nullable=True)  # List of well-done translations
    recommendations: Mapped[dict] = mapped_column(JSON, nullable=True)  # Suggestions for improvement

    # Relationship
    audit = relationship("Audit", back_populates="results")

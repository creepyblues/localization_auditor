from datetime import datetime
from enum import Enum
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AuditStatus(str, Enum):
    PENDING = "pending"
    SCRAPING = "scraping"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"


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

    # URLs to audit
    original_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    audit_url: Mapped[str] = mapped_column(String(2048), nullable=False)

    # Metadata
    source_language: Mapped[str] = mapped_column(String(10), nullable=True)  # e.g., "en"
    target_language: Mapped[str] = mapped_column(String(10), nullable=True)  # e.g., "ko"
    industry: Mapped[str] = mapped_column(String(100), nullable=True)  # e.g., "ecommerce", "adtech", "wellness"

    # Status tracking
    status: Mapped[str] = mapped_column(String(50), default=AuditStatus.PENDING.value)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    # Overall score (average of all dimensions)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=True)

    # Raw scraped content (stored for reference)
    original_content: Mapped[dict] = mapped_column(JSON, nullable=True)
    audit_content: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Aligned content pairs for side-by-side comparison
    content_pairs: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="audits")
    results = relationship("AuditResult", back_populates="audit", cascade="all, delete-orphan")


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

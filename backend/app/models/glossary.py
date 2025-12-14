from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Glossary(Base):
    __tablename__ = "glossaries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)  # Null for system glossaries

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    industry: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "ecommerce", "adtech", "wellness"
    source_language: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g., "en"
    target_language: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g., "ko"

    is_system: Mapped[bool] = mapped_column(Boolean, default=False)  # True for pre-built glossaries

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="glossaries")
    terms = relationship("GlossaryTerm", back_populates="glossary", cascade="all, delete-orphan")


class GlossaryTerm(Base):
    __tablename__ = "glossary_terms"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    glossary_id: Mapped[int] = mapped_column(ForeignKey("glossaries.id"), nullable=False)

    source_term: Mapped[str] = mapped_column(String(500), nullable=False)
    target_term: Mapped[str] = mapped_column(String(500), nullable=False)
    context: Mapped[str] = mapped_column(Text, nullable=True)  # Usage context or examples
    notes: Mapped[str] = mapped_column(Text, nullable=True)  # Additional notes for translators

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship
    glossary = relationship("Glossary", back_populates="terms")

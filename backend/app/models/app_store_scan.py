from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AppStoreScan(Base):
    """Persisted App Store scan history for a user."""
    __tablename__ = "app_store_scans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Scan parameters (for filtering/display in history)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    feed_type: Mapped[str] = mapped_column(String(20), nullable=False)
    country: Mapped[str] = mapped_column(String(10), nullable=False)
    total_apps: Mapped[int] = mapped_column(Integer, nullable=False)
    unique_languages: Mapped[int] = mapped_column(Integer, nullable=False)

    # Full scan result as JSON (includes apps array, statistics, etc.)
    result: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="app_store_scans")

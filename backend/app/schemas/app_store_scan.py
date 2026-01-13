from datetime import datetime
from typing import List, Any
from pydantic import BaseModel


class AppStoreScanCreate(BaseModel):
    """Request schema for saving an app store scan."""
    category: str
    feed_type: str
    country: str
    total_apps: int
    unique_languages: int
    result: dict  # Full AppStoreScanResult


class AppStoreScanResponse(BaseModel):
    """Response schema for a single app store scan."""
    id: int
    category: str
    feed_type: str
    country: str
    total_apps: int
    unique_languages: int
    result: dict
    created_at: datetime

    class Config:
        from_attributes = True


class AppStoreScanListResponse(BaseModel):
    """Response schema for listing app store scans."""
    scans: List[AppStoreScanResponse]
    total: int

"""
App Store Scanner API Routes
"""

from fastapi import APIRouter, HTTPException, Query, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import logging

from app.core.database import get_db
from app.models.user import User
from app.models.app_store_scan import AppStoreScan
from app.schemas.app_store_scan import AppStoreScanCreate, AppStoreScanResponse, AppStoreScanListResponse
from app.api.deps import get_current_user
from app.services.app_store_scanner import AppStoreScanner

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/app-store", tags=["app-store"])


@router.get("/categories")
async def list_categories():
    """
    List available App Store categories

    Returns:
        Dictionary of available category names and their genre IDs
    """
    return {
        "categories": AppStoreScanner.CATEGORIES,
        "feed_types": AppStoreScanner.FEED_TYPES,
    }


@router.get("/scan/{category}")
async def scan_category(
    category: str,
    feed_type: str = Query(default="free", description="Feed type: free, paid, or grossing"),
    limit: int = Query(default=50, ge=1, le=200, description="Number of apps to scan (1-200)"),
    country: str = Query(default="us", description="iTunes Store country code"),
):
    """
    Scan App Store top apps in a category and identify language support

    Args:
        category: Category name (e.g., health_fitness, entertainment, education)
        feed_type: Type of apps - free, paid, or grossing
        limit: Number of apps to scan (1-200)
        country: iTunes Store country code (default: us)

    Returns:
        Comprehensive report including:
        - List of apps with their language support
        - Statistics on language distribution
        - Total unique languages found

    Example:
        GET /app-store/scan/health_fitness?feed_type=free&limit=50
    """
    try:
        scanner = AppStoreScanner(country_code=country)
        result = await scanner.scan_category(
            category=category,
            feed_type=feed_type,
            limit=limit
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error scanning category {category}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error scanning App Store: {str(e)}"
        )


@router.get("/app/{app_id}")
async def get_app_details(
    app_id: str,
    country: str = Query(default="us", description="iTunes Store country code"),
):
    """
    Get detailed information about a specific app including language support

    Args:
        app_id: iTunes app ID
        country: iTunes Store country code

    Returns:
        App details including supported languages, pricing, ratings, etc.

    Example:
        GET /app-store/app/399857015
    """
    try:
        scanner = AppStoreScanner(country_code=country)
        result = await scanner.get_app_languages(app_id)

        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching app {app_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching app details: {str(e)}"
        )


# ============== Scan History CRUD Endpoints ==============

@router.post("/scans", response_model=AppStoreScanResponse, status_code=status.HTTP_201_CREATED)
async def save_scan(
    scan_data: AppStoreScanCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Save an app store scan to history."""
    scan = AppStoreScan(
        user_id=current_user.id,
        category=scan_data.category,
        feed_type=scan_data.feed_type,
        country=scan_data.country,
        total_apps=scan_data.total_apps,
        unique_languages=scan_data.unique_languages,
        result=scan_data.result
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return scan


@router.get("/scans", response_model=AppStoreScanListResponse)
async def list_scans(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all saved scans for the current user."""
    # Get total count
    count_result = await db.execute(
        select(func.count(AppStoreScan.id)).where(AppStoreScan.user_id == current_user.id)
    )
    total = count_result.scalar()

    # Get paginated results
    result = await db.execute(
        select(AppStoreScan)
        .where(AppStoreScan.user_id == current_user.id)
        .order_by(AppStoreScan.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    scans = result.scalars().all()

    return AppStoreScanListResponse(scans=scans, total=total)


@router.get("/scans/{scan_id}", response_model=AppStoreScanResponse)
async def get_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific saved scan."""
    result = await db.execute(
        select(AppStoreScan).where(
            AppStoreScan.id == scan_id,
            AppStoreScan.user_id == current_user.id
        )
    )
    scan = result.scalar_one_or_none()

    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )

    return scan


@router.delete("/scans/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a saved scan."""
    result = await db.execute(
        select(AppStoreScan).where(
            AppStoreScan.id == scan_id,
            AppStoreScan.user_id == current_user.id
        )
    )
    scan = result.scalar_one_or_none()

    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )

    await db.delete(scan)
    await db.commit()

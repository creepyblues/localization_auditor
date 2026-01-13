"""
App Store Scanner API Routes
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

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

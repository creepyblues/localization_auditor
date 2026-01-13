"""
App Store Scanner Service

Scans Apple App Store top apps by category and identifies language support for each app.
Uses Apple's iTunes RSS feeds and Lookup API.
"""

import httpx
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class AppStoreScanner:
    """Scanner for Apple App Store top apps and their language support"""

    # App Store category genre IDs
    CATEGORIES = {
        "health_fitness": 6013,
        "entertainment": 6016,
        "education": 6017,
        "games": 6014,
        "business": 6000,
        "lifestyle": 6012,
        "productivity": 6007,
        "social_networking": 6005,
        "travel": 6003,
        "utilities": 6002,
    }

    # Feed types available
    FEED_TYPES = {
        "free": "topfreeapplications",
        "paid": "toppaidapplications",
        "grossing": "topgrossingapplications",
    }

    def __init__(self, country_code: str = "us"):
        """
        Initialize App Store Scanner

        Args:
            country_code: iTunes Store country code (default: "us")
        """
        self.country_code = country_code
        self.base_rss_url = f"https://itunes.apple.com/{country_code}/rss"
        self.lookup_url = "https://itunes.apple.com/lookup"

    async def get_top_apps(
        self,
        category: str = "health_fitness",
        feed_type: str = "free",
        limit: int = 100
    ) -> List[Dict]:
        """
        Fetch top apps from App Store RSS feed

        Args:
            category: Category name (e.g., "health_fitness")
            feed_type: Feed type - "free", "paid", or "grossing"
            limit: Number of apps to fetch (max 200)

        Returns:
            List of app data dictionaries
        """
        genre_id = self.CATEGORIES.get(category)
        if not genre_id:
            raise ValueError(f"Invalid category: {category}. Valid options: {list(self.CATEGORIES.keys())}")

        feed_type_str = self.FEED_TYPES.get(feed_type)
        if not feed_type_str:
            raise ValueError(f"Invalid feed type: {feed_type}. Valid options: {list(self.FEED_TYPES.keys())}")

        url = f"{self.base_rss_url}/{feed_type_str}/limit={limit}/genre={genre_id}/json"

        logger.info(f"Fetching top {limit} {feed_type} apps from {category} category")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

        apps = []
        entries = data.get("feed", {}).get("entry", [])

        for entry in entries:
            app_id = entry.get("id", {}).get("attributes", {}).get("im:id")
            app_name = entry.get("im:name", {}).get("label", "Unknown")
            artist = entry.get("im:artist", {}).get("label", "Unknown")
            bundle_id = entry.get("id", {}).get("attributes", {}).get("im:bundleId", "")

            apps.append({
                "id": app_id,
                "name": app_name,
                "artist": artist,
                "bundle_id": bundle_id,
            })

        logger.info(f"Retrieved {len(apps)} apps from RSS feed")
        return apps

    async def get_app_languages(self, app_id: str) -> Dict:
        """
        Fetch detailed app information including language support

        Args:
            app_id: iTunes app ID

        Returns:
            Dictionary with app details and language support
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.lookup_url, params={"id": app_id})
            response.raise_for_status()
            data = response.json()

        results = data.get("results", [])
        if not results:
            logger.warning(f"No results found for app ID: {app_id}")
            return {
                "app_id": app_id,
                "languages": [],
                "error": "No data found"
            }

        app_data = results[0]

        # Extract language codes
        language_codes = app_data.get("languageCodesISO2A", [])

        return {
            "app_id": app_id,
            "app_name": app_data.get("trackName", "Unknown"),
            "artist": app_data.get("artistName", "Unknown"),
            "bundle_id": app_data.get("bundleId", ""),
            "languages": language_codes,
            "language_count": len(language_codes),
            "price": app_data.get("price", 0),
            "currency": app_data.get("currency", "USD"),
            "version": app_data.get("version", "Unknown"),
            "release_date": app_data.get("releaseDate", ""),
            "current_version_release_date": app_data.get("currentVersionReleaseDate", ""),
            "average_user_rating": app_data.get("averageUserRating", 0),
            "user_rating_count": app_data.get("userRatingCount", 0),
            "track_url": app_data.get("trackViewUrl", ""),
        }

    async def get_korean_metadata(self, app_id: str) -> Dict:
        """
        Fetch Korean localized screenshots and description for an app

        Args:
            app_id: iTunes app ID

        Returns:
            Dictionary with Korean screenshots and description preview
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    self.lookup_url,
                    params={"id": app_id, "country": "kr", "lang": "ko"}
                )
                response.raise_for_status()
                data = response.json()

            results = data.get("results", [])
            if not results:
                logger.warning(f"App {app_id} not found in Korean App Store")
                return {
                    "screenshots_ko": [],
                    "description_ko": "",
                    "ko_store_available": False
                }

            app_data = results[0]
            screenshots = app_data.get("screenshotUrls", [])

            # Log if no screenshots found
            if not screenshots:
                logger.warning(f"App {app_id} has no screenshotUrls in Korean store response")

            description = app_data.get("description", "")
            # Get first 5 lines
            lines = description.split('\n')[:5]
            description_preview = '\n'.join(lines)

            return {
                "screenshots_ko": screenshots[:3],
                "description_ko": description_preview,
                "ko_store_available": True
            }
        except Exception as e:
            logger.error(f"Error fetching Korean metadata for app {app_id}: {str(e)}")
            return {
                "screenshots_ko": [],
                "description_ko": "",
                "ko_store_available": False
            }

    async def scan_category(
        self,
        category: str = "health_fitness",
        feed_type: str = "free",
        limit: int = 100
    ) -> Dict:
        """
        Scan a category and get language support for all top apps

        Args:
            category: Category name
            feed_type: Feed type - "free", "paid", or "grossing"
            limit: Number of apps to scan

        Returns:
            Dictionary with scan results including all apps and their language support
        """
        logger.info(f"Starting scan of {category} category, {feed_type} apps, limit={limit}")

        # Get top apps from RSS feed
        top_apps = await self.get_top_apps(category, feed_type, limit)

        # Fetch language support for each app
        apps_with_languages = []

        for i, app in enumerate(top_apps, 1):
            try:
                logger.info(f"Fetching languages for app {i}/{len(top_apps)}: {app['name']}")
                app_details = await self.get_app_languages(app["id"])

                # Fetch Korean metadata if app supports Korean
                if "KO" in app_details.get("languages", []):
                    logger.info(f"Fetching Korean metadata for: {app['name']}")
                    ko_metadata = await self.get_korean_metadata(app["id"])
                    app_details.update(ko_metadata)
                else:
                    app_details["screenshots_ko"] = []
                    app_details["description_ko"] = ""
                    app_details["ko_store_available"] = False

                apps_with_languages.append(app_details)
            except Exception as e:
                logger.error(f"Error fetching languages for app {app['id']}: {str(e)}")
                apps_with_languages.append({
                    "app_id": app["id"],
                    "app_name": app["name"],
                    "artist": app["artist"],
                    "languages": [],
                    "screenshots_ko": [],
                    "description_ko": "",
                    "ko_store_available": False,
                    "error": str(e)
                })

        # Calculate statistics
        total_apps = len(apps_with_languages)
        apps_by_language_count = {}
        all_languages = set()

        for app in apps_with_languages:
            languages = app.get("languages", [])
            lang_count = len(languages)
            apps_by_language_count[lang_count] = apps_by_language_count.get(lang_count, 0) + 1
            all_languages.update(languages)

        return {
            "category": category,
            "feed_type": feed_type,
            "country_code": self.country_code,
            "total_apps_scanned": total_apps,
            "apps": apps_with_languages,
            "statistics": {
                "total_unique_languages": len(all_languages),
                "all_languages_found": sorted(list(all_languages)),
                "apps_by_language_count": apps_by_language_count,
                "average_languages_per_app": sum(len(app.get("languages", [])) for app in apps_with_languages) / total_apps if total_apps > 0 else 0,
            }
        }

# App Store Language Scanner

An automated tool to scan Apple App Store top apps by category and identify which languages each app supports.

## Overview

This feature enables you to:
- Scan top apps in any App Store category (Health & Fitness, Education, Entertainment, etc.)
- Identify language support for each app
- Get comprehensive statistics on language distribution
- Export detailed reports in JSON format

## Features

### 📊 Comprehensive Data Collection
- **26 unique languages** found across Health & Fitness apps
- **App metadata** including ratings, versions, and release dates
- **Language distribution** statistics and analytics
- **Multiple feed types**: free, paid, or top grossing apps

### 🌍 Supported Categories

The scanner supports the following App Store categories:

| Category | Genre ID | Description |
|----------|----------|-------------|
| `health_fitness` | 6013 | Health & Fitness apps |
| `entertainment` | 6016 | Entertainment apps |
| `education` | 6017 | Educational apps |
| `games` | 6014 | Games |
| `business` | 6000 | Business apps |
| `lifestyle` | 6012 | Lifestyle apps |
| `productivity` | 6007 | Productivity apps |
| `social_networking` | 6005 | Social networking apps |
| `travel` | 6003 | Travel apps |
| `utilities` | 6002 | Utility apps |

## API Endpoints

### 1. List Available Categories

```http
GET /api/app-store/categories
```

Returns all available categories and feed types.

**Response:**
```json
{
  "categories": {
    "health_fitness": 6013,
    "entertainment": 6016,
    ...
  },
  "feed_types": {
    "free": "topfreeapplications",
    "paid": "toppaidapplications",
    "grossing": "topgrossingapplications"
  }
}
```

### 2. Scan Apps by Category

```http
GET /api/app-store/scan/{category}?feed_type=free&limit=50&country=us
```

**Parameters:**
- `category` (path): Category name (e.g., `health_fitness`)
- `feed_type` (query, optional): Type of apps - `free`, `paid`, or `grossing` (default: `free`)
- `limit` (query, optional): Number of apps to scan, 1-200 (default: `50`)
- `country` (query, optional): iTunes Store country code (default: `us`)

**Example:**
```bash
curl "http://localhost:8000/api/app-store/scan/health_fitness?feed_type=free&limit=100"
```

**Response:**
```json
{
  "category": "health_fitness",
  "feed_type": "free",
  "country_code": "us",
  "total_apps_scanned": 100,
  "apps": [
    {
      "app_id": "399857015",
      "app_name": "Planet Fitness",
      "artist": "Planet Fitness Holdings, LLC",
      "bundle_id": "com.planetfitness.lunkinator",
      "languages": ["EN", "ES"],
      "language_count": 2,
      "price": 0.0,
      "currency": "USD",
      "version": "9.11.8",
      "average_user_rating": 4.87,
      "user_rating_count": 586615
    },
    ...
  ],
  "statistics": {
    "total_unique_languages": 26,
    "all_languages_found": ["AR", "AZ", "DA", "DE", "EN", ...],
    "apps_by_language_count": {
      "1": 2,
      "2": 3,
      "5": 1,
      ...
    },
    "average_languages_per_app": 8.0
  }
}
```

### 3. Get Individual App Details

```http
GET /api/app-store/app/{app_id}?country=us
```

**Parameters:**
- `app_id` (path): iTunes app ID
- `country` (query, optional): iTunes Store country code (default: `us`)

**Example:**
```bash
curl "http://localhost:8000/api/app-store/app/399857015"
```

## Usage Examples

### Python (Direct Service Usage)

```python
import asyncio
from app.services.app_store_scanner import AppStoreScanner

async def scan_apps():
    scanner = AppStoreScanner(country_code="us")

    # Scan top 50 free Health & Fitness apps
    result = await scanner.scan_category(
        category="health_fitness",
        feed_type="free",
        limit=50
    )

    print(f"Total apps scanned: {result['total_apps_scanned']}")
    print(f"Unique languages found: {result['statistics']['total_unique_languages']}")

    for app in result['apps']:
        print(f"{app['app_name']}: {app['language_count']} languages")

asyncio.run(scan_apps())
```

### cURL (API Usage)

```bash
# Scan top 50 free Health & Fitness apps
curl "http://localhost:8000/api/app-store/scan/health_fitness?feed_type=free&limit=50"

# Scan top 100 paid Education apps
curl "http://localhost:8000/api/app-store/scan/education?feed_type=paid&limit=100"

# Get specific app details
curl "http://localhost:8000/api/app-store/app/399857015"

# List all available categories
curl "http://localhost:8000/api/app-store/categories"
```

### JavaScript (Frontend)

```javascript
// Fetch top apps in Health & Fitness category
async function scanHealthApps() {
  const response = await fetch(
    'http://localhost:8000/api/app-store/scan/health_fitness?feed_type=free&limit=50'
  );
  const data = await response.json();

  console.log(`Total apps: ${data.total_apps_scanned}`);
  console.log(`Languages found: ${data.statistics.total_unique_languages}`);

  data.apps.forEach(app => {
    console.log(`${app.app_name}: ${app.languages.join(', ')}`);
  });
}
```

## Test Results (Health & Fitness Category)

Based on a scan of the top 10 free Health & Fitness apps:

### Key Findings:
- **26 unique languages** identified across all apps
- **Average of 8 languages per app**
- Most common languages: EN (English), ES (Spanish), FR (French), DE (German), JA (Japanese)

### Language Coverage:
```
AR (Arabic), AZ (Azerbaijani), DA (Danish), DE (German), EN (English),
ES (Spanish), FI (Finnish), FR (French), HI (Hindi), ID (Indonesian),
IT (Italian), JA (Japanese), KO (Korean), MS (Malay), NB (Norwegian),
NL (Dutch), PL (Polish), PT (Portuguese), RO (Romanian), RU (Russian),
SV (Swedish), TH (Thai), TR (Turkish), UK (Ukrainian), VI (Vietnamese),
ZH (Chinese)
```

### Top Apps Language Support:
1. **Flo Cycle & Period Tracker** - 21 languages
2. **MyFitnessPal: Calorie Counter** - 19 languages
3. **Cal AI - Calorie Tracker** - 15 languages
4. **Strava: Run, Bike, Walk** - 12 languages
5. **Yuka - Food & Cosmetic Scanner** - 5 languages

## Data Source

This scanner uses official Apple APIs:
- **iTunes RSS Feeds**: For top charts by category
- **iTunes Lookup API**: For detailed app information including `languageCodesISO2A`

### RSS Feed Format:
```
https://itunes.apple.com/{country}/rss/{feed_type}/limit={limit}/genre={genre_id}/json
```

### Lookup API Format:
```
https://itunes.apple.com/lookup?id={app_id}
```

## Language Codes

Languages are returned in ISO 639-1 format (2-letter codes):
- `EN` - English
- `ES` - Spanish
- `FR` - French
- `DE` - German
- `JA` - Japanese
- `KO` - Korean
- `ZH` - Chinese
- etc.

## Rate Limiting

The scanner includes automatic rate limiting to respect Apple's API limits:
- Sequential API calls for app details
- Configurable scan limits (1-200 apps)
- Proper error handling and retry logic

## Integration with Localization Auditor

This App Store scanner complements the main localization auditing features by:
- Identifying market leaders in each category
- Understanding competitive language support
- Prioritizing localization efforts based on top apps
- Benchmarking language coverage against competitors

## Future Enhancements

Potential improvements:
- [ ] Add support for Google Play Store
- [ ] Historical tracking of language support changes
- [ ] Visualization dashboard for language trends
- [ ] Comparison reports across categories
- [ ] Export to CSV/Excel formats
- [ ] Scheduled scans and alerts

## Sources

- [Apple iTunes Search API Documentation](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html)
- [iTunes Lookup API Examples](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/LookupExamples.html)
- [App Store Categories](https://apps.apple.com/us/charts/iphone/)

## License

Part of the Localization Auditor project.

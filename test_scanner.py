"""
Test script for App Store Scanner
"""
import asyncio
import json
import sys
sys.path.insert(0, './backend')

from app.services.app_store_scanner import AppStoreScanner


async def test_scanner():
    """Test the App Store scanner with Health & Fitness category"""

    print("=" * 80)
    print("App Store Scanner Test - Health & Fitness Category")
    print("=" * 80)
    print()

    scanner = AppStoreScanner(country_code="us")

    # Test with a small limit first (10 apps) for quick testing
    print("Scanning top 10 free Health & Fitness apps...")
    print()

    result = await scanner.scan_category(
        category="health_fitness",
        feed_type="free",
        limit=10
    )

    # Display results
    print(f"Category: {result['category']}")
    print(f"Feed Type: {result['feed_type']}")
    print(f"Country: {result['country_code']}")
    print(f"Total Apps Scanned: {result['total_apps_scanned']}")
    print()

    print("=" * 80)
    print("STATISTICS")
    print("=" * 80)
    stats = result['statistics']
    print(f"Total Unique Languages Found: {stats['total_unique_languages']}")
    print(f"Average Languages per App: {stats['average_languages_per_app']:.2f}")
    print()
    print("All Languages Found:")
    print(", ".join(stats['all_languages_found']))
    print()
    print("Apps by Language Count:")
    for count, num_apps in sorted(stats['apps_by_language_count'].items()):
        print(f"  {count} languages: {num_apps} apps")
    print()

    print("=" * 80)
    print("TOP APPS AND THEIR LANGUAGE SUPPORT")
    print("=" * 80)

    for i, app in enumerate(result['apps'][:10], 1):
        print(f"\n{i}. {app['app_name']}")
        print(f"   Artist: {app['artist']}")
        print(f"   Languages ({app['language_count']}): {', '.join(app['languages'])}")
        if 'average_user_rating' in app:
            print(f"   Rating: {app['average_user_rating']:.1f}/5.0 ({app['user_rating_count']} reviews)")

    print()
    print("=" * 80)
    print("Test completed successfully!")
    print("=" * 80)

    # Save full results to JSON file
    with open('/home/user/localization_auditor/test_results.json', 'w') as f:
        json.dump(result, f, indent=2)

    print("\nFull results saved to: test_results.json")


if __name__ == "__main__":
    asyncio.run(test_scanner())

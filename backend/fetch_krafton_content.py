#!/usr/bin/env python3
"""
Script to fetch content from Krafton websites (Korean and English versions)
"""
import asyncio
import json
from playwright.async_api import async_playwright

async def fetch_page_content(url, label):
    """Fetch content and screenshot from a URL"""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            # Navigate to the URL with extended timeout
            print(f"Navigating to {url}...")
            await page.goto(url, wait_until='networkidle', timeout=60000)

            # Wait a bit for dynamic content to load
            await page.wait_for_timeout(3000)

            # Take a full-page screenshot
            screenshot_path = f'/Users/sungholee/code/localization_auditor/backend/{label}_screenshot.png'
            await page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to {screenshot_path}")

            # Extract all text content
            content = {}

            # Header/Navigation
            nav_elements = await page.query_selector_all('header, nav, [role="navigation"]')
            nav_texts = []
            for elem in nav_elements:
                text = await elem.inner_text()
                if text.strip():
                    nav_texts.append(text.strip())
            content['header_navigation'] = nav_texts

            # Main content
            main_elements = await page.query_selector_all('main, [role="main"], article, section')
            main_texts = []
            for elem in main_elements:
                text = await elem.inner_text()
                if text.strip():
                    main_texts.append(text.strip())
            content['main_content'] = main_texts

            # Footer
            footer_elements = await page.query_selector_all('footer, [role="contentinfo"]')
            footer_texts = []
            for elem in footer_elements:
                text = await elem.inner_text()
                if text.strip():
                    footer_texts.append(text.strip())
            content['footer'] = footer_texts

            # All headings
            headings = {}
            for level in range(1, 7):
                h_elements = await page.query_selector_all(f'h{level}')
                h_texts = []
                for elem in h_elements:
                    text = await elem.inner_text()
                    if text.strip():
                        h_texts.append(text.strip())
                if h_texts:
                    headings[f'h{level}'] = h_texts
            content['headings'] = headings

            # All buttons
            button_elements = await page.query_selector_all('button, [role="button"], a.btn, .button')
            button_texts = []
            for elem in button_elements:
                text = await elem.inner_text()
                if text.strip():
                    button_texts.append(text.strip())
            content['buttons'] = button_texts

            # All links
            link_elements = await page.query_selector_all('a')
            link_texts = []
            for elem in link_elements:
                text = await elem.inner_text()
                href = await elem.get_attribute('href')
                if text.strip():
                    link_texts.append({'text': text.strip(), 'href': href})
            content['links'] = link_texts[:50]  # Limit to first 50 links

            # Page title
            content['title'] = await page.title()

            # Meta description
            meta_desc = await page.query_selector('meta[name="description"]')
            if meta_desc:
                content['meta_description'] = await meta_desc.get_attribute('content')

            # All visible text (fallback)
            body = await page.query_selector('body')
            if body:
                content['full_body_text'] = await body.inner_text()

            await browser.close()
            return content

        except Exception as e:
            print(f"Error fetching {url}: {e}")
            await browser.close()
            return {'error': str(e)}

async def main():
    # Fetch Korean version
    print("\n" + "="*80)
    print("FETCHING KOREAN VERSION")
    print("="*80 + "\n")
    korean_content = await fetch_page_content('https://www.krafton.com/', 'krafton_korean')

    # Fetch English version
    print("\n" + "="*80)
    print("FETCHING ENGLISH VERSION")
    print("="*80 + "\n")
    english_content = await fetch_page_content('https://krafton.com/en/', 'krafton_english')

    # Save to JSON files
    with open('/Users/sungholee/code/localization_auditor/backend/krafton_korean_content.json', 'w', encoding='utf-8') as f:
        json.dump(korean_content, f, ensure_ascii=False, indent=2)

    with open('/Users/sungholee/code/localization_auditor/backend/krafton_english_content.json', 'w', encoding='utf-8') as f:
        json.dump(english_content, f, ensure_ascii=False, indent=2)

    print("\n" + "="*80)
    print("CONTENT SAVED TO JSON FILES")
    print("="*80)
    print("Korean content: /Users/sungholee/code/localization_auditor/backend/krafton_korean_content.json")
    print("English content: /Users/sungholee/code/localization_auditor/backend/krafton_english_content.json")

    return korean_content, english_content

if __name__ == '__main__':
    asyncio.run(main())

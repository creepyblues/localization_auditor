import asyncio
from typing import Optional
from dataclasses import dataclass
from playwright.async_api import async_playwright, Page


@dataclass
class ScrapedContent:
    url: str
    title: str
    meta_description: Optional[str]
    meta_keywords: Optional[str]
    headings: list[dict]  # {level: int, text: str}
    paragraphs: list[str]
    links: list[dict]  # {text: str, href: str}
    buttons: list[str]
    forms: list[dict]  # {labels: list, placeholders: list}
    images: list[dict]  # {alt: str, src: str}
    detected_language: Optional[str]
    raw_text: str


class WebScraper:
    def __init__(self):
        self.playwright = None
        self.browser = None

    async def __aenter__(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def scrape_url(self, url: str, timeout: int = 30000) -> ScrapedContent:
        """Scrape a URL and extract structured content."""
        page = await self.browser.new_page()

        try:
            await page.goto(url, wait_until="networkidle", timeout=timeout)

            # Wait for dynamic content to load
            await page.wait_for_load_state("domcontentloaded")
            await asyncio.sleep(1)  # Additional wait for JS rendering

            content = await self._extract_content(page, url)
            return content

        finally:
            await page.close()

    async def _extract_content(self, page: Page, url: str) -> ScrapedContent:
        """Extract structured content from a page."""

        # Title
        title = await page.title()

        # Meta tags
        meta_description = await self._get_meta_content(page, "description")
        meta_keywords = await self._get_meta_content(page, "keywords")

        # Detect language from html lang attribute
        detected_language = await page.evaluate("document.documentElement.lang || null")

        # Headings
        headings = await page.evaluate("""
            () => {
                const result = [];
                ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tag, idx) => {
                    document.querySelectorAll(tag).forEach(el => {
                        const text = el.innerText.trim();
                        if (text) {
                            result.push({ level: idx + 1, text: text });
                        }
                    });
                });
                return result;
            }
        """)

        # Paragraphs
        paragraphs = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('p'))
                    .map(el => el.innerText.trim())
                    .filter(text => text.length > 0);
            }
        """)

        # Links
        links = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('a'))
                    .map(el => ({
                        text: el.innerText.trim(),
                        href: el.href
                    }))
                    .filter(link => link.text.length > 0);
            }
        """)

        # Buttons
        buttons = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'))
                    .map(el => el.innerText?.trim() || el.value?.trim() || '')
                    .filter(text => text.length > 0);
            }
        """)

        # Forms
        forms = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('form')).map(form => ({
                    labels: Array.from(form.querySelectorAll('label'))
                        .map(el => el.innerText.trim())
                        .filter(text => text.length > 0),
                    placeholders: Array.from(form.querySelectorAll('input, textarea'))
                        .map(el => el.placeholder || '')
                        .filter(text => text.length > 0)
                }));
            }
        """)

        # Images
        images = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('img'))
                    .map(el => ({
                        alt: el.alt || '',
                        src: el.src
                    }))
                    .filter(img => img.alt.length > 0 || img.src.length > 0);
            }
        """)

        # Raw text content
        raw_text = await page.evaluate("document.body.innerText")

        return ScrapedContent(
            url=url,
            title=title,
            meta_description=meta_description,
            meta_keywords=meta_keywords,
            headings=headings,
            paragraphs=paragraphs,
            links=links,
            buttons=buttons,
            forms=forms,
            images=images,
            detected_language=detected_language,
            raw_text=raw_text
        )

    async def _get_meta_content(self, page: Page, name: str) -> Optional[str]:
        """Get content of a meta tag by name."""
        result = await page.evaluate(f"""
            () => {{
                const meta = document.querySelector('meta[name="{name}"]') ||
                             document.querySelector('meta[property="og:{name}"]');
                return meta ? meta.content : null;
            }}
        """)
        return result


async def scrape_urls(original_url: str, audit_url: str) -> tuple[ScrapedContent, ScrapedContent]:
    """Scrape both original and audit URLs."""
    async with WebScraper() as scraper:
        original_content, audit_content = await asyncio.gather(
            scraper.scrape_url(original_url),
            scraper.scrape_url(audit_url)
        )
        return original_content, audit_content

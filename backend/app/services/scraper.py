import asyncio
import io
import random
from typing import Optional
from dataclasses import dataclass
from playwright.async_api import async_playwright, Page
from playwright_stealth import Stealth
from PIL import Image


class ScrapingError(Exception):
    """Raised when scraping fails or content is invalid."""
    pass


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


def validate_content(content: ScrapedContent) -> tuple[bool, str]:
    """Check if content is real or a bot protection page."""
    bot_indicators = [
        "just a moment", "verifying you are human", "cloudflare",
        "checking your browser", "ddos protection", "access denied",
        "please wait", "enable javascript", "please enable cookies",
        "ray id", "performance & security by"
    ]

    title_lower = (content.title or "").lower()
    text_lower = (content.raw_text or "").lower()

    for indicator in bot_indicators:
        if indicator in title_lower or indicator in text_lower:
            return False, f"Bot protection detected: '{indicator}'"

    # Check minimum content - but be lenient for simple pages
    if len(content.paragraphs) < 2 and len(content.headings) < 2:
        return False, "Insufficient content captured (too few paragraphs and headings)"

    return True, "OK"


async def detect_blocked_page_with_vision(
    screenshot_base64: str,
    api_key: str
) -> tuple[bool, Optional[str]]:
    """
    Use Claude Vision (Haiku) to detect if screenshot shows a blocked page.

    Returns:
        tuple: (is_blocked: bool, reason: Optional[str])
        - is_blocked: True if page appears to be a CAPTCHA/challenge/blocked page
        - reason: Description of what was detected (if blocked)
    """
    import anthropic
    import logging

    logger = logging.getLogger(__name__)

    client = anthropic.Anthropic(api_key=api_key)

    # Minimal prompt for cheap detection
    detection_prompt = """Analyze this screenshot and determine if it shows a blocked or challenge page.

Look for:
- CAPTCHA challenges (checkbox, image puzzles, text entry)
- Cloudflare "Just a moment" or "Checking your browser" pages
- "Access Denied" or "403 Forbidden" messages
- Bot detection challenges
- "Please verify you are human" messages
- Security verification screens
- Blank pages with only error messages

Respond with EXACTLY one of these formats:
- If blocked: BLOCKED: [brief reason, max 50 words]
- If accessible: ACCESSIBLE

Examples:
- BLOCKED: Cloudflare security challenge with "Checking if the site connection is secure" message
- BLOCKED: CAPTCHA checkbox requiring user to verify they are not a robot
- ACCESSIBLE
"""

    try:
        response = client.messages.create(
            model="claude-3-5-haiku-latest",  # Cheapest model for this check
            max_tokens=100,  # Keep response short
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": screenshot_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": detection_prompt
                    }
                ]
            }]
        )

        response_text = ""
        for block in response.content:
            if hasattr(block, 'text'):
                response_text += block.text

        response_text = response_text.strip()
        logger.info(f"Blocked page detection response: {response_text}")

        if response_text.startswith("BLOCKED:"):
            reason = response_text[8:].strip()
            return True, reason
        else:
            return False, None

    except Exception as e:
        # If detection fails, log and return not blocked (fail open)
        logger.warning(f"Blocked page detection failed: {e}")
        return False, None


def resize_image_for_claude(image_bytes: bytes, max_dimension: int = 1568) -> bytes:
    """Resize image to optimal size for Claude vision API.

    Claude recommends images no larger than 1568px in either dimension
    to avoid automatic resizing and reduce latency.
    """
    img = Image.open(io.BytesIO(image_bytes))

    # Calculate resize ratio if needed
    width, height = img.size
    if width > max_dimension or height > max_dimension:
        ratio = min(max_dimension / width, max_dimension / height)
        new_size = (int(width * ratio), int(height * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS)

    # Convert to RGB if necessary (for PNG with transparency)
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    # Save to bytes as optimized PNG
    buffer = io.BytesIO()
    img.save(buffer, format='PNG', optimize=True)
    return buffer.getvalue()


class WebScraper:
    def __init__(self):
        self.playwright = None
        self.browser = None

    async def __aenter__(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
            ]
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def scrape_url(self, url: str, timeout: int = 60000) -> ScrapedContent:
        """Scrape a URL and extract structured content."""
        # Randomize viewport for more human-like behavior
        width = random.randint(1280, 1920)
        height = random.randint(800, 1080)

        # Create a browser context with realistic settings
        context = await self.browser.new_context(
            viewport={'width': width, 'height': height},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/New_York',
            java_script_enabled=True,
            bypass_csp=True,
        )
        page = await context.new_page()

        # Apply stealth mode to avoid detection
        stealth = Stealth(navigator_platform_override='MacIntel')
        await stealth.apply_stealth_async(page)

        # Additional anti-detection scripts
        await page.add_init_script("""
            // Override navigator properties
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

            // Override chrome property
            window.chrome = { runtime: {} };

            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        """)

        try:
            # Add random delay before navigation (human-like behavior)
            await asyncio.sleep(random.uniform(0.5, 1.5))

            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)

            # Wait for dynamic content to load
            await page.wait_for_load_state("networkidle", timeout=30000)

            # Check for and wait through Cloudflare challenge
            cf_passed = await self._wait_for_cloudflare(page)

            if not cf_passed:
                # Try scrolling and waiting - sometimes helps
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
                await asyncio.sleep(3)
                await self._wait_for_cloudflare(page)

            # Additional wait for JS rendering
            await asyncio.sleep(random.uniform(2, 4))

            # Simulate human-like scrolling
            await page.evaluate("window.scrollTo(0, 300)")
            await asyncio.sleep(0.5)

            content = await self._extract_content(page, url)
            return content

        finally:
            await page.close()
            await context.close()

    async def _wait_for_cloudflare(self, page) -> bool:
        """Detect and wait for Cloudflare challenge to complete."""
        cf_selectors = [
            '#challenge-running',
            '#challenge-form',
            '.cf-browser-verification',
            'div[id="cf-content"]',
            '#cf-wrapper',
            '#cf-challenge-running',
            '.cf-turnstile',
            'iframe[src*="challenges.cloudflare.com"]',
        ]

        for selector in cf_selectors:
            element = await page.query_selector(selector)
            if element:
                try:
                    # Wait up to 30 seconds for challenge to complete
                    await page.wait_for_selector(selector, state='hidden', timeout=30000)
                    await asyncio.sleep(3)  # Additional wait after challenge
                    return True
                except Exception:
                    # Challenge didn't complete in time
                    return False

        # Also check page title for Cloudflare indicators
        title = await page.title()
        if 'just a moment' in title.lower() or 'cloudflare' in title.lower():
            # Wait and check again
            await asyncio.sleep(5)
            new_title = await page.title()
            return 'just a moment' not in new_title.lower()

        return True  # No Cloudflare detected

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

    async def scrape_url_with_retry(self, url: str, max_retries: int = 3) -> ScrapedContent:
        """Scrape a URL with retry logic and content validation."""
        last_error = None

        for attempt in range(max_retries):
            try:
                content = await self.scrape_url(url)
                is_valid, message = validate_content(content)

                if is_valid:
                    return content

                last_error = message

                # Don't retry on the last attempt
                if attempt < max_retries - 1:
                    wait_time = 5 * (attempt + 1)  # 5s, 10s, 15s
                    await asyncio.sleep(wait_time)

            except Exception as e:
                last_error = str(e)
                if attempt < max_retries - 1:
                    wait_time = 5 * (attempt + 1)
                    await asyncio.sleep(wait_time)

        raise ScrapingError(f"Failed to scrape {url} after {max_retries} attempts: {last_error}")

    async def take_screenshot(self, url: str, timeout: int = 60000) -> bytes:
        """Take a full-page screenshot of a URL and return as PNG bytes.

        The screenshot is automatically resized to optimal dimensions for Claude Vision API.
        """
        # Randomize viewport for more human-like behavior
        width = random.randint(1280, 1440)
        height = random.randint(800, 900)

        # Create a browser context with realistic settings
        context = await self.browser.new_context(
            viewport={'width': width, 'height': height},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/New_York',
            java_script_enabled=True,
            bypass_csp=True,
        )
        page = await context.new_page()

        # Apply stealth mode to avoid detection
        stealth = Stealth(navigator_platform_override='MacIntel')
        await stealth.apply_stealth_async(page)

        # Additional anti-detection scripts
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            window.chrome = { runtime: {} };
        """)

        try:
            # Add random delay before navigation
            await asyncio.sleep(random.uniform(0.5, 1.5))

            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)

            # Wait for dynamic content to load (with timeout handling)
            try:
                await page.wait_for_load_state("networkidle", timeout=30000)
            except Exception:
                # If networkidle times out, continue anyway - we'll capture what we have
                pass

            # Check for and wait through Cloudflare challenge
            await self._wait_for_cloudflare(page)

            # Additional wait for JS rendering
            await asyncio.sleep(random.uniform(2, 4))

            # Scroll to load lazy content
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 3)")
            await asyncio.sleep(0.5)
            await page.evaluate("window.scrollTo(0, 0)")  # Scroll back to top
            await asyncio.sleep(0.5)

            # Take full-page screenshot
            screenshot_bytes = await page.screenshot(full_page=True, type='png')

            # Resize to optimal dimensions for Claude
            resized_screenshot = resize_image_for_claude(screenshot_bytes)

            return resized_screenshot

        finally:
            await page.close()
            await context.close()

    async def take_quick_screenshot(self, url: str, timeout: int = 15000) -> bytes:
        """Take a quick screenshot without waiting for full page load.

        Used when normal screenshot times out - captures whatever is visible
        (like Cloudflare challenge pages) for blocked page detection.
        """
        width = random.randint(1280, 1440)
        height = random.randint(800, 900)

        context = await self.browser.new_context(
            viewport={'width': width, 'height': height},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/New_York',
            java_script_enabled=True,
            bypass_csp=True,
        )
        page = await context.new_page()

        stealth = Stealth(navigator_platform_override='MacIntel')
        await stealth.apply_stealth_async(page)

        try:
            # Navigate with shorter timeout, don't wait for full load
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)

            # Brief wait to let challenge page render
            await asyncio.sleep(3)

            # Take screenshot of whatever is visible
            screenshot_bytes = await page.screenshot(full_page=False, type='png')

            return resize_image_for_claude(screenshot_bytes)

        finally:
            await page.close()
            await context.close()


async def scrape_urls(original_url: str, audit_url: str) -> tuple[ScrapedContent, ScrapedContent]:
    """Scrape both original and audit URLs (without retry/validation)."""
    async with WebScraper() as scraper:
        original_content, audit_content = await asyncio.gather(
            scraper.scrape_url(original_url),
            scraper.scrape_url(audit_url)
        )
        return original_content, audit_content


async def scrape_urls_with_retry(original_url: str, audit_url: str) -> tuple[ScrapedContent, ScrapedContent]:
    """Scrape both URLs with retry logic and content validation.

    Raises:
        ScrapingError: If either URL fails validation after retries.
    """
    async with WebScraper() as scraper:
        original_content, audit_content = await asyncio.gather(
            scraper.scrape_url_with_retry(original_url),
            scraper.scrape_url_with_retry(audit_url)
        )
        return original_content, audit_content


async def scrape_screenshots(original_url: str, audit_url: str) -> tuple[bytes, bytes]:
    """Take screenshots of both original and audit URLs.

    Returns:
        Tuple of (original_screenshot_bytes, audit_screenshot_bytes) as PNG data.
    """
    async with WebScraper() as scraper:
        original_screenshot, audit_screenshot = await asyncio.gather(
            scraper.take_screenshot(original_url),
            scraper.take_screenshot(audit_url)
        )
        return original_screenshot, audit_screenshot

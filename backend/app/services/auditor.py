import json
from typing import Optional
from dataclasses import dataclass, asdict

import anthropic

from app.core.config import get_settings
from app.services.scraper import ScrapedContent
from app.models.audit import AuditDimension

settings = get_settings()


@dataclass
class DimensionScore:
    dimension: str
    score: int
    findings: list[dict]
    good_examples: list[dict]
    recommendations: list[str]


@dataclass
class AuditScore:
    overall_score: int
    dimensions: list[DimensionScore]


AUDIT_SYSTEM_PROMPT = """You are an expert localization quality auditor with deep knowledge of translation quality assessment, cultural adaptation, and industry-specific terminology. Your task is to evaluate localized website content against the original source content.

You will analyze the content across 8 dimensions and provide detailed, actionable feedback.

IMPORTANT: You must respond with valid JSON only. No markdown, no explanations outside the JSON structure."""


def build_audit_prompt(
    original: ScrapedContent,
    localized: ScrapedContent,
    industry: Optional[str],
    glossary_terms: Optional[list[dict]] = None
) -> str:
    """Build the audit prompt for Claude."""

    glossary_section = ""
    if glossary_terms:
        terms_text = "\n".join([
            f"  - \"{t['source_term']}\" → \"{t['target_term']}\""
            + (f" (Context: {t['context']})" if t.get('context') else "")
            for t in glossary_terms[:50]  # Limit to 50 terms
        ])
        glossary_section = f"""
## Industry Glossary (Expected Terminology)
{terms_text}
"""

    prompt = f"""## Task
Evaluate the localized website content against the original, scoring each dimension from 0-100.

## Source Content ({original.detected_language or 'Original Language'})
**URL:** {original.url}
**Title:** {original.title}
**Meta Description:** {original.meta_description or 'N/A'}
**Meta Keywords:** {original.meta_keywords or 'N/A'}

**Headings:**
{json.dumps(original.headings[:20], indent=2)}

**Sample Paragraphs:**
{chr(10).join(original.paragraphs[:10])}

**Buttons/CTAs:**
{json.dumps(original.buttons[:20], indent=2)}

**Link Texts:**
{json.dumps([l['text'] for l in original.links[:30]], indent=2)}

---

## Localized Content ({localized.detected_language or 'Target Language'})
**URL:** {localized.url}
**Title:** {localized.title}
**Meta Description:** {localized.meta_description or 'N/A'}
**Meta Keywords:** {localized.meta_keywords or 'N/A'}

**Headings:**
{json.dumps(localized.headings[:20], indent=2)}

**Sample Paragraphs:**
{chr(10).join(localized.paragraphs[:10])}

**Buttons/CTAs:**
{json.dumps(localized.buttons[:20], indent=2)}

**Link Texts:**
{json.dumps([l['text'] for l in localized.links[:30]], indent=2)}

---

## Industry Context
{industry or 'General'}
{glossary_section}

---

## Scoring Criteria

For each dimension, provide:
1. A score from 0-100
2. Specific findings (issues found with examples AND suggested corrections)
3. Good examples (well-executed translations to highlight as positive examples)
4. Actionable recommendations

For findings (issues), use this format:
- original "source text" : localized "translated text" -> suggestion "corrected text"

For good examples, highlight translations that:
- Accurately convey meaning
- Use appropriate cultural adaptation
- Sound natural in the target language
- Follow industry terminology correctly

**Dimensions to evaluate:**

1. **CORRECTNESS** (0-100): Translation accuracy, grammar, spelling, terminology fidelity
   - Are translations accurate and faithful to the original meaning?
   - Are there any grammatical or spelling errors?

2. **CULTURAL_RELEVANCE** (0-100): Cultural adaptation, idioms, imagery appropriateness
   - Are cultural references adapted appropriately?
   - Are idioms and expressions localized (not literally translated)?
   - Is the tone appropriate for the target culture?

3. **INDUSTRY_EXPERTISE** (0-100): Domain-specific terminology accuracy, compliance
   - Is industry terminology translated correctly?
   - Does it follow glossary terms if provided?
   - Does it comply with industry standards?

4. **FLUENCY** (0-100): Natural reading flow in target language
   - Does the content read naturally?
   - Is sentence structure appropriate for the target language?

5. **CONSISTENCY** (0-100): Uniform terminology usage throughout
   - Is the same term translated the same way throughout?
   - Are brand terms handled consistently?

6. **COMPLETENESS** (0-100): Detection of missing/untranslated content
   - Is all content translated?
   - Are there any untranslated strings or placeholders?

7. **UI_UX** (0-100): Date/time formats, currency, measurements, layout considerations
   - Are dates, times, and numbers formatted for the locale?
   - Are currencies appropriate?
   - Are measurement units converted if needed?

8. **SEO** (0-100): Meta tags, keywords localization
   - Are meta descriptions and titles localized?
   - Are keywords adapted for local search terms?

---

## Response Format
Respond with this exact JSON structure (include all 8 dimensions: CORRECTNESS, CULTURAL_RELEVANCE, INDUSTRY_EXPERTISE, FLUENCY, CONSISTENCY, COMPLETENESS, UI_UX, SEO):
{{
  "overall_score": <int 0-100>,
  "dimensions": [
    {{
      "dimension": "CORRECTNESS",
      "score": <int 0-100>,
      "findings": [
        {{"issue": "<description>", "original": "<source text>", "localized": "<translated text>", "suggestion": "<corrected translation>", "severity": "high|medium|low"}}
      ],
      "good_examples": [
        {{"description": "<why this is well done>", "original": "<source text>", "localized": "<translated text>"}}
      ],
      "recommendations": ["<actionable recommendation>"]
    }}
  ]
}}
"""
    return prompt


class LocalizationAuditor:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    async def audit(
        self,
        original: ScrapedContent,
        localized: ScrapedContent,
        industry: Optional[str] = None,
        glossary_terms: Optional[list[dict]] = None
    ) -> AuditScore:
        """Run the localization audit using Claude."""

        prompt = build_audit_prompt(original, localized, industry, glossary_terms)

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            system=AUDIT_SYSTEM_PROMPT
        )

        # Parse the response
        response_text = message.content[0].text

        # Clean up the response if it has markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        def clean_json_text(text: str) -> str:
            """Clean up common JSON formatting issues from Claude's response."""
            import re
            # Remove JavaScript-style comments
            text = re.sub(r'//.*?$', '', text, flags=re.MULTILINE)
            # Remove trailing commas before closing brackets/braces
            text = re.sub(r',\s*([}\]])', r'\1', text)
            # Fix unescaped newlines inside strings (replace with space)
            # This is a simplified fix - handles common case where newline appears in string values
            text = re.sub(r'(?<="[^"]*)\n(?=[^"]*")', ' ', text)
            return text

        try:
            result = json.loads(response_text)
        except json.JSONDecodeError as e:
            # Try to extract and clean JSON from the response
            cleaned_text = clean_json_text(response_text)

            try:
                result = json.loads(cleaned_text)
            except json.JSONDecodeError as e2:
                # Try to extract JSON object from the response
                import re
                json_match = re.search(r'\{[\s\S]*\}', cleaned_text)
                if json_match:
                    try:
                        result = json.loads(json_match.group())
                    except json.JSONDecodeError:
                        # Last resort: try to fix common issues with string values
                        fixed_text = json_match.group()
                        # Remove control characters that might cause issues
                        fixed_text = ''.join(c if ord(c) >= 32 or c in '\n\r\t' else ' ' for c in fixed_text)
                        result = json.loads(fixed_text)
                else:
                    raise ValueError(f"Failed to parse Claude response as JSON: {e2}")

        # Convert to dataclass
        dimensions = [
            DimensionScore(
                dimension=d["dimension"],
                score=d["score"],
                findings=d.get("findings", []),
                good_examples=d.get("good_examples", []),
                recommendations=d.get("recommendations", [])
            )
            for d in result["dimensions"]
        ]

        return AuditScore(
            overall_score=result["overall_score"],
            dimensions=dimensions
        )


def content_to_dict(content: ScrapedContent) -> dict:
    """Convert ScrapedContent to a dictionary for storage."""
    return asdict(content)


def build_content_pairs(original: ScrapedContent, localized: ScrapedContent) -> dict:
    """Build aligned content pairs for side-by-side comparison."""
    pairs = {
        "title": {
            "original": original.title,
            "localized": localized.title
        },
        "meta_description": {
            "original": original.meta_description,
            "localized": localized.meta_description
        },
        "meta_keywords": {
            "original": original.meta_keywords,
            "localized": localized.meta_keywords
        },
        "headings": [],
        "paragraphs": [],
        "buttons": [],
        "links": [],
        "images": []
    }

    # Align headings by index
    max_headings = max(len(original.headings), len(localized.headings))
    for i in range(min(max_headings, 50)):  # Limit to 50
        orig_heading = original.headings[i] if i < len(original.headings) else {}
        loc_heading = localized.headings[i] if i < len(localized.headings) else {}
        pairs["headings"].append({
            "original": orig_heading.get("text", ""),
            "localized": loc_heading.get("text", ""),
            "level": orig_heading.get("level") or loc_heading.get("level", 1),
            "index": i
        })

    # Align paragraphs by index
    max_paragraphs = max(len(original.paragraphs), len(localized.paragraphs))
    for i in range(min(max_paragraphs, 30)):  # Limit to 30
        orig_para = original.paragraphs[i] if i < len(original.paragraphs) else ""
        loc_para = localized.paragraphs[i] if i < len(localized.paragraphs) else ""
        pairs["paragraphs"].append({
            "original": orig_para,
            "localized": loc_para,
            "index": i
        })

    # Align buttons by index
    max_buttons = max(len(original.buttons), len(localized.buttons))
    for i in range(min(max_buttons, 30)):  # Limit to 30
        orig_btn = original.buttons[i] if i < len(original.buttons) else ""
        loc_btn = localized.buttons[i] if i < len(localized.buttons) else ""
        pairs["buttons"].append({
            "original": orig_btn,
            "localized": loc_btn,
            "index": i
        })

    # Align links by index
    max_links = max(len(original.links), len(localized.links))
    for i in range(min(max_links, 50)):  # Limit to 50
        orig_link = original.links[i] if i < len(original.links) else {}
        loc_link = localized.links[i] if i < len(localized.links) else {}
        pairs["links"].append({
            "original": orig_link.get("text", ""),
            "localized": loc_link.get("text", ""),
            "index": i
        })

    # Align images by index (alt text)
    max_images = max(len(original.images), len(localized.images))
    for i in range(min(max_images, 30)):  # Limit to 30
        orig_img = original.images[i] if i < len(original.images) else {}
        loc_img = localized.images[i] if i < len(localized.images) else {}
        pairs["images"].append({
            "original_alt": orig_img.get("alt", ""),
            "localized_alt": loc_img.get("alt", ""),
            "src": orig_img.get("src") or loc_img.get("src", ""),
            "index": i
        })

    return pairs

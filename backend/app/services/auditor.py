"""
Localization Auditor Service

This service provides localization quality auditing using Claude API.
It supports both direct API mode (memory-efficient for production) and
Agent SDK mode (for local development with tool-use capabilities).
"""

import json
import logging
import os
import re
import shutil
import time
from typing import Optional, Any
from dataclasses import dataclass, asdict

import anthropic

# Optional import for Agent SDK (may not be available in production)
try:
    from claude_agent_sdk import (
        ClaudeSDKClient,
        ClaudeAgentOptions,
        AssistantMessage,
        ResultMessage,
        TextBlock,
        ToolUseBlock,
        ToolResultBlock,
        tool,
        create_sdk_mcp_server,
    )
    AGENT_SDK_AVAILABLE = True
except ImportError:
    AGENT_SDK_AVAILABLE = False

from app.core.config import get_settings
from app.services.scraper import ScrapedContent, WebScraper

logger = logging.getLogger(__name__)

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
    # Screenshots captured during analysis (base64-encoded PNG)
    original_screenshot: str | None = None
    audit_screenshot: str | None = None
    # Actual analysis method used
    analysis_method: str = "text"  # "text", "screenshot", or "combined"
    # API usage and cost
    api_cost_usd: float | None = None
    api_input_tokens: int | None = None
    api_output_tokens: int | None = None
    api_duration_ms: int | None = None


AGENT_SYSTEM_PROMPT = """You are an expert localization quality auditor with deep knowledge of translation quality assessment, cultural adaptation, and industry-specific terminology.

Your task is to evaluate localized website content against the original source content.

## Workflow

1. **Fetch Content**
   - Use WebFetch to retrieve content from both the original and localized URLs
   - If WebFetch fails (blocked, timeout), use Playwright MCP to take screenshots and analyze visually
   - Extract key content: titles, headings, paragraphs, buttons, links, meta tags

2. **Load Glossary**
   - Call the get_glossary tool to retrieve industry-specific terminology
   - Use these terms to validate translation consistency

3. **Analyze Content**
   Evaluate across 8 dimensions (score 0-100 each):

   - **CORRECTNESS**: Translation accuracy, grammar, spelling, terminology fidelity
   - **CULTURAL_RELEVANCE**: Cultural adaptation, idioms, imagery appropriateness, tone
   - **INDUSTRY_EXPERTISE**: Domain-specific terminology accuracy, compliance, glossary adherence
   - **FLUENCY**: Natural reading flow in target language, sentence structure
   - **CONSISTENCY**: Uniform terminology usage throughout, brand terms handling
   - **COMPLETENESS**: Detection of missing/untranslated content, placeholders
   - **UI_UX**: Date/time formats, currency, measurements, layout considerations
   - **SEO**: Meta tags, keywords localization, title optimization

4. **Provide Detailed Feedback**
   For each dimension:
   - Score (0-100)
   - Specific findings with original text, localized text, and suggestions
   - Good examples of well-done translations
   - Actionable recommendations

## CRITICAL: Output Format

You MUST end your response with a JSON code block containing the audit results.
The JSON MUST follow this EXACT structure:

```json
{
  "overall_score": <int 0-100>,
  "dimensions": [
    {
      "dimension": "CORRECTNESS",
      "score": <int 0-100>,
      "findings": [
        {"issue": "<description>", "original": "<source text>", "localized": "<translated text>", "suggestion": "<corrected translation>", "severity": "high|medium|low"}
      ],
      "good_examples": [
        {"description": "<why this is well done>", "original": "<source text>", "localized": "<translated text>"}
      ],
      "recommendations": ["<actionable recommendation>"]
    },
    {
      "dimension": "CULTURAL_RELEVANCE",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    },
    {
      "dimension": "INDUSTRY_EXPERTISE",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    },
    {
      "dimension": "FLUENCY",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    },
    {
      "dimension": "CONSISTENCY",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    },
    {
      "dimension": "COMPLETENESS",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    },
    {
      "dimension": "UI_UX",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    },
    {
      "dimension": "SEO",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    }
  ]
}
```

IMPORTANT:
- Include ALL 8 dimensions in the exact order shown
- The overall_score should be the average of all dimension scores
- Each finding MUST have ALL fields: issue, original, localized, suggestion, severity
  - "original" = the exact text from the source page
  - "localized" = the exact text from the localized page (what user currently sees)
  - "suggestion" = the recommended corrected translation
  - NEVER leave original or localized empty - always quote the actual text from the page
- Each good_example MUST have: description, original, localized
- The JSON must be valid and parseable
"""


STANDALONE_AGENT_SYSTEM_PROMPT = """You are an expert localization quality auditor specializing in back-translation assessment.

Your task is to evaluate a localized website's translation quality WITHOUT access to the original source content.
Instead, you will assess whether the content appears to be a quality translation from the specified source language.

## Workflow

1. **Fetch Content**
   - Use WebFetch to retrieve content from the localized URL
   - If WebFetch fails (blocked, timeout), use Playwright MCP to take screenshots and analyze visually
   - Extract key content: titles, headings, paragraphs, buttons, links, meta tags

2. **Load Glossary**
   - Call the get_glossary tool to retrieve industry-specific terminology
   - Use these terms to validate terminology usage

3. **Back-Translation Assessment**
   Evaluate whether the text appears to be a quality translation FROM the specified source language.
   Consider:
   - Does the text read naturally in the target language?
   - Are there signs of machine translation (awkward phrasing, unnatural constructs)?
   - Does the sentence structure follow natural patterns for the target language?
   - Are there literal translations that don't make sense culturally?
   - Is terminology usage appropriate for the industry?
   - Are date/currency/number formats properly localized?

4. **Analyze Content**
   Evaluate across 7 dimensions (score 0-100 each):

   - **CORRECTNESS**: Grammar, spelling, natural expression in target language
   - **CULTURAL_RELEVANCE**: Cultural adaptation, appropriate idioms, tone for target audience
   - **INDUSTRY_EXPERTISE**: Domain-specific terminology appropriateness
   - **FLUENCY**: Natural reading flow, no signs of literal translation
   - **COMPLETENESS**: No placeholder text, complete sentences, no broken content
   - **UI_UX**: Date/time formats, currency, measurements properly localized
   - **SEO**: Meta tags, keywords appropriate for target language/region

   Note: CONSISTENCY dimension is not applicable for standalone audits (no source to compare against).

5. **Provide Detailed Feedback**
   For each dimension:
   - Score (0-100)
   - Specific findings with the text in question and suggestions
   - Good examples of well-done content
   - Actionable recommendations

## CRITICAL: Output Format

You MUST end your response with a JSON code block containing the audit results.
The JSON MUST follow this EXACT structure:

```json
{
  "overall_score": <int 0-100>,
  "dimensions": [
    {
      "dimension": "CORRECTNESS",
      "score": <int 0-100>,
      "findings": [
        {"issue": "<description>", "text": "<problematic text>", "suggestion": "<improved text>", "severity": "high|medium|low"}
      ],
      "good_examples": [
        {"description": "<why this is well done>", "text": "<good text>"}
      ],
      "recommendations": ["<actionable recommendation>"]
    },
    {
      "dimension": "CULTURAL_RELEVANCE",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    },
    {
      "dimension": "INDUSTRY_EXPERTISE",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    },
    {
      "dimension": "FLUENCY",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    },
    {
      "dimension": "COMPLETENESS",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    },
    {
      "dimension": "UI_UX",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    },
    {
      "dimension": "SEO",
      "score": <int 0-100>,
      "findings": [...],
      "good_examples": [...],
      "recommendations": [...]
    }
  ]
}
```

IMPORTANT:
- Include ALL 7 dimensions in the exact order shown (CONSISTENCY is excluded)
- The overall_score should be the average of all dimension scores
- Each finding MUST have: issue, text, suggestion, severity
- Each good_example MUST have: description, text
- The JSON must be valid and parseable
"""


# Direct API system prompt (used when content is pre-scraped)
DIRECT_API_SYSTEM_PROMPT = """You are an expert localization quality auditor specializing in back-translation assessment.

Your task is to evaluate a localized website's translation quality based on the scraped content provided.
You will assess whether the content appears to be a quality translation from the specified source language.

## Assessment Approach

Evaluate whether the text appears to be a quality translation FROM the specified source language.
Consider:
- Does the text read naturally in the target language?
- Are there signs of machine translation (awkward phrasing, unnatural constructs)?
- Does the sentence structure follow natural patterns for the target language?
- Are there literal translations that don't make sense culturally?
- Is terminology usage appropriate for the industry?
- Are date/currency/number formats properly localized?

## Dimensions to Evaluate (score 0-100 each)

- **CORRECTNESS**: Grammar, spelling, natural expression in target language
- **CULTURAL_RELEVANCE**: Cultural adaptation, appropriate idioms, tone for local audience
- **INDUSTRY_EXPERTISE**: Domain-specific terminology accuracy and appropriateness
- **FLUENCY**: Natural reading flow, sentence structure, coherence
- **COMPLETENESS**: Detection of missing/untranslated content, placeholders
- **UI_UX**: Date/time formats, currency, measurements, number formats
- **SEO**: Meta tags, title optimization, keyword presence

## Output Format

You MUST end your response with a JSON code block containing the audit results:

```json
{
  "overall_score": <int 0-100>,
  "dimensions": [
    {
      "dimension": "CORRECTNESS",
      "score": <int 0-100>,
      "findings": [
        {"issue": "<description>", "text": "<problematic text from page>", "suggestion": "<improved version>", "severity": "high|medium|low"}
      ],
      "good_examples": [
        {"description": "<why this is well done>", "text": "<well-translated text>"}
      ],
      "recommendations": ["<actionable recommendation>"]
    },
    // ... include ALL 7 dimensions
  ]
}
```

IMPORTANT:
- Include ALL 7 dimensions in exact order: CORRECTNESS, CULTURAL_RELEVANCE, INDUSTRY_EXPERTISE, FLUENCY, COMPLETENESS, UI_UX, SEO
- overall_score = average of all dimension scores
- Each finding MUST have: issue, text, suggestion, severity
- Each good_example MUST have: description, text
- The JSON must be valid and parseable
"""


def create_glossary_tool(terms: list[dict]):
    """Create a glossary tool with terms from the database."""

    @tool("get_glossary", "Get the glossary terms for terminology validation in this audit", {})
    async def get_glossary(args: dict[str, Any]) -> dict[str, Any]:
        if not terms:
            return {
                "content": [{
                    "type": "text",
                    "text": "No glossary terms provided for this audit. Proceed with general best practices for industry terminology."
                }]
            }

        terms_text = f"## Industry Glossary ({len(terms)} terms)\n\n"
        terms_text += "Use these terms to validate translation consistency:\n\n"

        for t in terms:  # Include ALL terms
            terms_text += f"- \"{t['source_term']}\" -> \"{t['target_term']}\""
            if t.get('context'):
                terms_text += f" (context: {t['context']})"
            terms_text += "\n"

        return {
            "content": [{
                "type": "text",
                "text": terms_text
            }]
        }

    return get_glossary


def sanitize_json_string(json_str: str) -> str:
    """Sanitize a JSON string by properly escaping control characters.

    This handles cases where scraped content contains raw control characters
    that break JSON parsing.
    """
    # Remove all control characters (0x00-0x1F and 0x7F) except for structural JSON whitespace
    # JSON only allows \t, \n, \r as whitespace, and they must be escaped inside strings
    result = []
    i = 0
    in_string = False

    while i < len(json_str):
        c = json_str[i]
        code = ord(c)

        # Track if we're inside a JSON string
        if c == '"' and (i == 0 or json_str[i-1] != '\\'):
            in_string = not in_string
            result.append(c)
        elif in_string:
            # Inside a string - escape control characters
            if code < 32 or code == 127:
                if c == '\n':
                    result.append('\\n')
                elif c == '\r':
                    result.append('\\r')
                elif c == '\t':
                    result.append('\\t')
                else:
                    # Replace other control chars with space or unicode escape
                    result.append(' ')
            elif c == '\\' and i + 1 < len(json_str):
                # Keep existing escape sequences
                next_c = json_str[i + 1]
                if next_c in 'nrtbf"\\/u':
                    result.append(c)
                else:
                    # Escape the backslash if not followed by valid escape char
                    result.append('\\\\')
            else:
                result.append(c)
        else:
            # Outside string - keep structural characters, remove other control chars
            if code < 32 and c not in ' \t\n\r':
                pass  # Skip control characters outside strings
            else:
                result.append(c)
        i += 1

    return ''.join(result)


def fix_truncated_json(json_str: str) -> str:
    """Attempt to fix truncated or malformed JSON by closing open structures."""
    # Count open braces/brackets
    open_braces = json_str.count('{') - json_str.count('}')
    open_brackets = json_str.count('[') - json_str.count(']')

    # Check if we're inside a string (odd number of unescaped quotes)
    in_string = False
    i = 0
    while i < len(json_str):
        if json_str[i] == '"' and (i == 0 or json_str[i-1] != '\\'):
            in_string = not in_string
        i += 1

    # If inside a string, close it
    if in_string:
        json_str += '"'

    # Remove trailing comma if present
    json_str = re.sub(r',\s*$', '', json_str)

    # Close open brackets and braces
    json_str += ']' * open_brackets
    json_str += '}' * open_braces

    return json_str


def preprocess_agent_response(text: str) -> str:
    """Strip conversational text before JSON extraction.

    Claude sometimes includes explanation text before the JSON output.
    This function finds the actual JSON start and strips the preamble.
    """
    # Find the actual JSON start (first { that looks like our expected structure)
    for i, char in enumerate(text):
        if char == '{':
            # Check if this looks like the start of our expected JSON
            # Look ahead for our expected keys
            lookahead = text[i:i+500]
            if '"overall_score"' in lookahead or '"dimensions"' in lookahead:
                return text[i:]

    return text


def extract_array_near_dimension(text: str, dimension: str, array_name: str) -> list:
    """Extract a JSON array near a dimension mention.

    Looks for patterns like: "dimension": "CORRECTNESS" ... "findings": [...]
    """
    import logging
    logger = logging.getLogger(__name__)

    # Find the dimension block first
    # Pattern: Look for the dimension and then the array within its block
    # The dimension block typically ends at the next dimension or closing brace

    # First, find where this dimension starts
    dim_pattern = rf'"dimension"\s*:\s*"{dimension}"'
    dim_match = re.search(dim_pattern, text, re.IGNORECASE)
    if not dim_match:
        return []

    # Find the block for this dimension (from dimension to next dimension or end)
    dim_start = dim_match.start()

    # Look for the next dimension marker or end of dimensions array
    next_dim_pattern = r'"dimension"\s*:\s*"[A-Z_]+"'
    next_matches = list(re.finditer(next_dim_pattern, text[dim_start + 1:], re.IGNORECASE))
    if next_matches:
        dim_end = dim_start + 1 + next_matches[0].start()
    else:
        dim_end = len(text)

    dim_block = text[dim_start:dim_end]

    # Now find the array within this dimension block
    array_pattern = rf'"{array_name}"\s*:\s*\['
    array_match = re.search(array_pattern, dim_block, re.IGNORECASE)
    if not array_match:
        return []

    # Find the matching closing bracket
    array_start = array_match.end() - 1  # Include the [
    bracket_count = 0
    array_end = array_start

    for i in range(array_start, len(dim_block)):
        if dim_block[i] == '[':
            bracket_count += 1
        elif dim_block[i] == ']':
            bracket_count -= 1
            if bracket_count == 0:
                array_end = i + 1
                break

    if array_end > array_start:
        array_str = dim_block[array_start:array_end]
        # Try to parse it
        try:
            # Clean up common issues
            array_str = re.sub(r',\s*\]', ']', array_str)  # Remove trailing commas
            return json.loads(array_str)
        except json.JSONDecodeError:
            # Try with aggressive cleanup
            try:
                cleaned = aggressive_json_cleanup(array_str)
                cleaned = re.sub(r',\s*\]', ']', cleaned)
                return json.loads(cleaned)
            except:
                logger.debug(f"Could not parse {array_name} for {dimension}: {array_str[:200]}")
                pass

    return []


def extract_scores_with_regex(text: str) -> dict | None:
    """Extract scores from text using regex patterns as a fallback when JSON parsing fails.

    This looks for patterns like:
    - "CORRECTNESS": 85 or "dimension": "CORRECTNESS", "score": 85
    - "overall_score": 75
    """
    dimensions_to_find = [
        "CORRECTNESS", "CULTURAL_RELEVANCE", "INDUSTRY_EXPERTISE",
        "FLUENCY", "CONSISTENCY", "COMPLETENESS", "UI_UX", "SEO"
    ]

    result = {
        "overall_score": 0,
        "dimensions": []
    }

    # Try to find overall_score
    overall_match = re.search(r'"overall_score"\s*:\s*(\d+)', text)
    if overall_match:
        result["overall_score"] = int(overall_match.group(1))

    # Find dimension scores
    found_dimensions = set()

    for dim in dimensions_to_find:
        # Pattern 1: "dimension": "CORRECTNESS", ... "score": 85
        pattern1 = rf'"dimension"\s*:\s*"{dim}"[^}}]*?"score"\s*:\s*(\d+)'
        match1 = re.search(pattern1, text, re.IGNORECASE | re.DOTALL)

        # Pattern 2: "CORRECTNESS": { ... "score": 85 }
        pattern2 = rf'"{dim}"\s*:\s*\{{\s*[^}}]*?"score"\s*:\s*(\d+)'
        match2 = re.search(pattern2, text, re.IGNORECASE | re.DOTALL)

        # Pattern 3: Simple "CORRECTNESS": 85
        pattern3 = rf'"{dim}"\s*:\s*(\d+)'
        match3 = re.search(pattern3, text, re.IGNORECASE)

        score = None
        if match1:
            score = int(match1.group(1))
        elif match2:
            score = int(match2.group(1))
        elif match3:
            score = int(match3.group(1))

        if score is not None:
            found_dimensions.add(dim)

            # Try to extract detailed arrays for this dimension
            findings = extract_array_near_dimension(text, dim, "findings")
            good_examples = extract_array_near_dimension(text, dim, "good_examples")
            recommendations = extract_array_near_dimension(text, dim, "recommendations")

            # If recommendations is empty, add fallback note
            if not recommendations:
                recommendations = ["Extracted via fallback parser"]

            result["dimensions"].append({
                "dimension": dim,
                "score": score,
                "findings": findings,
                "good_examples": good_examples,
                "recommendations": recommendations
            })

    # If we found at least half the dimensions, consider it a success
    if len(found_dimensions) >= 4:
        # Calculate overall score if not found
        if result["overall_score"] == 0 and result["dimensions"]:
            result["overall_score"] = sum(d["score"] for d in result["dimensions"]) // len(result["dimensions"])

        # Add missing dimensions with default scores
        for dim in dimensions_to_find:
            if dim not in found_dimensions:
                result["dimensions"].append({
                    "dimension": dim,
                    "score": 50,
                    "findings": [],
                    "good_examples": [],
                    "recommendations": ["Unable to assess - fallback parser"]
                })

        return result

    return None


def aggressive_json_cleanup(json_str: str) -> str:
    """Aggressively clean JSON string by removing problematic patterns."""
    # Remove all backslash sequences that aren't valid JSON escapes
    # Valid: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
    def fix_escapes(s):
        result = []
        i = 0
        while i < len(s):
            if s[i] == '\\' and i + 1 < len(s):
                next_char = s[i + 1]
                if next_char in '"\\\/bfnrt':
                    result.append(s[i:i+2])
                    i += 2
                elif next_char == 'u' and i + 5 < len(s):
                    # Unicode escape \uXXXX
                    result.append(s[i:i+6])
                    i += 6
                else:
                    # Invalid escape - just add the character without backslash
                    result.append(next_char)
                    i += 2
            else:
                result.append(s[i])
                i += 1
        return ''.join(result)

    # Remove control characters
    cleaned = ''.join(c if ord(c) >= 32 or c in '\n\t' else ' ' for c in json_str)

    # Fix escapes
    cleaned = fix_escapes(cleaned)

    # Remove trailing commas before } or ]
    cleaned = re.sub(r',(\s*[}\]])', r'\1', cleaned)

    return cleaned


def extract_json_robustly(text: str) -> dict:
    """Extract JSON from text using multiple strategies."""
    import logging
    logger = logging.getLogger(__name__)

    # Preprocess: Strip conversational text before JSON
    text = preprocess_agent_response(text)

    strategies = []
    errors = []

    # Strategy 1: Find JSON in code block
    json_match = re.search(r'```json\s*([\s\S]*?)\s*```', text)
    if json_match:
        strategies.append(("code_block", json_match.group(1)))

    # Strategy 2: Find raw JSON object
    json_match = re.search(r'\{[\s\S]*"overall_score"[\s\S]*"dimensions"[\s\S]*\}', text)
    if json_match:
        strategies.append(("raw_json", json_match.group(0)))

    # Strategy 3: Find JSON starting from first { to last }
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        strategies.append(("brace_range", text[first_brace:last_brace + 1]))

    def identity(s):
        return s

    def printable_only(s):
        """Keep only printable characters and essential whitespace."""
        result = []
        for c in s:
            code = ord(c)
            # Keep printable ASCII (32-126), newline, tab
            if 32 <= code <= 126 or c in '\n\t':
                result.append(c)
            # Keep non-ASCII characters (Unicode like Korean, Japanese, etc.)
            elif code > 127:
                result.append(c)
            # Skip control characters (0-31 except \n\t, and 127)
        return ''.join(result)

    def combined_cleanup(s):
        """Apply all cleanup strategies together."""
        s = printable_only(s)
        s = aggressive_json_cleanup(s)
        return s

    for strategy_name, json_str in strategies:
        # Clean up common JSON issues
        json_str = re.sub(r'//.*?$', '', json_str, flags=re.MULTILINE)  # Remove comments
        json_str = re.sub(r',\s*([}\]])', r'\1', json_str)  # Remove trailing commas

        # Try parsing with increasing levels of sanitization
        # Using named functions to avoid lambda capture issues
        attempts = [
            ("raw", identity),
            ("sanitized", sanitize_json_string),
            ("aggressive", aggressive_json_cleanup),
            ("printable_only", printable_only),
            ("combined", combined_cleanup),
            ("truncation_fixed", lambda s: fix_truncated_json(combined_cleanup(s))),
        ]

        for attempt_name, attempt_fn in attempts:
            try:
                cleaned = attempt_fn(json_str)
                result = json.loads(cleaned)
                logger.info(f"JSON parsed successfully using strategy '{strategy_name}' with attempt '{attempt_name}'")
                return result
            except json.JSONDecodeError as e:
                errors.append(f"{strategy_name}/{attempt_name}: {str(e)[:100]}")
            except Exception as e:
                errors.append(f"{strategy_name}/{attempt_name}: {type(e).__name__}: {str(e)[:100]}")

    # Log all errors for debugging
    logger.error(f"Failed to parse JSON. Attempts: {errors}")
    logger.error(f"Response text length: {len(text)}, first 500 chars: {text[:500]}")

    # Last resort: Try regex-based extraction of scores
    logger.info("Attempting regex-based score extraction as fallback")
    result = extract_scores_with_regex(text)
    if result:
        logger.info("Regex-based extraction succeeded")
        return result

    raise ValueError(f"Could not extract valid JSON from agent response. Errors: {'; '.join(errors[:3])}")


def parse_agent_output(response_text: str, standalone: bool = False) -> AuditScore:
    """Parse the agent's response to extract structured audit results.

    Args:
        response_text: The raw text response from the agent
        standalone: If True, expects 7 dimensions (excludes CONSISTENCY)
    """
    # Use robust JSON extraction with multiple fallback strategies
    result = extract_json_robustly(response_text)

    # Convert to dataclass
    dimensions = []
    for d in result.get("dimensions", []):
        dimensions.append(DimensionScore(
            dimension=d.get("dimension", "UNKNOWN"),
            score=d.get("score", 0),
            findings=d.get("findings", []),
            good_examples=d.get("good_examples", []),
            recommendations=d.get("recommendations", [])
        ))

    # Expected dimensions differ for standalone vs comparison audits
    if standalone:
        # Standalone audits have 7 dimensions (no CONSISTENCY)
        expected_dims = ["CORRECTNESS", "CULTURAL_RELEVANCE", "INDUSTRY_EXPERTISE",
                         "FLUENCY", "COMPLETENESS", "UI_UX", "SEO"]
    else:
        # Comparison audits have all 8 dimensions
        expected_dims = ["CORRECTNESS", "CULTURAL_RELEVANCE", "INDUSTRY_EXPERTISE",
                         "FLUENCY", "CONSISTENCY", "COMPLETENESS", "UI_UX", "SEO"]

    existing_dims = {d.dimension for d in dimensions}

    for dim in expected_dims:
        if dim not in existing_dims:
            dimensions.append(DimensionScore(
                dimension=dim,
                score=50,  # Default score
                findings=[],
                good_examples=[],
                recommendations=["Unable to fully assess this dimension"]
            ))

    return AuditScore(
        overall_score=result.get("overall_score", 0),
        dimensions=dimensions
    )


def extract_screenshots_from_messages(
    messages: list,
    original_url: str | None,
    audit_url: str
) -> tuple[str | None, str | None, bool]:
    """Extract screenshot data from Playwright MCP tool results.

    Args:
        messages: List of messages from the agent
        original_url: Original URL (None for standalone audits)
        audit_url: Localized URL to audit

    Returns:
        Tuple of (original_screenshot_base64, audit_screenshot_base64, used_screenshots)
    """
    original_screenshot = None
    audit_screenshot = None
    used_screenshots = False

    # Track tool use IDs for screenshot calls and their target URLs
    screenshot_tool_uses: dict[str, str] = {}  # tool_use_id -> url

    for message in messages:
        if isinstance(message, AssistantMessage):
            for block in message.content:
                # Track screenshot tool calls
                if isinstance(block, ToolUseBlock):
                    if "screenshot" in block.name.lower():
                        # Try to determine which URL this is for
                        # Playwright navigate happens before screenshot, so we track the last navigated URL
                        used_screenshots = True
                        screenshot_tool_uses[block.id] = "unknown"

                    if "navigate" in block.name.lower():
                        # Track the URL being navigated to
                        url = block.input.get("url", "")
                        # Store for the next screenshot
                        screenshot_tool_uses["_last_nav_url"] = url

                # Capture screenshot results
                if isinstance(block, ToolResultBlock):
                    if block.tool_use_id in screenshot_tool_uses:
                        # Extract base64 image data from content
                        content = block.content
                        if isinstance(content, list):
                            for item in content:
                                if isinstance(item, dict) and item.get("type") == "image":
                                    # Image data in base64
                                    image_data = item.get("data", "")
                                    if image_data:
                                        # Determine if this is original or audit URL
                                        last_nav = screenshot_tool_uses.get("_last_nav_url", "")
                                        if original_url and last_nav and original_url in last_nav:
                                            original_screenshot = image_data
                                        elif audit_url and last_nav and audit_url in last_nav:
                                            audit_screenshot = image_data
                                        elif audit_screenshot is None:
                                            # Default to audit if we can't determine
                                            audit_screenshot = image_data
                                        else:
                                            original_screenshot = image_data
                        elif isinstance(content, str):
                            # Sometimes content is a base64 string directly
                            if content.startswith("data:image") or len(content) > 1000:
                                # Likely base64 image
                                if audit_screenshot is None:
                                    audit_screenshot = content
                                else:
                                    original_screenshot = content

    return original_screenshot, audit_screenshot, used_screenshots


class LocalizationAuditor:
    """Localization auditor using Claude Agent SDK."""

    def __init__(self):
        pass

    async def audit(
        self,
        original_url: str,
        audit_url: str,
        source_language: str,
        target_language: str,
        industry: Optional[str] = None,
        glossary_terms: Optional[list[dict]] = None
    ) -> AuditScore:
        """
        Run localization audit using Claude Agent SDK.

        The agent handles web scraping internally with WebFetch and
        Playwright MCP fallback for blocked sites.
        """

        # Create glossary MCP server with terms from database
        glossary_tool = create_glossary_tool(glossary_terms or [])
        glossary_server = create_sdk_mcp_server(
            name="glossary",
            version="1.0.0",
            tools=[glossary_tool]
        )

        # Build the audit prompt
        prompt = f"""Please perform a localization audit on the following website:

**Original URL ({source_language}):** {original_url}
**Localized URL ({target_language}):** {audit_url}
**Industry:** {industry or 'General'}

## Instructions

1. First, fetch content from both URLs using WebFetch
   - If WebFetch fails, use Playwright MCP to take screenshots and analyze visually

2. Call the get_glossary tool to load industry terminology for validation

3. Compare the original and localized content thoroughly

4. Provide scores and detailed feedback for all 8 dimensions

5. End your response with a JSON code block containing the structured results

Remember to:
- Check glossary term usage for consistency
- Identify cultural adaptation issues
- Note any untranslated content
- Evaluate the natural flow of the translation
- Check date/currency/number formats
"""

        # Configure agent options
        # Check if npx is available for Playwright MCP (requires Node.js)
        npx_available = shutil.which("npx") is not None

        allowed_tools = [
            "WebFetch",
            "WebSearch",
            "Read",
            "mcp__glossary__get_glossary",
        ]

        mcp_servers = {
            "glossary": glossary_server,
        }

        # Only add Playwright if npx is available
        if npx_available:
            allowed_tools.extend([
                "mcp__playwright__browser_navigate",
                "mcp__playwright__browser_snapshot",
                "mcp__playwright__browser_screenshot",
            ])
            mcp_servers["playwright"] = {
                "command": "npx",
                "args": ["@anthropic-ai/mcp-server-playwright@latest"]
            }

        # Determine permission mode - can't use bypassPermissions when running as root
        is_root = os.geteuid() == 0 if hasattr(os, 'geteuid') else False
        permission_mode = "default" if is_root else "bypassPermissions"

        options = ClaudeAgentOptions(
            system_prompt=AGENT_SYSTEM_PROMPT,
            allowed_tools=allowed_tools,
            mcp_servers=mcp_servers,
            permission_mode=permission_mode
        )

        # Run the agent and collect response
        response_text = ""
        all_messages = []
        result_message = None

        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)

            async for message in client.receive_messages():
                all_messages.append(message)
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            response_text += block.text
                elif isinstance(message, ResultMessage):
                    result_message = message
                    break

        # Extract screenshots from tool results
        original_screenshot, audit_screenshot, used_screenshots = extract_screenshots_from_messages(
            all_messages, original_url, audit_url
        )

        # Parse the response into structured format
        result = parse_agent_output(response_text)

        # Determine analysis method and attach screenshots
        if used_screenshots:
            result.analysis_method = "combined" if response_text else "screenshot"
        else:
            result.analysis_method = "text"

        result.original_screenshot = original_screenshot
        result.audit_screenshot = audit_screenshot

        # Capture API usage and cost from ResultMessage
        if result_message:
            result.api_cost_usd = result_message.total_cost_usd
            result.api_duration_ms = result_message.duration_ms
            if result_message.usage:
                result.api_input_tokens = result_message.usage.get("input_tokens")
                result.api_output_tokens = result_message.usage.get("output_tokens")

        return result

    async def audit_standalone(
        self,
        audit_url: str,
        source_language: str,
        target_language: str,
        industry: Optional[str] = None,
        glossary_terms: Optional[list[dict]] = None
    ) -> AuditScore:
        """
        Run standalone localization audit (back-translation assessment).

        Only analyzes the target URL without comparing to an original.
        Evaluates whether content appears to be a quality translation
        from the specified source language.

        Args:
            audit_url: URL of the localized site to audit
            source_language: The language the content was translated FROM
            target_language: The language the content is in (target language)
            industry: Optional industry context
            glossary_terms: Optional list of glossary terms for validation
        """

        # Create glossary MCP server with terms from database
        glossary_tool = create_glossary_tool(glossary_terms or [])
        glossary_server = create_sdk_mcp_server(
            name="glossary",
            version="1.0.0",
            tools=[glossary_tool]
        )

        # Build the standalone audit prompt
        prompt = f"""Please perform a back-translation quality assessment on the following localized website:

**Localized URL ({target_language}):** {audit_url}
**Original Language (translated FROM):** {source_language}
**Target Language (translated TO):** {target_language}
**Industry:** {industry or 'General'}

## Instructions

1. Fetch content from the localized URL using WebFetch
   - If WebFetch fails, use Playwright MCP to take screenshots and analyze visually

2. Call the get_glossary tool to load industry terminology for validation

3. Assess whether the content appears to be a quality translation from {source_language}
   - Look for signs of machine translation or poor localization
   - Check if the text reads naturally in {target_language}
   - Evaluate cultural appropriateness for the target audience

4. Provide scores and detailed feedback for all 7 dimensions
   - Note: CONSISTENCY dimension is not applicable (no source to compare)

5. End your response with a JSON code block containing the structured results

Remember to:
- Check for awkward phrasing that suggests literal translation
- Identify cultural adaptation issues
- Note any placeholder text or incomplete translations
- Evaluate the natural flow of the language
- Check date/currency/number format localization
"""

        # Configure agent options
        # Check if npx is available for Playwright MCP (requires Node.js)
        npx_available = shutil.which("npx") is not None

        allowed_tools = [
            "WebFetch",
            "WebSearch",
            "Read",
            "mcp__glossary__get_glossary",
        ]

        mcp_servers = {
            "glossary": glossary_server,
        }

        # Only add Playwright if npx is available
        if npx_available:
            allowed_tools.extend([
                "mcp__playwright__browser_navigate",
                "mcp__playwright__browser_snapshot",
                "mcp__playwright__browser_screenshot",
            ])
            mcp_servers["playwright"] = {
                "command": "npx",
                "args": ["@anthropic-ai/mcp-server-playwright@latest"]
            }

        # Determine permission mode - can't use bypassPermissions when running as root
        is_root = os.geteuid() == 0 if hasattr(os, 'geteuid') else False
        permission_mode = "default" if is_root else "bypassPermissions"

        options = ClaudeAgentOptions(
            system_prompt=STANDALONE_AGENT_SYSTEM_PROMPT,
            allowed_tools=allowed_tools,
            mcp_servers=mcp_servers,
            permission_mode=permission_mode
        )

        # Run the agent and collect response
        response_text = ""
        all_messages = []
        result_message = None

        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)

            async for message in client.receive_messages():
                all_messages.append(message)
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            response_text += block.text
                elif isinstance(message, ResultMessage):
                    result_message = message
                    break

        # Extract screenshots from tool results (standalone has no original URL)
        _, audit_screenshot, used_screenshots = extract_screenshots_from_messages(
            all_messages, None, audit_url
        )

        # Parse the response into structured format (standalone mode)
        result = parse_agent_output(response_text, standalone=True)

        # Determine analysis method and attach screenshots
        if used_screenshots:
            result.analysis_method = "combined" if response_text else "screenshot"
        else:
            result.analysis_method = "text"

        result.audit_screenshot = audit_screenshot

        # Capture API usage and cost from ResultMessage
        if result_message:
            result.api_cost_usd = result_message.total_cost_usd
            result.api_duration_ms = result_message.duration_ms
            if result_message.usage:
                result.api_input_tokens = result_message.usage.get("input_tokens")
                result.api_output_tokens = result_message.usage.get("output_tokens")

        return result

    async def audit_standalone_direct(
        self,
        audit_url: str,
        source_language: str,
        target_language: str,
        industry: Optional[str] = None,
        glossary_terms: Optional[list[dict]] = None,
        progress_callback: Optional[Any] = None
    ) -> AuditScore:
        """
        Run standalone localization audit using direct Anthropic API.

        This method is more memory-efficient than the Agent SDK version
        as it doesn't spawn subprocesses. Ideal for production deployment.

        Args:
            audit_url: URL of the localized site to audit
            source_language: The language the content was translated FROM
            target_language: The language the content is in (target language)
            industry: Optional industry context
            glossary_terms: Optional list of glossary terms for validation
            progress_callback: Optional async callback for progress updates
        """
        start_time = time.time()

        # Step 1: Scrape the website content
        if progress_callback:
            await progress_callback("Scraping website content...")

        logger.info(f"Scraping content from {audit_url}")

        try:
            async with WebScraper() as scraper:
                scraped_content = await scraper.scrape_url(audit_url)
        except Exception as e:
            logger.error(f"Failed to scrape {audit_url}: {e}")
            raise Exception(f"Failed to scrape website: {e}")

        # Step 2: Build the prompt with scraped content
        if progress_callback:
            await progress_callback("Analyzing content with AI...")

        # Format glossary terms
        glossary_text = ""
        if glossary_terms:
            glossary_text = "\n\n## Industry Glossary\n\n"
            glossary_text += "Use these terms to validate terminology:\n"
            for t in glossary_terms[:50]:  # Limit to 50 terms to manage context
                glossary_text += f"- \"{t['source_term']}\" -> \"{t['target_term']}\""
                if t.get('context'):
                    glossary_text += f" (context: {t['context']})"
                glossary_text += "\n"

        # Format scraped content
        content_text = f"""## Scraped Content from {audit_url}

**Page Title:** {scraped_content.title}
**Detected Language:** {scraped_content.detected_language or 'unknown'}
**Meta Description:** {scraped_content.meta_description or 'none'}
**Meta Keywords:** {scraped_content.meta_keywords or 'none'}

### Headings
"""
        for h in scraped_content.headings[:30]:  # Limit headings
            content_text += f"- H{h['level']}: {h['text']}\n"

        content_text += "\n### Main Text Content\n"
        # Combine paragraphs, limit total length
        para_text = "\n\n".join(scraped_content.paragraphs[:50])
        if len(para_text) > 15000:
            para_text = para_text[:15000] + "\n\n[Content truncated...]"
        content_text += para_text

        content_text += "\n\n### Buttons/CTAs\n"
        for btn in scraped_content.buttons[:20]:
            content_text += f"- {btn}\n"

        content_text += "\n\n### Links\n"
        for link in scraped_content.links[:30]:
            content_text += f"- {link['text']}\n"

        # Build the full prompt
        prompt = f"""Please perform a back-translation quality assessment on the following localized website content:

**URL:** {audit_url}
**Original Language (translated FROM):** {source_language}
**Target Language (translated TO):** {target_language}
**Industry:** {industry or 'General'}
{glossary_text}
{content_text}

## Instructions

Assess whether the content appears to be a quality translation from {source_language} to {target_language}.

Evaluate all 7 dimensions and provide:
1. Score (0-100) for each dimension
2. Specific findings with problematic text and suggestions
3. Good examples of well-done translations
4. Actionable recommendations

End your response with the JSON code block as specified in the system prompt.
"""

        # Step 3: Call Claude API directly
        logger.info("Calling Claude API for analysis")

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8192,
                system=DIRECT_API_SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise Exception(f"AI analysis failed: {e}")

        # Extract response text
        response_text = ""
        for block in response.content:
            if hasattr(block, 'text'):
                response_text += block.text

        # Step 4: Parse the response
        if progress_callback:
            await progress_callback("Processing results...")

        result = parse_agent_output(response_text, standalone=True)
        result.analysis_method = "text"

        # Calculate timing and costs
        duration_ms = int((time.time() - start_time) * 1000)
        result.api_duration_ms = duration_ms
        result.api_input_tokens = response.usage.input_tokens
        result.api_output_tokens = response.usage.output_tokens

        # Calculate cost (Claude Sonnet pricing)
        # Input: $3 per 1M tokens, Output: $15 per 1M tokens
        input_cost = (response.usage.input_tokens / 1_000_000) * 3.0
        output_cost = (response.usage.output_tokens / 1_000_000) * 15.0
        result.api_cost_usd = round(input_cost + output_cost, 4)

        logger.info(f"Audit complete: score={result.overall_score}, tokens={response.usage.input_tokens}+{response.usage.output_tokens}, cost=${result.api_cost_usd}")

        return result


# Keep these helper functions for backward compatibility
def merge_audit_scores(
    text_scores: Optional[AuditScore],
    screenshot_scores: Optional[AuditScore]
) -> AuditScore:
    """Merge scores from text and screenshot analysis for combined mode.

    Note: With the Agent SDK, this is typically not needed as the agent
    handles fallback internally. Kept for backward compatibility.
    """
    if text_scores is None:
        return screenshot_scores
    if screenshot_scores is None:
        return text_scores

    screenshot_dims_by_name = {d.dimension: d for d in screenshot_scores.dimensions}
    merged_dimensions = []

    for text_dim in text_scores.dimensions:
        screenshot_dim = screenshot_dims_by_name.get(text_dim.dimension)

        if screenshot_dim:
            merged_score = (text_dim.score + screenshot_dim.score) // 2

            seen_issues = set()
            merged_findings = []
            for finding in text_dim.findings + screenshot_dim.findings:
                issue_key = finding.get("issue", "")[:50]
                if issue_key and issue_key not in seen_issues:
                    seen_issues.add(issue_key)
                    merged_findings.append(finding)

            merged_good_examples = text_dim.good_examples + screenshot_dim.good_examples
            merged_recommendations = list(dict.fromkeys(
                text_dim.recommendations + screenshot_dim.recommendations
            ))

            merged_dimensions.append(DimensionScore(
                dimension=text_dim.dimension,
                score=merged_score,
                findings=merged_findings,
                good_examples=merged_good_examples,
                recommendations=merged_recommendations
            ))
        else:
            merged_dimensions.append(text_dim)

    text_dim_names = {d.dimension for d in text_scores.dimensions}
    for screenshot_dim in screenshot_scores.dimensions:
        if screenshot_dim.dimension not in text_dim_names:
            merged_dimensions.append(screenshot_dim)

    overall_score = sum(d.score for d in merged_dimensions) // len(merged_dimensions) if merged_dimensions else 0

    return AuditScore(
        overall_score=overall_score,
        dimensions=merged_dimensions
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
    for i in range(min(max_headings, 50)):
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
    for i in range(min(max_paragraphs, 30)):
        orig_para = original.paragraphs[i] if i < len(original.paragraphs) else ""
        loc_para = localized.paragraphs[i] if i < len(localized.paragraphs) else ""
        pairs["paragraphs"].append({
            "original": orig_para,
            "localized": loc_para,
            "index": i
        })

    # Align buttons by index
    max_buttons = max(len(original.buttons), len(localized.buttons))
    for i in range(min(max_buttons, 30)):
        orig_btn = original.buttons[i] if i < len(original.buttons) else ""
        loc_btn = localized.buttons[i] if i < len(localized.buttons) else ""
        pairs["buttons"].append({
            "original": orig_btn,
            "localized": loc_btn,
            "index": i
        })

    # Align links by index
    max_links = max(len(original.links), len(localized.links))
    for i in range(min(max_links, 50)):
        orig_link = original.links[i] if i < len(original.links) else {}
        loc_link = localized.links[i] if i < len(localized.links) else {}
        pairs["links"].append({
            "original": orig_link.get("text", ""),
            "localized": loc_link.get("text", ""),
            "index": i
        })

    # Align images by index (alt text)
    max_images = max(len(original.images), len(localized.images))
    for i in range(min(max_images, 30)):
        orig_img = original.images[i] if i < len(original.images) else {}
        loc_img = localized.images[i] if i < len(localized.images) else {}
        pairs["images"].append({
            "original_alt": orig_img.get("alt", ""),
            "localized_alt": loc_img.get("alt", ""),
            "src": orig_img.get("src") or loc_img.get("src", ""),
            "index": i
        })

    return pairs

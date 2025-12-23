"""
Localization Auditor Agent

An AI agent that reviews translated website content for cultural appropriateness,
domain expertise accuracy, and glossary term consistency.

Features:
- Web scraping with fallback to screenshot + OCR
- Domain-specific glossary integration
- Cultural and expert context review
"""

import asyncio
import csv
import os
from pathlib import Path
from typing import Any

from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    ResultMessage,
    TextBlock,
    tool,
    create_sdk_mcp_server,
)

# System prompt for the localization auditor
SYSTEM_PROMPT = """You are an expert localization auditor with deep expertise in:
- Translation quality assessment
- Cultural adaptation and appropriateness
- Industry-specific terminology and conventions
- Regional market preferences and sensitivities

Your task is to audit translated website content by comparing the source and target versions.

## Audit Process

1. **Content Retrieval**
   - First, try to fetch the website content using WebFetch
   - If WebFetch fails (blocked, timeout, or returns error), use the Playwright MCP to take a screenshot
   - When using screenshots, analyze the visual content to extract text

2. **Domain/Industry Detection**
   - Analyze the website to determine its industry/domain (e.g., e-commerce, healthcare, finance, tech, gaming)
   - Load the appropriate glossary using the load_glossary tool if available

3. **Audit Criteria**
   Review the translation for:

   a) **Glossary Compliance**
      - Check if domain-specific terms match the glossary
      - Flag any inconsistencies or deviations

   b) **Cultural Appropriateness**
      - Identify culturally insensitive content
      - Check for proper localization of dates, currencies, units
      - Verify cultural references are adapted appropriately

   c) **Domain Expertise**
      - Verify technical/industry terms are correctly translated
      - Check for context-appropriate translations
      - Identify any mistranslations that could cause confusion

   d) **Tone and Style**
      - Assess if the tone matches the target market expectations
      - Check formality levels (e.g., Korean honorifics, Japanese keigo)
      - Verify brand voice consistency

4. **Output Format**
   Provide a structured audit report with:
   - Overall quality score (1-10)
   - Summary of findings
   - Detailed issues list with:
     - Issue type (glossary/cultural/domain/tone)
     - Severity (critical/major/minor)
     - Source text
     - Current translation
     - Suggested fix
     - Explanation
   - Recommendations for improvement

## Important Notes
- Always explain WHY something is an issue, not just WHAT the issue is
- Consider the target audience and market context
- Be specific with suggestions - provide actual corrected text when possible
- If no glossary is available for the detected industry, proceed with general best practices
"""


@tool(
    "load_glossary",
    "Load a domain-specific glossary CSV file for terminology validation",
    {"industry": str, "source_locale": str, "target_locale": str}
)
async def load_glossary(args: dict[str, Any]) -> dict[str, Any]:
    """Load glossary terms from a CSV file based on industry and locales."""
    industry = args.get("industry", "").lower().replace(" ", "_")
    source_locale = args.get("source_locale", "en").lower()
    target_locale = args.get("target_locale", "").lower()

    # Look for glossary file in the glossaries directory
    glossary_dir = Path(__file__).parent / "glossaries"
    glossary_file = glossary_dir / f"{industry}.csv"

    if not glossary_file.exists():
        # Try a general glossary
        glossary_file = glossary_dir / "general.csv"
        if not glossary_file.exists():
            return {
                "content": [{
                    "type": "text",
                    "text": f"No glossary found for industry '{industry}'. Proceeding without glossary validation."
                }]
            }

    try:
        terms: list[dict[str, str]] = []
        with open(glossary_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []

            # Normalize headers to lowercase
            if source_locale not in [h.lower() for h in headers]:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Source locale '{source_locale}' not found in glossary. Available: {headers}"
                    }]
                }

            if target_locale not in [h.lower() for h in headers]:
                return {
                    "content": [{
                        "type": "text",
                        "text": f"Target locale '{target_locale}' not found in glossary. Available: {headers}"
                    }]
                }

            for row in reader:
                # Create case-insensitive lookup
                row_lower = {k.lower(): v for k, v in row.items()}
                source_term = row_lower.get(source_locale, "")
                target_term = row_lower.get(target_locale, "")

                if source_term and target_term:
                    terms.append({
                        "source": source_term,
                        "target": target_term,
                        "context": row_lower.get("context", ""),
                        "notes": row_lower.get("notes", "")
                    })

        if not terms:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Glossary loaded but no terms found for {source_locale} -> {target_locale}"
                }]
            }

        # Format terms for output
        terms_text = f"Loaded {len(terms)} glossary terms for {industry} ({source_locale} -> {target_locale}):\n\n"
        for term in terms[:50]:  # Limit to first 50 terms to avoid token overflow
            terms_text += f"- {term['source']} → {term['target']}"
            if term.get("context"):
                terms_text += f" (context: {term['context']})"
            if term.get("notes"):
                terms_text += f" [note: {term['notes']}]"
            terms_text += "\n"

        if len(terms) > 50:
            terms_text += f"\n... and {len(terms) - 50} more terms"

        return {
            "content": [{
                "type": "text",
                "text": terms_text
            }]
        }

    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": f"Error loading glossary: {str(e)}"
            }],
            "is_error": True
        }


async def run_audit(
    source_url: str,
    target_url: str,
    source_locale: str = "en",
    target_locale: str = "ko",
    industry: str | None = None
) -> None:
    """
    Run a localization audit on the given URLs.

    Args:
        source_url: URL of the source (original) website
        target_url: URL of the translated website
        source_locale: Source language code (default: en)
        target_locale: Target language code (default: ko)
        industry: Optional industry hint (e.g., 'e-commerce', 'healthcare')
    """

    # Create custom MCP server with glossary tool
    glossary_server = create_sdk_mcp_server(
        name="glossary",
        version="1.0.0",
        tools=[load_glossary]
    )

    # Build the audit prompt
    audit_prompt = f"""Please audit the following website translation:

**Source URL ({source_locale}):** {source_url}
**Target URL ({target_locale}):** {target_url}
"""

    if industry:
        audit_prompt += f"\n**Industry Hint:** {industry}"

    audit_prompt += """

Please follow the audit process:
1. Fetch content from both URLs (use screenshots if blocked)
2. Detect the industry/domain if not provided
3. Load the appropriate glossary
4. Perform a comprehensive audit
5. Provide a detailed report with scores, issues, and recommendations
"""

    # Configure the agent options
    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT,
        allowed_tools=[
            "WebFetch",
            "WebSearch",
            "Read",
            "Write",
            "Glob",
            "mcp__glossary__load_glossary",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_screenshot",
        ],
        mcp_servers={
            "glossary": glossary_server,
            "playwright": {
                "command": "npx",
                "args": ["@anthropic-ai/mcp-server-playwright@latest"]
            }
        },
        permission_mode="bypassPermissions"
    )

    print("=" * 60)
    print("LOCALIZATION AUDIT AGENT")
    print("=" * 60)
    print(f"Source: {source_url} ({source_locale})")
    print(f"Target: {target_url} ({target_locale})")
    if industry:
        print(f"Industry: {industry}")
    print("=" * 60)
    print("\nStarting audit...\n")

    # Run the agent
    async with ClaudeSDKClient(options=options) as client:
        await client.query(audit_prompt)

        async for message in client.receive_messages():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(block.text, end="", flush=True)

            elif isinstance(message, ResultMessage):
                print("\n")
                print("=" * 60)
                print("AUDIT COMPLETE")
                print("=" * 60)
                if message.total_cost_usd:
                    print(f"Cost: ${message.total_cost_usd:.4f}")
                print(f"Duration: {message.duration_ms / 1000:.1f}s")
                break


async def interactive_mode() -> None:
    """Run the agent in interactive mode, prompting for URLs."""
    print("\n" + "=" * 60)
    print("LOCALIZATION AUDITOR - Interactive Mode")
    print("=" * 60)

    source_url = input("\nSource URL (original language): ").strip()
    if not source_url:
        print("Error: Source URL is required")
        return

    target_url = input("Target URL (translated): ").strip()
    if not target_url:
        print("Error: Target URL is required")
        return

    source_locale = input("Source locale (default: en): ").strip() or "en"
    target_locale = input("Target locale (default: ko): ").strip() or "ko"
    industry = input("Industry hint (optional, e.g., e-commerce, healthcare): ").strip() or None

    await run_audit(
        source_url=source_url,
        target_url=target_url,
        source_locale=source_locale,
        target_locale=target_locale,
        industry=industry
    )


async def main() -> None:
    """Main entry point."""
    import sys

    if len(sys.argv) >= 3:
        # Command line mode: python main.py <source_url> <target_url> [source_locale] [target_locale] [industry]
        source_url = sys.argv[1]
        target_url = sys.argv[2]
        source_locale = sys.argv[3] if len(sys.argv) > 3 else "en"
        target_locale = sys.argv[4] if len(sys.argv) > 4 else "ko"
        industry = sys.argv[5] if len(sys.argv) > 5 else None

        await run_audit(
            source_url=source_url,
            target_url=target_url,
            source_locale=source_locale,
            target_locale=target_locale,
            industry=industry
        )
    else:
        # Interactive mode
        await interactive_mode()


if __name__ == "__main__":
    asyncio.run(main())

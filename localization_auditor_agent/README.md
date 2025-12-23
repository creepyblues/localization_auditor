# Localization Auditor Agent

An AI-powered agent that reviews translated website content for cultural appropriateness, domain expertise accuracy, and glossary term consistency.

Built with the [Claude Agent SDK](https://platform.claude.com/docs/en/api/agent-sdk/python).

## Features

- **Web Content Retrieval** — Fetches website content via WebFetch with automatic fallback to screenshot + OCR when scraping is blocked
- **Domain-Specific Glossaries** — Loads CSV glossaries based on detected industry for terminology validation
- **Cultural Review** — Identifies culturally insensitive content and improper adaptations
- **Expert Context** — Verifies industry-specific terminology is correctly translated
- **Multi-Language Support** — Works with any language pair (en, ko, ja, etc.)

## Requirements

- Python 3.10+
- [Anthropic API Key](https://console.anthropic.com/)
- Node.js (for Playwright MCP server - screenshot fallback)

## Setup

1. **Clone and navigate to the project:**
   ```bash
   cd localization_auditor_agent
   ```

2. **Create and activate virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure API key:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

5. **(Optional) Install Playwright for screenshot fallback:**
   ```bash
   npx playwright install chromium
   ```

## Usage

### Interactive Mode

```bash
source venv/bin/activate
python main.py
```

You'll be prompted for:
- Source URL (original language)
- Target URL (translated)
- Source locale (default: en)
- Target locale (default: ko)
- Industry hint (optional)

### CLI Mode

```bash
python main.py <source_url> <target_url> [source_locale] [target_locale] [industry]
```

**Examples:**

```bash
# Audit Korean translation of an e-commerce site
python main.py https://shop.example.com https://shop.example.com/ko en ko e-commerce

# Audit Japanese translation with auto-detected industry
python main.py https://example.com https://example.com/ja en ja

# Audit with default locales (en -> ko)
python main.py https://example.com/en https://example.com/ko
```

## Glossaries

### Format

Glossary files are CSV with locale codes as column headers:

```csv
en,ko,ja,context,notes
checkout,결제,チェックアウト,payment flow,Prefer 결제 over 체크아웃 for Korean market
cart,장바구니,カート,shopping,
add to cart,장바구니에 담기,カートに追加,button text,
```

**Columns:**
| Column | Required | Description |
|--------|----------|-------------|
| `en`, `ko`, `ja`, etc. | Yes (at least 2) | Locale codes matching your source/target |
| `context` | No | Usage context for the term |
| `notes` | No | Additional guidance for reviewers |

### Adding Glossaries

1. Create a CSV file in `glossaries/` named by industry:
   - `e-commerce.csv`
   - `healthcare.csv`
   - `finance.csv`
   - `gaming.csv`
   - `legal.csv`

2. The agent will automatically load the matching glossary when it detects the industry

3. If no industry-specific glossary exists, create `glossaries/general.csv` as a fallback

### Included Glossaries

| File | Languages | Terms |
|------|-----------|-------|
| `e-commerce.csv` | en, ko, ja | 27 common e-commerce terms |
| `sample.csv` | en, ko, ja | Template for creating new glossaries |

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCALIZATION AUDIT FLOW                   │
└─────────────────────────────────────────────────────────────┘

1. INPUT
   ├── Source URL (original language)
   ├── Target URL (translated)
   ├── Locale pair (e.g., en → ko)
   └── Industry hint (optional)

2. CONTENT RETRIEVAL
   ├── Try WebFetch for both URLs
   └── If blocked → Playwright screenshot → Claude vision OCR

3. INDUSTRY DETECTION
   ├── Analyze website content
   ├── Determine domain (e-commerce, healthcare, etc.)
   └── Load matching glossary CSV

4. AUDIT ANALYSIS
   ├── Glossary Compliance — Check term consistency
   ├── Cultural Appropriateness — Dates, currencies, references
   ├── Domain Expertise — Technical/industry terms
   └── Tone & Style — Formality, honorifics, brand voice

5. OUTPUT
   ├── Overall quality score (1-10)
   ├── Summary of findings
   ├── Detailed issues list with severity
   └── Recommendations for improvement
```

## Output Format

The agent produces a structured audit report:

```
AUDIT REPORT
============

Overall Score: 7.5/10

Summary:
The translation maintains good accuracy but has several
glossary inconsistencies and minor cultural adaptation issues.

Issues Found:
┌──────────────┬──────────┬─────────────────────────────────┐
│ Type         │ Severity │ Description                     │
├──────────────┼──────────┼─────────────────────────────────┤
│ Glossary     │ Major    │ "checkout" translated as        │
│              │          │ "체크아웃" instead of "결제"      │
├──────────────┼──────────┼─────────────────────────────────┤
│ Cultural     │ Minor    │ Date format not localized       │
│              │          │ (MM/DD/YYYY → YYYY년 MM월 DD일)  │
├──────────────┼──────────┼─────────────────────────────────┤
│ Tone         │ Minor    │ Missing honorific in customer   │
│              │          │ service section                 │
└──────────────┴──────────┴─────────────────────────────────┘

Recommendations:
1. Update checkout terminology per glossary
2. Implement locale-aware date formatting
3. Review formality levels for B2C content
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Yes |
| `CLAUDE_CODE_USE_BEDROCK` | Use AWS Bedrock (set to `1`) | No |
| `CLAUDE_CODE_USE_VERTEX` | Use Google Vertex AI (set to `1`) | No |

### Customizing the Agent

Edit `main.py` to modify:

- **System prompt** (`SYSTEM_PROMPT`) — Adjust audit criteria and output format
- **Allowed tools** — Add/remove tools in `ClaudeAgentOptions`
- **MCP servers** — Add additional MCP integrations

## Troubleshooting

### "WebFetch failed" or blocked content

The agent will automatically fall back to Playwright screenshots. Ensure:
```bash
npx playwright install chromium
```

### "No glossary found for industry"

Create a glossary file matching the detected industry name in `glossaries/`:
```bash
# Check what industry was detected in the output
# Create: glossaries/<industry>.csv
```

### API key errors

Verify your `.env` file:
```bash
cat .env
# Should show: ANTHROPIC_API_KEY=sk-ant-...
```

### Permission errors

The agent runs with `permission_mode="bypassPermissions"` for automation. For interactive approval, change to `"default"` in `main.py`.

## Project Structure

```
localization_auditor_agent/
├── main.py              # Agent entry point and configuration
├── requirements.txt     # Python dependencies
├── glossaries/          # Industry-specific terminology
│   ├── e-commerce.csv   # E-commerce glossary (en/ko/ja)
│   └── sample.csv       # Template for new glossaries
├── .env.example         # Environment variable template
├── .gitignore           # Git ignore rules
└── venv/                # Python virtual environment
```

## License

MIT

## References

- [Claude Agent SDK Documentation](https://platform.claude.com/docs/en/api/agent-sdk/overview)
- [Claude Agent SDK Python Reference](https://platform.claude.com/docs/en/api/agent-sdk/python)
- [Playwright MCP Server](https://github.com/anthropics/mcp-server-playwright)

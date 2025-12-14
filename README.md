# Localization Auditor

A web application that audits localized websites against their original language versions, scoring them across multiple quality dimensions using Claude AI.

## Features

- **8 Quality Dimensions**: Comprehensive scoring across correctness, cultural relevance, industry expertise, fluency, consistency, completeness, UI/UX localization, and SEO
- **AI-Powered Analysis**: Leverages Claude AI for nuanced language understanding and cultural context analysis
- **Industry Glossaries**: Pre-built terminology for e-commerce, ad tech, and wellness industries
- **Custom Glossaries**: Create and manage your own terminology dictionaries
- **Detailed Reports**: Actionable findings and recommendations for each dimension

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+, TypeScript, Tailwind CSS |
| Backend | Python FastAPI |
| Database | PostgreSQL |
| LLM | Claude API (Anthropic) |
| Web Scraping | Playwright |
| Auth | JWT-based authentication |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 16+
- Redis (optional, for background tasks)

### Setup

1. **Clone and navigate to the project**
   ```bash
   cd localization_auditor
   ```

2. **Start the database**
   ```bash
   docker-compose up -d
   ```

3. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt

   # Copy and edit the environment file
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY

   # Install Playwright browsers
   playwright install chromium

   # Run database migrations
   alembic upgrade head

   # Start the server
   uvicorn app.main:app --reload
   ```

4. **Set up the frontend**
   ```bash
   cd frontend
   npm install

   # Copy environment file
   cp .env.local.example .env.local

   # Start the dev server
   npm run dev
   ```

5. **Access the app**
   - Frontend: http://localhost:3000
   - API docs: http://localhost:8000/docs

## Quality Dimensions

| Dimension | Description |
|-----------|-------------|
| Correctness | Translation accuracy, grammar, spelling, terminology fidelity |
| Cultural Relevance | Cultural adaptation, idioms, imagery appropriateness, tone |
| Industry Expertise | Domain-specific terminology accuracy, compliance |
| Fluency | Natural reading flow in target language |
| Consistency | Uniform terminology usage throughout |
| Completeness | Detection of missing/untranslated content |
| UI/UX | Date/time formats, currency, measurements, number formats |
| SEO | Meta tags, keywords localization |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/me` - Get current user

### Audits
- `POST /api/audits` - Create new audit
- `GET /api/audits` - List user's audits
- `GET /api/audits/{id}` - Get audit with results
- `DELETE /api/audits/{id}` - Delete audit

### Glossaries
- `POST /api/glossaries` - Create glossary
- `GET /api/glossaries` - List glossaries
- `GET /api/glossaries/{id}` - Get glossary with terms
- `DELETE /api/glossaries/{id}` - Delete glossary
- `POST /api/glossaries/{id}/terms` - Add term
- `POST /api/glossaries/{id}/import` - Bulk import terms
- `DELETE /api/glossaries/{id}/terms/{term_id}` - Delete term

## Environment Variables

### Backend (.env)
```
DEBUG=true
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/localization_auditor
SECRET_KEY=your-secret-key
ANTHROPIC_API_KEY=your-anthropic-api-key
REDIS_URL=redis://localhost:6379/0
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## License

MIT

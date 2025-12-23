"""CSV Glossary Import Service"""
import csv
import io
from typing import List, Dict, Tuple, Set
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.glossary import Glossary, GlossaryTerm


@dataclass
class CSVImportResult:
    """Result of CSV import operation."""
    glossaries_created: int = 0
    glossaries_updated: int = 0
    terms_added: int = 0
    terms_skipped: int = 0
    errors: List[str] = field(default_factory=list)
    details: List[Dict] = field(default_factory=list)


class CSVGlossaryImportService:
    """Service for importing glossary terms from CSV files."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def parse_csv(self, file_content: bytes) -> Tuple[List[str], List[Dict[str, str]]]:
        """
        Parse CSV file and return headers and rows.

        Returns:
            Tuple of (headers, rows) where headers = ["en", "kr", "ja", ...]
        """
        # Decode and parse CSV - handle BOM for Excel-generated files
        content = file_content.decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(content))
        headers = reader.fieldnames
        rows = list(reader)

        # Validate headers
        if not headers or len(headers) < 2:
            raise ValueError("CSV must have at least 2 columns (source + 1 target)")

        # Normalize headers to lowercase
        headers = [h.strip().lower() for h in headers]

        # First column must be source language (English)
        source_lang = headers[0]
        if source_lang != "en":
            raise ValueError("First column must be 'en' (English source)")

        return headers, rows

    async def import_glossaries(
        self,
        file_content: bytes,
        industry: str
    ) -> CSVImportResult:
        """
        Import CSV to create/update system glossaries.

        Creates one glossary per source-target language pair.
        Only adds new terms - existing terms are preserved (no overwrite).

        Args:
            file_content: Raw bytes of the CSV file
            industry: Industry identifier (e.g., "ecommerce", "adtech")

        Returns:
            CSVImportResult with counts and details
        """
        headers, rows = await self.parse_csv(file_content)
        source_lang = headers[0]
        target_langs = headers[1:]

        result = CSVImportResult()

        # Process each target language column
        for target_lang in target_langs:
            glossary_detail = {
                "source_language": source_lang,
                "target_language": target_lang,
                "terms_added": 0,
                "terms_skipped": 0
            }

            # Find or create glossary for this language pair
            query = select(Glossary).where(
                Glossary.industry == industry,
                Glossary.source_language == source_lang,
                Glossary.target_language == target_lang,
                Glossary.is_system == True
            )
            existing = await self.db.execute(query)
            glossary = existing.scalar_one_or_none()

            if glossary:
                result.glossaries_updated += 1
                # Get existing source terms for duplicate check
                existing_terms_query = select(GlossaryTerm.source_term).where(
                    GlossaryTerm.glossary_id == glossary.id
                )
                existing_result = await self.db.execute(existing_terms_query)
                existing_source_terms: Set[str] = {
                    row[0].lower().strip() for row in existing_result.fetchall()
                }
            else:
                # Create new glossary
                glossary = Glossary(
                    user_id=None,
                    name=f"{industry.title()} System Glossary ({source_lang}->{target_lang})",
                    description=f"System glossary for {industry} industry",
                    industry=industry,
                    source_language=source_lang,
                    target_language=target_lang,
                    is_system=True
                )
                self.db.add(glossary)
                await self.db.flush()
                result.glossaries_created += 1
                existing_source_terms = set()

            # Add terms from CSV
            for row in rows:
                # Handle case-insensitive column lookup
                source_term = None
                target_term = None

                for key, value in row.items():
                    key_lower = key.strip().lower() if key else ""
                    if key_lower == source_lang:
                        source_term = value.strip() if value else ""
                    elif key_lower == target_lang:
                        target_term = value.strip() if value else ""

                # Skip empty rows
                if not source_term:
                    continue

                # Skip if target is empty
                if not target_term:
                    continue

                # Check for duplicate (case-insensitive)
                if source_term.lower() in existing_source_terms:
                    result.terms_skipped += 1
                    glossary_detail["terms_skipped"] += 1
                    continue

                # Add term
                term = GlossaryTerm(
                    glossary_id=glossary.id,
                    source_term=source_term,
                    target_term=target_term,
                    context=None,
                    notes=None
                )
                self.db.add(term)
                existing_source_terms.add(source_term.lower())
                result.terms_added += 1
                glossary_detail["terms_added"] += 1

            result.details.append(glossary_detail)

        await self.db.commit()
        return result

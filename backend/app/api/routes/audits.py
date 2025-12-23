from datetime import datetime
from typing import Optional, Callable, Awaitable
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User
from app.models.audit import Audit, AuditResult, AuditStatus, AuditType
from app.models.glossary import Glossary, GlossaryTerm
from app.schemas.audit import AuditCreate, AuditResponse, AuditListResponse, AuditType as AuditTypeSchema
from app.api.deps import get_current_user
from app.services.auditor import LocalizationAuditor
from app.services.scraper import WebScraper
import base64

router = APIRouter(prefix="/audits", tags=["audits"])


# Progress callback type
ProgressCallback = Callable[[str, int, int], Awaitable[None]]


async def run_audit_task(audit_id: int, glossary_id: Optional[int] = None):
    """
    Background task to run the audit using Claude Agent SDK.

    The agent handles web scraping internally with WebFetch and
    Playwright MCP fallback for blocked sites.
    """
    from app.core.database import async_session_maker

    async with async_session_maker() as db:
        try:
            # Get the audit
            result = await db.execute(
                select(Audit).where(Audit.id == audit_id)
            )
            audit = result.scalar_one_or_none()
            if not audit:
                return

            # Helper to update progress
            async def update_progress(message: str, step: int, total: int):
                audit.progress_message = message
                audit.progress_step = step
                audit.progress_total = total
                await db.commit()

            # Total steps: 1 (init) + 1 (glossary) + 1 (agent run) + 1 (save results)
            total_steps = 4

            # Step 1: Initialize
            await update_progress("Initializing audit...", 1, total_steps)
            audit.status = AuditStatus.ANALYZING.value
            await db.commit()

            # Step 2: Load glossary terms
            await update_progress("Loading glossary terms...", 2, total_steps)
            glossary_terms = None
            if glossary_id:
                terms_result = await db.execute(
                    select(GlossaryTerm).where(GlossaryTerm.glossary_id == glossary_id)
                )
                terms = terms_result.scalars().all()
                glossary_terms = [
                    {"source_term": t.source_term, "target_term": t.target_term, "context": t.context}
                    for t in terms
                ]
                await update_progress(f"Loaded {len(glossary_terms)} glossary terms", 2, total_steps)

            # Step 3: Run the audit using Agent SDK
            if audit.audit_type == AuditType.STANDALONE.value:
                await update_progress("Running AI agent for back-translation assessment...", 3, total_steps)
            else:
                await update_progress("Running AI agent for content comparison...", 3, total_steps)

            auditor = LocalizationAuditor()

            # Choose audit method based on audit_type
            if audit.audit_type == AuditType.STANDALONE.value:
                # Standalone audit: back-translation assessment
                scores = await auditor.audit_standalone(
                    audit_url=audit.audit_url,
                    source_language=audit.source_language or "en",
                    target_language=audit.target_language or "unknown",
                    industry=audit.industry,
                    glossary_terms=glossary_terms
                )
            else:
                # Comparison audit: compare original vs localized
                scores = await auditor.audit(
                    original_url=audit.original_url,
                    audit_url=audit.audit_url,
                    source_language=audit.source_language or "en",
                    target_language=audit.target_language or "unknown",
                    industry=audit.industry,
                    glossary_terms=glossary_terms
                )

            # Step 4: Save results
            await update_progress("Saving audit results...", 4, total_steps)

            if scores:
                audit.overall_score = scores.overall_score

                # Save screenshots captured by the agent (from Playwright MCP)
                if scores.original_screenshot:
                    audit.original_screenshot = scores.original_screenshot
                if scores.audit_screenshot:
                    audit.audit_screenshot = scores.audit_screenshot

                # Set actual audit mode from the agent's analysis method
                audit.actual_audit_mode = scores.analysis_method

                # Save API usage and cost
                audit.api_cost_usd = scores.api_cost_usd
                audit.api_input_tokens = scores.api_input_tokens
                audit.api_output_tokens = scores.api_output_tokens
                audit.api_duration_ms = scores.api_duration_ms

                for dim_score in scores.dimensions:
                    audit_result = AuditResult(
                        audit_id=audit.id,
                        dimension=dim_score.dimension,
                        score=dim_score.score,
                        findings=dim_score.findings,
                        good_examples=dim_score.good_examples,
                        recommendations=dim_score.recommendations
                    )
                    db.add(audit_result)

                audit.status = AuditStatus.COMPLETED.value
                audit.progress_message = "Audit completed successfully"
                audit.completed_at = datetime.utcnow()
                await db.commit()

        except Exception as e:
            # Update status to failed
            audit.status = AuditStatus.FAILED.value
            audit.error_message = str(e)
            audit.progress_message = f"Audit failed: {str(e)[:200]}"
            await db.commit()
            raise


@router.post("", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
async def create_audit(
    audit_data: AuditCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new localization audit."""
    audit = Audit(
        user_id=current_user.id,
        audit_type=audit_data.audit_type.value if audit_data.audit_type else AuditType.COMPARISON.value,
        original_url=audit_data.original_url,  # None for standalone audits
        audit_url=audit_data.audit_url,
        source_language=audit_data.source_language,
        target_language=audit_data.target_language,
        industry=audit_data.industry,
        audit_mode=audit_data.audit_mode.value if audit_data.audit_mode else "auto",
        glossary_id=audit_data.glossary_id,
        status=AuditStatus.PENDING.value
    )
    db.add(audit)
    await db.commit()

    # Reload with results and glossary relationships
    result = await db.execute(
        select(Audit)
        .options(
            selectinload(Audit.results),
            selectinload(Audit.glossary).selectinload(Glossary.terms)
        )
        .where(Audit.id == audit.id)
    )
    audit = result.scalar_one()

    # Start the audit in background
    background_tasks.add_task(run_audit_task, audit.id, audit_data.glossary_id)

    return audit


@router.get("", response_model=AuditListResponse)
async def list_audits(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all audits for the current user."""
    # Get total count
    count_result = await db.execute(
        select(Audit).where(Audit.user_id == current_user.id)
    )
    total = len(count_result.scalars().all())

    # Get paginated results
    result = await db.execute(
        select(Audit)
        .options(
            selectinload(Audit.results),
            selectinload(Audit.glossary).selectinload(Glossary.terms)
        )
        .where(Audit.user_id == current_user.id)
        .order_by(Audit.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    audits = result.scalars().all()

    return AuditListResponse(audits=audits, total=total)


@router.get("/{audit_id}", response_model=AuditResponse)
async def get_audit(
    audit_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific audit with results."""
    result = await db.execute(
        select(Audit)
        .options(
            selectinload(Audit.results),
            selectinload(Audit.glossary).selectinload(Glossary.terms)
        )
        .where(Audit.id == audit_id, Audit.user_id == current_user.id)
    )
    audit = result.scalar_one_or_none()

    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )

    return audit


@router.delete("/{audit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_audit(
    audit_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an audit."""
    result = await db.execute(
        select(Audit).where(Audit.id == audit_id, Audit.user_id == current_user.id)
    )
    audit = result.scalar_one_or_none()

    if not audit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit not found"
        )

    await db.delete(audit)
    await db.commit()

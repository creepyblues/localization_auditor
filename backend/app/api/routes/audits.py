from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User
from app.models.audit import Audit, AuditResult, AuditStatus
from app.models.glossary import Glossary, GlossaryTerm
from app.schemas.audit import AuditCreate, AuditResponse, AuditListResponse
from app.api.deps import get_current_user
from app.services.scraper import scrape_urls
from app.services.auditor import LocalizationAuditor, content_to_dict, build_content_pairs

router = APIRouter(prefix="/audits", tags=["audits"])


async def run_audit_task(audit_id: int, glossary_id: Optional[int] = None):
    """Background task to run the audit."""
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

            # Update status to scraping
            audit.status = AuditStatus.SCRAPING.value
            await db.commit()

            # Scrape both URLs
            original_content, audit_content = await scrape_urls(
                audit.original_url,
                audit.audit_url
            )

            # Store scraped content
            audit.original_content = content_to_dict(original_content)
            audit.audit_content = content_to_dict(audit_content)

            # Generate content pairs for side-by-side comparison
            audit.content_pairs = build_content_pairs(original_content, audit_content)

            # Update detected languages
            if original_content.detected_language and not audit.source_language:
                audit.source_language = original_content.detected_language
            if audit_content.detected_language and not audit.target_language:
                audit.target_language = audit_content.detected_language

            # Update status to analyzing
            audit.status = AuditStatus.ANALYZING.value
            await db.commit()

            # Get glossary terms if provided
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

            # Run the audit
            auditor = LocalizationAuditor()
            scores = await auditor.audit(
                original=original_content,
                localized=audit_content,
                industry=audit.industry,
                glossary_terms=glossary_terms
            )

            # Store results
            audit.overall_score = scores.overall_score

            for dim_score in scores.dimensions:
                result = AuditResult(
                    audit_id=audit.id,
                    dimension=dim_score.dimension,
                    score=dim_score.score,
                    findings=dim_score.findings,
                    good_examples=dim_score.good_examples,
                    recommendations=dim_score.recommendations
                )
                db.add(result)

            audit.status = AuditStatus.COMPLETED.value
            audit.completed_at = datetime.utcnow()
            await db.commit()

        except Exception as e:
            # Update status to failed
            audit.status = AuditStatus.FAILED.value
            audit.error_message = str(e)
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
        original_url=audit_data.original_url,
        audit_url=audit_data.audit_url,
        source_language=audit_data.source_language,
        target_language=audit_data.target_language,
        industry=audit_data.industry,
        status=AuditStatus.PENDING.value
    )
    db.add(audit)
    await db.commit()

    # Reload with results relationship
    result = await db.execute(
        select(Audit)
        .options(selectinload(Audit.results))
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
        .options(selectinload(Audit.results))
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
        .options(selectinload(Audit.results))
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

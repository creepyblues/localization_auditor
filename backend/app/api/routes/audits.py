from datetime import datetime
from typing import Optional, Callable, Awaitable, List
import json
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User
from app.models.audit import Audit, AuditResult, AuditStatus, AuditType
from app.models.glossary import Glossary, GlossaryTerm
from app.schemas.audit import AuditCreate, AuditResponse, AuditListResponse, AuditType as AuditTypeSchema, ProficiencyTestResponse
from app.api.deps import get_current_user
from app.services.auditor import LocalizationAuditor, BlockedPageError
from app.services.scraper import WebScraper, resize_image_for_claude
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
            # Use direct API (more memory-efficient for production)
            if audit.audit_type == AuditType.STANDALONE.value:
                # Standalone audit: back-translation assessment
                scores = await auditor.audit_standalone_direct(
                    audit_url=audit.audit_url,
                    source_language=audit.source_language or "en",
                    target_language=audit.target_language or "unknown",
                    industry=audit.industry,
                    glossary_terms=glossary_terms,
                    progress_callback=lambda msg: update_progress(msg, 3, total_steps)
                )
            else:
                # Comparison audit: compare original vs localized
                # For now, use standalone direct for all audits
                # TODO: Implement comparison mode with direct API
                scores = await auditor.audit_standalone_direct(
                    audit_url=audit.audit_url,
                    source_language=audit.source_language or "en",
                    target_language=audit.target_language or "unknown",
                    industry=audit.industry,
                    glossary_terms=glossary_terms,
                    progress_callback=lambda msg: update_progress(msg, 3, total_steps)
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

        except BlockedPageError as e:
            # Page is blocked - set BLOCKED status, store screenshot and reason
            audit.status = AuditStatus.BLOCKED.value
            audit.blocked_reason = e.reason
            audit.audit_screenshot = e.screenshot_base64
            audit.progress_message = f"Page blocked: {e.reason[:100]}"
            await db.commit()
            # Don't raise - this is expected behavior, not an error

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


@router.post("/{audit_id}/retry", response_model=AuditResponse)
async def retry_blocked_audit(
    audit_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retry an audit that was blocked. Resets status and runs again."""
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

    if audit.status != AuditStatus.BLOCKED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only retry blocked audits"
        )

    # Reset audit state
    audit.status = AuditStatus.PENDING.value
    audit.blocked_reason = None
    audit.error_message = None
    audit.progress_message = "Retrying audit..."
    audit.progress_step = None
    audit.progress_total = None
    await db.commit()

    # Start the audit in background
    background_tasks.add_task(run_audit_task, audit.id, audit.glossary_id)

    return audit


async def run_audit_task_with_screenshot(
    audit_id: int,
    glossary_id: Optional[int] = None,
    existing_screenshot: Optional[str] = None
):
    """
    Background task to run audit using existing screenshot, skipping block detection.
    """
    from app.core.database import async_session_maker

    async with async_session_maker() as db:
        try:
            result = await db.execute(
                select(Audit).where(Audit.id == audit_id)
            )
            audit = result.scalar_one_or_none()
            if not audit:
                return

            # Helper to update progress
            async def update_progress(message: str, step: int = 3, total: int = 4):
                audit.progress_message = message
                audit.progress_step = step
                audit.progress_total = total
                await db.commit()

            audit.status = AuditStatus.ANALYZING.value
            await db.commit()

            # Load glossary terms
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

            await update_progress("Running AI analysis on captured screenshot...")

            auditor = LocalizationAuditor()

            # Call the method that uses existing screenshot
            scores = await auditor.audit_with_screenshot(
                audit_url=audit.audit_url,
                screenshot_base64=existing_screenshot,
                source_language=audit.source_language or "en",
                target_language=audit.target_language or "unknown",
                industry=audit.industry,
                glossary_terms=glossary_terms,
                progress_callback=lambda msg: update_progress(msg, 3, 4)
            )

            # Save results
            await update_progress("Saving audit results...", 4, 4)

            if scores:
                audit.overall_score = scores.overall_score
                audit.actual_audit_mode = "screenshot"
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
                audit.progress_message = "Audit completed (forced proceed)"
                audit.completed_at = datetime.utcnow()
                await db.commit()

        except Exception as e:
            audit.status = AuditStatus.FAILED.value
            audit.error_message = str(e)
            audit.progress_message = f"Audit failed: {str(e)[:200]}"
            await db.commit()
            raise


@router.post("/{audit_id}/proceed", response_model=AuditResponse)
async def proceed_blocked_audit(
    audit_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Force proceed with an audit that was blocked (analyze the blocked page anyway)."""
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

    if audit.status != AuditStatus.BLOCKED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only proceed with blocked audits"
        )

    if not audit.audit_screenshot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No screenshot available for this audit"
        )

    # Update status
    audit.status = AuditStatus.PENDING.value
    audit.progress_message = "Proceeding with audit (skipping block detection)..."
    await db.commit()

    # Start the audit with existing screenshot
    background_tasks.add_task(
        run_audit_task_with_screenshot,
        audit.id,
        audit.glossary_id,
        audit.audit_screenshot
    )

    return audit


async def run_image_upload_audit_task(audit_id: int, glossary_id: Optional[int] = None):
    """
    Background task to run audit on user-uploaded images using Claude Vision.
    """
    from app.core.database import async_session_maker

    async with async_session_maker() as db:
        try:
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

            total_steps = 4

            # Step 1: Initialize
            await update_progress("Initializing image audit...", 1, total_steps)
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

            # Step 3: Run AI analysis on uploaded images
            await update_progress("Analyzing uploaded images with AI...", 3, total_steps)

            auditor = LocalizationAuditor()
            scores = await auditor.audit_uploaded_images(
                uploaded_images=audit.uploaded_images,
                audit_type=audit.audit_type,
                source_language=audit.source_language or "en",
                target_language=audit.target_language or "unknown",
                industry=audit.industry,
                glossary_terms=glossary_terms,
                progress_callback=lambda msg: update_progress(msg, 3, total_steps)
            )

            # Step 4: Save results
            await update_progress("Saving audit results...", 4, total_steps)

            if scores:
                audit.overall_score = scores.overall_score
                audit.actual_audit_mode = "image_upload"
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
            audit.status = AuditStatus.FAILED.value
            audit.error_message = str(e)
            audit.progress_message = f"Audit failed: {str(e)[:200]}"
            await db.commit()
            raise


@router.post("/upload", response_model=AuditResponse, status_code=status.HTTP_201_CREATED)
async def create_audit_with_images(
    images: List[UploadFile] = File(...),
    image_labels: str = Form(...),  # JSON array: ["original", "localized", ...]
    audit_type: str = Form(default="comparison"),
    source_language: str = Form(default="en"),
    target_language: Optional[str] = Form(default=None),
    industry: Optional[str] = Form(default=None),
    glossary_id: Optional[int] = Form(default=None),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new localization audit from uploaded images."""

    # Validate image count
    if len(images) < 1 or len(images) > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must upload between 1 and 3 images"
        )

    # Parse and validate labels
    try:
        labels = json.loads(image_labels)
        if len(labels) != len(images):
            raise ValueError("Number of labels must match number of images")
        for label in labels:
            if label not in ["original", "localized"]:
                raise ValueError(f"Invalid label: {label}. Must be 'original' or 'localized'")
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="image_labels must be a valid JSON array"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Validate audit type requirements
    has_original = "original" in labels
    has_localized = "localized" in labels

    if audit_type == "comparison" and not (has_original and has_localized):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comparison audit requires at least one original and one localized image"
        )

    if audit_type == "standalone" and not has_localized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Standalone audit requires at least one localized image"
        )

    # Process and validate images
    uploaded_images_data = []
    for idx, (image_file, label) in enumerate(zip(images, labels)):
        # Validate file type
        if not image_file.content_type or not image_file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {idx + 1} is not a valid image"
            )

        # Read and validate size (max 10MB per image)
        content = await image_file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image {idx + 1} is too large (max 10MB)"
            )

        # Resize for Claude Vision API
        resized = resize_image_for_claude(content)

        uploaded_images_data.append({
            "label": label,
            "data": base64.b64encode(resized).decode('utf-8'),
            "filename": image_file.filename or f"image_{idx + 1}.png"
        })

    # Create audit record
    audit = Audit(
        user_id=current_user.id,
        audit_type=audit_type,
        original_url=None,  # No URL for image uploads
        audit_url=None,     # No URL for image uploads
        source_language=source_language,
        target_language=target_language,
        industry=industry,
        audit_mode="image_upload",
        glossary_id=glossary_id,
        status=AuditStatus.PENDING.value,
        uploaded_images=uploaded_images_data
    )
    db.add(audit)
    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Audit)
        .options(
            selectinload(Audit.results),
            selectinload(Audit.glossary).selectinload(Glossary.terms)
        )
        .where(Audit.id == audit.id)
    )
    audit = result.scalar_one()

    # Start background task
    background_tasks.add_task(run_image_upload_audit_task, audit.id, glossary_id)

    return audit


async def run_proficiency_test_task(audit_id: int):
    """
    Background task to run language proficiency test only.
    """
    from app.core.database import async_session_maker

    async with async_session_maker() as db:
        try:
            result = await db.execute(
                select(Audit).where(Audit.id == audit_id)
            )
            audit = result.scalar_one_or_none()
            if not audit:
                return

            # Helper to update progress
            async def update_progress(message: str, step: int = 2, total: int = 3):
                audit.progress_message = message
                audit.progress_step = step
                audit.progress_total = total
                await db.commit()

            audit.status = AuditStatus.ANALYZING.value
            await update_progress("Running language proficiency analysis...", 1, 3)
            await db.commit()

            auditor = LocalizationAuditor()

            # Determine content source: URL or uploaded image
            image_data = None
            content = None

            if audit.uploaded_images and len(audit.uploaded_images) > 0:
                # Use uploaded image
                image_data = audit.uploaded_images[0].get("data")
            elif audit.audit_url:
                # Scrape URL content
                await update_progress("Scraping page content...", 1, 3)
                async with WebScraper() as scraper:
                    try:
                        scraped = await scraper.scrape_url(audit.audit_url)
                        content = scraped.raw_text
                    except Exception as e:
                        # Try screenshot fallback
                        await update_progress("Text scraping blocked, taking screenshot...", 1, 3)
                        screenshot_bytes = await scraper.take_screenshot(audit.audit_url)
                        if screenshot_bytes:
                            image_data = base64.b64encode(screenshot_bytes).decode('utf-8')
                        else:
                            raise e

            await update_progress("Analyzing language proficiency...", 2, 3)

            # Run proficiency test
            proficiency_result = await auditor.run_proficiency_test(
                content=content,
                image_data=image_data,
                target_language=audit.target_language or "en",
                progress_callback=lambda msg: update_progress(msg, 2, 3)
            )

            # Save results
            await update_progress("Saving results...", 3, 3)

            if proficiency_result:
                # Handle None score - use 0 as fallback and note the error
                score = proficiency_result.get("score")
                parse_error = proficiency_result.get("parse_error")

                if score is None:
                    if parse_error:
                        # JSON parsing failed completely
                        audit.status = AuditStatus.FAILED.value
                        audit.error_message = f"Analysis failed: {parse_error}"
                        audit.progress_message = "Failed to parse AI response"
                        await db.commit()
                        return
                    else:
                        # Score not found but no parse error - treat as 0
                        score = 0

                audit.overall_score = score
                audit.actual_audit_mode = "proficiency"

                # Save API usage
                audit.api_cost_usd = proficiency_result.get("api_cost_usd")
                audit.api_input_tokens = proficiency_result.get("api_input_tokens")
                audit.api_output_tokens = proficiency_result.get("api_output_tokens")
                audit.api_duration_ms = proficiency_result.get("api_duration_ms")

                # Save as single LANGUAGE_PROFICIENCY result
                audit_result = AuditResult(
                    audit_id=audit.id,
                    dimension="LANGUAGE_PROFICIENCY",
                    score=score,
                    findings=proficiency_result.get("findings"),
                    good_examples=proficiency_result.get("good_examples"),
                    recommendations=proficiency_result.get("recommendations")
                )
                db.add(audit_result)

                audit.status = AuditStatus.COMPLETED.value
                audit.progress_message = "Proficiency test completed"
                audit.completed_at = datetime.utcnow()
                await db.commit()

        except Exception as e:
            audit.status = AuditStatus.FAILED.value
            audit.error_message = str(e)
            audit.progress_message = f"Proficiency test failed: {str(e)[:200]}"
            await db.commit()
            raise


@router.post("/proficiency-test", response_model=ProficiencyTestResponse, status_code=status.HTTP_201_CREATED)
async def create_proficiency_test(
    url: Optional[str] = Form(default=None),
    image: Optional[UploadFile] = File(default=None),
    target_language: str = Form(default="en"),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Run a quick language proficiency test on a URL or uploaded image.
    Returns only the proficiency score and verdict - faster than full audit.
    """
    # Validate input - need either URL or image
    if not url and not image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either a URL or an image"
        )

    # Process uploaded image if provided
    uploaded_images_data = None
    if image:
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is not a valid image"
            )

        content = await image.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image is too large (max 10MB)"
            )

        resized = resize_image_for_claude(content)
        uploaded_images_data = [{
            "label": "localized",
            "data": base64.b64encode(resized).decode('utf-8'),
            "filename": image.filename or "uploaded_image.png"
        }]

    # Create audit record with proficiency type
    audit = Audit(
        user_id=current_user.id,
        audit_type=AuditType.PROFICIENCY.value,
        original_url=None,
        audit_url=url,
        source_language=None,
        target_language=target_language,
        industry=None,
        audit_mode="proficiency",
        glossary_id=None,
        status=AuditStatus.PENDING.value,
        uploaded_images=uploaded_images_data
    )
    db.add(audit)
    await db.commit()
    await db.refresh(audit)

    # Start background task
    background_tasks.add_task(run_proficiency_test_task, audit.id)

    return ProficiencyTestResponse(
        id=audit.id,
        status=audit.status,
        url=audit.audit_url,
        score=None,
        verdict=None,
        findings=None,
        good_examples=None,
        recommendations=None,
        created_at=audit.created_at,
        completed_at=None,
        error_message=None
    )

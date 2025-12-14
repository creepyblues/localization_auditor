from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User
from app.models.glossary import Glossary, GlossaryTerm
from app.schemas.glossary import (
    GlossaryCreate, GlossaryResponse, GlossaryListResponse,
    GlossaryTermCreate, GlossaryTermResponse, GlossaryImport
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/glossaries", tags=["glossaries"])


@router.post("", response_model=GlossaryResponse, status_code=status.HTTP_201_CREATED)
async def create_glossary(
    glossary_data: GlossaryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new glossary."""
    glossary = Glossary(
        user_id=current_user.id,
        name=glossary_data.name,
        description=glossary_data.description,
        industry=glossary_data.industry,
        source_language=glossary_data.source_language,
        target_language=glossary_data.target_language,
        is_system=False
    )
    db.add(glossary)
    await db.commit()

    # Reload with terms relationship
    result = await db.execute(
        select(Glossary)
        .options(selectinload(Glossary.terms))
        .where(Glossary.id == glossary.id)
    )
    return result.scalar_one()


@router.get("", response_model=GlossaryListResponse)
async def list_glossaries(
    industry: Optional[str] = None,
    source_language: Optional[str] = None,
    target_language: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List glossaries (user's own + system glossaries)."""
    query = select(Glossary).options(selectinload(Glossary.terms)).where(
        or_(Glossary.user_id == current_user.id, Glossary.is_system == True)
    )

    if industry:
        query = query.where(Glossary.industry == industry)
    if source_language:
        query = query.where(Glossary.source_language == source_language)
    if target_language:
        query = query.where(Glossary.target_language == target_language)

    result = await db.execute(query.order_by(Glossary.created_at.desc()))
    glossaries = result.scalars().all()

    return GlossaryListResponse(glossaries=glossaries, total=len(glossaries))


@router.get("/{glossary_id}", response_model=GlossaryResponse)
async def get_glossary(
    glossary_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a glossary with all terms."""
    result = await db.execute(
        select(Glossary)
        .options(selectinload(Glossary.terms))
        .where(
            Glossary.id == glossary_id,
            or_(Glossary.user_id == current_user.id, Glossary.is_system == True)
        )
    )
    glossary = result.scalar_one_or_none()

    if not glossary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Glossary not found"
        )

    return glossary


@router.delete("/{glossary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_glossary(
    glossary_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a glossary (only user's own, not system glossaries)."""
    result = await db.execute(
        select(Glossary).where(
            Glossary.id == glossary_id,
            Glossary.user_id == current_user.id,
            Glossary.is_system == False
        )
    )
    glossary = result.scalar_one_or_none()

    if not glossary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Glossary not found or cannot be deleted"
        )

    await db.delete(glossary)
    await db.commit()


# Term management
@router.post("/{glossary_id}/terms", response_model=GlossaryTermResponse, status_code=status.HTTP_201_CREATED)
async def add_term(
    glossary_id: int,
    term_data: GlossaryTermCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a term to a glossary."""
    # Verify glossary ownership
    result = await db.execute(
        select(Glossary).where(
            Glossary.id == glossary_id,
            Glossary.user_id == current_user.id
        )
    )
    glossary = result.scalar_one_or_none()

    if not glossary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Glossary not found"
        )

    term = GlossaryTerm(
        glossary_id=glossary_id,
        source_term=term_data.source_term,
        target_term=term_data.target_term,
        context=term_data.context,
        notes=term_data.notes
    )
    db.add(term)
    await db.commit()
    await db.refresh(term)

    return term


@router.post("/{glossary_id}/import", response_model=GlossaryResponse)
async def import_terms(
    glossary_id: int,
    import_data: GlossaryImport,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bulk import terms to a glossary."""
    # Verify glossary ownership
    result = await db.execute(
        select(Glossary)
        .options(selectinload(Glossary.terms))
        .where(
            Glossary.id == glossary_id,
            Glossary.user_id == current_user.id
        )
    )
    glossary = result.scalar_one_or_none()

    if not glossary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Glossary not found"
        )

    # Add all terms
    for term_data in import_data.terms:
        term = GlossaryTerm(
            glossary_id=glossary_id,
            source_term=term_data.source_term,
            target_term=term_data.target_term,
            context=term_data.context,
            notes=term_data.notes
        )
        db.add(term)

    await db.commit()

    # Reload with terms
    result = await db.execute(
        select(Glossary)
        .options(selectinload(Glossary.terms))
        .where(Glossary.id == glossary_id)
    )
    return result.scalar_one()


@router.delete("/{glossary_id}/terms/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_term(
    glossary_id: int,
    term_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a term from a glossary."""
    # Verify glossary ownership
    result = await db.execute(
        select(GlossaryTerm)
        .join(Glossary)
        .where(
            GlossaryTerm.id == term_id,
            GlossaryTerm.glossary_id == glossary_id,
            Glossary.user_id == current_user.id
        )
    )
    term = result.scalar_one_or_none()

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Term not found"
        )

    await db.delete(term)
    await db.commit()

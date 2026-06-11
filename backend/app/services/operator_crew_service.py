from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.operator_crew import CrewDocument, CrewTypeRating, OperatorCrewMember
from app.schemas.operator_crew import (
    CrewDocumentCreate,
    CrewMemberCreate,
    CrewMemberUpdate,
    CrewRatingUpdate,
)


async def list_crew(db: AsyncSession, operator_id: str) -> list[OperatorCrewMember]:
    result = await db.execute(
        select(OperatorCrewMember)
        .where(OperatorCrewMember.operator_id == operator_id)
        .order_by(OperatorCrewMember.created_at.desc())
    )
    return list(result.scalars().all())


async def get_crew_member(db: AsyncSession, operator_id: str, member_id: str) -> OperatorCrewMember:
    result = await db.execute(
        select(OperatorCrewMember)
        .options(
            selectinload(OperatorCrewMember.documents),
            selectinload(OperatorCrewMember.type_ratings),
        )
        .where(OperatorCrewMember.id == member_id, OperatorCrewMember.operator_id == operator_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crew member not found")
    return member


async def create_crew_member(db: AsyncSession, operator_id: str, payload: CrewMemberCreate) -> OperatorCrewMember:
    member = OperatorCrewMember(operator_id=operator_id, **payload.model_dump())
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


async def update_crew_member(
    db: AsyncSession, operator_id: str, member_id: str, payload: CrewMemberUpdate
) -> OperatorCrewMember:
    member = await get_crew_member(db, operator_id, member_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(member, field, value)
    member.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(member)
    return member


async def submit_crew_member(db: AsyncSession, operator_id: str, member_id: str) -> OperatorCrewMember:
    member = await get_crew_member(db, operator_id, member_id)
    member.status = "submitted"
    member.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(member)
    return member


async def add_document(
    db: AsyncSession, operator_id: str, member_id: str, payload: CrewDocumentCreate
) -> CrewDocument:
    await get_crew_member(db, operator_id, member_id)
    doc = CrewDocument(crew_member_id=member_id, **payload.model_dump())
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def update_ratings(
    db: AsyncSession, operator_id: str, member_id: str, payload: CrewRatingUpdate
) -> OperatorCrewMember:
    member = await get_crew_member(db, operator_id, member_id)
    existing = await db.execute(
        select(CrewTypeRating).where(CrewTypeRating.crew_member_id == member_id)
    )
    for r in existing.scalars().all():
        await db.delete(r)

    for rating_data in payload.ratings:
        rating = CrewTypeRating(crew_member_id=member_id, **rating_data.model_dump())
        db.add(rating)

    member.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(member)
    return member

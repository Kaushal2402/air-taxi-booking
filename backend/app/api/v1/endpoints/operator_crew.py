from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_crew import (
    CrewDocumentCreate,
    CrewDocumentOut,
    CrewMemberCreate,
    CrewMemberListItem,
    CrewMemberOut,
    CrewMemberUpdate,
    CrewRatingUpdate,
)
from app.services import operator_crew_service

router = APIRouter(prefix="/crew", tags=["operator-crew"])


@router.get("", response_model=list[CrewMemberListItem])
async def list_crew(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_crew_service.list_crew(db, current_user.operator_id)


@router.post("", response_model=CrewMemberOut, status_code=201)
async def create_crew_member(
    payload: CrewMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_crew_service.create_crew_member(db, current_user.operator_id, payload)


@router.get("/{member_id}", response_model=CrewMemberOut)
async def get_crew_member(
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_crew_service.get_crew_member(db, current_user.operator_id, member_id)


@router.patch("/{member_id}", response_model=CrewMemberOut)
async def update_crew_member(
    member_id: str,
    payload: CrewMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_crew_service.update_crew_member(db, current_user.operator_id, member_id, payload)


@router.post("/{member_id}/submit", response_model=CrewMemberOut)
async def submit_crew_member(
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_crew_service.submit_crew_member(db, current_user.operator_id, member_id)


@router.post("/{member_id}/documents", response_model=CrewDocumentOut, status_code=201)
async def add_document(
    member_id: str,
    payload: CrewDocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_crew_service.add_document(db, current_user.operator_id, member_id, payload)


@router.patch("/{member_id}/ratings", response_model=CrewMemberOut)
async def update_ratings(
    member_id: str,
    payload: CrewRatingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_crew_service.update_ratings(db, current_user.operator_id, member_id, payload)

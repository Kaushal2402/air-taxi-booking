from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_manifests import (
    ManifestLockPayload,
    ManifestOut,
    ManifestPassengerUpdate,
    ManifestSubmitPayload,
    ManifestSummary,
)
from app.services import operator_manifests_service

router = APIRouter(prefix="/manifests", tags=["operator-manifests"])


@router.get("", response_model=list[ManifestSummary])
async def list_manifests(
    status: Optional[str] = Query(default=None, description="Filter by flight status"),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> Any:
    return await operator_manifests_service.list_manifests(
        db, current_user.operator_id, status_filter=status
    )


@router.get("/{flight_id}", response_model=ManifestOut)
async def get_manifest(
    flight_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> Any:
    return await operator_manifests_service.get_manifest(
        db, current_user.operator_id, flight_id
    )


@router.patch("/{flight_id}/passengers/{passenger_id}")
async def update_passenger(
    flight_id: str,
    passenger_id: str,
    payload: ManifestPassengerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> Any:
    return await operator_manifests_service.update_passenger(
        db, current_user.operator_id, flight_id, passenger_id, payload
    )


@router.post("/{flight_id}/lock")
async def lock_manifest(
    flight_id: str,
    payload: ManifestLockPayload = ManifestLockPayload(),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> Any:
    return await operator_manifests_service.lock_manifest(
        db, current_user.operator_id, flight_id, payload
    )


@router.post("/{flight_id}/unlock")
async def unlock_manifest(
    flight_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> Any:
    return await operator_manifests_service.unlock_manifest(
        db, current_user.operator_id, flight_id
    )


@router.post("/{flight_id}/submit")
async def submit_manifest(
    flight_id: str,
    payload: ManifestSubmitPayload = ManifestSubmitPayload(),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> Any:
    return await operator_manifests_service.submit_manifest(
        db, current_user.operator_id, flight_id, payload
    )


@router.get("/{flight_id}/export")
async def export_manifest(
    flight_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> Any:
    return await operator_manifests_service.export_manifest(
        db, current_user.operator_id, flight_id
    )

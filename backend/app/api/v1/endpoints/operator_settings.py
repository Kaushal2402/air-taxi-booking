from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_settings import OperatorSettings, OperatorSettingsUpdate
from app.services import operator_settings_service

router = APIRouter(tags=["operator-settings"])


@router.get("/operator-settings", response_model=OperatorSettings)
async def get_operator_settings(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> OperatorSettings:
    return await operator_settings_service.get_settings(db, current_user.operator_id)


@router.patch("/operator-settings", response_model=OperatorSettings)
async def update_operator_settings(
    payload: OperatorSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
) -> OperatorSettings:
    return await operator_settings_service.update_settings(db, current_user.operator_id, payload)

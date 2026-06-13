from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_settlements import (
    SettlementDetail,
    SettlementQuery,
    SettlementQueryOut,
    SettlementsListResponse,
)
from app.services import operator_settlements_service

router = APIRouter(prefix="/settlements", tags=["operator-settlements"])


@router.get("", response_model=SettlementsListResponse)
async def list_settlements(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_settlements_service.list_settlements(db, current_user.operator_id)


@router.get("/{settlement_id}", response_model=SettlementDetail)
async def get_settlement(
    settlement_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_settlements_service.get_settlement(
        db, current_user.operator_id, settlement_id
    )


@router.get("/{settlement_id}/export")
async def export_settlement(
    settlement_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_settlements_service.export_settlement(
        db, current_user.operator_id, settlement_id
    )


@router.post("/{settlement_id}/queries", response_model=SettlementQueryOut, status_code=201)
@router.post("/{settlement_id}/query", response_model=SettlementQueryOut, status_code=201)
async def raise_query(
    settlement_id: str,
    payload: SettlementQuery,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_settlements_service.raise_query(
        db, current_user.operator_id, settlement_id, payload
    )

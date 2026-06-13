from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_documents import (
    ComplianceOverview,
    DocumentOut,
    DocumentUpload,
    ExpiryWatchlistItem,
)
from app.services import operator_documents_service

documents_router = APIRouter(prefix="/documents", tags=["operator-documents"])
compliance_router = APIRouter(prefix="/compliance", tags=["operator-compliance"])


@documents_router.get("", response_model=list[DocumentOut])
async def list_documents(
    entity_type: Optional[str] = Query(None, description="Filter by entity_type: company | aircraft | pilot"),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_documents_service.list_documents(db, current_user.operator_id, entity_type)


@documents_router.post("", response_model=DocumentOut, status_code=201)
async def upload_document(
    payload: DocumentUpload,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_documents_service.upload_document(db, current_user.operator_id, payload)


@documents_router.get("/expiry-watchlist", response_model=list[ExpiryWatchlistItem])
async def get_expiry_watchlist(
    days_ahead: int = Query(60, description="Number of days to look ahead for expiring documents"),
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_documents_service.get_expiry_watchlist(db, current_user.operator_id, days_ahead)


@compliance_router.get("/overview", response_model=ComplianceOverview)
async def get_compliance_overview(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_documents_service.get_compliance_overview(db, current_user.operator_id)

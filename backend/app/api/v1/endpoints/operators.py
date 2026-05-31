from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.operators import (
    AircraftCreate,
    AircraftListResponse,
    AircraftResponse,
    AircraftUpdate,
    CommissionBody,
    GroundBody,
    MaintenanceBody,
    OperatorCreate,
    OperatorDetail,
    OperatorDocumentCreate,
    OperatorDocumentResponse,
    OperatorDocumentUpdate,
    OperatorListResponse,
    OperatorPerformanceResponse,
    OperatorResponse,
    OperatorUpdate,
    PauseBody,
    PilotCreate,
    PilotListResponse,
    PilotResponse,
    PilotUpdate,
    RejectBody,
)
from app.services import operator_service

operators_router = APIRouter()
aircraft_router = APIRouter()
pilots_router = APIRouter()


# ── Operators ─────────────────────────────────────────────────────────────────

@operators_router.get("", response_model=OperatorListResponse)
async def list_operators(
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.list_operators(db, status, search, page, page_size)


@operators_router.post("", response_model=OperatorResponse, status_code=201)
async def create_operator(
    body: OperatorCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.create_operator(db, body.model_dump())


@operators_router.get("/{id}", response_model=OperatorDetail)
async def get_operator(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.get_operator_detail(db, id)


@operators_router.patch("/{id}", response_model=OperatorResponse)
async def update_operator(
    id: str,
    body: OperatorUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.update_operator(db, id, body.model_dump(exclude_unset=True))


@operators_router.post("/{id}/approve", response_model=OperatorResponse)
async def approve_operator(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.approve_operator(db, id)


@operators_router.post("/{id}/reject", response_model=OperatorResponse)
async def reject_operator(
    id: str,
    body: RejectBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.reject_operator(db, id, body.reason)


@operators_router.post("/{id}/pause", response_model=OperatorResponse)
async def pause_operator(
    id: str,
    body: PauseBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.pause_operator(db, id, body.reason)


@operators_router.post("/{id}/reactivate", response_model=OperatorResponse)
async def reactivate_operator(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.reactivate_operator(db, id)


@operators_router.post("/{id}/commission", response_model=OperatorResponse)
async def configure_commission(
    id: str,
    body: CommissionBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.configure_commission(db, id, body.commission_pct)


@operators_router.get("/{id}/performance", response_model=OperatorPerformanceResponse)
async def get_operator_performance(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.get_performance(db, id)


@operators_router.get("/{id}/documents", response_model=List[OperatorDocumentResponse])
async def list_operator_documents(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    docs = await operator_service.list_operator_docs(db, id)
    return [OperatorDocumentResponse.model_validate(d) for d in docs]


@operators_router.post("/{id}/documents", response_model=OperatorDocumentResponse, status_code=201)
async def add_operator_document(
    id: str,
    body: OperatorDocumentCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.add_operator_doc(db, id, body.model_dump())


@operators_router.patch("/{id}/documents/{doc_id}", response_model=OperatorDocumentResponse)
async def update_operator_document(
    id: str,
    doc_id: str,
    body: OperatorDocumentUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.update_operator_doc(
        db, id, doc_id, body.model_dump(exclude_unset=True)
    )


# ── Aircraft ──────────────────────────────────────────────────────────────────

@aircraft_router.get("", response_model=AircraftListResponse)
async def list_aircraft(
    operator_id: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.list_aircraft(db, operator_id, status, search, page, page_size)


@aircraft_router.post("", response_model=AircraftResponse, status_code=201)
async def create_aircraft(
    body: AircraftCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.create_aircraft(db, body.model_dump())


@aircraft_router.get("/{id}", response_model=AircraftResponse)
async def get_aircraft(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.get_aircraft(db, id)


@aircraft_router.patch("/{id}", response_model=AircraftResponse)
async def update_aircraft(
    id: str,
    body: AircraftUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.update_aircraft(db, id, body.model_dump(exclude_unset=True))


@aircraft_router.post("/{id}/approve", response_model=AircraftResponse)
async def approve_aircraft(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.approve_aircraft(db, id)


@aircraft_router.post("/{id}/ground", response_model=AircraftResponse)
async def ground_aircraft(
    id: str,
    body: GroundBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.ground_aircraft(db, id, body.reason)


@aircraft_router.post("/{id}/unground", response_model=AircraftResponse)
async def unground_aircraft(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.unground_aircraft(db, id)


@aircraft_router.post("/{id}/maintenance", response_model=AircraftResponse)
async def set_maintenance(
    id: str,
    body: MaintenanceBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.set_maintenance(
        db, id, body.starts_at, body.ends_at, body.notes
    )


# ── Pilots ────────────────────────────────────────────────────────────────────

@pilots_router.get("", response_model=PilotListResponse)
async def list_pilots(
    operator_id: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.list_pilots(db, operator_id, status, search, page, page_size)


@pilots_router.post("", response_model=PilotResponse, status_code=201)
async def create_pilot(
    body: PilotCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.create_pilot(db, body.model_dump())


@pilots_router.get("/{id}", response_model=PilotResponse)
async def get_pilot(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.get_pilot(db, id)


@pilots_router.patch("/{id}", response_model=PilotResponse)
async def update_pilot(
    id: str,
    body: PilotUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.update_pilot(db, id, body.model_dump(exclude_unset=True))


@pilots_router.post("/{id}/approve", response_model=PilotResponse)
async def approve_pilot(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.approve_pilot(db, id)


@pilots_router.post("/{id}/ground", response_model=PilotResponse)
async def ground_pilot(
    id: str,
    body: GroundBody,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await operator_service.ground_pilot(db, id, body.reason)

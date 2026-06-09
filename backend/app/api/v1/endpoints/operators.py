from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query, Request

from app.database import get_db
from app.dependencies import get_current_admin_user, require_permission
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
from app.schemas.common import MessageResponse
from app.schemas.operator_auth import OperatorInviteUserRequest, OperatorInviteUserResponse
from app.services import audit_service, operator_auth_service, operator_service

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
    _: AdminUser = Depends(require_permission("operators.view")),
    db=Depends(get_db),
):
    return await operator_service.list_operators(db, status, search, page, page_size)


@operators_router.post("", response_model=OperatorResponse, status_code=201)
async def create_operator(
    body: OperatorCreate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("operators.create")),
    db=Depends(get_db),
):
    result = await operator_service.create_operator(db, body.model_dump())
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="operator.created",
            target=f"operator:{result.id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data={"name": getattr(result, "name", None)},
        )
    except Exception:
        pass
    return result


@operators_router.get("/{id}", response_model=OperatorDetail)
async def get_operator(
    id: str,
    _: AdminUser = Depends(require_permission("operators.view")),
    db=Depends(get_db),
):
    return await operator_service.get_operator_detail(db, id)


@operators_router.get("/{id}/users", response_model=list[OperatorInviteUserResponse])
async def list_operator_users(
    id: str,
    _: AdminUser = Depends(require_permission("operators.view")),
    db=Depends(get_db),
):
    from sqlalchemy import select
    from app.models.operator_user import OperatorUser
    result = await db.execute(
        select(OperatorUser).where(OperatorUser.operator_id == id).order_by(OperatorUser.created_at)
    )
    return result.scalars().all()


@operators_router.post("/{id}/users/invite", response_model=OperatorInviteUserResponse, status_code=201)
async def invite_operator_user(
    id: str,
    body: OperatorInviteUserRequest,
    request: Request,
    current_user: AdminUser = Depends(require_permission("operators.edit")),
    db=Depends(get_db),
):
    result = await operator_auth_service.invite_operator_user(
        db,
        operator_id=id,
        name=body.name,
        email=body.email,
        operator_role=body.operator_role,
        phone=body.phone,
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="operator_user.invited",
            target=f"operator:{id} user:{result.id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data={"email": body.email, "role": body.operator_role},
        )
    except Exception:
        pass
    return result


@operators_router.post("/{id}/users/{user_id}/resend-invite", response_model=MessageResponse)
async def resend_operator_invite(
    id: str,
    user_id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("operators.edit")),
    db=Depends(get_db),
):
    await operator_auth_service.resend_invite(db, user_id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="operator_user.invite_resent",
            target=f"operator:{id} user:{user_id}",
            category="Operations",
            severity="low",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="Invite resent successfully")


@operators_router.patch("/{id}", response_model=OperatorResponse)
async def update_operator(
    id: str,
    body: OperatorUpdate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("operators.edit")),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await operator_service.update_operator(db, id, changes)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="operator.updated",
            target=f"operator:{id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data=changes,
        )
    except Exception:
        pass
    return result


@operators_router.post("/{id}/approve", response_model=OperatorResponse)
async def approve_operator(
    id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("operators.approve")),
    db=Depends(get_db),
):
    result = await operator_service.approve_operator(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="operator.approved",
            target=f"operator:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@operators_router.post("/{id}/reject", response_model=OperatorResponse)
async def reject_operator(
    id: str,
    body: RejectBody,
    request: Request,
    current_user: AdminUser = Depends(require_permission("operators.approve")),
    db=Depends(get_db),
):
    result = await operator_service.reject_operator(db, id, body.reason)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="operator.rejected",
            target=f"operator:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"reason": body.reason},
        )
    except Exception:
        pass
    return result


@operators_router.post("/{id}/pause", response_model=OperatorResponse)
async def pause_operator(
    id: str,
    body: PauseBody,
    request: Request,
    current_user: AdminUser = Depends(require_permission("operators.suspend")),
    db=Depends(get_db),
):
    result = await operator_service.pause_operator(db, id, body.reason)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="operator.paused",
            target=f"operator:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"reason": body.reason},
        )
    except Exception:
        pass
    return result


@operators_router.post("/{id}/reactivate", response_model=OperatorResponse)
async def reactivate_operator(
    id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("operators.suspend")),
    db=Depends(get_db),
):
    result = await operator_service.reactivate_operator(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="operator.reactivated",
            target=f"operator:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@operators_router.post("/{id}/commission", response_model=OperatorResponse)
async def configure_commission(
    id: str,
    body: CommissionBody,
    request: Request,
    current_user: AdminUser = Depends(require_permission("operators.edit")),
    db=Depends(get_db),
):
    result = await operator_service.configure_commission(db, id, body.commission_pct)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="operator.commission_configured",
            target=f"operator:{id}",
            category="Finance",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"commission_pct": body.commission_pct},
        )
    except Exception:
        pass
    return result


@operators_router.get("/{id}/performance", response_model=OperatorPerformanceResponse)
async def get_operator_performance(
    id: str,
    _: AdminUser = Depends(require_permission("operators.view")),
    db=Depends(get_db),
):
    return await operator_service.get_performance(db, id)


@operators_router.get("/{id}/documents", response_model=List[OperatorDocumentResponse])
async def list_operator_documents(
    id: str,
    _: AdminUser = Depends(require_permission("operators.view")),
    db=Depends(get_db),
):
    docs = await operator_service.list_operator_docs(db, id)
    return [OperatorDocumentResponse.model_validate(d) for d in docs]


@operators_router.post("/{id}/documents", response_model=OperatorDocumentResponse, status_code=201)
async def add_operator_document(
    id: str,
    body: OperatorDocumentCreate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("operators.edit")),
    db=Depends(get_db),
):
    result = await operator_service.add_operator_doc(db, id, body.model_dump())
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="operator.document_added",
            target=f"operator:{id} doc:{result.id}",
            category="Compliance",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@operators_router.patch("/{id}/documents/{doc_id}", response_model=OperatorDocumentResponse)
async def update_operator_document(
    id: str,
    doc_id: str,
    body: OperatorDocumentUpdate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("kyc.documents.approve")),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await operator_service.update_operator_doc(db, id, doc_id, changes)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="operator.document_updated",
            target=f"operator:{id} doc:{doc_id}",
            category="Compliance",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data=changes,
        )
    except Exception:
        pass
    return result


# ── Aircraft ──────────────────────────────────────────────────────────────────

@aircraft_router.get("/compliance")
async def aircraft_compliance_summary(
    _: AdminUser = Depends(require_permission("aircraft.view")),
    db=Depends(get_db),
):
    """Airworthiness compliance summary: counts by status + lists of expiring/expired aircraft."""
    return await operator_service.get_aircraft_compliance_summary(db)


@aircraft_router.get("", response_model=AircraftListResponse)
async def list_aircraft(
    operator_id: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: AdminUser = Depends(require_permission("aircraft.view")),
    db=Depends(get_db),
):
    return await operator_service.list_aircraft(db, operator_id, status, search, page, page_size)


@aircraft_router.post("", response_model=AircraftResponse, status_code=201)
async def create_aircraft(
    body: AircraftCreate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("aircraft.manage")),
    db=Depends(get_db),
):
    result = await operator_service.create_aircraft(db, body.model_dump())
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="aircraft.created",
            target=f"aircraft:{result.id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@aircraft_router.get("/{id}", response_model=AircraftResponse)
async def get_aircraft(
    id: str,
    _: AdminUser = Depends(require_permission("aircraft.view")),
    db=Depends(get_db),
):
    return await operator_service.get_aircraft(db, id)


@aircraft_router.patch("/{id}", response_model=AircraftResponse)
async def update_aircraft(
    id: str,
    body: AircraftUpdate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("aircraft.manage")),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await operator_service.update_aircraft(db, id, changes)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="aircraft.updated",
            target=f"aircraft:{id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data=changes,
        )
    except Exception:
        pass
    return result


@aircraft_router.post("/{id}/approve", response_model=AircraftResponse)
async def approve_aircraft(
    id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("aircraft.manage")),
    db=Depends(get_db),
):
    result = await operator_service.approve_aircraft(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="aircraft.approved",
            target=f"aircraft:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@aircraft_router.post("/{id}/ground", response_model=AircraftResponse)
async def ground_aircraft(
    id: str,
    body: GroundBody,
    request: Request,
    current_user: AdminUser = Depends(require_permission("aircraft.manage")),
    db=Depends(get_db),
):
    result = await operator_service.ground_aircraft(db, id, body.reason)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="aircraft.grounded",
            target=f"aircraft:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"reason": body.reason},
        )
    except Exception:
        pass
    return result


@aircraft_router.post("/{id}/unground", response_model=AircraftResponse)
async def unground_aircraft(
    id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("aircraft.manage")),
    db=Depends(get_db),
):
    result = await operator_service.unground_aircraft(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="aircraft.ungrounded",
            target=f"aircraft:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@aircraft_router.post("/{id}/maintenance", response_model=AircraftResponse)
async def set_maintenance(
    id: str,
    body: MaintenanceBody,
    request: Request,
    current_user: AdminUser = Depends(require_permission("aircraft.manage")),
    db=Depends(get_db),
):
    result = await operator_service.set_maintenance(
        db, id, body.starts_at, body.ends_at, body.notes
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="aircraft.maintenance_set",
            target=f"aircraft:{id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data={"starts_at": str(body.starts_at), "ends_at": str(body.ends_at), "notes": body.notes},
        )
    except Exception:
        pass
    return result


# ── Pilots ────────────────────────────────────────────────────────────────────

@pilots_router.get("/compliance")
async def pilots_compliance_summary(
    _: AdminUser = Depends(require_permission("aircraft.view")),
    db=Depends(get_db),
):
    """Medical compliance summary: pilots grouped by medical expiry status."""
    return await operator_service.get_pilots_compliance_summary(db)


@pilots_router.get("", response_model=PilotListResponse)
async def list_pilots(
    operator_id: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: AdminUser = Depends(require_permission("aircraft.view")),
    db=Depends(get_db),
):
    return await operator_service.list_pilots(db, operator_id, status, search, page, page_size)


@pilots_router.post("", response_model=PilotResponse, status_code=201)
async def create_pilot(
    body: PilotCreate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("aircraft.manage")),
    db=Depends(get_db),
):
    result = await operator_service.create_pilot(db, body.model_dump())
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="pilot.created",
            target=f"pilot:{result.id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@pilots_router.get("/{id}", response_model=PilotResponse)
async def get_pilot(
    id: str,
    _: AdminUser = Depends(require_permission("aircraft.view")),
    db=Depends(get_db),
):
    return await operator_service.get_pilot(db, id)


@pilots_router.patch("/{id}", response_model=PilotResponse)
async def update_pilot(
    id: str,
    body: PilotUpdate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("aircraft.manage")),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await operator_service.update_pilot(db, id, changes)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="pilot.updated",
            target=f"pilot:{id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data=changes,
        )
    except Exception:
        pass
    return result


@pilots_router.post("/{id}/approve", response_model=PilotResponse)
async def approve_pilot(
    id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("aircraft.manage")),
    db=Depends(get_db),
):
    result = await operator_service.approve_pilot(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="pilot.approved",
            target=f"pilot:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@pilots_router.post("/{id}/ground", response_model=PilotResponse)
async def ground_pilot(
    id: str,
    body: GroundBody,
    request: Request,
    current_user: AdminUser = Depends(require_permission("aircraft.manage")),
    db=Depends(get_db),
):
    result = await operator_service.ground_pilot(db, id, body.reason)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="pilot.grounded",
            target=f"pilot:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"reason": body.reason},
        )
    except Exception:
        pass
    return result

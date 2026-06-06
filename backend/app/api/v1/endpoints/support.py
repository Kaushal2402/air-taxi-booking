from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query, Request

from app.database import get_db
from app.dependencies import get_current_admin_user, require_permission
from app.models.admin_user import AdminUser
from app.schemas.support import (
    SlaPolicyCreate,
    SlaPolicyResponse,
    SlaPolicyUpdate,
    TicketAssignRequest,
    TicketCreate,
    TicketDetailResponse,
    TicketEscalateRequest,
    TicketListResponse,
    TicketMessageCreate,
    TicketMessageResponse,
    TicketResolveRequest,
    TicketStatusUpdateRequest,
)
from app.services import audit_service, support_service

router = APIRouter()


# ── Tickets ───────────────────────────────────────────────────────────────────

@router.get("/tickets", response_model=TicketListResponse)
async def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = Query(None),
    priority: str | None = Query(None),
    status: str | None = Query(None),
    assignee_id: str | None = Query(None),
    sla_breach: bool | None = Query(None),
    search: str | None = Query(None),
    _: AdminUser = Depends(require_permission("support.tickets.view")),
    db=Depends(get_db),
):
    return await support_service.list_tickets(
        db, page, page_size, category, priority, status, assignee_id, sla_breach, search
    )


@router.get("/tickets/{ticket_id}", response_model=TicketDetailResponse)
async def get_ticket(
    ticket_id: str,
    _: AdminUser = Depends(require_permission("support.tickets.view")),
    db=Depends(get_db),
):
    return await support_service.get_ticket(db, ticket_id)


@router.post("/tickets", response_model=TicketDetailResponse, status_code=201)
async def create_ticket(
    body: TicketCreate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("support.tickets.view")),
    db=Depends(get_db),
):
    result = await support_service.create_ticket(
        db,
        body,
        author_id=current_user.id,
        author_name=current_user.name,
        author_role=current_user.role,
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="support.ticket_created",
            target=f"ticket:{result.id}",
            category="Support",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@router.post("/tickets/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    body: TicketAssignRequest,
    request: Request,
    current_user: AdminUser = Depends(require_permission("support.tickets.reply")),
    db=Depends(get_db),
):
    result = await support_service.assign_ticket(db, ticket_id, body.assignee_id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="support.ticket_assigned",
            target=f"ticket:{ticket_id}",
            category="Support",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data={"assignee_id": body.assignee_id},
        )
    except Exception:
        pass
    return result


@router.post("/tickets/{ticket_id}/messages", response_model=TicketMessageResponse, status_code=201)
async def add_message(
    ticket_id: str,
    body: TicketMessageCreate,
    current_user: AdminUser = Depends(require_permission("support.tickets.reply")),
    db=Depends(get_db),
):
    return await support_service.add_message(
        db,
        ticket_id,
        kind=body.kind,
        body=body.body,
        author_id=current_user.id,
        author_name=current_user.name,
        author_role=current_user.role,
    )


@router.post("/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    body: TicketStatusUpdateRequest,
    _: AdminUser = Depends(require_permission("support.tickets.close")),
    db=Depends(get_db),
):
    """Move a ticket to a new status. Validates allowed transitions."""
    return await support_service.update_status(
        db, ticket_id, body.status, body.resolution_code, body.resolution_note
    )


@router.post("/tickets/{ticket_id}/resolve")
async def resolve_ticket(
    ticket_id: str,
    body: TicketResolveRequest,
    request: Request,
    current_user: AdminUser = Depends(require_permission("support.tickets.close")),
    db=Depends(get_db),
):
    result = await support_service.resolve_ticket(
        db, ticket_id, body.resolution_code, body.resolution_note
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="support.ticket_resolved",
            target=f"ticket:{ticket_id}",
            category="Support",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data={"resolution_code": body.resolution_code},
        )
    except Exception:
        pass
    return result


@router.post("/tickets/{ticket_id}/escalate")
async def escalate_ticket(
    ticket_id: str,
    body: TicketEscalateRequest,
    request: Request,
    current_user: AdminUser = Depends(require_permission("support.tickets.escalate")),
    db=Depends(get_db),
):
    result = await support_service.escalate_ticket(
        db,
        ticket_id,
        reason=body.reason,
        author_id=current_user.id,
        author_name=current_user.name,
        author_role=current_user.role,
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="support.ticket_escalated",
            target=f"ticket:{ticket_id}",
            category="Support",
            severity="high",
            source_ip=request.client.host if request.client else None,
            after_data={"reason": body.reason},
        )
    except Exception:
        pass
    return result


# ── SLA Policies ──────────────────────────────────────────────────────────────

@router.get("/sla-policies", response_model=List[SlaPolicyResponse])
async def list_sla_policies(
    _: AdminUser = Depends(require_permission("support.tickets.view")),
    db=Depends(get_db),
):
    return await support_service.list_sla_policies(db)


@router.post("/sla-policies", response_model=SlaPolicyResponse, status_code=201)
async def create_sla_policy(
    body: SlaPolicyCreate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("support.tickets.close")),
    db=Depends(get_db),
):
    result = await support_service.create_sla_policy(db, body)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="support.sla_policy_created",
            target=f"sla_policy:{result.id}",
            category="Support",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@router.patch("/sla-policies/{policy_id}", response_model=SlaPolicyResponse)
async def update_sla_policy(
    policy_id: str,
    body: SlaPolicyUpdate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("support.tickets.close")),
    db=Depends(get_db),
):
    result = await support_service.update_sla_policy(db, policy_id, body)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="support.sla_policy_updated",
            target=f"sla_policy:{policy_id}",
            category="Support",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result

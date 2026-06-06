from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.services import audit_service, privacy_service

router = APIRouter()


# ── Schemas (inline — small surface) ─────────────────────────────────────────

class PrivacyRequestResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: Optional[str]
    customer_email: Optional[str]
    request_type: str
    status: str
    sla_due_at: Optional[datetime]
    sla_breached: bool
    auto_processed: bool
    resolved_by: Optional[str]
    resolution_note: Optional[str]
    completed_at: Optional[datetime]
    notes: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class PrivacyRequestListResponse(BaseModel):
    items: List[PrivacyRequestResponse]
    total: int
    page: int
    per_page: int


class CreatePrivacyRequestBody(BaseModel):
    notes: Optional[str] = None


class ResolvePrivacyRequestBody(BaseModel):
    resolution_note: Optional[str] = None


# ── Customer-facing request creation ─────────────────────────────────────────

@router.post(
    "/customers/{customer_id}/export-request",
    response_model=PrivacyRequestResponse,
    status_code=201,
    summary="Submit a data-export request for a customer",
)
async def create_export_request(
    customer_id: str,
    body: CreatePrivacyRequestBody,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    req = await privacy_service.create_export_request(db, customer_id, notes=body.notes)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=getattr(current_user, "role", "Admin"),
            action="privacy.export_request.created",
            target=f"customer:{customer_id}",
            category="Privacy",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return PrivacyRequestResponse.model_validate(req)


@router.post(
    "/customers/{customer_id}/deletion-request",
    response_model=PrivacyRequestResponse,
    status_code=201,
    summary="Submit a deletion request for a customer",
)
async def create_deletion_request(
    customer_id: str,
    body: CreatePrivacyRequestBody,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    req = await privacy_service.create_deletion_request(db, customer_id, notes=body.notes)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=getattr(current_user, "role", "Admin"),
            action="privacy.deletion_request.created",
            target=f"customer:{customer_id}",
            category="Privacy",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return PrivacyRequestResponse.model_validate(req)


# ── Admin queue ───────────────────────────────────────────────────────────────

@router.get(
    "/requests",
    response_model=PrivacyRequestListResponse,
    summary="List all privacy requests (admin queue)",
)
async def list_requests(
    status: Optional[str] = Query(None, pattern="^(pending|processing|completed|rejected)$"),
    request_type: Optional[str] = Query(None, pattern="^(export|deletion)$"),
    customer_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    data = await privacy_service.list_requests(
        db,
        status=status,
        request_type=request_type,
        customer_id=customer_id,
        page=page,
        per_page=per_page,
    )
    return PrivacyRequestListResponse(
        items=[PrivacyRequestResponse.model_validate(r) for r in data["items"]],
        total=data["total"],
        page=data["page"],
        per_page=data["per_page"],
    )


@router.get(
    "/requests/{request_id}",
    response_model=PrivacyRequestResponse,
    summary="Get a single privacy request",
)
async def get_request(
    request_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    req = await privacy_service.get_request(db, request_id)
    return PrivacyRequestResponse.model_validate(req)


@router.patch(
    "/requests/{request_id}/approve",
    response_model=PrivacyRequestResponse,
    summary="Approve a privacy request (execute export or anonymize PII)",
)
async def approve_request(
    request_id: str,
    body: ResolvePrivacyRequestBody,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    req = await privacy_service.approve_request(
        db, request_id,
        resolved_by=current_user.email,
        resolution_note=body.resolution_note,
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=getattr(current_user, "role", "Admin"),
            action=f"privacy.{req.request_type}_request.approved",
            target=f"privacy_request:{request_id}",
            category="Privacy",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return PrivacyRequestResponse.model_validate(req)


@router.patch(
    "/requests/{request_id}/reject",
    response_model=PrivacyRequestResponse,
    summary="Reject a privacy request",
)
async def reject_request(
    request_id: str,
    body: ResolvePrivacyRequestBody,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    req = await privacy_service.reject_request(
        db, request_id,
        resolved_by=current_user.email,
        resolution_note=body.resolution_note,
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=getattr(current_user, "role", "Admin"),
            action=f"privacy.{req.request_type}_request.rejected",
            target=f"privacy_request:{request_id}",
            category="Privacy",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return PrivacyRequestResponse.model_validate(req)

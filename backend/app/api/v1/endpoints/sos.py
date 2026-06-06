from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.common import MessageResponse
from app.schemas.sos import SosEventResponse, SosResolveRequest, SosTriggerRequest
from app.services import audit_service, sos_service

router = APIRouter()


@router.post("/trigger", response_model=SosEventResponse, status_code=201)
async def trigger_sos(
    body: SosTriggerRequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    """
    Trigger an SOS event. Respects all four Safety SOS platform settings:
    - sos_enabled: rejects the request if the SOS feature is off
    - sos_contact_number: records the number to be dialled on the device
    - sos_share_location: attaches GPS only when location sharing is enabled
    - sos_alert_admin: records whether ops notification should be sent
    """
    event = await sos_service.trigger_sos(
        db=db,
        booking_id=body.booking_id,
        booking_type=body.booking_type,
        triggered_by=body.triggered_by,
        triggered_by_id=body.triggered_by_id,
        lat=body.lat,
        lng=body.lng,
        notes=body.notes,
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="sos.triggered",
            target=f"sos_event:{event.id}",
            category="Safety",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return SosEventResponse.model_validate(event)


@router.get("", response_model=List[SosEventResponse])
async def list_sos_events(
    status: Optional[str] = Query(None, pattern="^(open|resolved)$"),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    events = await sos_service.list_sos_events(db, status=status)
    return [SosEventResponse.model_validate(e) for e in events]


@router.get("/{event_id}", response_model=SosEventResponse)
async def get_sos_event(
    event_id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    event = await sos_service.get_sos_event(db, event_id)
    return SosEventResponse.model_validate(event)


@router.patch("/{event_id}/resolve", response_model=SosEventResponse)
async def resolve_sos_event(
    event_id: str,
    body: SosResolveRequest,
    request: Request,
    current_user: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    event = await sos_service.resolve_sos(
        db=db,
        event_id=event_id,
        resolved_by=current_user.email,
        resolution_notes=body.resolution_notes,
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="sos.resolved",
            target=f"sos_event:{event.id}",
            category="Safety",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return SosEventResponse.model_validate(event)

from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ValidationException
from app.models.sos import SosEvent
from app.services.settings_service import get_settings


async def trigger_sos(
    db: AsyncSession,
    booking_id: Optional[str],
    booking_type: Optional[str],
    triggered_by: str,
    triggered_by_id: Optional[str],
    lat: Optional[float],
    lng: Optional[float],
    notes: Optional[str],
    resolved_by_admin: Optional[str] = None,
) -> SosEvent:
    """
    Core SOS trigger logic. Enforces all 4 Safety SOS platform settings:

      1. sos_enabled         — gate: reject if SOS feature is disabled
      2. sos_contact_number  — record which number was dialled (real dial happens on device)
      3. sos_share_location  — only attach lat/lng to the event if setting is on
      4. sos_alert_admin     — mark whether ops should be notified (consumer of this flag
                               pushes the actual notification; logic is honoured here)
    """
    settings = await get_settings(db)

    # ── 1. sos_enabled gate ────────────────────────────────────────────────────
    if not settings.sos_enabled:
        raise ValidationException("SOS feature is currently disabled by platform settings.")

    # ── 2. sos_contact_number ─────────────────────────────────────────────────
    contact_dialled = settings.sos_contact_number or "112"

    # ── 3. sos_share_location ─────────────────────────────────────────────────
    share_location = bool(settings.sos_share_location)
    event_lat = lat if share_location else None
    event_lng = lng if share_location else None

    # ── 4. sos_alert_admin ────────────────────────────────────────────────────
    alert_admin = bool(settings.sos_alert_admin)

    event = SosEvent(
        booking_id=booking_id,
        booking_type=booking_type,
        triggered_by=triggered_by,
        triggered_by_id=triggered_by_id,
        lat=event_lat,
        lng=event_lng,
        contact_number_dialled=contact_dialled,
        location_shared=share_location,
        ops_alerted=alert_admin,
        notes=notes,
        status="open",
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


async def resolve_sos(
    db: AsyncSession,
    event_id: str,
    resolved_by: str,
    resolution_notes: Optional[str],
) -> SosEvent:
    result = await db.execute(select(SosEvent).where(SosEvent.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise NotFoundException(f"SOS event {event_id} not found.")
    event.status = "resolved"
    event.resolved_by = resolved_by
    event.resolution_notes = resolution_notes
    await db.commit()
    await db.refresh(event)
    return event


async def list_sos_events(
    db: AsyncSession,
    status: Optional[str] = None,
) -> list[SosEvent]:
    q = select(SosEvent).order_by(SosEvent.created_at.desc())
    if status:
        q = q.where(SosEvent.status == status)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_sos_event(db: AsyncSession, event_id: str) -> SosEvent:
    result = await db.execute(select(SosEvent).where(SosEvent.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise NotFoundException(f"SOS event {event_id} not found.")
    return event

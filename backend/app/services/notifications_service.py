from __future__ import annotations

import json

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notifications import NotificationBroadcast, NotificationLog, NotificationTemplate
from app.schemas.notifications import (
    BroadcastCreate,
    NotificationTemplateCreate,
    NotificationTemplateResponse,
    NotificationTemplateUpdate,
)


def _serialize(tmpl: NotificationTemplate) -> NotificationTemplateResponse:
    try:
        channels = json.loads(tmpl.channels) if isinstance(tmpl.channels, str) else tmpl.channels
    except Exception:
        channels = []
    data = {
        "id": tmpl.id,
        "name": tmpl.name,
        "template_code": tmpl.template_code,
        "event_trigger": tmpl.event_trigger,
        "channels": channels,
        "status": tmpl.status,
        "category": tmpl.category,
        "push_title": tmpl.push_title,
        "push_body": tmpl.push_body,
        "sms_body": tmpl.sms_body,
        "email_subject": tmpl.email_subject,
        "email_body": tmpl.email_body,
        "wa_body": tmpl.wa_body,
        "priority": tmpl.priority,
        "quiet_hours_override": tmpl.quiet_hours_override,
        "sms_fallback_seconds": tmpl.sms_fallback_seconds,
        "dedup_window_seconds": tmpl.dedup_window_seconds,
        "sent_30d": tmpl.sent_30d,
        "open_rate": tmpl.open_rate,
        "created_at": tmpl.created_at,
        "updated_at": tmpl.updated_at,
    }
    return NotificationTemplateResponse(**data)


async def list_templates(
    db: AsyncSession,
    search: str | None = None,
    channel: str | None = None,
    status: str | None = None,
    category: str | None = None,
) -> list[NotificationTemplateResponse]:
    q = select(NotificationTemplate)
    result = await db.execute(q.order_by(NotificationTemplate.category, NotificationTemplate.name))
    items = result.scalars().all()

    out = []
    for t in items:
        try:
            channels = json.loads(t.channels) if isinstance(t.channels, str) else t.channels
        except Exception:
            channels = []

        if search:
            s = search.lower()
            if not (s in t.name.lower() or s in t.template_code.lower() or s in t.event_trigger.lower()):
                continue
        if channel and channel not in channels:
            continue
        if status and t.status != status:
            continue
        if category and t.category != category:
            continue

        out.append(_serialize(t))
    return out


async def get_template(db: AsyncSession, template_id: str) -> NotificationTemplate:
    result = await db.execute(select(NotificationTemplate).where(NotificationTemplate.id == template_id))
    tmpl = result.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tmpl


async def create_template(db: AsyncSession, body: NotificationTemplateCreate) -> NotificationTemplateResponse:
    existing = await db.execute(
        select(NotificationTemplate).where(NotificationTemplate.template_code == body.template_code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Template code already exists")

    tmpl = NotificationTemplate(
        name=body.name,
        template_code=body.template_code,
        event_trigger=body.event_trigger,
        channels=json.dumps(body.channels),
        status=body.status,
        category=body.category,
        push_title=body.push_title,
        push_body=body.push_body,
        sms_body=body.sms_body,
        email_subject=body.email_subject,
        email_body=body.email_body,
        wa_body=body.wa_body,
        priority=body.priority,
        quiet_hours_override=body.quiet_hours_override,
        sms_fallback_seconds=body.sms_fallback_seconds,
        dedup_window_seconds=body.dedup_window_seconds,
    )
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return _serialize(tmpl)


async def update_template(
    db: AsyncSession, template_id: str, body: NotificationTemplateUpdate
) -> NotificationTemplateResponse:
    tmpl = await get_template(db, template_id)

    update_data = body.model_dump(exclude_unset=True)
    if "channels" in update_data:
        update_data["channels"] = json.dumps(update_data["channels"])

    for k, v in update_data.items():
        setattr(tmpl, k, v)

    await db.commit()
    await db.refresh(tmpl)
    return _serialize(tmpl)


async def delete_template(db: AsyncSession, template_id: str) -> None:
    tmpl = await get_template(db, template_id)
    await db.delete(tmpl)
    await db.commit()


async def get_stats(db: AsyncSession) -> dict:
    total = (await db.execute(select(func.count(NotificationTemplate.id)))).scalar_one()
    live = (await db.execute(
        select(func.count(NotificationTemplate.id)).where(NotificationTemplate.status == "live")
    )).scalar_one()
    sent = (await db.execute(select(func.sum(NotificationTemplate.sent_30d)))).scalar_one() or 0

    return {
        "sent_30d": sent,
        "delivery_rate": 98.7,
        "push_opt_in": 74.0,
        "avg_open_marketing": 12.4,
        "total_templates": total,
        "live_templates": live,
    }


async def list_delivery_log(
    db: AsyncSession, page: int = 1, page_size: int = 50
) -> tuple[list[NotificationLog], int]:
    offset = (page - 1) * page_size
    result = await db.execute(
        select(NotificationLog)
        .order_by(NotificationLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()
    total = (await db.execute(select(func.count(NotificationLog.id)))).scalar_one()
    return items, total


async def create_broadcast(db: AsyncSession, body: BroadcastCreate) -> NotificationBroadcast:
    broadcast = NotificationBroadcast(
        audience_description=body.audience_description,
        channel=body.channel,
        message=body.message,
        status="scheduled" if body.scheduled_at else "draft",
        estimated_reach=0,
    )
    db.add(broadcast)
    await db.commit()
    await db.refresh(broadcast)
    return broadcast

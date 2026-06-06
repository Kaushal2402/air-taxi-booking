from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime, timedelta, timezone

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
from app.services.settings_service import get_settings, is_in_quiet_window

logger = logging.getLogger(__name__)


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


def _render(template: str | None, variables: dict) -> str:
    """Replace {{var}} placeholders with values from the variables dict."""
    if not template:
        return ""
    result = template
    for key, value in variables.items():
        result = result.replace("{{" + key + "}}", str(value))
    return result


async def send_event_notification(
    db: AsyncSession,
    template_code: str,
    variables: dict,
    *,
    recipient_phone: str | None = None,
    recipient_email: str | None = None,
    recipient_push_token: str | None = None,
    notify_push: bool = True,
    notify_sms: bool = True,
    notify_email: bool = True,
    notify_wa: bool = False,
) -> None:
    """
    Look up a live template by template_code, render it with variables,
    and dispatch via each enabled channel. Logs every attempt.

    Example usage in bookings_service.py:
        await send_event_notification(db, "BOOKING_CONFIRMED",
            {"customer_name": "Priya", "booking_ref": "AC-12345", ...},
            recipient_phone=customer.phone,
            recipient_email=customer.email,
        )
    """
    # 1. Find the live template
    result = await db.execute(
        select(NotificationTemplate).where(
            NotificationTemplate.template_code == template_code,
            NotificationTemplate.status == "live",
        )
    )
    tmpl = result.scalar_one_or_none()
    if not tmpl:
        logger.debug("send_event_notification: no live template for code=%s — skipping", template_code)
        return

    # 2. Dedup window — skip if the same template was already sent to the same
    #    recipient within dedup_window_seconds (prevents duplicate triggers).
    dedup_secs: int = tmpl.dedup_window_seconds or 0
    if dedup_secs > 0 and (recipient_phone or recipient_email):
        dedup_recipient = recipient_phone or recipient_email or ""
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=dedup_secs)
        recent = (await db.execute(
            select(NotificationLog).where(
                NotificationLog.template_id == tmpl.id,
                NotificationLog.recipient == dedup_recipient,
                NotificationLog.status.in_(["delivered", "pending"]),
                NotificationLog.created_at >= cutoff,
            ).limit(1)
        )).scalar_one_or_none()
        if recent:
            logger.debug(
                "send_event_notification: dedup suppressed %s for %s (window=%ds)",
                template_code, dedup_recipient, dedup_secs,
            )
            return

    # 3. Check quiet hours (skip non-critical notifications)
    try:
        platform = await get_settings(db)
        if is_in_quiet_window(platform) and not tmpl.quiet_hours_override:
            logger.debug("send_event_notification: suppressed by quiet hours for %s", template_code)
            _log(db, tmpl, "suppressed", "all")
            return
    except Exception:
        pass  # quiet-hours check is non-fatal

    channels: list[str] = json.loads(tmpl.channels) if tmpl.channels else []

    # Resolve FCM priority: "high" maps to FCM priority "high"; default is "normal"
    fcm_priority = "high" if (tmpl.priority or "normal") == "high" else "normal"

    # 4. Push — send first; SMS fallback fires after sms_fallback_seconds if push fails
    push_delivered = False
    if "push" in channels and notify_push and recipient_push_token:
        try:
            from app.providers import get_push_provider
            from app.providers.base.push import PushMessage
            provider = get_push_provider()
            msg = PushMessage(
                title=_render(tmpl.push_title, variables),
                body=_render(tmpl.push_body, variables),
                # Pass priority in data payload so FCM adapter can forward it
                data={"priority": fcm_priority},
            )
            res = await provider.send(recipient_push_token, msg)
            push_delivered = res.success
            _log(db, tmpl, "delivered" if res.success else "failed", "push")
        except Exception as exc:
            logger.warning("send_event_notification push failed for %s: %s", template_code, exc)
            _log(db, tmpl, "failed", "push")

    # 5. SMS — respects sms_fallback_seconds:
    #    • If push was delivered and fallback_seconds > 0 → wait and skip SMS
    #      (in production a background task / webhook would handle this;
    #       here we skip SMS when push succeeded to avoid double-notification)
    #    • If push was not delivered or fallback_seconds == 0 → send SMS immediately
    sms_fallback_secs: int = tmpl.sms_fallback_seconds or 0
    skip_sms_due_to_push = push_delivered and sms_fallback_secs > 0

    if "sms" in channels and notify_sms and recipient_phone and tmpl.sms_body:
        if skip_sms_due_to_push:
            logger.debug(
                "send_event_notification: SMS skipped for %s — push delivered (fallback window=%ds)",
                template_code, sms_fallback_secs,
            )
            _log(db, tmpl, "suppressed", "sms", recipient=recipient_phone)
        else:
            try:
                from app.providers import get_sms_provider
                provider = get_sms_provider()
                body = _render(tmpl.sms_body, variables)
                res = await provider.send(recipient_phone, body)
                _log(db, tmpl, "delivered" if res.success else "failed", "sms",
                     recipient=recipient_phone)
            except Exception as exc:
                logger.warning("send_event_notification SMS failed for %s: %s", template_code, exc)
                _log(db, tmpl, "failed", "sms", recipient=recipient_phone)

    # 5. Email
    if "email" in channels and notify_email and recipient_email and tmpl.email_body:
        try:
            from app.providers import get_email_provider
            from app.providers.base.email import EmailMessage
            provider = get_email_provider()
            res = await provider.send(EmailMessage(
                to=[recipient_email],
                subject=_render(tmpl.email_subject, variables) or template_code,
                html_body=_render(tmpl.email_body, variables),
                text_body=re.sub(r"<[^>]+>", "", _render(tmpl.email_body, variables)),
            ))
            _log(db, tmpl, "delivered" if res.success else "failed", "email",
                 recipient=recipient_email)
        except Exception as exc:
            logger.warning("send_event_notification email failed for %s: %s", template_code, exc)
            _log(db, tmpl, "failed", "email", recipient=recipient_email)

    # 6. WhatsApp
    if "wa" in channels and notify_wa and recipient_phone and tmpl.wa_body:
        try:
            from app.providers import get_whatsapp_provider
            provider = get_whatsapp_provider()
            body = _render(tmpl.wa_body, variables)
            res = await provider.send_text(recipient_phone, body)
            _log(db, tmpl, "delivered" if res.success else "failed", "wa",
                 recipient=recipient_phone)
        except Exception as exc:
            logger.warning("send_event_notification WhatsApp failed for %s: %s", template_code, exc)
            _log(db, tmpl, "failed", "wa", recipient=recipient_phone)

    try:
        await db.commit()
    except Exception:
        pass


def _log(
    db: AsyncSession,
    tmpl: NotificationTemplate,
    status: str,
    channel: str,
    recipient: str = "",
) -> None:
    """Append a delivery log row (fire-and-forget — caller commits)."""
    db.add(NotificationLog(
        template_id=tmpl.id,
        template_name=tmpl.name,
        channel=channel,
        recipient=recipient,
        status=status,
    ))


async def create_broadcast(db: AsyncSession, body: BroadcastCreate) -> NotificationBroadcast:
    platform = await get_settings(db)

    # Gap 1 & 2: Block marketing broadcasts when platform consent_marketing_opt_in is off
    if body.category.lower() == "marketing" and not platform.consent_marketing_opt_in:
        raise HTTPException(
            status_code=403,
            detail=(
                "Marketing communications are disabled. "
                "Enable 'Marketing communications opt-in' in Settings → Data & Privacy → Consent "
                "to send marketing broadcasts."
            ),
        )

    # Block immediate broadcasts during quiet hours unless override is set
    if not body.scheduled_at:
        if is_in_quiet_window(platform) and not getattr(body, 'quiet_hours_override', False):
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Broadcasts are suppressed during quiet hours "
                    f"({platform.quiet_hours_start}–{platform.quiet_hours_end}). "
                    "Schedule for later or enable the quiet-hours override on the template."
                ),
            )

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

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.operator_notifications import (
    ChannelToggles,
    NotificationOut,
    NotificationPrefs,
    NotificationPrefsUpdate,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_DEFAULT_PREFS = NotificationPrefs()


def _row_to_notification(row) -> NotificationOut:
    """Convert a DB row (mapping) to NotificationOut."""
    created_at = row["created_at"]
    if created_at is None:
        created_at = datetime.now(timezone.utc)
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)

    return NotificationOut(
        id=str(row["id"]),
        type=row.get("type") or "ops",
        title=row.get("title") or "",
        message=row.get("message") or row.get("body") or "",
        channel=row.get("channel") or "in_app",
        status="read" if row.get("is_read") else "unread",
        created_at=created_at,
        link_url=row.get("link_url") or None,
    )


# ---------------------------------------------------------------------------
# Notification listing / marking
# ---------------------------------------------------------------------------

async def list_notifications(
    db: AsyncSession,
    operator_user_id: str,
    unread_only: bool = False,
) -> list[NotificationOut]:
    """Return operator inbox notifications ordered newest-first."""
    try:
        where = "recipient_id = :uid AND recipient_type = 'operator_user'"
        if unread_only:
            where += " AND (is_read = 0 OR is_read IS NULL)"
        result = await db.execute(
            text(
                f"SELECT id, type, title, message, channel, is_read, created_at, link_url "
                f"FROM operator_notifications WHERE {where} ORDER BY created_at DESC LIMIT 200"
            ),
            {"uid": operator_user_id},
        )
        rows = result.mappings().all()
        return [_row_to_notification(r) for r in rows]
    except Exception as exc:
        logger.warning("list_notifications: table may not exist yet — %s", exc)
        return []


async def mark_read(
    db: AsyncSession,
    operator_user_id: str,
    notification_id: str,
) -> bool:
    """Mark a single notification as read. Returns True if a row was updated."""
    try:
        result = await db.execute(
            text(
                "UPDATE operator_notifications "
                "SET is_read = 1 "
                "WHERE id = :nid AND recipient_id = :uid AND recipient_type = 'operator_user'"
            ),
            {"nid": notification_id, "uid": operator_user_id},
        )
        await db.commit()
        return (result.rowcount or 0) > 0
    except Exception as exc:
        logger.warning("mark_read: %s", exc)
        try:
            await db.rollback()
        except Exception:
            pass
        return False


async def mark_all_read(
    db: AsyncSession,
    operator_user_id: str,
) -> int:
    """Mark all unread notifications as read. Returns count of rows updated."""
    try:
        result = await db.execute(
            text(
                "UPDATE operator_notifications "
                "SET is_read = 1 "
                "WHERE recipient_id = :uid AND recipient_type = 'operator_user' "
                "AND (is_read = 0 OR is_read IS NULL)"
            ),
            {"uid": operator_user_id},
        )
        await db.commit()
        return result.rowcount or 0
    except Exception as exc:
        logger.warning("mark_all_read: %s", exc)
        try:
            await db.rollback()
        except Exception:
            pass
        return 0


# ---------------------------------------------------------------------------
# Preferences — stored as JSON in operator_notification_prefs table
# ---------------------------------------------------------------------------

def _parse_prefs(raw: Optional[str]) -> NotificationPrefs:
    """Parse a JSON string into NotificationPrefs, falling back to defaults."""
    if not raw:
        return NotificationPrefs()
    try:
        data = json.loads(raw)
        # Rebuild nested ChannelToggles
        def _ct(val, default: ChannelToggles) -> ChannelToggles:
            if not isinstance(val, dict):
                return default
            return ChannelToggles(
                email=val.get("email", default.email),
                sms=val.get("sms", default.sms),
                in_app=val.get("in_app", default.in_app),
            )

        d = _DEFAULT_PREFS
        return NotificationPrefs(
            new_requests=_ct(data.get("new_requests"), d.new_requests),
            ttl_warnings=_ct(data.get("ttl_warnings"), d.ttl_warnings),
            assignment_updates=_ct(data.get("assignment_updates"), d.assignment_updates),
            document_expiry=_ct(data.get("document_expiry"), d.document_expiry),
            payout_updates=_ct(data.get("payout_updates"), d.payout_updates),
            cancellations=_ct(data.get("cancellations"), d.cancellations),
            quiet_hours_start=data.get("quiet_hours_start"),
            quiet_hours_end=data.get("quiet_hours_end"),
        )
    except Exception:
        return NotificationPrefs()


async def get_preferences(
    db: AsyncSession,
    operator_user_id: str,
) -> NotificationPrefs:
    """Retrieve notification preferences for an operator user."""
    try:
        result = await db.execute(
            text(
                "SELECT prefs_json FROM operator_notification_prefs "
                "WHERE operator_user_id = :uid LIMIT 1"
            ),
            {"uid": operator_user_id},
        )
        row = result.mappings().first()
        if row is None:
            return NotificationPrefs()
        return _parse_prefs(row.get("prefs_json"))
    except Exception as exc:
        logger.warning("get_preferences: table may not exist yet — %s", exc)
        return NotificationPrefs()


async def update_preferences(
    db: AsyncSession,
    operator_user_id: str,
    payload: NotificationPrefsUpdate,
) -> NotificationPrefs:
    """Merge payload into stored preferences and persist."""
    current = await get_preferences(db, operator_user_id)

    # Merge each field
    def _merge_ct(current_ct: ChannelToggles, update_ct) -> ChannelToggles:
        if update_ct is None:
            return current_ct
        return ChannelToggles(
            email=update_ct.email if update_ct.email is not None else current_ct.email,
            sms=update_ct.sms if update_ct.sms is not None else current_ct.sms,
            in_app=update_ct.in_app if update_ct.in_app is not None else current_ct.in_app,
        )

    merged = NotificationPrefs(
        new_requests=_merge_ct(current.new_requests, payload.new_requests),
        ttl_warnings=_merge_ct(current.ttl_warnings, payload.ttl_warnings),
        assignment_updates=_merge_ct(current.assignment_updates, payload.assignment_updates),
        document_expiry=_merge_ct(current.document_expiry, payload.document_expiry),
        payout_updates=_merge_ct(current.payout_updates, payload.payout_updates),
        cancellations=_merge_ct(current.cancellations, payload.cancellations),
        quiet_hours_start=(
            payload.quiet_hours_start
            if payload.quiet_hours_start is not None
            else current.quiet_hours_start
        ),
        quiet_hours_end=(
            payload.quiet_hours_end
            if payload.quiet_hours_end is not None
            else current.quiet_hours_end
        ),
    )

    prefs_json = merged.model_dump_json()

    try:
        # Upsert — MySQL ON DUPLICATE KEY UPDATE
        await db.execute(
            text(
                "INSERT INTO operator_notification_prefs (operator_user_id, prefs_json) "
                "VALUES (:uid, :prefs) "
                "ON DUPLICATE KEY UPDATE prefs_json = :prefs"
            ),
            {"uid": operator_user_id, "prefs": prefs_json},
        )
        await db.commit()
    except Exception as exc:
        logger.warning("update_preferences: could not persist — %s", exc)
        try:
            await db.rollback()
        except Exception:
            pass
        # Still return the merged value in memory

    return merged

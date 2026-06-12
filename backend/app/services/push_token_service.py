from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device_token import DeviceToken

UserType = Literal["admin", "operator", "customer", "driver"]

# FCM error codes that mean the token is permanently dead
_STALE_FCM_ERRORS = {
    "UNREGISTERED",
    "INVALID_ARGUMENT",
    "NOT_FOUND",
}


async def register(
    db: AsyncSession,
    user_type: UserType,
    user_id: str,
    token: str,
    platform: Optional[str] = None,
    device_name: Optional[str] = None,
) -> DeviceToken:
    """Upsert a device token for a user.

    If the token already exists (same FCM token, different user) it is
    re-assigned to the current user — handles app reinstalls.
    """
    now = datetime.now(timezone.utc)

    # Check if token already registered (possibly for another user/device)
    existing_q = await db.execute(select(DeviceToken).where(DeviceToken.token == token))
    existing = existing_q.scalar_one_or_none()

    if existing:
        # Update ownership and metadata
        existing.user_type = user_type
        existing.user_id = user_id
        existing.platform = platform or existing.platform
        existing.device_name = device_name or existing.device_name
        existing.last_seen_at = now  # type: ignore[assignment]
        await db.commit()
        return existing

    dt = DeviceToken(
        id=str(uuid.uuid4()),
        user_type=user_type,
        user_id=user_id,
        token=token,
        platform=platform,
        device_name=device_name,
        last_seen_at=now,  # type: ignore[assignment]
    )
    db.add(dt)
    await db.commit()
    return dt


async def deregister(
    db: AsyncSession,
    token: str,
) -> None:
    """Delete a single device token (called on device logout)."""
    await db.execute(delete(DeviceToken).where(DeviceToken.token == token))
    await db.commit()


async def deregister_all(
    db: AsyncSession,
    user_type: UserType,
    user_id: str,
) -> None:
    """Delete ALL tokens for a user (called on sign-out-all / account suspend)."""
    await db.execute(
        delete(DeviceToken).where(
            DeviceToken.user_type == user_type,
            DeviceToken.user_id == user_id,
        )
    )
    await db.commit()


async def get_tokens(
    db: AsyncSession,
    user_type: UserType,
    user_id: str,
) -> List[str]:
    """Return all active FCM tokens for a user (all devices)."""
    q = await db.execute(
        select(DeviceToken.token).where(
            DeviceToken.user_type == user_type,
            DeviceToken.user_id == user_id,
        )
    )
    return [row[0] for row in q.all()]


async def send_to_user(
    db: AsyncSession,
    user_type: UserType,
    user_id: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
    priority: str = "normal",
) -> int:
    """Send a push notification to all devices of a user.

    Returns the number of successful deliveries.
    Automatically removes stale/invalid tokens from the DB.
    """
    tokens = await get_tokens(db, user_type, user_id)
    if not tokens:
        return 0

    try:
        from app.providers import get_push_provider
        from app.providers.base.push import PushMessage
    except Exception:
        return 0

    try:
        provider = get_push_provider()
    except ValueError:
        return 0  # FCM not configured yet

    msg = PushMessage(
        title=title,
        body=body,
        data={**(data or {}), "priority": priority},
    )

    stale: List[str] = []
    delivered = 0

    for token in tokens:
        result = await provider.send(token, msg)
        if result.success:
            delivered += 1
            # Update last_seen_at
            q = await db.execute(select(DeviceToken).where(DeviceToken.token == token))
            dt = q.scalar_one_or_none()
            if dt:
                dt.last_seen_at = datetime.now(timezone.utc)  # type: ignore[assignment]
        else:
            # Mark stale if FCM says the token is dead
            err = (result.error or "").upper()
            if any(code in err for code in _STALE_FCM_ERRORS):
                stale.append(token)

    if stale:
        await db.execute(delete(DeviceToken).where(DeviceToken.token.in_(stale)))

    await db.commit()
    return delivered

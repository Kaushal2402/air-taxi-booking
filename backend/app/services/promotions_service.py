from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ValidationException
from app.models.promotion import CouponRedemption, Promotion
from app.models.referral import Referral, ReferralProgram


# ── Promotions ─────────────────────────────────────────────────────────────────

async def list_promotions(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    status: str | None = None,
) -> tuple[list[Any], int]:
    query = select(Promotion)
    if search:
        query = query.where(Promotion.code.ilike(f"%{search}%"))
    if status:
        query = query.where(Promotion.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(Promotion.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())
    return items, total


async def create_promotion(db: AsyncSession, data: dict) -> Promotion:
    # Ensure code uniqueness
    existing = await db.execute(
        select(Promotion).where(Promotion.code == data["code"])
    )
    if existing.scalar_one_or_none():
        raise ValidationException(f"Promotion code '{data['code']}' is already in use")

    now = datetime.now(timezone.utc)
    promo = Promotion(
        id=str(uuid.uuid4()),
        **{k: v for k, v in data.items()},
        status="draft",
        budget_spent_minor=0,
        redemption_count=0,
    )
    # Ensure created_at / updated_at are set
    promo.created_at = now
    promo.updated_at = now
    db.add(promo)
    await db.commit()
    await db.refresh(promo)
    return promo


async def get_promotion(db: AsyncSession, promotion_id: str) -> Promotion:
    result = await db.execute(
        select(Promotion).where(Promotion.id == promotion_id)
    )
    promo = result.scalar_one_or_none()
    if not promo:
        raise NotFoundException("Promotion", promotion_id)
    return promo


async def update_promotion(db: AsyncSession, promotion_id: str, data: dict) -> Promotion:
    promo = await get_promotion(db, promotion_id)
    if promo.status not in ("draft", "paused"):
        raise ValidationException(
            "Only draft or paused promotions can be updated"
        )
    # Prevent updating read-only fields or bypassing status state machine
    for key in ("id", "code", "budget_spent_minor", "redemption_count", "created_at", "status"):
        data.pop(key, None)

    now = datetime.now(timezone.utc)
    for key, value in data.items():
        setattr(promo, key, value)
    promo.updated_at = now

    await db.commit()
    await db.refresh(promo)
    return promo


async def activate_promotion(db: AsyncSession, promotion_id: str) -> Promotion:
    promo = await get_promotion(db, promotion_id)
    if promo.status not in ("draft", "paused"):
        raise ValidationException(
            f"Promotion cannot be activated from status '{promo.status}'"
        )
    promo.status = "active"
    promo.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(promo)
    return promo


async def pause_promotion(db: AsyncSession, promotion_id: str) -> Promotion:
    promo = await get_promotion(db, promotion_id)
    if promo.status != "active":
        raise ValidationException(
            f"Only active promotions can be paused (current: '{promo.status}')"
        )
    promo.status = "paused"
    promo.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(promo)
    return promo


async def delete_promotion(db: AsyncSession, promotion_id: str) -> None:
    promo = await get_promotion(db, promotion_id)
    if promo.status != "draft":
        raise ValidationException("Only draft promotions can be deleted")
    await db.delete(promo)
    await db.commit()


async def get_analytics(db: AsyncSession, days: int = 14) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Total aggregates
    agg_result = await db.execute(
        select(
            func.count(CouponRedemption.id).label("total_redemptions"),
            func.coalesce(func.sum(CouponRedemption.amount_minor), 0).label("total_spent"),
        ).where(CouponRedemption.created_at >= since)
    )
    agg_row = agg_result.one()
    total_redemptions: int = agg_row.total_redemptions or 0
    total_spent: int = int(agg_row.total_spent or 0)
    avg_discount_minor = int(total_spent / total_redemptions) if total_redemptions else 0

    # Daily series
    daily_result = await db.execute(
        select(
            func.date(CouponRedemption.created_at).label("day"),
            func.count(CouponRedemption.id).label("cnt"),
            func.coalesce(func.sum(CouponRedemption.amount_minor), 0).label("spent"),
        )
        .where(CouponRedemption.created_at >= since)
        .group_by(func.date(CouponRedemption.created_at))
        .order_by(func.date(CouponRedemption.created_at))
    )
    daily_series = [
        {"date": str(row.day), "count": row.cnt, "spent_minor": int(row.spent)}
        for row in daily_result.all()
    ]

    # By promo
    by_promo_result = await db.execute(
        select(
            Promotion.code,
            func.count(CouponRedemption.id).label("redemptions"),
            func.coalesce(func.sum(CouponRedemption.amount_minor), 0).label("spent"),
        )
        .join(Promotion, CouponRedemption.promotion_id == Promotion.id)
        .where(CouponRedemption.created_at >= since)
        .group_by(Promotion.code)
        .order_by(func.count(CouponRedemption.id).desc())
    )
    by_promo_rows = by_promo_result.all()
    by_promo = [
        {
            "code": row.code,
            "redemptions": row.redemptions,
            "spent_minor": int(row.spent),
            "pct": round(row.redemptions / total_redemptions * 100, 1)
            if total_redemptions
            else 0.0,
        }
        for row in by_promo_rows
    ]

    blended_cpa_minor = avg_discount_minor  # simplified CPA calculation

    return {
        "total_redemptions": total_redemptions,
        "total_budget_spent_minor": total_spent,
        "avg_discount_minor": avg_discount_minor,
        "new_customers": 0,        # would require joining customer data
        "blended_cpa_minor": blended_cpa_minor,
        "daily_series": daily_series,
        "by_promo": by_promo,
    }


# ── Referral Program ───────────────────────────────────────────────────────────

async def get_referral_program(db: AsyncSession) -> ReferralProgram:
    """Get the singleton referral program config, creating it if it doesn't exist."""
    result = await db.execute(select(ReferralProgram).limit(1))
    program = result.scalar_one_or_none()
    if not program:
        now = datetime.now(timezone.utc)
        program = ReferralProgram(
            id=str(uuid.uuid4()),
            created_at=now,
            updated_at=now,
        )
        db.add(program)
        await db.commit()
        await db.refresh(program)
    return program


async def update_referral_program(db: AsyncSession, data: dict) -> ReferralProgram:
    program = await get_referral_program(db)
    for key in ("id", "created_at"):
        data.pop(key, None)
    for key, value in data.items():
        setattr(program, key, value)
    program.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(program)
    return program


async def get_referral_stats(db: AsyncSession) -> dict:
    # Total referrals
    total_result = await db.execute(select(func.count(Referral.id)))
    referrals_sent: int = total_result.scalar_one() or 0

    # Converted
    conv_result = await db.execute(
        select(func.count(Referral.id)).where(
            Referral.status.in_(("converted", "rewarded"))
        )
    )
    converted: int = conv_result.scalar_one() or 0

    # Flagged
    flagged_result = await db.execute(
        select(func.count(Referral.id)).where(Referral.status == "flagged")
    )
    fraud_blocked: int = flagged_result.scalar_one() or 0

    # Reward paid to rewarded referrals
    reward_result = await db.execute(
        select(func.coalesce(func.sum(Referral.reward_minor), 0)).where(
            Referral.status == "rewarded"
        )
    )
    reward_paid_minor: int = int(reward_result.scalar_one() or 0)

    conversion_rate_pct = (
        round(converted / referrals_sent * 100, 1) if referrals_sent else 0.0
    )
    cpa_minor = int(reward_paid_minor / converted) if converted else 0

    return {
        "referrals_sent": referrals_sent,
        "converted": converted,
        "conversion_rate_pct": conversion_rate_pct,
        "reward_paid_minor": reward_paid_minor,
        "new_customers": converted,
        "cpa_minor": cpa_minor,
        "fraud_blocked": fraud_blocked,
        "fraud_saved_minor": 0,  # would require flagged reward tracking
        "top_referrers": [],     # requires customer name join (not yet available)
    }

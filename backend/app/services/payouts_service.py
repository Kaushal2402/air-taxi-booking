from __future__ import annotations

from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.payout import (
    AdjustmentType,
    PayeeStatus,
    PayoutAdjustment,
    PayoutPayee,
    PayoutRun,
    PayoutRunStatus,
)


# ── Payout Runs ────────────────────────────────────────────────────────────────

async def list_runs(
    db: AsyncSession,
    page: int,
    page_size: int,
    status: str | None,
    run_type: str | None,
    search: str | None,
) -> Dict[str, Any]:
    q = select(PayoutRun)
    if status:
        q = q.where(PayoutRun.status == status)
    if run_type:
        q = q.where(PayoutRun.run_type == run_type)
    if search:
        like = f"%{search}%"
        q = q.where(
            PayoutRun.run_ref.ilike(like) | PayoutRun.period_label.ilike(like)
        )
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()
    q = q.order_by(PayoutRun.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    items = result.scalars().all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


async def get_run(db: AsyncSession, run_id: str) -> PayoutRun:
    result = await db.execute(
        select(PayoutRun).where(PayoutRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Payout run not found")
    return run


async def create_run(db: AsyncSession, data: Dict[str, Any]) -> PayoutRun:
    run = PayoutRun(**data)
    run.status = PayoutRunStatus.draft
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


async def update_run(db: AsyncSession, run_id: str, data: Dict[str, Any]) -> PayoutRun:
    run = await get_run(db, run_id)
    for k, v in data.items():
        setattr(run, k, v)
    await db.commit()
    await db.refresh(run)
    return run


async def approve_run(db: AsyncSession, run_id: str, admin_id: str, notes: str | None) -> PayoutRun:
    run = await get_run(db, run_id)
    if run.status not in (PayoutRunStatus.review, PayoutRunStatus.draft):
        raise HTTPException(status_code=400, detail="Run cannot be approved in current status")
    run.status = PayoutRunStatus.approved
    run.approved_by = admin_id
    from datetime import datetime
    run.approved_at = datetime.utcnow()
    if notes:
        run.notes = notes
    await db.commit()
    await db.refresh(run)
    return run


async def reject_run(db: AsyncSession, run_id: str, reason: str) -> PayoutRun:
    run = await get_run(db, run_id)
    run.status = PayoutRunStatus.failed
    run.rejection_reason = reason
    await db.commit()
    await db.refresh(run)
    return run


async def delete_run(db: AsyncSession, run_id: str) -> None:
    run = await get_run(db, run_id)
    if run.status not in (PayoutRunStatus.draft, PayoutRunStatus.failed, PayoutRunStatus.cancelled):
        raise HTTPException(status_code=400, detail="Only draft/failed/cancelled runs can be deleted")
    await db.delete(run)
    await db.commit()


# ── Payout Payees ──────────────────────────────────────────────────────────────

async def list_payees(
    db: AsyncSession,
    run_id: str,
    page: int,
    page_size: int,
    status: str | None,
    search: str | None,
) -> Dict[str, Any]:
    await get_run(db, run_id)
    q = select(PayoutPayee).options(selectinload(PayoutPayee.adjustments)).where(
        PayoutPayee.run_id == run_id
    )
    if status:
        q = q.where(PayoutPayee.status == status)
    if search:
        like = f"%{search}%"
        q = q.where(
            PayoutPayee.entity_name.ilike(like) | PayoutPayee.entity_ref.ilike(like)
        )
    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()
    q = q.order_by(PayoutPayee.net_amount.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    items = result.scalars().all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


async def get_payee(db: AsyncSession, payee_id: str) -> PayoutPayee:
    result = await db.execute(
        select(PayoutPayee)
        .options(selectinload(PayoutPayee.adjustments))
        .where(PayoutPayee.id == payee_id)
    )
    payee = result.scalar_one_or_none()
    if not payee:
        raise HTTPException(status_code=404, detail="Payee not found")
    return payee


async def add_payee(db: AsyncSession, run_id: str, data: Dict[str, Any]) -> PayoutPayee:
    await get_run(db, run_id)
    payee = PayoutPayee(run_id=run_id, **data)
    db.add(payee)
    await db.commit()
    await db.refresh(payee)
    return await get_payee(db, payee.id)


async def update_payee(db: AsyncSession, payee_id: str, data: Dict[str, Any]) -> PayoutPayee:
    payee = await get_payee(db, payee_id)
    for k, v in data.items():
        setattr(payee, k, v)
    if data.get("status") == PayeeStatus.paid:
        from datetime import datetime
        payee.paid_at = datetime.utcnow()
    await db.commit()
    await db.refresh(payee)
    return await get_payee(db, payee_id)


async def add_adjustment(
    db: AsyncSession, payee_id: str, data: Dict[str, Any], admin_id: str
) -> PayoutAdjustment:
    await get_payee(db, payee_id)
    adj = PayoutAdjustment(payee_id=payee_id, created_by=admin_id, **data)
    db.add(adj)
    # Recompute net on payee
    payee_result = await db.execute(select(PayoutPayee).where(PayoutPayee.id == payee_id))
    payee = payee_result.scalar_one()
    amount = float(data["amount"])
    if data.get("adjustment_type") in (AdjustmentType.deduction, AdjustmentType.clawback, AdjustmentType.penalty):
        payee.deduction_amount = float(payee.deduction_amount) + abs(amount)
    else:
        payee.incentive_amount = float(payee.incentive_amount) + abs(amount)
    payee.net_amount = (
        float(payee.gross_amount)
        + float(payee.incentive_amount)
        - float(payee.deduction_amount)
        - float(payee.hold_amount)
    )
    await db.commit()
    await db.refresh(adj)
    return adj

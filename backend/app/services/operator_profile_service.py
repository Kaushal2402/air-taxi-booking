from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.operator import Operator, OperatorDocument


async def get_operator(db: AsyncSession, operator_id: str) -> Operator:
    result = await db.execute(select(Operator).where(Operator.id == operator_id))
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")
    return op


async def get_profile(db: AsyncSession, operator_id: str) -> Operator:
    return await get_operator(db, operator_id)


async def update_profile(db: AsyncSession, operator_id: str, changes: dict) -> Operator:
    op = await get_operator(db, operator_id)
    allowed = {"trade_name", "contact_email", "contact_phone", "hq_city"}
    # Legal-name / registration changes after approval require re-review
    locked_fields = {"name", "company_registration_no"}
    locked_being_changed = locked_fields.intersection(changes.keys())
    if locked_being_changed and op.onboarding_status == "approved":
        changes["onboarding_status"] = "re_review"
    for k, v in changes.items():
        if k in allowed | locked_fields | {"onboarding_status"}:
            setattr(op, k, v)
    await db.commit()
    await db.refresh(op)
    return op


async def submit_onboarding(db: AsyncSession, operator_id: str, data: dict) -> Operator:
    op = await get_operator(db, operator_id)
    if op.onboarding_status not in ("draft", "rejected", None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit from status '{op.onboarding_status}'",
        )
    for k, v in data.items():
        if hasattr(op, k):
            setattr(op, k, v)
    op.onboarding_status = "submitted"
    await db.commit()
    await db.refresh(op)
    return op


async def get_onboarding_status(db: AsyncSession, operator_id: str) -> dict:
    op = await get_operator(db, operator_id)
    return {
        "status": op.status,
        "onboarding_status": op.onboarding_status or "draft",
        "rejection_reason": op.rejection_reason,
    }


async def upload_certification(db: AsyncSession, operator_id: str, doc_type: str, file_url: str, expires_at) -> OperatorDocument:
    doc = OperatorDocument(
        id=str(uuid.uuid4()),
        operator_id=operator_id,
        doc_type=doc_type,
        file_url=file_url,
        expires_at=expires_at,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def upload_insurance(db: AsyncSession, operator_id: str, file_url: str, expires_at) -> OperatorDocument:
    doc = OperatorDocument(
        id=str(uuid.uuid4()),
        operator_id=operator_id,
        doc_type="insurance",
        file_url=file_url,
        expires_at=expires_at,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def update_payout_details(db: AsyncSession, operator_id: str, payout_account_ref: str) -> Operator:
    op = await get_operator(db, operator_id)
    op.payout_account_ref = payout_account_ref
    await db.commit()
    await db.refresh(op)
    return op


async def list_documents(db: AsyncSession, operator_id: str) -> list[OperatorDocument]:
    result = await db.execute(
        select(OperatorDocument)
        .where(OperatorDocument.operator_id == operator_id)
        .order_by(OperatorDocument.created_at.desc())
    )
    return list(result.scalars().all())

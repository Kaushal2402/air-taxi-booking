from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.operator_booking_request import OperatorBookingRequest
from app.schemas.operator_requests import BookingRequestCreate, RejectRequest


async def list_requests(
    db: AsyncSession, operator_id: str, status: str | None = None
) -> list[OperatorBookingRequest]:
    q = select(OperatorBookingRequest).where(OperatorBookingRequest.operator_id == operator_id)
    if status:
        q = q.where(OperatorBookingRequest.status == status)
    q = q.order_by(OperatorBookingRequest.ttl_expires_at.asc().nullslast())
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_request(db: AsyncSession, operator_id: str, request_id: str) -> OperatorBookingRequest:
    result = await db.execute(
        select(OperatorBookingRequest).where(
            OperatorBookingRequest.id == request_id,
            OperatorBookingRequest.operator_id == operator_id,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Booking request not found")
    return req


async def create_request(
    db: AsyncSession, operator_id: str, payload: BookingRequestCreate
) -> OperatorBookingRequest:
    req = OperatorBookingRequest(operator_id=operator_id, **payload.model_dump())
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


async def accept_request(
    db: AsyncSession, operator_id: str, request_id: str, user_id: str
) -> OperatorBookingRequest:
    req = await get_request(db, operator_id, request_id)
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot accept request in status '{req.status}'")
    _check_ttl(req)
    req.status = "accepted"
    req.actioned_at = datetime.utcnow()
    req.actioned_by = user_id
    await db.commit()
    await db.refresh(req)
    return req


async def reject_request(
    db: AsyncSession, operator_id: str, request_id: str, user_id: str, payload: RejectRequest
) -> OperatorBookingRequest:
    req = await get_request(db, operator_id, request_id)
    if req.status not in ("pending", "quote_shared"):
        raise HTTPException(status_code=400, detail=f"Cannot reject request in status '{req.status}'")
    req.status = "rejected"
    req.reject_reason = payload.reason
    req.actioned_at = datetime.utcnow()
    req.actioned_by = user_id
    await db.commit()
    await db.refresh(req)
    return req


async def attach_quote(
    db: AsyncSession, operator_id: str, request_id: str, user_id: str, quote_id: str
) -> OperatorBookingRequest:
    req = await get_request(db, operator_id, request_id)
    if req.status not in ("pending",):
        raise HTTPException(status_code=400, detail=f"Cannot attach quote in status '{req.status}'")
    _check_ttl(req)
    req.status = "quote_shared"
    req.quote_id = quote_id
    req.actioned_at = datetime.utcnow()
    req.actioned_by = user_id
    await db.commit()
    await db.refresh(req)
    return req


def _check_ttl(req: OperatorBookingRequest) -> None:
    if req.ttl_expires_at and req.ttl_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Request TTL has expired")

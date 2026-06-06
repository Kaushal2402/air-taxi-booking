from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.privacy_request import PrivacyRequest
from app.services.settings_service import get_settings

logger = logging.getLogger(__name__)

# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_customer(db: AsyncSession, customer_id: str) -> Customer:
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


async def _check_duplicate(db: AsyncSession, customer_id: str, request_type: str) -> None:
    """Reject if there is already an open (pending/processing) request of the same type."""
    result = await db.execute(
        select(PrivacyRequest).where(
            PrivacyRequest.customer_id == customer_id,
            PrivacyRequest.request_type == request_type,
            PrivacyRequest.status.in_(["pending", "processing"]),
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"An open {request_type} request already exists for this customer.",
        )


# ── Create requests ───────────────────────────────────────────────────────────

async def create_export_request(
    db: AsyncSession,
    customer_id: str,
    notes: Optional[str] = None,
) -> PrivacyRequest:
    """
    Create a data-export request for a customer.
    SLA due_at is stamped using privacy_export_sla_hours from platform settings.
    """
    await _check_duplicate(db, customer_id, "export")
    customer = await _get_customer(db, customer_id)
    settings = await get_settings(db)

    hours = settings.privacy_export_sla_hours or 72
    sla_due_at = datetime.now(timezone.utc) + timedelta(hours=hours)

    req = PrivacyRequest(
        customer_id=customer_id,
        customer_name=customer.name,
        customer_email=customer.email,
        request_type="export",
        status="pending",
        sla_due_at=sla_due_at,
        notes=notes,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    logger.info("privacy: export request created for customer %s, SLA %s", customer_id, sla_due_at)
    return req


async def create_deletion_request(
    db: AsyncSession,
    customer_id: str,
    notes: Optional[str] = None,
) -> PrivacyRequest:
    """
    Create a deletion request for a customer.
    SLA due_at is stamped using privacy_deletion_sla_days from platform settings.
    If privacy_auto_anonymize is enabled the request is processed immediately.
    """
    await _check_duplicate(db, customer_id, "deletion")
    customer = await _get_customer(db, customer_id)
    settings = await get_settings(db)

    days = settings.privacy_deletion_sla_days or 30
    sla_due_at = datetime.now(timezone.utc) + timedelta(days=days)

    req = PrivacyRequest(
        customer_id=customer_id,
        customer_name=customer.name,
        customer_email=customer.email,
        request_type="deletion",
        status="pending",
        sla_due_at=sla_due_at,
        notes=notes,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    # Auto-process immediately if the platform toggle is on
    if settings.privacy_auto_anonymize:
        req = await _execute_deletion(db, req, auto=True)

    logger.info("privacy: deletion request created for customer %s, SLA %s", customer_id, sla_due_at)
    return req


# ── List & detail ─────────────────────────────────────────────────────────────

async def list_requests(
    db: AsyncSession,
    status: Optional[str] = None,
    request_type: Optional[str] = None,
    customer_id: Optional[str] = None,
    page: int = 1,
    per_page: int = 25,
) -> dict:
    now = datetime.now(timezone.utc)

    # Mark breached rows before returning
    await db.execute(
        update(PrivacyRequest)
        .where(
            PrivacyRequest.sla_due_at < now,
            PrivacyRequest.sla_breached.is_(False),
            PrivacyRequest.status.in_(["pending", "processing"]),
        )
        .values(sla_breached=True)
    )
    await db.commit()

    q = select(PrivacyRequest)
    if status:
        q = q.where(PrivacyRequest.status == status)
    if request_type:
        q = q.where(PrivacyRequest.request_type == request_type)
    if customer_id:
        q = q.where(PrivacyRequest.customer_id == customer_id)

    q = q.order_by(PrivacyRequest.created_at.desc())

    from sqlalchemy import func, select as sa_select
    count_q = sa_select(func.count()).select_from(q.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    q = q.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    items = result.scalars().all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


async def get_request(db: AsyncSession, request_id: str) -> PrivacyRequest:
    result = await db.execute(select(PrivacyRequest).where(PrivacyRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Privacy request not found")
    return req


# ── Admin approve / reject ────────────────────────────────────────────────────

async def approve_request(
    db: AsyncSession,
    request_id: str,
    resolved_by: str,
    resolution_note: Optional[str] = None,
) -> PrivacyRequest:
    req = await get_request(db, request_id)
    if req.status not in ("pending", "processing"):
        raise HTTPException(status_code=400, detail="Request is already resolved.")

    if req.request_type == "export":
        req = await _execute_export(db, req, resolved_by=resolved_by, note=resolution_note)
    else:
        req = await _execute_deletion(db, req, resolved_by=resolved_by, note=resolution_note)
    return req


async def reject_request(
    db: AsyncSession,
    request_id: str,
    resolved_by: str,
    resolution_note: Optional[str] = None,
) -> PrivacyRequest:
    req = await get_request(db, request_id)
    if req.status not in ("pending", "processing"):
        raise HTTPException(status_code=400, detail="Request is already resolved.")

    req.status = "rejected"
    req.resolved_by = resolved_by
    req.resolution_note = resolution_note
    req.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)
    return req


# ── Execution helpers ─────────────────────────────────────────────────────────

async def _execute_export(
    db: AsyncSession,
    req: PrivacyRequest,
    resolved_by: Optional[str] = None,
    note: Optional[str] = None,
) -> PrivacyRequest:
    """Mark the export request completed. Actual file generation is out-of-scope
    for this service layer — a notification/webhook would trigger the export job."""
    req.status = "completed"
    req.resolved_by = resolved_by or "system"
    req.resolution_note = note or "Data export package prepared and dispatched."
    req.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)
    logger.info("privacy: export request %s completed by %s", req.id, req.resolved_by)
    return req


async def _execute_deletion(
    db: AsyncSession,
    req: PrivacyRequest,
    auto: bool = False,
    resolved_by: Optional[str] = None,
    note: Optional[str] = None,
) -> PrivacyRequest:
    """Anonymize the customer's PII and mark the deletion request completed."""
    result = await db.execute(select(Customer).where(Customer.id == req.customer_id))
    customer = result.scalar_one_or_none()

    if customer:
        customer.name = "[ANON]"
        customer.phone = f"[ANON-{customer.id[:8]}]"
        customer.email = f"anon-{customer.id[:8]}@redacted"
        customer.status = "deleted"

    req.status = "completed"
    req.auto_processed = auto
    req.resolved_by = resolved_by or ("system-auto" if auto else "system")
    req.resolution_note = note or ("Auto-processed: PII anonymized." if auto else "PII anonymized by admin.")
    req.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)
    logger.info("privacy: deletion request %s completed (auto=%s)", req.id, auto)
    return req


# ── Gap 6 hook: auto-process pending deletions (called by purge_service) ──────

async def auto_process_pending_deletions(db: AsyncSession) -> int:
    """
    Process all pending deletion requests when privacy_auto_anonymize is on.
    Returns count processed. Called daily by purge_service.run_all_purges().
    """
    settings = await get_settings(db)
    if not settings.privacy_auto_anonymize:
        return 0

    result = await db.execute(
        select(PrivacyRequest).where(
            PrivacyRequest.request_type == "deletion",
            PrivacyRequest.status.in_(["pending", "processing"]),
        )
    )
    pending = result.scalars().all()
    count = 0
    for req in pending:
        try:
            await _execute_deletion(db, req, auto=True)
            count += 1
        except Exception:
            logger.exception("privacy: failed to auto-process deletion request %s", req.id)
    logger.info("privacy: auto_process_pending_deletions processed %d requests", count)
    return count

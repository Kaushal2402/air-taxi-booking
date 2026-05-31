from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.models.driver import Driver, DriverDocument
from app.models.operator import Aircraft, Operator, OperatorDocument, Pilot
from app.models.vehicle import Vehicle, VehicleDocument

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────


class KycQueueItem(BaseModel):
    id: str
    entity_type: str          # "driver" | "operator" | "vehicle"
    entity_id: str
    entity_name: str
    doc_type: str
    status: str
    file_url: Optional[str] = None
    expiry_date: Optional[str] = None   # ISO date string
    review_notes: Optional[str] = None
    created_at: str           # ISO datetime
    age_seconds: Optional[int] = None   # seconds since created_at

    class Config:
        from_attributes = True


class KycQueueResponse(BaseModel):
    items: List[KycQueueItem]
    total: int
    page: int
    page_size: int


class KycExpiryItem(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    entity_name: str
    doc_type: str
    expiry_date: str       # ISO date
    days_until_expiry: int # negative = already expired
    impact: str
    file_url: Optional[str] = None

    class Config:
        from_attributes = True


class KycReviewRequest(BaseModel):
    action: str                       # "approve" | "reject" | "request_reupload"
    expiry_date: Optional[str] = None # required when action=="approve"
    reason: Optional[str] = None      # required when action=="reject"


# ── Helpers ───────────────────────────────────────────────────────────────────


def _age_seconds(created_at: datetime) -> int:
    """Return integer seconds since created_at (UTC-aware)."""
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    delta = now - created_at
    return max(0, int(delta.total_seconds()))


def _days_until(expiry: date) -> int:
    """Return days until expiry — negative if already past."""
    today = datetime.now(timezone.utc).date()
    return (expiry - today).days


# ── GET /kyc/queue ─────────────────────────────────────────────────────────────


@router.get("/queue", response_model=KycQueueResponse)
async def get_kyc_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    entity_type: Optional[str] = Query(None, description="driver|operator|vehicle"),
    status: Optional[str] = Query(None, description="pending|in_review|approved|rejected|expired"),
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> KycQueueResponse:
    """
    Unified KYC review queue — aggregates pending/in_review documents
    across driver and operator entity types, sorted oldest-first.
    """
    pending_statuses = ["pending", "in_review"]
    if status:
        pending_statuses = [status]

    items: list[KycQueueItem] = []

    # ── Driver documents ──────────────────────────────────────────────────────
    if entity_type is None or entity_type == "driver":
        dd_q = (
            select(DriverDocument, Driver)
            .join(Driver, Driver.id == DriverDocument.driver_id)
            .where(DriverDocument.status.in_(pending_statuses))
        )
        dd_result = await db.execute(dd_q)
        for dd, d in dd_result.all():
            items.append(
                KycQueueItem(
                    id=dd.id,
                    entity_type="driver",
                    entity_id=dd.driver_id,
                    entity_name=d.name,
                    doc_type=dd.doc_type,
                    status=dd.status,
                    file_url=dd.image_url,
                    expiry_date=str(dd.expiry_date) if dd.expiry_date else None,
                    review_notes=dd.review_note,
                    created_at=dd.created_at.isoformat(),
                    age_seconds=_age_seconds(dd.created_at),
                )
            )

    # ── Operator documents ─────────────────────────────────────────────────────
    if entity_type is None or entity_type == "operator":
        od_q = (
            select(OperatorDocument, Operator)
            .join(Operator, Operator.id == OperatorDocument.operator_id)
            .where(OperatorDocument.status.in_(pending_statuses))
        )
        od_result = await db.execute(od_q)
        for od, o in od_result.all():
            items.append(
                KycQueueItem(
                    id=od.id,
                    entity_type="operator",
                    entity_id=od.operator_id,
                    entity_name=o.name,
                    doc_type=od.doc_type,
                    status=od.status,
                    file_url=od.file_url,
                    expiry_date=str(od.expires_at) if od.expires_at else None,
                    review_notes=od.review_notes,
                    created_at=od.created_at.isoformat(),
                    age_seconds=_age_seconds(od.created_at),
                )
            )

    # ── Vehicle documents ──────────────────────────────────────────────────────
    if entity_type is None or entity_type == "vehicle":
        vd_q = (
            select(VehicleDocument, Vehicle)
            .join(Vehicle, Vehicle.id == VehicleDocument.vehicle_id)
            .where(VehicleDocument.status.in_(pending_statuses))
        )
        vd_result = await db.execute(vd_q)
        for vd, v in vd_result.all():
            items.append(
                KycQueueItem(
                    id=vd.id,
                    entity_type="vehicle",
                    entity_id=vd.vehicle_id,
                    entity_name=v.plate_no,
                    doc_type=vd.doc_type,
                    status=vd.status,
                    file_url=vd.image_url,
                    expiry_date=str(vd.expiry_date) if vd.expiry_date else None,
                    review_notes=vd.review_note,
                    created_at=vd.created_at.isoformat(),
                    age_seconds=_age_seconds(vd.created_at),
                )
            )

    # Sort oldest-first by created_at
    items.sort(key=lambda x: x.created_at)

    total = len(items)

    # Manual pagination
    offset = (page - 1) * page_size
    page_items = items[offset: offset + page_size]

    return KycQueueResponse(
        items=page_items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ── GET /kyc/expiry-watchlist ──────────────────────────────────────────────────


@router.get("/expiry-watchlist", response_model=List[KycExpiryItem])
async def get_expiry_watchlist(
    days: int = Query(14, ge=0, le=365),
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[KycExpiryItem]:
    """
    Documents expiring within `days` days (or already expired),
    across all entity types.  Sorted expiry-date ASC (most urgent first).
    """
    today = datetime.now(timezone.utc).date()
    threshold = today + timedelta(days=days)

    expiry_items: list[KycExpiryItem] = []

    # ── Driver documents with expiry ──────────────────────────────────────────
    dd_q = (
        select(DriverDocument, Driver)
        .join(Driver, Driver.id == DriverDocument.driver_id)
        .where(
            DriverDocument.expiry_date.isnot(None),
            DriverDocument.expiry_date <= threshold,
        )
        .order_by(DriverDocument.expiry_date.asc())
    )
    dd_result = await db.execute(dd_q)
    for dd, d in dd_result.all():
        expiry_items.append(
            KycExpiryItem(
                id=dd.id,
                entity_type="driver",
                entity_id=dd.driver_id,
                entity_name=d.name,
                doc_type=dd.doc_type,
                expiry_date=str(dd.expiry_date),
                days_until_expiry=_days_until(dd.expiry_date),
                impact="Force-offline driver",
                file_url=dd.image_url,
            )
        )

    # ── Operator documents with expiry ─────────────────────────────────────────
    od_q = (
        select(OperatorDocument, Operator)
        .join(Operator, Operator.id == OperatorDocument.operator_id)
        .where(
            OperatorDocument.expires_at.isnot(None),
            OperatorDocument.expires_at <= threshold,
        )
        .order_by(OperatorDocument.expires_at.asc())
    )
    od_result = await db.execute(od_q)
    for od, o in od_result.all():
        expiry_items.append(
            KycExpiryItem(
                id=od.id,
                entity_type="operator",
                entity_id=od.operator_id,
                entity_name=o.name,
                doc_type=od.doc_type,
                expiry_date=str(od.expires_at),
                days_until_expiry=_days_until(od.expires_at),
                impact="Pause operator",
                file_url=od.file_url,
            )
        )

    # ── Vehicle documents with expiry ─────────────────────────────────────────
    vd_q = (
        select(VehicleDocument, Vehicle)
        .join(Vehicle, Vehicle.id == VehicleDocument.vehicle_id)
        .where(
            VehicleDocument.expiry_date.isnot(None),
            VehicleDocument.expiry_date <= threshold,
        )
        .order_by(VehicleDocument.expiry_date.asc())
    )
    vd_result = await db.execute(vd_q)
    for vd, v in vd_result.all():
        expiry_items.append(
            KycExpiryItem(
                id=vd.id,
                entity_type="vehicle",
                entity_id=vd.vehicle_id,
                entity_name=v.plate_no,
                doc_type=vd.doc_type,
                expiry_date=str(vd.expiry_date),
                days_until_expiry=_days_until(vd.expiry_date),
                impact="Suspend vehicle",
                file_url=vd.image_url,
            )
        )

    # ── Aircraft airworthiness expiry ─────────────────────────────────────────
    ac_q = (
        select(Aircraft)
        .where(
            Aircraft.airworthiness_expiry.isnot(None),
            Aircraft.airworthiness_expiry <= threshold,
        )
        .order_by(Aircraft.airworthiness_expiry.asc())
    )
    ac_result = await db.execute(ac_q)
    for ac in ac_result.scalars().all():
        expiry_items.append(
            KycExpiryItem(
                id=ac.id,
                entity_type="aircraft",
                entity_id=ac.id,
                entity_name=ac.registration_mark,
                doc_type="Airworthiness Certificate",
                expiry_date=str(ac.airworthiness_expiry),
                days_until_expiry=_days_until(ac.airworthiness_expiry),
                impact="Ground aircraft",
                file_url=ac.airworthiness_doc_url,
            )
        )

    # ── Pilot medical certificate expiry ──────────────────────────────────────
    pi_q = (
        select(Pilot)
        .where(
            Pilot.medical_expiry.isnot(None),
            Pilot.medical_expiry <= threshold,
        )
        .order_by(Pilot.medical_expiry.asc())
    )
    pi_result = await db.execute(pi_q)
    for pi in pi_result.scalars().all():
        expiry_items.append(
            KycExpiryItem(
                id=pi.id,
                entity_type="pilot",
                entity_id=pi.id,
                entity_name=pi.name,
                doc_type="Medical Certificate",
                expiry_date=str(pi.medical_expiry),
                days_until_expiry=_days_until(pi.medical_expiry),
                impact="Ground pilot",
                file_url=None,
            )
        )

    # Sort by expiry_date ASC (most urgent first, already-expired first)
    expiry_items.sort(key=lambda x: x.expiry_date)

    return expiry_items


# ── PATCH /kyc/driver-documents/{doc_id}/review ────────────────────────────────


@router.patch("/driver-documents/{doc_id}/review", response_model=KycQueueItem)
async def review_driver_document(
    doc_id: str,
    body: KycReviewRequest,
    admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> KycQueueItem:
    """
    Approve, reject, or request re-upload of a driver document
    from the central KYC queue (no driver_id scoping required).
    """
    # Find the document
    result = await db.execute(
        select(DriverDocument, Driver)
        .join(Driver, Driver.id == DriverDocument.driver_id)
        .where(DriverDocument.id == doc_id)
    )
    row = result.one_or_none()
    if not row:
        raise NotFoundException("DriverDocument", doc_id)

    dd, d = row
    now = datetime.now(timezone.utc)

    if body.action == "approve":
        dd.status = "ok"
        if body.expiry_date:
            dd.expiry_date = date.fromisoformat(body.expiry_date)
        dd.reviewed_by = admin.name
        dd.reviewed_at = now

    elif body.action == "reject":
        if not body.reason:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="reason is required when action is 'reject'",
            )
        dd.status = "rejected"
        dd.review_note = body.reason
        dd.reviewed_by = admin.name
        dd.reviewed_at = now

    elif body.action == "request_reupload":
        dd.status = "pending"
        if body.reason:
            dd.review_note = body.reason

    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="action must be 'approve', 'reject', or 'request_reupload'",
        )

    await db.commit()
    await db.refresh(dd)

    return KycQueueItem(
        id=dd.id,
        entity_type="driver",
        entity_id=dd.driver_id,
        entity_name=d.name,
        doc_type=dd.doc_type,
        status=dd.status,
        file_url=dd.image_url,
        expiry_date=str(dd.expiry_date) if dd.expiry_date else None,
        review_notes=dd.review_note,
        created_at=dd.created_at.isoformat(),
        age_seconds=_age_seconds(dd.created_at),
    )


# ── PATCH /kyc/operator-documents/{doc_id}/review ─────────────────────────────


@router.patch("/operator-documents/{doc_id}/review", response_model=KycQueueItem)
async def review_operator_document(
    doc_id: str,
    body: KycReviewRequest,
    admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> KycQueueItem:
    """
    Approve, reject, or request re-upload of an operator document
    from the central KYC queue (no operator_id scoping required).
    """
    # Find the document
    result = await db.execute(
        select(OperatorDocument, Operator)
        .join(Operator, Operator.id == OperatorDocument.operator_id)
        .where(OperatorDocument.id == doc_id)
    )
    row = result.one_or_none()
    if not row:
        raise NotFoundException("OperatorDocument", doc_id)

    od, o = row

    if body.action == "approve":
        od.status = "approved"
        if body.expiry_date:
            od.expires_at = date.fromisoformat(body.expiry_date)
        if body.reason:
            od.review_notes = body.reason

    elif body.action == "reject":
        if not body.reason:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="reason is required when action is 'reject'",
            )
        od.status = "rejected"
        od.review_notes = body.reason

    elif body.action == "request_reupload":
        od.status = "pending"
        if body.reason:
            od.review_notes = body.reason

    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="action must be 'approve', 'reject', or 'request_reupload'",
        )

    await db.commit()
    await db.refresh(od)

    return KycQueueItem(
        id=od.id,
        entity_type="operator",
        entity_id=od.operator_id,
        entity_name=o.name,
        doc_type=od.doc_type,
        status=od.status,
        file_url=od.file_url,
        expiry_date=str(od.expires_at) if od.expires_at else None,
        review_notes=od.review_notes,
        created_at=od.created_at.isoformat(),
        age_seconds=_age_seconds(od.created_at),
    )


# ── PATCH /kyc/vehicle-documents/{doc_id}/review ──────────────────────────────


@router.patch("/vehicle-documents/{doc_id}/review", response_model=KycQueueItem)
async def review_vehicle_document(
    doc_id: str,
    body: KycReviewRequest,
    admin: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> KycQueueItem:
    """
    Approve, reject, or request re-upload of a vehicle document
    from the central KYC queue (no vehicle_id scoping required).
    """
    result = await db.execute(
        select(VehicleDocument, Vehicle)
        .join(Vehicle, Vehicle.id == VehicleDocument.vehicle_id)
        .where(VehicleDocument.id == doc_id)
    )
    row = result.one_or_none()
    if not row:
        raise NotFoundException("VehicleDocument", doc_id)

    vd, v = row
    now = datetime.now(timezone.utc)

    if body.action == "approve":
        vd.status = "ok"
        if body.expiry_date:
            vd.expiry_date = date.fromisoformat(body.expiry_date)
        vd.reviewed_by = admin.name
        vd.reviewed_at = now

    elif body.action == "reject":
        if not body.reason:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="reason is required when action is 'reject'",
            )
        vd.status = "rejected"
        vd.review_note = body.reason
        vd.reviewed_by = admin.name
        vd.reviewed_at = now

    elif body.action == "request_reupload":
        vd.status = "pending"
        if body.reason:
            vd.review_note = body.reason

    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="action must be 'approve', 'reject', or 'request_reupload'",
        )

    await db.commit()
    await db.refresh(vd)

    return KycQueueItem(
        id=vd.id,
        entity_type="vehicle",
        entity_id=vd.vehicle_id,
        entity_name=v.plate_no,
        doc_type=vd.doc_type,
        status=vd.status,
        file_url=vd.image_url,
        expiry_date=str(vd.expiry_date) if vd.expiry_date else None,
        review_notes=vd.review_note,
        created_at=vd.created_at.isoformat(),
        age_seconds=_age_seconds(vd.created_at),
    )

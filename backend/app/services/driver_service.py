from __future__ import annotations

import os
import re
import shutil
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.driver import Driver, DriverDocument, DriverWalletTransaction
from app.services.settings_service import get_settings
from app.schemas.driver import (
    DriverDocumentListResponse,
    DriverDocumentResponse,
    DriverDocumentReviewRequest,
    DriverListResponse,
    DriverResponse,
    DriverWalletAdjustRequest,
    DriverWalletAdjustResponse,
    DriverWalletTransactionListResponse,
    DriverWalletTransactionResponse,
    OnboardingDriverResponse,
    OnboardingQueueResponse,
)


# ── List drivers ──────────────────────────────────────────────────────────────

async def list_drivers(
    db: AsyncSession,
    search: Optional[str] = None,
    status: Optional[str] = None,
    online_status: Optional[str] = None,
    vehicle_class: Optional[str] = None,
    zone_code: Optional[str] = None,
    kyc_status: Optional[str] = None,
    min_rating: Optional[float] = None,
    include_inactive: bool = False,
    page: int = 1,
    per_page: int = 25,
) -> DriverListResponse:
    per_page = min(per_page, 100)

    base_q = select(Driver)

    # Search
    if search:
        like = f"%{search}%"
        conditions = [
            Driver.name.ilike(like),
            Driver.phone.ilike(like),
            Driver.vehicle_plate.ilike(like),
            Driver.id.ilike(like),
        ]
        # Support "D-12047", "D-00042", or bare "42" → search by seq_id
        code_match = re.match(r'^[Dd]-?\s*(\d+)$', search.strip())
        if code_match:
            conditions.append(Driver.seq_id == int(code_match.group(1)))
        base_q = base_q.where(or_(*conditions))

    # Status filter
    if status:
        base_q = base_q.where(Driver.status == status)
    elif not include_inactive:
        base_q = base_q.where(Driver.status != "deactivated")

    # Online status filter
    if online_status:
        base_q = base_q.where(Driver.online_status == online_status)

    # Vehicle class filter
    if vehicle_class:
        base_q = base_q.where(Driver.vehicle_class == vehicle_class)

    # Zone code filter
    if zone_code:
        base_q = base_q.where(Driver.zone_code == zone_code)

    # KYC status filter
    if kyc_status:
        base_q = base_q.where(Driver.kyc_status == kyc_status)

    # Min rating filter
    if min_rating is not None:
        base_q = base_q.where(Driver.rating >= min_rating)

    # Total count
    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Paginated rows
    offset = (page - 1) * per_page
    rows_q = base_q.order_by(Driver.created_at.desc()).offset(offset).limit(per_page)
    rows_result = await db.execute(rows_q)
    items = list(rows_result.scalars().all())

    # Status counts — build a search-filtered base without status/online filter
    all_q = select(Driver)
    if search:
        like = f"%{search}%"
        all_conditions = [
            Driver.name.ilike(like),
            Driver.phone.ilike(like),
            Driver.vehicle_plate.ilike(like),
            Driver.id.ilike(like),
        ]
        code_match = re.match(r'^[Dd]-?\s*(\d+)$', search.strip())
        if code_match:
            all_conditions.append(Driver.seq_id == int(code_match.group(1)))
        all_q = all_q.where(or_(*all_conditions))
    if not include_inactive:
        all_q = all_q.where(Driver.status != "deactivated")

    all_count_q = select(func.count()).select_from(all_q.subquery())
    status_counts: dict[str, int] = {
        "all": (await db.execute(all_count_q)).scalar_one(),
    }

    # Online count
    online_q = select(func.count()).select_from(
        all_q.where(Driver.online_status == "online").subquery()
    )
    status_counts["online"] = (await db.execute(online_q)).scalar_one()

    # In-review count
    in_review_q = select(func.count()).select_from(
        all_q.where(Driver.status == "in_review").subquery()
    )
    status_counts["in_review"] = (await db.execute(in_review_q)).scalar_one()

    # Suspended count
    suspended_q = select(func.count()).select_from(
        all_q.where(Driver.status == "suspended").subquery()
    )
    status_counts["suspended"] = (await db.execute(suspended_q)).scalar_one()

    # Docs expiring count
    expiring_q = select(func.count()).select_from(
        all_q.where(Driver.kyc_status == "expiring").subquery()
    )
    status_counts["docs_expiring"] = (await db.execute(expiring_q)).scalar_one()

    return DriverListResponse(
        items=[DriverResponse.model_validate(d) for d in items],
        total=total,
        page=page,
        per_page=per_page,
        status_counts=status_counts,
    )


# ── Create driver (manual onboard) ───────────────────────────────────────────

async def create_driver(db: AsyncSession, data: dict) -> Driver:
    phone = (data.get("phone") or "").strip()
    if not phone:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Phone is required")

    existing = await db.execute(select(Driver).where(Driver.phone == phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A driver with this phone number already exists")

    driver = Driver(
        id=str(uuid.uuid4()),
        name=data["name"],
        phone=phone,
        email=data.get("email"),
        city=data.get("city"),
        zone_code=data.get("zone_code"),
        vehicle_class=data.get("vehicle_class"),
        vehicle_plate=data.get("vehicle_plate"),
        status="pending",
        stage="signup",
        online_status="offline",
        kyc_status="pending",
    )
    db.add(driver)
    await db.commit()
    await db.refresh(driver)
    return driver


# ── Get single driver ─────────────────────────────────────────────────────────

async def get_driver(db: AsyncSession, driver_id: str) -> Driver:
    # Try UUID first
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    driver = result.scalar_one_or_none()

    # Fallback: try driver_code format (e.g. "D-12047")
    if not driver:
        code_match = re.match(r'^[Dd]-?(\d+)$', driver_id.strip())
        if code_match:
            seq = int(code_match.group(1))
            result = await db.execute(select(Driver).where(Driver.seq_id == seq))
            driver = result.scalar_one_or_none()

    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")
    return driver


# ── Onboarding queue ──────────────────────────────────────────────────────────

async def get_onboarding_queue(
    db: AsyncSession,
    search: Optional[str] = None,
    stage: Optional[str] = None,
    vehicle_class: Optional[str] = None,
    zone_code: Optional[str] = None,
    missing_doc: Optional[str] = None,
) -> OnboardingQueueResponse:
    base_q = select(Driver).where(Driver.status.in_(["pending", "in_review"]))

    if search:
        like = f"%{search}%"
        conditions = [
            Driver.name.ilike(like),
            Driver.phone.ilike(like),
            Driver.id.ilike(like),
        ]
        base_q = base_q.where(or_(*conditions))

    if stage:
        base_q = base_q.where(Driver.stage == stage)

    if vehicle_class:
        base_q = base_q.where(Driver.vehicle_class == vehicle_class)

    if zone_code:
        base_q = base_q.where(Driver.zone_code == zone_code)

    rows_result = await db.execute(base_q.order_by(Driver.created_at.asc()))
    drivers = list(rows_result.scalars().all())

    # Load documents for each driver
    onboarding_items: list[OnboardingDriverResponse] = []
    stats = {
        "in_queue": 0,
        "ready_to_approve": 0,
        "missing_docs": 0,
        "sla_breach_risk": 0,
    }

    for driver in drivers:
        doc_result = await db.execute(
            select(DriverDocument).where(DriverDocument.driver_id == driver.id)
        )
        docs = list(doc_result.scalars().all())

        # Filter by missing_doc if requested
        if missing_doc:
            doc_types_present = {d.doc_type for d in docs if d.status == "ok"}
            if missing_doc in doc_types_present:
                continue

        # doc_progress: count ok docs / 6 * 100
        ok_count = sum(1 for d in docs if d.status == "ok")
        doc_progress = int(ok_count / 6 * 100)

        # sla_status based on created_at age
        now = datetime.now(timezone.utc)
        created = driver.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age_hours = (now - created).total_seconds() / 3600

        if age_hours < 24:
            sla_status = "ok"
        elif age_hours < 48:
            sla_status = "warn"
        else:
            sla_status = "danger"

        submitted_at = driver.created_at

        # Stats
        stats["in_queue"] += 1
        if ok_count >= 6:
            stats["ready_to_approve"] += 1
        else:
            has_bad_doc = any(d.status in ("pending", "rejected", "expired") for d in docs)
            if has_bad_doc or ok_count < 6:
                stats["missing_docs"] += 1
        if sla_status in ("warn", "danger"):
            stats["sla_breach_risk"] += 1

        doc_responses = [DriverDocumentResponse.model_validate(d) for d in docs]

        item = OnboardingDriverResponse(
            **DriverResponse.model_validate(driver).model_dump(),
            documents=doc_responses,
            doc_progress=doc_progress,
            sla_status=sla_status,
            submitted_at=submitted_at,
        )
        onboarding_items.append(item)

    return OnboardingQueueResponse(
        items=onboarding_items,
        total=len(onboarding_items),
        stats=stats,
    )


# ── Update driver ─────────────────────────────────────────────────────────────

async def update_driver(db: AsyncSession, driver_id: str, data: dict) -> Driver:
    driver = await get_driver(db, driver_id)

    for key, value in data.items():
        setattr(driver, key, value)

    await db.commit()
    await db.refresh(driver)
    return driver


# ── Status transitions ────────────────────────────────────────────────────────

async def approve_driver(db: AsyncSession, driver_id: str) -> Driver:
    from datetime import timedelta

    driver = await get_driver(db, driver_id)
    settings = await get_settings(db)

    # Assign seq_id if not yet assigned
    if driver.seq_id is None:
        max_result = await db.execute(select(func.max(Driver.seq_id)))
        max_seq = max_result.scalar_one_or_none() or 0
        driver.seq_id = max_seq + 1

    driver.status = "active"
    driver.stage = "approved"

    # Fetch current documents to check for expired ones
    doc_result = await db.execute(
        select(DriverDocument).where(DriverDocument.driver_id == driver.id)
    )
    docs = list(doc_result.scalars().all())
    has_expired_or_pending = any(d.status in ("expired", "pending") for d in docs)

    if settings.driver_grace_period_enabled and has_expired_or_pending:
        # Approve into grace period instead of full approval
        grace_days = settings.driver_grace_period_days or 7
        driver.kyc_status = "grace_period"
        driver.doc_grace_until = (datetime.now(timezone.utc).date() + timedelta(days=grace_days))
    else:
        driver.kyc_status = "approved"
        driver.doc_grace_until = None

    await db.commit()
    await db.refresh(driver)
    return driver


async def reject_driver(db: AsyncSession, driver_id: str, reason: str) -> Driver:
    driver = await get_driver(db, driver_id)
    driver.status = "rejected"
    driver.flag_reason = reason
    await db.commit()
    await db.refresh(driver)
    return driver


async def suspend_driver(db: AsyncSession, driver_id: str, reason: str) -> Driver:
    driver = await get_driver(db, driver_id)
    driver.status = "suspended"
    driver.online_status = "offline"
    driver.flag_reason = reason
    await db.commit()
    await db.refresh(driver)
    return driver


async def reactivate_driver(db: AsyncSession, driver_id: str) -> Driver:
    driver = await get_driver(db, driver_id)
    driver.status = "active"
    driver.flag_reason = None
    await db.commit()
    await db.refresh(driver)
    return driver


async def deactivate_driver(db: AsyncSession, driver_id: str, reason: str) -> Driver:
    driver = await get_driver(db, driver_id)
    driver.status = "deactivated"
    driver.online_status = "offline"
    driver.flag_reason = reason
    await db.commit()
    await db.refresh(driver)
    return driver


async def force_offline(db: AsyncSession, driver_id: str) -> Driver:
    driver = await get_driver(db, driver_id)
    driver.online_status = "offline"
    await db.commit()
    await db.refresh(driver)
    return driver


# ── Document operations ───────────────────────────────────────────────────────

async def get_documents(db: AsyncSession, driver_id: str) -> DriverDocumentListResponse:
    # Resolve to actual UUID (input may be a driver code like "D-00001")
    driver = await get_driver(db, driver_id)

    result = await db.execute(
        select(DriverDocument)
        .where(DriverDocument.driver_id == driver.id)
        .order_by(DriverDocument.created_at.asc())
    )
    docs = list(result.scalars().all())

    return DriverDocumentListResponse(
        items=[DriverDocumentResponse.model_validate(d) for d in docs]
    )


async def create_document(db: AsyncSession, driver_id: str, data: dict) -> DriverDocument:
    # Resolve to actual UUID (input may be a driver code like "D-00001")
    driver = await get_driver(db, driver_id)

    expiry_date = None
    raw_expiry = data.get("expiry_date")
    if raw_expiry:
        if isinstance(raw_expiry, str):
            expiry_date = date.fromisoformat(raw_expiry)
        elif isinstance(raw_expiry, date):
            expiry_date = raw_expiry

    doc = DriverDocument(
        id=str(uuid.uuid4()),
        driver_id=driver.id,          # always the UUID FK, never a driver-code string
        doc_type=data["doc_type"],
        doc_number=data.get("doc_number"),
        expiry_date=expiry_date,
        status="pending",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def _recompute_driver_kyc_status(db: AsyncSession, driver_id: str) -> None:
    """Recompute driver kyc_status based on current document states, respecting grace period."""
    from datetime import timedelta

    result = await db.execute(
        select(DriverDocument).where(DriverDocument.driver_id == driver_id)
    )
    docs = list(result.scalars().all())

    driver_result = await db.execute(select(Driver).where(Driver.id == driver_id))
    driver = driver_result.scalar_one_or_none()
    if not driver:
        return

    now = datetime.now(timezone.utc).date()

    # If driver is inside an active grace window, don't downgrade to rejected
    if driver.doc_grace_until and driver.doc_grace_until >= now:
        # Still in grace — only clear if docs are now fully clean
        all_ok = docs and all(d.status == "ok" for d in docs)
        if all_ok:
            driver.kyc_status = "approved"
            driver.doc_grace_until = None
        # else leave kyc_status as grace_period
        await db.commit()
        return

    # Grace expired — clear it and recompute normally
    if driver.doc_grace_until and driver.doc_grace_until < now:
        driver.doc_grace_until = None

    if not docs:
        driver.kyc_status = "pending"
    elif any(d.status == "rejected" for d in docs):
        driver.kyc_status = "rejected"
    elif any(d.status == "expired" for d in docs):
        driver.kyc_status = "rejected"
    elif any(d.status == "pending" for d in docs):
        driver.kyc_status = "pending"
    else:
        expiry_threshold = now + timedelta(days=30)
        has_expiring = any(
            d.expiry_date is not None and d.expiry_date <= expiry_threshold
            for d in docs if d.status == "ok"
        )
        driver.kyc_status = "expiring" if has_expiring else "approved"

    await db.commit()


async def review_document(
    db: AsyncSession,
    driver_id: str,
    doc_id: str,
    data: DriverDocumentReviewRequest,
    reviewed_by: str,
) -> DriverDocument:
    # Resolve to actual UUID (input may be a driver code like "D-00001")
    driver = await get_driver(db, driver_id)

    result = await db.execute(
        select(DriverDocument).where(
            DriverDocument.id == doc_id,
            DriverDocument.driver_id == driver.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    now = datetime.now(timezone.utc)

    if data.action == "approve":
        doc.status = "ok"
        if data.expiry_date:
            doc.expiry_date = date.fromisoformat(data.expiry_date)
        doc.review_note = data.review_note
        doc.reviewed_by = reviewed_by
        doc.reviewed_at = now

    elif data.action == "reject":
        doc.status = "rejected"
        doc.review_note = data.review_note
        doc.reviewed_by = reviewed_by
        doc.reviewed_at = now

    elif data.action == "request_reupload":
        doc.status = "pending"
        doc.review_note = data.review_note
        doc.reviewed_by = reviewed_by
        doc.reviewed_at = now

    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="action must be 'approve', 'reject', or 'request_reupload'",
        )

    await db.commit()
    await db.refresh(doc)

    # Recompute driver kyc_status based on document states (must use UUID, not raw driver_id)
    await _recompute_driver_kyc_status(db, driver.id)

    return doc


# ── Wallet operations ─────────────────────────────────────────────────────────

async def get_wallet_transactions(
    db: AsyncSession,
    driver_id: str,
    page: int = 1,
    per_page: int = 25,
) -> DriverWalletTransactionListResponse:
    per_page = min(per_page, 100)

    # Resolve to actual UUID (input may be a driver code like "D-00001")
    driver = await get_driver(db, driver_id)

    base_q = select(DriverWalletTransaction).where(
        DriverWalletTransaction.driver_id == driver.id
    )

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * per_page
    rows_q = base_q.order_by(DriverWalletTransaction.created_at.desc()).offset(offset).limit(per_page)
    rows_result = await db.execute(rows_q)
    items = list(rows_result.scalars().all())

    return DriverWalletTransactionListResponse(
        items=[DriverWalletTransactionResponse.model_validate(t) for t in items],
        total=total,
        page=page,
        per_page=per_page,
    )


async def adjust_wallet(
    db: AsyncSession,
    driver_id: str,
    data: DriverWalletAdjustRequest,
    created_by: str,
) -> DriverWalletAdjustResponse:
    driver = await get_driver(db, driver_id)

    if data.amount_minor <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="amount_minor must be greater than 0",
        )

    if data.direction == "debit":
        if data.amount_minor > driver.wallet_balance_minor:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Insufficient wallet balance",
            )
        driver.wallet_balance_minor -= data.amount_minor
    elif data.direction == "credit":
        driver.wallet_balance_minor += data.amount_minor
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="direction must be 'credit' or 'debit'",
        )

    txn = DriverWalletTransaction(
        id=str(uuid.uuid4()),
        driver_id=driver.id,   # always UUID FK, never driver-code string
        direction=data.direction,
        amount_minor=data.amount_minor,
        reason=data.reason,
        audit_note=data.audit_note,
        created_by=created_by,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(driver)
    await db.refresh(txn)

    return DriverWalletAdjustResponse(
        driver=DriverResponse.model_validate(driver),
        transaction=DriverWalletTransactionResponse.model_validate(txn),
    )


# ── Document image upload ─────────────────────────────────────────────────────

_ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
    "application/pdf",
}

_UPLOAD_DIR = "static/documents"


async def upload_document_image(
    db: AsyncSession,
    driver_id: str,
    doc_id: str,
    file: UploadFile,
) -> DriverDocument:
    """Save an uploaded file for a driver document and store its URL."""

    # Validate content type
    content_type = (file.content_type or "").lower()
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{content_type}'. Allowed: JPEG, PNG, WebP, GIF, PDF.",
        )

    # Resolve driver UUID
    driver = await get_driver(db, driver_id)

    result = await db.execute(
        select(DriverDocument).where(
            DriverDocument.id == doc_id,
            DriverDocument.driver_id == driver.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Determine file extension from content type
    ext_map = {
        "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
        "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf",
    }
    ext = ext_map.get(content_type, "bin")

    # Build safe filename: <doc_id>.<ext>  (overwrites previous upload for same doc)
    os.makedirs(_UPLOAD_DIR, exist_ok=True)
    filename  = f"{doc_id}.{ext}"
    file_path = os.path.join(_UPLOAD_DIR, filename)

    # Stream file to disk
    with open(file_path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    # Persist URL
    doc.image_url = f"/static/documents/{filename}"
    await db.commit()
    await db.refresh(doc)
    return doc

from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer, WalletTransaction
from app.schemas.customer import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
    WalletAdjustRequest,
    WalletAdjustResponse,
    WalletTransactionListResponse,
    WalletTransactionResponse,
)


# ── Segment computation ───────────────────────────────────────────────────────

async def compute_segment(customer: Customer) -> str:
    """Compute customer segment from cached metrics.

    Priority: vip_corp > loyalist > frequent > new > regular
    vip_corp is manual-only (set via segment_override, never auto-computed).
    """
    if customer.trips_count >= 300:
        return "loyalist"
    now = datetime.now(timezone.utc)
    joined = customer.joined_at
    if joined is not None:
        # Ensure tz-aware for comparison
        if joined.tzinfo is None:
            joined = joined.replace(tzinfo=timezone.utc)
        if (now - joined) <= timedelta(days=30):
            return "new"
    if customer.trips_count >= 50:
        return "frequent"
    return "regular"


# ── List customers ────────────────────────────────────────────────────────────

async def list_customers(
    db: AsyncSession,
    search: Optional[str] = None,
    segment: Optional[str] = None,
    status: Optional[str] = None,
    city: Optional[str] = None,
    include_inactive: bool = False,
    page: int = 1,
    per_page: int = 25,
) -> CustomerListResponse:
    per_page = min(per_page, 100)

    base_q = select(Customer)

    # Search across name, phone, email, UUID prefix, and customer code (C-NNNN)
    if search:
        like = f"%{search}%"
        from sqlalchemy import or_
        conditions = [
            Customer.name.ilike(like),
            Customer.phone.ilike(like),
            Customer.email.ilike(like),
            Customer.id.ilike(like),
        ]
        # Support "C-42", "C-0042", or bare "42" → search by seq_id
        code_match = re.match(r'^[Cc]-?\s*(\d+)$', search.strip())
        if code_match:
            conditions.append(Customer.seq_id == int(code_match.group(1)))
        base_q = base_q.where(or_(*conditions))

    # Segment filter (matches either override or computed)
    if segment:
        from sqlalchemy import or_, and_
        base_q = base_q.where(
            or_(
                and_(Customer.segment_override.isnot(None), Customer.segment_override == segment),
                and_(Customer.segment_override.is_(None), Customer.computed_segment == segment),
            )
        )

    # Status filter
    if status:
        base_q = base_q.where(Customer.status == status)
    elif not include_inactive:
        # Exclude banned by default
        base_q = base_q.where(Customer.status != "banned")

    # City filter
    if city:
        base_q = base_q.where(Customer.city.ilike(f"%{city}%"))

    # Count query
    count_q = select(func.count()).select_from(base_q.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar_one()

    # Paginated results
    offset = (page - 1) * per_page
    rows_q = base_q.order_by(Customer.joined_at.desc()).offset(offset).limit(per_page)
    rows_result = await db.execute(rows_q)
    items = list(rows_result.scalars().all())

    # Segment counts — run 6 targeted count queries
    segment_counts: dict[str, int] = {}

    # "all" — same base filters but no segment filter (must mirror base_q search exactly)
    all_q = select(Customer)
    if search:
        like = f"%{search}%"
        from sqlalchemy import or_
        all_conditions = [
            Customer.name.ilike(like),
            Customer.phone.ilike(like),
            Customer.email.ilike(like),
            Customer.id.ilike(like),
        ]
        code_match = re.match(r'^[Cc]-?\s*(\d+)$', search.strip())
        if code_match:
            all_conditions.append(Customer.seq_id == int(code_match.group(1)))
        all_q = all_q.where(or_(*all_conditions))
    if not include_inactive:
        all_q = all_q.where(Customer.status != "banned")
    if city:
        all_q = all_q.where(Customer.city.ilike(f"%{city}%"))

    all_count_q = select(func.count()).select_from(all_q.subquery())
    segment_counts["all"] = (await db.execute(all_count_q)).scalar_one()

    # Per-segment counts
    for seg_name in ("vip_corp", "loyalist", "frequent", "new"):
        from sqlalchemy import or_, and_
        seg_q = all_q.where(
            or_(
                and_(Customer.segment_override.isnot(None), Customer.segment_override == seg_name),
                and_(Customer.segment_override.is_(None), Customer.computed_segment == seg_name),
            )
        )
        seg_count_q = select(func.count()).select_from(seg_q.subquery())
        segment_counts[seg_name] = (await db.execute(seg_count_q)).scalar_one()

    # Flagged count (by status, not segment)
    flagged_q = all_q.where(Customer.status == "flagged")
    flagged_count_q = select(func.count()).select_from(flagged_q.subquery())
    segment_counts["flagged"] = (await db.execute(flagged_count_q)).scalar_one()

    return CustomerListResponse(
        items=[CustomerResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        per_page=per_page,
        segment_counts=segment_counts,
    )


# ── Get single customer ───────────────────────────────────────────────────────

async def get_customer(db: AsyncSession, customer_id: str) -> Customer:
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


# ── Create customer ───────────────────────────────────────────────────────────

async def create_customer(
    db: AsyncSession,
    data: CustomerCreate,
    created_by: str,
) -> Customer:
    # Check phone uniqueness
    phone_q = await db.execute(select(Customer).where(Customer.phone == data.phone))
    if phone_q.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A customer with this phone number already exists",
        )

    # Check email uniqueness
    email_q = await db.execute(select(Customer).where(Customer.email == data.email))
    if email_q.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A customer with this email address already exists",
        )

    now = datetime.now(timezone.utc)
    customer = Customer(
        id=str(uuid.uuid4()),
        name=data.name,
        phone=data.phone,
        email=data.email,
        city=data.city,
        segment_override=data.segment_override,
        status="active",
        wallet_balance_minor=0,
        trips_count=0,
        ltv_minor=0,
        cancellation_rate=0.0,
        joined_at=now,
        created_at=now,
        updated_at=now,
    )

    # Compute initial segment
    customer.computed_segment = await compute_segment(customer)

    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


# ── Update customer ───────────────────────────────────────────────────────────

async def update_customer(
    db: AsyncSession,
    customer_id: str,
    data: CustomerUpdate,
) -> Customer:
    customer = await get_customer(db, customer_id)

    updates = data.model_dump(exclude_unset=True)

    # Uniqueness checks — only validate if the field is actually changing
    if "phone" in updates and updates["phone"] != customer.phone:
        dup = await db.execute(
            select(Customer).where(Customer.phone == updates["phone"], Customer.id != customer_id)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number is already in use by another customer",
            )

    if "email" in updates and updates["email"] != customer.email:
        dup = await db.execute(
            select(Customer).where(Customer.email == updates["email"], Customer.id != customer_id)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email address is already in use by another customer",
            )

    trips_changed = "trips_count" in updates

    for key, value in updates.items():
        setattr(customer, key, value)

    # Recompute segment if trips_count changed
    if trips_changed:
        customer.computed_segment = await compute_segment(customer)

    await db.commit()
    await db.refresh(customer)
    return customer


# ── Status transitions ────────────────────────────────────────────────────────

async def suspend_customer(db: AsyncSession, customer_id: str, reason: str) -> Customer:
    customer = await get_customer(db, customer_id)
    customer.status = "suspended"
    customer.flag_reason = reason
    await db.commit()
    await db.refresh(customer)
    return customer


async def reactivate_customer(db: AsyncSession, customer_id: str) -> Customer:
    customer = await get_customer(db, customer_id)
    customer.status = "active"
    customer.flag_reason = None
    await db.commit()
    await db.refresh(customer)
    return customer


async def flag_customer(db: AsyncSession, customer_id: str, reason: str) -> Customer:
    customer = await get_customer(db, customer_id)
    customer.status = "flagged"
    customer.flag_reason = reason
    await db.commit()
    await db.refresh(customer)
    return customer


async def unflag_customer(db: AsyncSession, customer_id: str) -> Customer:
    customer = await get_customer(db, customer_id)
    customer.status = "active"
    customer.flag_reason = None
    await db.commit()
    await db.refresh(customer)
    return customer


# ── Wallet operations ─────────────────────────────────────────────────────────

async def adjust_wallet(
    db: AsyncSession,
    customer_id: str,
    data: WalletAdjustRequest,
    created_by: str,
) -> WalletAdjustResponse:
    customer = await get_customer(db, customer_id)

    if data.amount_minor <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="amount_minor must be greater than 0",
        )

    if data.direction == "debit":
        if data.amount_minor > customer.wallet_balance_minor:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Insufficient wallet balance",
            )
        customer.wallet_balance_minor -= data.amount_minor
    elif data.direction == "credit":
        customer.wallet_balance_minor += data.amount_minor
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="direction must be 'credit' or 'debit'",
        )

    txn = WalletTransaction(
        id=str(uuid.uuid4()),
        customer_id=customer_id,
        direction=data.direction,
        amount_minor=data.amount_minor,
        reason=data.reason,
        audit_note=data.audit_note,
        notify_push=data.notify_push,
        notify_sms=data.notify_sms,
        notify_email=data.notify_email,
        created_by=created_by,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(customer)
    await db.refresh(txn)

    return WalletAdjustResponse(
        customer=CustomerResponse.model_validate(customer),
        transaction=WalletTransactionResponse.model_validate(txn),
    )


async def list_wallet_transactions(
    db: AsyncSession,
    customer_id: str,
    page: int = 1,
    per_page: int = 25,
) -> WalletTransactionListResponse:
    per_page = min(per_page, 100)

    # Verify customer exists
    await get_customer(db, customer_id)

    base_q = select(WalletTransaction).where(WalletTransaction.customer_id == customer_id)

    # Total count
    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Paginated rows
    offset = (page - 1) * per_page
    rows_q = base_q.order_by(WalletTransaction.created_at.desc()).offset(offset).limit(per_page)
    rows_result = await db.execute(rows_q)
    items = list(rows_result.scalars().all())

    return WalletTransactionListResponse(
        items=[WalletTransactionResponse.model_validate(t) for t in items],
        total=total,
        page=page,
        per_page=per_page,
    )

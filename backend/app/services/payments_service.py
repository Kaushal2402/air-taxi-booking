from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select

from app.models.payment import Payment, PaymentMethod, PaymentStatus, Refund, ReconciliationBatch, ReconciliationUnmatched
from app.models.booking import RoadBooking
from app.models.customer import Customer
from app.schemas.payments import (
    BookingSearchResult,
    BreakdownItem,
    BatchItem,
    BatchListResponse,
    GatewaySummary,
    InstrumentDetail,
    ManualEntryRequest,
    ManualEntryResponse,
    PaymentDetail,
    PaymentKPIs,
    PaymentListItem,
    PaymentListResponse,
    ReconciliationSummaryResponse,
    RefundRequest,
    RefundResponse,
    RefundSummary,
    RerunMatchResponse,
    ResolveAllResponse,
    TimelineEvent,
    UnmatchedItem,
    UnmatchedResponse,
)


# ── helpers ────────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _payment_to_list_item(p: Payment) -> PaymentListItem:
    return PaymentListItem(
        id=p.id,
        created_at=p.created_at,
        customer_name=p.customer_name,
        customer_id=p.customer_id,
        booking_ref=p.booking_ref,
        service=p.service,
        method=p.method.value if hasattr(p.method, "value") else str(p.method),
        vpa=p.vpa,
        gross_amount=p.gross_amount,
        gateway_fee=p.gateway_fee,
        net_amount=p.net_amount,
        status=p.status.value if hasattr(p.status, "value") else str(p.status),
        gateway_ref=p.gateway_ref,
        currency=p.currency,
    )


# ── list_transactions ──────────────────────────────────────────────────────────

async def list_transactions(
    db,
    page: int = 1,
    page_size: int = 25,
    search: str | None = None,
    method: str | None = None,
    status: str | None = None,
    gateway: str | None = None,
    service: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> PaymentListResponse:
    q = select(Payment)

    if search:
        like = f"%{search}%"
        q = q.where(
            Payment.id.ilike(like)
            | Payment.customer_name.ilike(like)
            | Payment.booking_ref.ilike(like)
            | Payment.vpa.ilike(like)
        )
    if method:
        q = q.where(Payment.method == method)
    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        q = q.where(Payment.status.in_(statuses))
    if gateway:
        # gateway is a display name (e.g. "UPI Switch"); match against method since Payment
        # has no gateway_name column — UPI Switch→upi, CardNet→card, Netbanking→netbanking
        gw_lower = gateway.lower()
        if "upi" in gw_lower:
            q = q.where(Payment.method == PaymentMethod.upi)
        elif "card" in gw_lower:
            q = q.where(Payment.method == PaymentMethod.card)
        elif "netbank" in gw_lower or "net bank" in gw_lower:
            q = q.where(Payment.method == PaymentMethod.netbanking)
        elif "wallet" in gw_lower or "corp" in gw_lower:
            q = q.where(Payment.method.in_([PaymentMethod.wallet, PaymentMethod.corporate]))
    if service:
        q = q.where(Payment.service.ilike(f"%{service}%"))
    if date_from:
        try:
            q = q.where(Payment.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.where(Payment.created_at <= datetime.fromisoformat(date_to))
        except ValueError:
            pass

    # total count (filtered)
    count_q = select(func.count()).select_from(q.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    # KPIs — always from the full unfiltered table
    kpi_q = select(
        func.coalesce(func.sum(Payment.gross_amount), 0),
        func.coalesce(func.sum(Payment.net_amount), 0),
    )
    kpi_result = await db.execute(kpi_q)
    gross_vol, net_rev = kpi_result.one()

    refund_q = select(func.coalesce(func.sum(Payment.gross_amount), 0)).where(
        Payment.status.in_(["refunded", "part-refund"])
    )
    refund_result = await db.execute(refund_q)
    refunds_total = refund_result.scalar() or 0

    cb_q = select(func.coalesce(func.sum(Payment.gross_amount), 0)).where(
        Payment.status == PaymentStatus.chargeback
    )
    cb_result = await db.execute(cb_q)
    chargebacks_total = cb_result.scalar() or 0

    # Success rate: captured / (captured + failed + refunded + chargeback)  — from full table
    terminal_q = select(func.count()).where(
        Payment.status.in_(["captured", "failed", "refunded", "part-refund", "chargeback", "disputed"])
    )
    terminal_result = await db.execute(terminal_q)
    terminal_count = terminal_result.scalar() or 0

    success_q = select(func.count()).where(Payment.status == PaymentStatus.captured)
    success_result = await db.execute(success_q)
    success_count = success_result.scalar() or 0
    success_rate = round((success_count / terminal_count * 100), 1) if terminal_count > 0 else 0.0

    # paginated rows
    q = q.order_by(Payment.created_at.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows_result = await db.execute(q)
    rows = rows_result.scalars().all()

    return PaymentListResponse(
        items=[_payment_to_list_item(p) for p in rows],
        total=total,
        page=page,
        page_size=page_size,
        kpis=PaymentKPIs(
            gross_volume=int(gross_vol),
            net_revenue=int(net_rev),
            refunds_total=int(refunds_total),
            chargebacks_total=int(chargebacks_total),
            success_rate=success_rate,
        ),
    )


# ── get_transaction ────────────────────────────────────────────────────────────

async def get_transaction(db, txn_id: str) -> PaymentDetail | None:
    q = select(Payment).where(Payment.id == txn_id)
    result = await db.execute(q)
    p: Payment | None = result.scalars().first()
    if not p:
        return None

    method_str = p.method.value if hasattr(p.method, "value") else str(p.method)

    breakdown = [
        BreakdownItem(label="Base fare", amount=p.gross_amount, kind="line"),
        BreakdownItem(label="Amount charged", amount=p.gross_amount, kind="total"),
        BreakdownItem(label=f"Gateway fee · {method_str.upper()}", amount=-p.gateway_fee, kind="fee"),
        BreakdownItem(label="Net revenue", amount=p.net_amount, kind="net"),
    ]

    instrument = InstrumentDetail(
        method=method_str,
        display=f"{method_str.upper()}" + (f" · {p.vpa}" if p.vpa else ""),
        bank="",
        sub_type=method_str,
        verified=True,
        risk_score=0,
        avs_status="N/A",
        three_ds="N/A",
    )

    status_str = p.status.value if hasattr(p.status, "value") else str(p.status)

    # updated_at may be None on a fresh insert before any UPDATE is applied
    updated_ts = (p.updated_at or p.created_at).strftime("%H:%M:%S")
    timeline = [
        TimelineEvent(event="Created", timestamp=p.created_at.strftime("%H:%M:%S"), note=f"Transaction {p.id} created", status="ok"),
        TimelineEvent(event=status_str.capitalize(), timestamp=updated_ts, note=f"Status: {status_str}", status="ok" if status_str in ("captured", "invoiced", "authorized") else "pending"),
    ]

    # load refunds
    ref_q = select(Refund).where(Refund.transaction_id == txn_id)
    ref_result = await db.execute(ref_q)
    refund_rows = ref_result.scalars().all()
    refund_summaries = [
        RefundSummary(id=r.id, amount=r.amount, status=r.status, reason=r.reason, created_at=r.created_at)
        for r in refund_rows
    ]

    return PaymentDetail(
        id=p.id,
        created_at=p.created_at,
        customer_name=p.customer_name,
        customer_id=p.customer_id,
        booking_ref=p.booking_ref,
        service=p.service,
        method=method_str,
        vpa=p.vpa,
        gross_amount=p.gross_amount,
        gateway_fee=p.gateway_fee,
        net_amount=p.net_amount,
        status=status_str,
        gateway_ref=p.gateway_ref,
        currency=p.currency,
        breakdown=breakdown,
        instrument=instrument,
        timeline=timeline,
        refunds=refund_summaries,
    )


# ── issue_refund ───────────────────────────────────────────────────────────────

async def issue_refund(db, txn_id: str, refund_req: RefundRequest) -> RefundResponse | None:
    q = select(Payment).where(Payment.id == txn_id)
    result = await db.execute(q)
    p: Payment | None = result.scalars().first()
    if not p:
        return None

    refund_amount = refund_req.amount if refund_req.refund_type == "partial" else p.net_amount
    if refund_amount is None:
        refund_amount = p.net_amount

    refund_id = f"REF-{uuid.uuid4().hex[:8].upper()}"
    now = _now()

    refund = Refund(
        id=refund_id,
        transaction_id=txn_id,
        amount=refund_amount,
        refund_type=refund_req.refund_type,
        reason=refund_req.reason,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    db.add(refund)

    # update payment status
    new_status = PaymentStatus.refunded if refund_req.refund_type == "full" else PaymentStatus.part_refund
    p.status = new_status
    p.updated_at = now

    await db.commit()
    await db.refresh(refund)

    return RefundResponse(
        refund_id=refund_id,
        transaction_id=txn_id,
        amount=refund_amount,
        status="pending",
        message="Refund initiated successfully",
        created_at=now,
    )


# ── get_reconciliation_summary ─────────────────────────────────────────────────

async def get_reconciliation_summary(db) -> ReconciliationSummaryResponse:
    q = select(ReconciliationBatch)
    result = await db.execute(q)
    batches = result.scalars().all()

    gateways: list[GatewaySummary] = []
    total_variance = 0
    unmatched_count = 0

    for b in batches:
        variance = int(b.amount) - int(b.amount * b.matched_count // max(b.transaction_count, 1))
        match_pct = round(b.matched_count / max(b.transaction_count, 1) * 100, 1)
        gateways.append(GatewaySummary(
            name=b.gateway,
            ref=b.id,
            expected_amount=int(b.amount),
            settled_amount=int(b.amount),
            variance=0 if b.status == "matched" else variance,
            match_pct=match_pct,
            status=b.status,
        ))
        if b.status != "matched":
            total_variance += abs(variance)
            unmatched_count += (b.transaction_count - b.matched_count)

    # unmatched items count
    um_q = select(func.count()).select_from(ReconciliationUnmatched)
    um_result = await db.execute(um_q)
    um_count = um_result.scalar() or 0
    if um_count > 0:
        unmatched_count = um_count

    cycle_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return ReconciliationSummaryResponse(
        cycle_date=cycle_date,
        total_variance=total_variance,
        unmatched_count=unmatched_count,
        gateways=gateways,
    )


# ── list_settlement_batches ────────────────────────────────────────────────────

async def list_settlement_batches(db, page: int = 1, page_size: int = 25, hours: int = 48) -> BatchListResponse:
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    q = select(ReconciliationBatch).where(ReconciliationBatch.settlement_date >= cutoff)

    count_q = select(func.count()).select_from(q.subquery())
    count_result = await db.execute(count_q)
    total = count_result.scalar() or 0

    q = q.order_by(ReconciliationBatch.settlement_date.desc()).offset((page - 1) * page_size).limit(page_size)
    rows_result = await db.execute(q)
    rows = rows_result.scalars().all()

    return BatchListResponse(
        items=[
            BatchItem(
                id=b.id,
                gateway=b.gateway,
                settlement_date=b.settlement_date,
                transaction_count=b.transaction_count,
                amount=int(b.amount),
                matched_count=b.matched_count,
                status=b.status,
            )
            for b in rows
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── list_unmatched_items ───────────────────────────────────────────────────────

async def list_unmatched_items(db) -> UnmatchedResponse:
    q = select(ReconciliationUnmatched).order_by(ReconciliationUnmatched.id)
    result = await db.execute(q)
    rows = result.scalars().all()

    return UnmatchedResponse(
        items=[
            UnmatchedItem(
                category=r.category,
                count=r.count,
                count_label=r.count_label,
                amount=int(r.amount),
                note=r.note,
                tone=r.tone,
            )
            for r in rows
        ]
    )


# ── search_booking ────────────────────────────────────────────────────────────

async def search_booking(db, booking_ref: str) -> BookingSearchResult | None:
    """Look up a booking by ref and return the fields needed for manual entry."""
    q = select(RoadBooking).where(RoadBooking.booking_ref == booking_ref.strip().upper())
    result = await db.execute(q)
    booking: RoadBooking | None = result.scalars().first()
    if not booking:
        return None

    # Resolve customer name
    customer_name = ""
    if booking.customer_id:
        cq = select(Customer).where(Customer.id == booking.customer_id)
        cr = await db.execute(cq)
        customer: Customer | None = cr.scalars().first()
        if customer:
            customer_name = customer.name

    # Use final fare if available, else estimate; model stores minor units (paise) if > 10000 else rupees
    raw_fare = booking.fare_final_minor or booking.fare_estimate_minor or 0
    # Detect if stored in paise (values > 100000 are almost certainly paise)
    gross_rupees = raw_fare // 100 if raw_fare > 100000 else raw_fare

    service = booking.vehicle_class or booking.service_type or ""

    return BookingSearchResult(
        booking_ref=booking.booking_ref,
        customer_id=booking.customer_id or "",
        customer_name=customer_name,
        service=service,
        gross_amount=gross_rupees,
    )


# ── create_manual_entry ────────────────────────────────────────────────────────

async def create_manual_entry(db, req: ManualEntryRequest) -> ManualEntryResponse:
    txn_id = f"MAN-{uuid.uuid4().hex[:8].upper()}"
    now = _now()

    # validate / coerce method enum
    try:
        method_enum = PaymentMethod(req.method.lower())
    except ValueError:
        method_enum = PaymentMethod.cash

    payment = Payment(
        id=txn_id,
        customer_id=req.customer_id,
        customer_name=req.customer_name,
        booking_ref=req.booking_ref,
        service=req.service,
        method=method_enum,
        vpa=req.vpa,
        gross_amount=req.gross_amount,
        gateway_fee=req.gateway_fee,
        net_amount=req.net_amount,
        status=PaymentStatus(req.status) if req.status in [s.value for s in PaymentStatus] else PaymentStatus.captured,
        gateway_ref=req.gateway_ref,
        currency=req.currency,
        created_at=now,
        updated_at=now,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return ManualEntryResponse(
        id=txn_id,
        message="Manual entry created successfully",
        created_at=now,
    )


# ── rerun_match ────────────────────────────────────────────────────────────────

async def rerun_match(db) -> RerunMatchResponse:
    """Re-run reconciliation matching: set all pending batches to matched if
    their matched_count equals transaction_count, otherwise leave as variance."""
    q = select(ReconciliationBatch)
    result = await db.execute(q)
    batches = result.scalars().all()

    matched = 0
    unmatched = 0
    now = _now()

    for b in batches:
        if b.matched_count >= b.transaction_count:
            b.status = "matched"
            matched += 1
        else:
            b.status = "variance"
            unmatched += 1
        b.updated_at = now

    await db.commit()

    return RerunMatchResponse(
        message=f"Match re-run complete. {matched} matched, {unmatched} with variance.",
        matched_count=matched,
        unmatched_count=unmatched,
    )


# ── resolve_all_unmatched ──────────────────────────────────────────────────────

async def resolve_all_unmatched(db) -> ResolveAllResponse:
    """Mark all unmatched items as resolved (delete from queue) and
    update related batches to matched."""
    count_q = select(func.count()).select_from(ReconciliationUnmatched)
    count_result = await db.execute(count_q)
    resolved_count = count_result.scalar() or 0

    # delete all unmatched records
    from sqlalchemy import delete as sa_delete
    await db.execute(sa_delete(ReconciliationUnmatched))

    # update all variance batches to matched
    q = select(ReconciliationBatch).where(ReconciliationBatch.status != "matched")
    result = await db.execute(q)
    batches = result.scalars().all()
    now = _now()
    for b in batches:
        b.status = "matched"
        b.matched_count = b.transaction_count
        b.updated_at = now

    await db.commit()

    return ResolveAllResponse(
        message=f"All {resolved_count} unmatched items resolved.",
        resolved_count=resolved_count,
    )

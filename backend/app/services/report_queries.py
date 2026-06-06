"""
Actual data queries for the 6 standard report templates.

Each function accepts a date range and optional filters, queries the
transactional DB directly (read-optimised — add a read replica in production),
and returns a dict with:
  - columns: list of column names
  - rows:    list of row dicts
  - summary: top-level KPI dict
  - generated_at: ISO timestamp
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.air_booking import AirBooking
from app.models.booking import RoadBooking
from app.models.driver import Driver, DriverWalletTransaction
from app.models.payment import Payment, ReconciliationBatch, ReconciliationUnmatched
from app.models.payout import PayoutPayee, PayoutRun
from app.models.promotion import CouponRedemption, Promotion
from app.models.pricing import TaxRule


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _minor_to_major(minor: int | None) -> float:
    """Convert paise / minor units to rupees / major units."""
    return round((minor or 0) / 100, 2)


# ── 1. Revenue & Operations ───────────────────────────────────────────────────

async def revenue_and_operations(
    db: AsyncSession,
    date_from: datetime,
    date_to: datetime,
    service_type: str | None = None,
    zone_name: str | None = None,
) -> dict[str, Any]:
    """
    GBV, net revenue, platform commission, take-rate and cancellation metrics,
    broken down by service type and zone.
    """
    COMMISSION_PCT = 0.20  # platform's 20% default; replace with settings lookup if stored

    # ── Road bookings ─────────────────────────────────────────────────────────
    road_q = select(
        RoadBooking.service_type,
        RoadBooking.zone_name,
        func.count(RoadBooking.id).label("total"),
        func.sum(case((RoadBooking.status == "Completed", 1), else_=0)).label("completed"),
        func.sum(case((RoadBooking.status.in_(["Cancelled", "CancelledByCustomer",
                                                "CancelledByDriver", "CancelledBySystem"]),
                       1), else_=0)).label("cancelled"),
        func.sum(case((RoadBooking.status == "Completed",
                       func.coalesce(RoadBooking.fare_final_minor,
                                     RoadBooking.fare_estimate_minor)),
                      else_=0)).label("gbv_minor"),
        func.sum(case((RoadBooking.status == "Completed",
                       RoadBooking.promo_discount_minor), else_=0)).label("promo_disc_minor"),
        func.avg(case((RoadBooking.status == "Completed",
                       RoadBooking.distance_km), else_=None)).label("avg_km"),
        func.avg(case((RoadBooking.status == "Completed",
                       RoadBooking.duration_min), else_=None)).label("avg_min"),
    ).where(
        RoadBooking.created_at >= date_from,
        RoadBooking.created_at <= date_to,
    )
    if service_type:
        road_q = road_q.where(RoadBooking.service_type == service_type)
    if zone_name:
        road_q = road_q.where(RoadBooking.zone_name == zone_name)
    road_q = road_q.group_by(RoadBooking.service_type, RoadBooking.zone_name)

    road_rows = (await db.execute(road_q)).mappings().all()

    # ── Air bookings ─────────────────────────────────────────────────────────
    air_q = select(
        AirBooking.service_subtype.label("service_type"),
        func.count(AirBooking.id).label("total"),
        func.sum(case((AirBooking.status == "Completed", 1), else_=0)).label("completed"),
        func.sum(case((AirBooking.status.in_(["CancelledByCustomer", "CancelledByOperator",
                                              "CancelledByAdmin"]), 1), else_=0)).label("cancelled"),
        func.sum(case((AirBooking.status == "Completed",
                       AirBooking.fare_final_minor), else_=0)).label("gbv_minor"),
    ).where(
        AirBooking.created_at >= date_from,
        AirBooking.created_at <= date_to,
    ).group_by(AirBooking.service_subtype)

    air_rows = (await db.execute(air_q)).mappings().all()

    rows: list[dict] = []
    summary_gbv = 0
    summary_completed = 0
    summary_cancelled = 0
    summary_total = 0

    for r in road_rows:
        gbv = r["gbv_minor"] or 0
        promo = r["promo_disc_minor"] or 0
        net = gbv - promo
        commission = round(net * COMMISSION_PCT)
        rows.append({
            "service_type": r["service_type"] or "—",
            "zone": r["zone_name"] or "—",
            "channel": "Road",
            "total_bookings": r["total"],
            "completed": r["completed"],
            "cancelled": r["cancelled"],
            "completion_rate_pct": round(r["completed"] / r["total"] * 100, 1) if r["total"] else 0,
            "cancellation_rate_pct": round(r["cancelled"] / r["total"] * 100, 1) if r["total"] else 0,
            "gbv": _minor_to_major(gbv),
            "promo_discounts": _minor_to_major(promo),
            "net_revenue": _minor_to_major(net),
            "platform_commission": _minor_to_major(commission),
            "take_rate_pct": round(commission / net * 100, 1) if net else 0,
            "avg_km": round(float(r["avg_km"] or 0), 2),
            "avg_min": round(float(r["avg_min"] or 0), 1),
        })
        summary_gbv += gbv
        summary_completed += r["completed"]
        summary_cancelled += r["cancelled"]
        summary_total += r["total"]

    for r in air_rows:
        gbv = r["gbv_minor"] or 0
        net = gbv
        commission = round(net * COMMISSION_PCT)
        rows.append({
            "service_type": r["service_type"] or "—",
            "zone": "—",
            "channel": "Air",
            "total_bookings": r["total"],
            "completed": r["completed"],
            "cancelled": r["cancelled"],
            "completion_rate_pct": round(r["completed"] / r["total"] * 100, 1) if r["total"] else 0,
            "cancellation_rate_pct": round(r["cancelled"] / r["total"] * 100, 1) if r["total"] else 0,
            "gbv": _minor_to_major(gbv),
            "promo_discounts": 0.0,
            "net_revenue": _minor_to_major(net),
            "platform_commission": _minor_to_major(commission),
            "take_rate_pct": round(commission / net * 100, 1) if net else 0,
            "avg_km": 0.0,
            "avg_min": 0.0,
        })
        summary_gbv += gbv
        summary_completed += r["completed"]
        summary_cancelled += r["cancelled"]
        summary_total += r["total"]

    net_total = summary_gbv
    commission_total = round(net_total * COMMISSION_PCT)

    return {
        "report": "Revenue & Operations",
        "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "generated_at": _now(),
        "columns": [
            "service_type", "zone", "channel", "total_bookings",
            "completed", "cancelled", "completion_rate_pct", "cancellation_rate_pct",
            "gbv", "promo_discounts", "net_revenue", "platform_commission", "take_rate_pct",
            "avg_km", "avg_min",
        ],
        "rows": rows,
        "summary": {
            "total_bookings": summary_total,
            "completed": summary_completed,
            "cancelled": summary_cancelled,
            "completion_rate_pct": round(summary_completed / summary_total * 100, 1) if summary_total else 0,
            "gbv": _minor_to_major(summary_gbv),
            "net_revenue": _minor_to_major(net_total),
            "platform_commission": _minor_to_major(commission_total),
            "take_rate_pct": round(commission_total / net_total * 100, 1) if net_total else 0,
        },
    }


# ── 2. GST Filing · GSTR-1 ───────────────────────────────────────────────────

async def gst_filing_gstr1(
    db: AsyncSession,
    date_from: datetime,
    date_to: datetime,
) -> dict[str, Any]:
    """
    Outward supplies formatted for GSTR-1 filing.
    Groups by HSN code, tax jurisdiction, and service type.
    Computes CGST / SGST (intra-state) and IGST (inter-state) split.
    """
    # Fetch active tax rules to get HSN codes and rates
    tax_rules = (await db.execute(
        select(TaxRule).where(TaxRule.active == True)  # noqa: E712
    )).scalars().all()

    # Build a default rate mapping — use the first rule per jurisdiction as proxy
    default_rate = 5.0  # GST 5% on transportation services (Schedule entry)
    if tax_rules:
        default_rate = float(tax_rules[0].rate)

    # Aggregate road bookings by zone (jurisdiction) and service type
    road_q = select(
        RoadBooking.zone_name.label("jurisdiction"),
        RoadBooking.service_type,
        func.count(RoadBooking.id).label("invoice_count"),
        func.sum(
            func.coalesce(RoadBooking.fare_final_minor, RoadBooking.fare_estimate_minor)
        ).label("taxable_value_minor"),
    ).where(
        RoadBooking.status == "Completed",
        RoadBooking.created_at >= date_from,
        RoadBooking.created_at <= date_to,
    ).group_by(RoadBooking.zone_name, RoadBooking.service_type)

    road_rows = (await db.execute(road_q)).mappings().all()

    # Air bookings
    air_q = select(
        AirBooking.service_subtype.label("service_type"),
        func.count(AirBooking.id).label("invoice_count"),
        func.sum(AirBooking.fare_final_minor).label("taxable_value_minor"),
    ).where(
        AirBooking.status == "Completed",
        AirBooking.created_at >= date_from,
        AirBooking.created_at <= date_to,
    ).group_by(AirBooking.service_subtype)

    air_rows = (await db.execute(air_q)).mappings().all()

    rows: list[dict] = []
    total_taxable = 0
    total_cgst = 0
    total_sgst = 0
    total_igst = 0

    # Tax rule: transportation by app → HSN 9964, 5% GST
    # Intra-state: 2.5% CGST + 2.5% SGST; Inter-state: 5% IGST
    hsn = tax_rules[0].hsn_code if tax_rules else "9964"
    rate = default_rate
    half = rate / 2

    for r in road_rows:
        tv = r["taxable_value_minor"] or 0
        # Assume intra-state for road (same state jurisdiction)
        cgst = round(tv * half / 100)
        sgst = round(tv * half / 100)
        igst = 0
        rows.append({
            "jurisdiction": r["jurisdiction"] or "Unknown",
            "service_type": r["service_type"],
            "channel": "Road",
            "hsn_code": hsn,
            "gst_rate_pct": rate,
            "invoice_count": r["invoice_count"],
            "taxable_value": _minor_to_major(tv),
            "cgst": _minor_to_major(cgst),
            "sgst": _minor_to_major(sgst),
            "igst": _minor_to_major(igst),
            "total_tax": _minor_to_major(cgst + sgst + igst),
        })
        total_taxable += tv
        total_cgst += cgst
        total_sgst += sgst

    for r in air_rows:
        tv = r["taxable_value_minor"] or 0
        # Air transport: 18% GST typically; use IGST as inter-state
        air_rate = 18.0
        igst = round(tv * air_rate / 100)
        rows.append({
            "jurisdiction": "All India",
            "service_type": r["service_type"],
            "channel": "Air",
            "hsn_code": "9964",
            "gst_rate_pct": air_rate,
            "invoice_count": r["invoice_count"],
            "taxable_value": _minor_to_major(tv),
            "cgst": 0.0,
            "sgst": 0.0,
            "igst": _minor_to_major(igst),
            "total_tax": _minor_to_major(igst),
        })
        total_taxable += tv
        total_igst += igst

    return {
        "report": "GST Filing · GSTR-1",
        "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "generated_at": _now(),
        "filing_note": (
            "Verify with your CA before filing. HSN 9964 applies to radio-taxi / "
            "transportation services. Air transport may attract 18% GST."
        ),
        "columns": [
            "jurisdiction", "service_type", "channel", "hsn_code",
            "gst_rate_pct", "invoice_count", "taxable_value",
            "cgst", "sgst", "igst", "total_tax",
        ],
        "rows": rows,
        "summary": {
            "total_invoices": sum(r["invoice_count"] for r in rows),
            "total_taxable_value": _minor_to_major(total_taxable),
            "total_cgst": _minor_to_major(total_cgst),
            "total_sgst": _minor_to_major(total_sgst),
            "total_igst": _minor_to_major(total_igst),
            "total_tax": _minor_to_major(total_cgst + total_sgst + total_igst),
        },
    }


# ── 3. Driver Payout Summary ──────────────────────────────────────────────────

async def driver_payout_summary(
    db: AsyncSession,
    date_from: datetime,
    date_to: datetime,
    driver_id: str | None = None,
) -> dict[str, Any]:
    """
    Earnings, deductions, holds, and net payout per driver for the period.
    Pulls from payout_payees joined with payout_runs.
    """
    q = select(
        PayoutPayee.entity_id,
        PayoutPayee.entity_name,
        PayoutPayee.entity_ref,
        PayoutPayee.entity_type,
        func.sum(PayoutPayee.trip_count).label("total_trips"),
        func.sum(PayoutPayee.gross_amount).label("gross"),
        func.sum(PayoutPayee.incentive_amount).label("incentives"),
        func.sum(PayoutPayee.deduction_amount).label("deductions"),
        func.sum(PayoutPayee.hold_amount).label("holds"),
        func.sum(PayoutPayee.net_amount).label("net"),
        func.count(PayoutPayee.id).label("run_count"),
        func.max(PayoutPayee.paid_at).label("last_paid_at"),
    ).join(
        PayoutRun, PayoutPayee.run_id == PayoutRun.id
    ).where(
        PayoutRun.period_start >= date_from,
        PayoutRun.period_end <= date_to,
        PayoutPayee.entity_type == "driver",
    )
    if driver_id:
        q = q.where(PayoutPayee.entity_id == driver_id)

    q = q.group_by(
        PayoutPayee.entity_id,
        PayoutPayee.entity_name,
        PayoutPayee.entity_ref,
        PayoutPayee.entity_type,
    ).order_by(func.sum(PayoutPayee.net_amount).desc())

    payout_rows = (await db.execute(q)).mappings().all()

    # Also pull wallet adjustment transactions for the same period for completeness
    wallet_q = select(
        DriverWalletTransaction.driver_id,
        func.sum(case(
            (DriverWalletTransaction.direction == "credit", DriverWalletTransaction.amount_minor),
            else_=0
        )).label("wallet_credits"),
        func.sum(case(
            (DriverWalletTransaction.direction == "debit", DriverWalletTransaction.amount_minor),
            else_=0
        )).label("wallet_debits"),
    ).where(
        DriverWalletTransaction.created_at >= date_from,
        DriverWalletTransaction.created_at <= date_to,
    ).group_by(DriverWalletTransaction.driver_id)

    wallet_data = {r["driver_id"]: r for r in (await db.execute(wallet_q)).mappings().all()}

    rows = []
    total_gross = 0
    total_incentives = 0
    total_deductions = 0
    total_holds = 0
    total_net = 0

    for r in payout_rows:
        wallet = wallet_data.get(r["entity_id"], {})
        net = float(r["net"] or 0)
        gross = float(r["gross"] or 0)
        deductions = float(r["deductions"] or 0)
        holds = float(r["holds"] or 0)
        incentives = float(r["incentives"] or 0)

        rows.append({
            "driver_id": r["entity_id"],
            "driver_name": r["entity_name"],
            "driver_ref": r["entity_ref"] or "—",
            "total_trips": int(r["total_trips"] or 0),
            "payout_runs": int(r["run_count"]),
            "gross_earnings": round(gross, 2),
            "incentives": round(incentives, 2),
            "deductions": round(deductions, 2),
            "holds": round(holds, 2),
            "net_payout": round(net, 2),
            "wallet_credits": _minor_to_major(wallet.get("wallet_credits") or 0),
            "wallet_debits": _minor_to_major(wallet.get("wallet_debits") or 0),
            "last_paid_at": r["last_paid_at"].isoformat() if r["last_paid_at"] else "—",
        })
        total_gross += gross
        total_incentives += incentives
        total_deductions += deductions
        total_holds += holds
        total_net += net

    return {
        "report": "Driver Payout Summary",
        "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "generated_at": _now(),
        "columns": [
            "driver_ref", "driver_name", "total_trips", "payout_runs",
            "gross_earnings", "incentives", "deductions", "holds", "net_payout",
            "wallet_credits", "wallet_debits", "last_paid_at",
        ],
        "rows": rows,
        "summary": {
            "driver_count": len(rows),
            "total_gross": round(total_gross, 2),
            "total_incentives": round(total_incentives, 2),
            "total_deductions": round(total_deductions, 2),
            "total_holds": round(total_holds, 2),
            "total_net": round(total_net, 2),
        },
    }


# ── 4. Settlement & Reconciliation ───────────────────────────────────────────

async def settlement_reconciliation(
    db: AsyncSession,
    date_from: datetime,
    date_to: datetime,
) -> dict[str, Any]:
    """
    Gateway-wise: expected settlements vs actual matched amount.
    Flags mismatches and unmatched items.
    """
    # Reconciliation batches from the gateway import
    batches_q = select(
        ReconciliationBatch.gateway,
        func.count(ReconciliationBatch.id).label("batch_count"),
        func.sum(ReconciliationBatch.transaction_count).label("txn_count"),
        func.sum(ReconciliationBatch.amount).label("settled_amount"),
        func.sum(ReconciliationBatch.matched_count).label("matched_count"),
        func.min(ReconciliationBatch.settlement_date).label("earliest"),
        func.max(ReconciliationBatch.settlement_date).label("latest"),
    ).where(
        ReconciliationBatch.settlement_date >= date_from,
        ReconciliationBatch.settlement_date <= date_to,
    ).group_by(ReconciliationBatch.gateway)

    batch_rows = (await db.execute(batches_q)).mappings().all()

    # Platform-side: what we expected to receive (captured payments in period)
    expected_q = select(
        Payment.method.label("gateway"),
        func.count(Payment.id).label("txn_count"),
        func.sum(Payment.net_amount).label("expected_amount"),
    ).where(
        Payment.status == "captured",
        Payment.created_at >= date_from,
        Payment.created_at <= date_to,
    ).group_by(Payment.method)

    expected_rows = {r["gateway"]: r for r in (await db.execute(expected_q)).mappings().all()}

    # Unmatched items
    unmatched_q = select(
        ReconciliationUnmatched.category,
        func.sum(ReconciliationUnmatched.count).label("count"),
        func.sum(ReconciliationUnmatched.amount).label("amount"),
    ).where(
        or_(
            ReconciliationUnmatched.cycle_date >= date_from.date(),
            ReconciliationUnmatched.cycle_date.is_(None)
        )
    ).group_by(ReconciliationUnmatched.category)

    unmatched_rows = (await db.execute(unmatched_q)).mappings().all()

    rows = []
    total_expected = 0
    total_settled = 0

    for r in batch_rows:
        gateway = r["gateway"]
        settled = int(r["settled_amount"] or 0)
        exp_row = expected_rows.get(gateway, {})
        expected = int(exp_row.get("expected_amount") or 0)
        diff = settled - expected
        match_rate = round(int(r["matched_count"] or 0) / int(r["txn_count"] or 1) * 100, 1)

        rows.append({
            "gateway": gateway,
            "batch_count": int(r["batch_count"]),
            "transaction_count": int(r["txn_count"] or 0),
            "expected_amount": _minor_to_major(expected),
            "settled_amount": _minor_to_major(settled),
            "difference": _minor_to_major(diff),
            "match_rate_pct": match_rate,
            "status": "matched" if abs(diff) < 100 else ("over" if diff > 0 else "under"),
            "period_from": r["earliest"].isoformat() if r["earliest"] else "—",
            "period_to": r["latest"].isoformat() if r["latest"] else "—",
        })
        total_expected += expected
        total_settled += settled

    return {
        "report": "Settlement & Reconciliation",
        "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "generated_at": _now(),
        "columns": [
            "gateway", "batch_count", "transaction_count",
            "expected_amount", "settled_amount", "difference",
            "match_rate_pct", "status", "period_from", "period_to",
        ],
        "rows": rows,
        "unmatched": [
            {
                "category": u["category"],
                "count": int(u["count"] or 0),
                "amount": _minor_to_major(int(u["amount"] or 0)),
            }
            for u in unmatched_rows
        ],
        "summary": {
            "gateways": len(rows),
            "total_expected": _minor_to_major(total_expected),
            "total_settled": _minor_to_major(total_settled),
            "total_difference": _minor_to_major(total_settled - total_expected),
            "fully_matched": sum(1 for r in rows if r["status"] == "matched"),
        },
    }


# ── 5. Trip & Demand Analytics ───────────────────────────────────────────────

async def trip_and_demand_analytics(
    db: AsyncSession,
    date_from: datetime,
    date_to: datetime,
    zone_name: str | None = None,
    service_type: str | None = None,
) -> dict[str, Any]:
    """
    Trip counts, cancellation %, average ETA / distance / duration,
    surge utilisation — by day and by zone.
    """
    # Daily rollup — road
    day_q = select(
        func.date(RoadBooking.created_at).label("date"),
        RoadBooking.service_type,
        RoadBooking.zone_name,
        func.count(RoadBooking.id).label("total"),
        func.sum(case((RoadBooking.status == "Completed", 1), else_=0)).label("completed"),
        func.sum(case((RoadBooking.status.in_(["Cancelled", "CancelledByCustomer",
                                               "CancelledByDriver", "CancelledBySystem"]),
                       1), else_=0)).label("cancelled"),
        func.avg(case((RoadBooking.status == "Completed",
                       RoadBooking.distance_km), else_=None)).label("avg_km"),
        func.avg(case((RoadBooking.status == "Completed",
                       RoadBooking.duration_min), else_=None)).label("avg_min"),
        func.avg(case((RoadBooking.surge_multiplier > 1.0,
                       RoadBooking.surge_multiplier), else_=None)).label("avg_surge"),
        func.sum(case((RoadBooking.surge_multiplier > 1.0, 1), else_=0)).label("surged_trips"),
        func.sum(case((RoadBooking.scheduled_at.is_not(None), 1), else_=0)).label("scheduled"),
    ).where(
        RoadBooking.created_at >= date_from,
        RoadBooking.created_at <= date_to,
    )
    if zone_name:
        day_q = day_q.where(RoadBooking.zone_name == zone_name)
    if service_type:
        day_q = day_q.where(RoadBooking.service_type == service_type)

    day_q = day_q.group_by(
        func.date(RoadBooking.created_at),
        RoadBooking.service_type,
        RoadBooking.zone_name,
    ).order_by(func.date(RoadBooking.created_at))

    day_rows = (await db.execute(day_q)).mappings().all()

    # Air bookings daily
    air_day_q = select(
        func.date(AirBooking.created_at).label("date"),
        AirBooking.service_subtype.label("service_type"),
        func.count(AirBooking.id).label("total"),
        func.sum(case((AirBooking.status == "Completed", 1), else_=0)).label("completed"),
        func.sum(case((AirBooking.status.in_(["CancelledByCustomer", "CancelledByOperator",
                                              "CancelledByAdmin"]), 1), else_=0)).label("cancelled"),
        func.avg(AirBooking.pax_count).label("avg_pax"),
    ).where(
        AirBooking.created_at >= date_from,
        AirBooking.created_at <= date_to,
    ).group_by(func.date(AirBooking.created_at), AirBooking.service_subtype)

    air_day_rows = (await db.execute(air_day_q)).mappings().all()

    rows = []
    total_trips = 0
    total_completed = 0
    total_cancelled = 0

    for r in day_rows:
        tot = int(r["total"])
        comp = int(r["completed"])
        canc = int(r["cancelled"])
        rows.append({
            "date": str(r["date"]),
            "service_type": r["service_type"],
            "zone": r["zone_name"] or "—",
            "channel": "Road",
            "total_bookings": tot,
            "completed": comp,
            "cancelled": canc,
            "completion_rate_pct": round(comp / tot * 100, 1) if tot else 0,
            "cancellation_rate_pct": round(canc / tot * 100, 1) if tot else 0,
            "avg_distance_km": round(float(r["avg_km"] or 0), 2),
            "avg_duration_min": round(float(r["avg_min"] or 0), 1),
            "avg_surge": round(float(r["avg_surge"] or 1.0), 2),
            "surged_trips": int(r["surged_trips"]),
            "scheduled_rides": int(r["scheduled"]),
        })
        total_trips += tot
        total_completed += comp
        total_cancelled += canc

    for r in air_day_rows:
        tot = int(r["total"])
        comp = int(r["completed"])
        canc = int(r["cancelled"])
        rows.append({
            "date": str(r["date"]),
            "service_type": r["service_type"],
            "zone": "Air",
            "channel": "Air",
            "total_bookings": tot,
            "completed": comp,
            "cancelled": canc,
            "completion_rate_pct": round(comp / tot * 100, 1) if tot else 0,
            "cancellation_rate_pct": round(canc / tot * 100, 1) if tot else 0,
            "avg_distance_km": 0.0,
            "avg_duration_min": 0.0,
            "avg_surge": 1.0,
            "surged_trips": 0,
            "scheduled_rides": 0,
        })
        total_trips += tot
        total_completed += comp
        total_cancelled += canc

    return {
        "report": "Trip & Demand Analytics",
        "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "generated_at": _now(),
        "columns": [
            "date", "service_type", "zone", "channel",
            "total_bookings", "completed", "cancelled",
            "completion_rate_pct", "cancellation_rate_pct",
            "avg_distance_km", "avg_duration_min",
            "avg_surge", "surged_trips", "scheduled_rides",
        ],
        "rows": rows,
        "summary": {
            "total_bookings": total_trips,
            "completed": total_completed,
            "cancelled": total_cancelled,
            "completion_rate_pct": round(total_completed / total_trips * 100, 1) if total_trips else 0,
            "cancellation_rate_pct": round(total_cancelled / total_trips * 100, 1) if total_trips else 0,
        },
    }


# ── 6. Promotion ROI ─────────────────────────────────────────────────────────

async def promotion_roi(
    db: AsyncSession,
    date_from: datetime,
    date_to: datetime,
) -> dict[str, Any]:
    """
    Per-promotion: redemption count, total discount spent,
    budget utilisation, and cost-per-acquisition (CPA).
    """
    promo_q = select(
        Promotion.id,
        Promotion.code,
        Promotion.type,
        Promotion.value,
        Promotion.cap_minor,
        Promotion.total_budget_minor,
        Promotion.budget_spent_minor,
        Promotion.redemption_count,
        Promotion.status,
        Promotion.validity_from,
        Promotion.validity_to,
        Promotion.new_customers_only,
        Promotion.segment,
    ).where(
        or_(
            and_(Promotion.validity_from >= date_from, Promotion.validity_from <= date_to),
            and_(Promotion.validity_to >= date_from, Promotion.validity_to <= date_to),
        )
    ).order_by(Promotion.budget_spent_minor.desc())

    promos = (await db.execute(promo_q)).mappings().all()

    # Redemptions in the specific date window
    redemption_q = select(
        CouponRedemption.promotion_id,
        func.count(CouponRedemption.id).label("period_redemptions"),
        func.sum(CouponRedemption.discount_minor).label("period_discount"),
    ).where(
        CouponRedemption.redeemed_at >= date_from,
        CouponRedemption.redeemed_at <= date_to,
    ).group_by(CouponRedemption.promotion_id)

    redemption_data = {
        r["promotion_id"]: r
        for r in (await db.execute(redemption_q)).mappings().all()
    }

    rows = []
    total_budget = 0
    total_spent = 0
    total_redemptions = 0

    for p in promos:
        promo_id = p["id"]
        budget = int(p["total_budget_minor"] or 0)
        spent = int(p["budget_spent_minor"] or 0)
        redemptions = int(p["redemption_count"] or 0)
        rd = redemption_data.get(promo_id, {})
        period_red = int(rd.get("period_redemptions") or 0)
        period_disc = int(rd.get("period_discount") or 0)
        cpa = round(_minor_to_major(period_disc) / period_red, 2) if period_red else 0

        budget_util = round(spent / budget * 100, 1) if budget else 0

        rows.append({
            "promo_code": p["code"],
            "type": p["type"],
            "value": p["value"],
            "cap": _minor_to_major(p["cap_minor"]) if p["cap_minor"] else None,
            "segment": p["segment"] or "All",
            "new_customers_only": bool(p["new_customers_only"]),
            "status": p["status"],
            "validity_from": p["validity_from"].isoformat() if p["validity_from"] else "—",
            "validity_to": p["validity_to"].isoformat() if p["validity_to"] else "—",
            "total_redemptions": redemptions,
            "period_redemptions": period_red,
            "total_budget": _minor_to_major(budget),
            "total_spent": _minor_to_major(spent),
            "period_discount_given": _minor_to_major(period_disc),
            "budget_utilisation_pct": budget_util,
            "cpa": cpa,
        })
        total_budget += budget
        total_spent += spent
        total_redemptions += period_red

    return {
        "report": "Promotion ROI",
        "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "generated_at": _now(),
        "columns": [
            "promo_code", "type", "value", "cap", "segment",
            "new_customers_only", "status", "validity_from", "validity_to",
            "total_redemptions", "period_redemptions",
            "total_budget", "total_spent", "period_discount_given",
            "budget_utilisation_pct", "cpa",
        ],
        "rows": rows,
        "summary": {
            "active_promotions": sum(1 for r in rows if r["status"] == "active"),
            "total_promotions": len(rows),
            "total_budget_allocated": _minor_to_major(total_budget),
            "total_budget_spent": _minor_to_major(total_spent),
            "period_redemptions": total_redemptions,
            "overall_budget_utilisation_pct": round(total_spent / total_budget * 100, 1) if total_budget else 0,
        },
    }


# ── Dispatch table ────────────────────────────────────────────────────────────

REPORT_DISPATCH: dict[str, Any] = {
    "Revenue & operations": revenue_and_operations,
    "GST filing · GSTR-1": gst_filing_gstr1,
    "Driver payout summary": driver_payout_summary,
    "Settlement & reconciliation": settlement_reconciliation,
    "Trip & demand analytics": trip_and_demand_analytics,
    "Promotion ROI": promotion_roi,
}


async def run_standard_report(
    db: AsyncSession,
    report_name: str,
    date_from: datetime,
    date_to: datetime,
    filters: dict | None = None,
) -> dict[str, Any]:
    """
    Entry point: look up the report by name and run it.
    Returns the full result dict (columns, rows, summary).
    Raises ValueError for unknown report names.
    """
    # Case-insensitive lookup
    fn = next(
        (v for k, v in REPORT_DISPATCH.items()
         if k.lower() == report_name.lower()),
        None,
    )
    if fn is None:
        raise ValueError(
            f"Unknown report '{report_name}'. "
            f"Available: {list(REPORT_DISPATCH.keys())}"
        )

    filters = filters or {}
    return await fn(db, date_from, date_to, **filters)

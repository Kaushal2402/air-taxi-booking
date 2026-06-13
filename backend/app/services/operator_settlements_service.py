from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime

from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.operator_settlements import (
    SettlementDetail,
    SettlementQuery,
    SettlementQueryOut,
    SettlementStatus,
    SettlementSummary,
    SettlementsKPI,
    SettlementsListResponse,
)

# payout_payees.status → SettlementStatus
_STATUS_MAP: dict[str, SettlementStatus] = {
    "pending": SettlementStatus.pending,
    "ready": SettlementStatus.processing,
    "hold": SettlementStatus.on_hold,
    "bank_fail": SettlementStatus.disputed,
    "paid": SettlementStatus.paid,
    "cancelled": SettlementStatus.cancelled,
}


def _map_status(raw: str) -> SettlementStatus:
    return _STATUS_MAP.get(raw, SettlementStatus.pending)


async def list_settlements(
    db: AsyncSession,
    operator_id: str,
) -> SettlementsListResponse:
    # ── Settlements list ────────────────────────────────────────────────────
    try:
        result = await db.execute(
            text(
                """
                SELECT
                    pp.id,
                    COALESCE(pr.period_label, CONCAT(DATE(pr.period_start), ' – ', DATE(pr.period_end))) AS period_label,
                    DATE(pr.period_start)   AS period_start,
                    DATE(pr.period_end)     AS period_end,
                    COALESCE(pp.gross_amount, 0.0)      AS gross_amount,
                    COALESCE(pp.deduction_amount, 0.0)  AS commission_amount,
                    0.0                                  AS deduction_amount,
                    COALESCE(pp.net_amount, 0.0)        AS net_amount,
                    pp.status,
                    pp.paid_at              AS payout_date,
                    pp.utr_number           AS payout_ref,
                    pp.created_at
                FROM payout_payees pp
                JOIN payout_runs pr ON pr.id = pp.run_id
                WHERE pp.entity_id   = :operator_id
                  AND pp.entity_type = 'operator'
                  AND pp.status      != 'cancelled'
                ORDER BY pr.period_start DESC
                """
            ),
            {"operator_id": operator_id},
        )
        rows = result.mappings().all()
    except Exception:
        rows = []

    settlements = [
        SettlementSummary(
            id=str(row["id"]),
            period_label=row["period_label"] or "",
            period_start=row["period_start"],
            period_end=row["period_end"],
            gross_amount=float(row["gross_amount"]),
            commission_amount=float(row["commission_amount"]),
            deduction_amount=float(row["deduction_amount"]),
            net_amount=float(row["net_amount"]),
            status=_map_status(row["status"]),
            payout_date=row["payout_date"],
            payout_ref=row["payout_ref"],
            created_at=row["created_at"],
        )
        for row in rows
    ]

    # ── KPI computation ─────────────────────────────────────────────────────
    try:
        kpi_result = await db.execute(
            text(
                """
                SELECT
                    SUM(CASE WHEN pp.status = 'paid'
                             THEN COALESCE(pp.net_amount, 0) ELSE 0 END)          AS total_earned,
                    SUM(CASE WHEN pp.status IN ('pending', 'ready')
                             THEN COALESCE(pp.net_amount, 0) ELSE 0 END)          AS pending_payout,
                    SUM(CASE WHEN pp.status IN ('hold', 'bank_fail')
                             THEN COALESCE(pp.net_amount, 0) ELSE 0 END)          AS disputed
                FROM payout_payees pp
                WHERE pp.entity_id   = :operator_id
                  AND pp.entity_type = 'operator'
                  AND pp.status      != 'cancelled'
                """
            ),
            {"operator_id": operator_id},
        )
        kpi_row = kpi_result.mappings().first()
    except Exception:
        kpi_row = None

    try:
        next_date_result = await db.execute(
            text(
                """
                SELECT MIN(pr.scheduled_at) AS next_payout_date
                FROM payout_runs pr
                JOIN payout_payees pp ON pp.run_id = pr.id
                WHERE pp.entity_id   = :operator_id
                  AND pp.entity_type = 'operator'
                  AND pr.status      IN ('approved', 'scheduled')
                  AND pr.scheduled_at > NOW()
                """
            ),
            {"operator_id": operator_id},
        )
        next_date_row = next_date_result.mappings().first()
    except Exception:
        next_date_row = None

    kpi = SettlementsKPI(
        total_earned=float(kpi_row["total_earned"] or 0) if kpi_row else 0.0,
        pending_payout=float(kpi_row["pending_payout"] or 0) if kpi_row else 0.0,
        disputed=float(kpi_row["disputed"] or 0) if kpi_row else 0.0,
        next_payout_date=next_date_row["next_payout_date"] if next_date_row else None,
    )

    return SettlementsListResponse(kpi=kpi, settlements=settlements)


async def get_settlement(
    db: AsyncSession,
    operator_id: str,
    settlement_id: str,
) -> SettlementDetail:
    # ── Header ──────────────────────────────────────────────────────────────
    try:
        result = await db.execute(
            text(
                """
                SELECT
                    pp.id,
                    COALESCE(pr.period_label, CONCAT(DATE(pr.period_start), ' – ', DATE(pr.period_end))) AS period_label,
                    DATE(pr.period_start)   AS period_start,
                    DATE(pr.period_end)     AS period_end,
                    COALESCE(pp.gross_amount, 0.0)      AS gross_amount,
                    COALESCE(pp.deduction_amount, 0.0)  AS commission_amount,
                    0.0                                  AS deduction_amount,
                    COALESCE(pp.net_amount, 0.0)        AS net_amount,
                    pp.status,
                    pp.paid_at              AS payout_date,
                    pp.utr_number           AS payout_ref,
                    pp.bank_account_ref,
                    pp.created_at
                FROM payout_payees pp
                JOIN payout_runs pr ON pr.id = pp.run_id
                WHERE pp.entity_id   = :operator_id
                  AND pp.entity_type = 'operator'
                  AND pp.id          = :settlement_id
                """
            ),
            {"operator_id": operator_id, "settlement_id": settlement_id},
        )
        row = result.mappings().first()
    except Exception:
        row = None

    if not row:
        raise HTTPException(status_code=404, detail="Settlement not found")

    # ── Line items from payout_adjustments ──────────────────────────────────
    try:
        adj_result = await db.execute(
            text(
                """
                SELECT
                    id,
                    payee_id AS flight_id,
                    COALESCE(reference, '') AS booking_ref,
                    description             AS route,
                    DATE(created_at)        AS flight_date,
                    CASE WHEN adjustment_type IN ('addition') THEN amount ELSE 0 END AS gross_amount,
                    0.0                                                               AS commission_amount,
                    CASE WHEN adjustment_type IN ('deduction','clawback','penalty')
                         THEN amount ELSE 0 END                                      AS deduction_amount,
                    CASE WHEN adjustment_type IN ('addition') THEN amount
                         ELSE -amount END                                             AS net_amount
                FROM payout_adjustments
                WHERE payee_id = :settlement_id
                ORDER BY created_at ASC
                """
            ),
            {"settlement_id": settlement_id},
        )
        adj_rows = adj_result.mappings().all()
    except Exception:
        adj_rows = []

    from app.schemas.operator_settlements import SettlementLineItem  # local import to avoid circular

    line_items = [
        SettlementLineItem(
            id=str(r["id"]),
            flight_id=str(r["flight_id"]),
            booking_ref=r["booking_ref"] or "",
            route=r["route"] or "",
            flight_date=r["flight_date"],
            gross_amount=float(r["gross_amount"] or 0),
            commission_amount=float(r["commission_amount"] or 0),
            deduction_amount=float(r["deduction_amount"] or 0),
            net_amount=float(r["net_amount"] or 0),
        )
        for r in adj_rows
    ]

    # Extract last-4 from masked bank reference (e.g. "XXXX1234" → "1234")
    bank_ref = row.get("bank_account_ref") or ""
    bank_last4 = bank_ref[-4:] if len(bank_ref) >= 4 else (bank_ref or None)

    return SettlementDetail(
        id=str(row["id"]),
        period_label=row["period_label"] or "",
        period_start=row["period_start"],
        period_end=row["period_end"],
        gross_amount=float(row["gross_amount"]),
        commission_amount=float(row["commission_amount"]),
        deduction_amount=float(row["deduction_amount"]),
        net_amount=float(row["net_amount"]),
        status=_map_status(row["status"]),
        payout_date=row["payout_date"],
        payout_ref=row["payout_ref"],
        bank_last4=bank_last4 or None,
        bank_account_name=None,
        created_at=row["created_at"],
        line_items=line_items,
        queries=[],
    )


async def export_settlement(
    db: AsyncSession,
    operator_id: str,
    settlement_id: str,
) -> StreamingResponse:
    detail = await get_settlement(db, operator_id, settlement_id)

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["Settlement Export"])
    writer.writerow(["Period", detail.period_label])
    writer.writerow(["Period Start", str(detail.period_start)])
    writer.writerow(["Period End", str(detail.period_end)])
    writer.writerow(["Gross", f"{detail.gross_amount:.2f}"])
    writer.writerow(["Commission", f"{detail.commission_amount:.2f}"])
    writer.writerow(["Other Deductions", f"{detail.deduction_amount:.2f}"])
    writer.writerow(["Net Payout", f"{detail.net_amount:.2f}"])
    writer.writerow(["Status", detail.status.value])
    writer.writerow(["Payout Ref", detail.payout_ref or ""])
    writer.writerow(["Payout Date", str(detail.payout_date) if detail.payout_date else ""])
    writer.writerow([])

    if detail.line_items:
        writer.writerow(["Flight Date", "Route", "Booking Ref", "Gross", "Commission", "Deduction", "Net"])
        for li in detail.line_items:
            writer.writerow([
                str(li.flight_date),
                li.route,
                li.booking_ref,
                f"{li.gross_amount:.2f}",
                f"{li.commission_amount:.2f}",
                f"{li.deduction_amount:.2f}",
                f"{li.net_amount:.2f}",
            ])

    output.seek(0)
    filename = f"settlement-{settlement_id[:8]}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def raise_query(
    db: AsyncSession,
    operator_id: str,
    settlement_id: str,
    payload: SettlementQuery,
) -> SettlementQueryOut:
    # Verify settlement belongs to this operator
    try:
        check = await db.execute(
            text(
                "SELECT id FROM payout_payees WHERE id = :sid AND entity_id = :oid AND entity_type = 'operator'"
            ),
            {"sid": settlement_id, "oid": operator_id},
        )
        row = check.mappings().first()
    except Exception:
        row = None

    if not row:
        raise HTTPException(status_code=404, detail="Settlement not found")

    query_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Best-effort insert into tickets table; no crash if table shape differs
    try:
        await db.execute(
            text(
                """
                INSERT INTO tickets (id, booking_id, reason, note, priority, stage, action, created_at, updated_at)
                VALUES (:id, :booking_id, 'settlement_query', :note, 'medium', 'open', 'pending', :now, :now)
                """
            ),
            {
                "id": query_id,
                "booking_id": settlement_id,
                "note": payload.query_text,
                "now": now,
            },
        )
        await db.commit()
    except Exception:
        await db.rollback()

    return SettlementQueryOut(
        id=query_id,
        settlement_id=settlement_id,
        query_text=payload.query_text,
        status="open",
        created_at=now,
    )

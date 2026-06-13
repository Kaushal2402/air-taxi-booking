from __future__ import annotations

import uuid
from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.operator_settlements import (
    SettlementDetail,
    SettlementLineItem,
    SettlementQuery,
    SettlementQueryOut,
    SettlementStatus,
    SettlementSummary,
)


async def list_settlements(
    db: AsyncSession,
    operator_id: str,
) -> list[SettlementSummary]:
    """Return all settlements for the given operator, newest first."""
    try:
        result = await db.execute(
            text(
                """
                SELECT
                    id,
                    period_start,
                    period_end,
                    gross_minor,
                    commission_minor,
                    deductions_minor,
                    net_minor,
                    currency,
                    status,
                    created_at
                FROM payouts
                WHERE operator_id = :operator_id
                ORDER BY period_start DESC
                """
            ),
            {"operator_id": operator_id},
        )
        rows = result.mappings().all()
    except Exception:
        # Table may not exist yet — return empty list
        rows = []

    return [
        SettlementSummary(
            id=str(row["id"]),
            period_start=row["period_start"],
            period_end=row["period_end"],
            gross_minor=row["gross_minor"],
            commission_minor=row["commission_minor"],
            deductions_minor=row["deductions_minor"],
            net_minor=row["net_minor"],
            currency=row["currency"],
            status=SettlementStatus(row["status"]),
            created_at=row["created_at"],
        )
        for row in rows
    ]


async def get_settlement(
    db: AsyncSession,
    operator_id: str,
    settlement_id: str,
) -> SettlementDetail:
    """Return full settlement detail including line items."""
    try:
        result = await db.execute(
            text(
                """
                SELECT
                    id,
                    period_start,
                    period_end,
                    gross_minor,
                    commission_minor,
                    deductions_minor,
                    net_minor,
                    currency,
                    status,
                    created_at,
                    payout_ref,
                    bank_masked
                FROM payouts
                WHERE operator_id = :operator_id AND id = :settlement_id
                """
            ),
            {"operator_id": operator_id, "settlement_id": settlement_id},
        )
        row = result.mappings().first()
    except Exception:
        row = None

    if not row:
        raise HTTPException(status_code=404, detail="Settlement not found")

    # Fetch line items
    try:
        li_result = await db.execute(
            text(
                """
                SELECT
                    id,
                    flight_id,
                    booking_ref,
                    route_summary,
                    flight_date,
                    gross_minor,
                    commission_minor,
                    deduction_minor,
                    net_minor,
                    description
                FROM payout_line_items
                WHERE payout_id = :settlement_id
                ORDER BY flight_date ASC
                """
            ),
            {"settlement_id": settlement_id},
        )
        li_rows = li_result.mappings().all()
    except Exception:
        li_rows = []

    line_items = [
        SettlementLineItem(
            id=str(li["id"]),
            flight_id=str(li["flight_id"]),
            booking_ref=li["booking_ref"],
            route_summary=li["route_summary"],
            flight_date=li["flight_date"],
            gross_minor=li["gross_minor"],
            commission_minor=li["commission_minor"],
            deduction_minor=li["deduction_minor"],
            net_minor=li["net_minor"],
            description=li["description"],
        )
        for li in li_rows
    ]

    return SettlementDetail(
        id=str(row["id"]),
        period_start=row["period_start"],
        period_end=row["period_end"],
        gross_minor=row["gross_minor"],
        commission_minor=row["commission_minor"],
        deductions_minor=row["deductions_minor"],
        net_minor=row["net_minor"],
        currency=row["currency"],
        status=SettlementStatus(row["status"]),
        created_at=row["created_at"],
        payout_ref=row.get("payout_ref"),
        bank_masked=row.get("bank_masked"),
        line_items=line_items,
    )


async def export_settlement(
    db: AsyncSession,
    operator_id: str,
    settlement_id: str,
) -> dict:
    """Return a dict suitable for CSV/PDF generation containing all settlement data."""
    detail = await get_settlement(db, operator_id, settlement_id)

    return {
        "settlement_id": detail.id,
        "period_start": str(detail.period_start),
        "period_end": str(detail.period_end),
        "gross_minor": detail.gross_minor,
        "commission_minor": detail.commission_minor,
        "deductions_minor": detail.deductions_minor,
        "net_minor": detail.net_minor,
        "currency": detail.currency,
        "status": detail.status.value,
        "payout_ref": detail.payout_ref,
        "bank_masked": detail.bank_masked,
        "generated_at": datetime.utcnow().isoformat(),
        "line_items": [
            {
                "id": li.id,
                "flight_id": li.flight_id,
                "booking_ref": li.booking_ref,
                "route_summary": li.route_summary,
                "flight_date": str(li.flight_date),
                "gross_minor": li.gross_minor,
                "commission_minor": li.commission_minor,
                "deduction_minor": li.deduction_minor,
                "net_minor": li.net_minor,
                "description": li.description,
            }
            for li in detail.line_items
        ],
    }


async def raise_query(
    db: AsyncSession,
    operator_id: str,
    settlement_id: str,
    payload: SettlementQuery,
) -> SettlementQueryOut:
    """Raise a dispute/query against a settlement."""
    # Verify the settlement belongs to this operator
    try:
        result = await db.execute(
            text(
                "SELECT id FROM payouts WHERE id = :settlement_id AND operator_id = :operator_id"
            ),
            {"settlement_id": settlement_id, "operator_id": operator_id},
        )
        row = result.mappings().first()
    except Exception:
        row = None

    if not row:
        raise HTTPException(status_code=404, detail="Settlement not found")

    query_id = str(uuid.uuid4())
    now = datetime.utcnow()

    try:
        await db.execute(
            text(
                """
                INSERT INTO payout_queries (id, payout_id, operator_id, query_text, status, created_at)
                VALUES (:id, :payout_id, :operator_id, :query_text, 'open', :created_at)
                """
            ),
            {
                "id": query_id,
                "payout_id": settlement_id,
                "operator_id": operator_id,
                "query_text": payload.query_text,
                "created_at": now,
            },
        )
        await db.commit()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save query") from exc

    return SettlementQueryOut(
        id=query_id,
        settlement_id=settlement_id,
        query_text=payload.query_text,
        status="open",
        created_at=now,
    )

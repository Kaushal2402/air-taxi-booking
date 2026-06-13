from __future__ import annotations

from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.operator_reports import ReportFilter, ReportOut


def _date_filter_sql(
    alias: str,
    col: str,
    filters: ReportFilter,
    params: dict,
) -> str:
    clauses: list[str] = []
    if filters.period_start:
        clauses.append(f"{alias}.{col} >= :period_start")
        params["period_start"] = filters.period_start
    if filters.period_end:
        clauses.append(f"{alias}.{col} <= :period_end")
        params["period_end"] = filters.period_end
    return (" AND " + " AND ".join(clauses)) if clauses else ""


async def get_revenue_report(
    db: AsyncSession,
    operator_id: str,
    filters: ReportFilter,
) -> ReportOut:
    params: dict = {"operator_id": operator_id}
    date_clause = _date_filter_sql("b", "etd", filters, params)

    sql = text(
        f"""
        SELECT
            DATE_FORMAT(b.etd, '%%Y-%%m') AS month,
            COALESCE(SUM(COALESCE(b.fare_final_minor, b.fare_estimate_minor, 0)), 0)
                AS gross_minor,
            COALESCE(SUM(
                COALESCE(b.fare_final_minor, b.fare_estimate_minor, 0)
                * o.commission_pct / 100.0
            ), 0) AS commission_minor,
            COALESCE(SUM(
                COALESCE(b.fare_final_minor, b.fare_estimate_minor, 0)
                * (1.0 - o.commission_pct / 100.0)
            ), 0) AS net_minor,
            COUNT(DISTINCT b.id) AS flight_count
        FROM air_bookings b
        JOIN operators o ON o.id = b.operator_id
        WHERE b.operator_id = :operator_id
          AND b.status NOT IN ('Cancelled', 'cancelled', 'Failed', 'failed')
          {date_clause}
        GROUP BY month
        ORDER BY month
        """
    )

    result = await db.execute(sql, params)
    rows = [dict(r._mapping) for r in result.fetchall()]

    totals: dict = {
        "gross_minor": sum(r["gross_minor"] for r in rows),
        "commission_minor": sum(r["commission_minor"] for r in rows),
        "net_minor": sum(r["net_minor"] for r in rows),
        "flight_count": sum(r["flight_count"] for r in rows),
    }

    return ReportOut(
        report_type="revenue",
        period_start=filters.period_start,
        period_end=filters.period_end,
        rows=rows,
        totals=totals,
    )


async def get_flights_summary(
    db: AsyncSession,
    operator_id: str,
    filters: ReportFilter,
) -> ReportOut:
    params: dict = {"operator_id": operator_id}
    date_clause = _date_filter_sql("b", "etd", filters, params)

    if filters.aircraft_id:
        date_clause += " AND b.aircraft_id = :aircraft_id"
        params["aircraft_id"] = filters.aircraft_id

    sql = text(
        f"""
        SELECT
            DATE(b.etd) AS date,
            SUM(CASE WHEN b.status = 'Completed' THEN 1 ELSE 0 END)  AS completed,
            SUM(CASE WHEN b.status IN ('Cancelled', 'cancelled') THEN 1 ELSE 0 END) AS cancelled,
            0 AS on_time,
            0 AS delayed_count,
            0.0 AS otp_pct
        FROM air_bookings b
        WHERE b.operator_id = :operator_id
          {date_clause}
        GROUP BY date
        ORDER BY date
        """
    )

    result = await db.execute(sql, params)
    rows = [dict(r._mapping) for r in result.fetchall()]

    for r in rows:
        r["date"] = str(r["date"])

    totals: dict = {
        "completed": sum(r["completed"] for r in rows),
        "cancelled": sum(r["cancelled"] for r in rows),
        "on_time": 0,
        "delayed_count": 0,
        "otp_pct": 0.0,
    }

    return ReportOut(
        report_type="flights_summary",
        period_start=filters.period_start,
        period_end=filters.period_end,
        rows=rows,
        totals=totals,
    )


async def get_load_factor_report(
    db: AsyncSession,
    operator_id: str,
    filters: ReportFilter,
) -> ReportOut:
    params: dict = {"operator_id": operator_id}
    date_clause = _date_filter_sql("b", "etd", filters, params)

    sql = text(
        f"""
        SELECT
            CONCAT(b.route_from, ' → ', b.route_to) AS route_label,
            COALESCE(SUM(b.aircraft_seats), 0)       AS seats_available,
            COALESCE(SUM(b.pax_count), 0)            AS seats_sold,
            ROUND(
                100.0 * COALESCE(SUM(b.pax_count), 0)
                / NULLIF(SUM(b.aircraft_seats), 0),
                1
            ) AS load_factor_pct
        FROM air_bookings b
        WHERE b.operator_id = :operator_id
          AND b.status NOT IN ('Cancelled', 'cancelled', 'Failed', 'failed')
          {date_clause}
        GROUP BY b.route_from, b.route_to
        ORDER BY load_factor_pct DESC
        """
    )

    result = await db.execute(sql, params)
    rows = [dict(r._mapping) for r in result.fetchall()]

    for r in rows:
        if r.get("load_factor_pct") is None:
            r["load_factor_pct"] = 0.0

    totals: dict = {
        "seats_available": sum(r["seats_available"] for r in rows),
        "seats_sold": sum(r["seats_sold"] for r in rows),
    }
    totals["load_factor_pct"] = (
        round(100.0 * totals["seats_sold"] / totals["seats_available"], 1)
        if totals["seats_available"]
        else 0.0
    )

    return ReportOut(
        report_type="load_factor",
        period_start=filters.period_start,
        period_end=filters.period_end,
        rows=rows,
        totals=totals,
    )


async def get_fleet_utilization(
    db: AsyncSession,
    operator_id: str,
    filters: ReportFilter,
) -> ReportOut:
    params: dict = {"operator_id": operator_id, "available_minutes": 21600}
    date_clause = _date_filter_sql("b", "etd", filters, params)

    if filters.aircraft_id:
        date_clause += " AND oa.id = :aircraft_id"
        params["aircraft_id"] = filters.aircraft_id

    sql = text(
        f"""
        SELECT
            oa.registration_mark                                    AS aircraft_reg,
            oa.aircraft_type_name                                   AS aircraft_type,
            ROUND(
                COALESCE(SUM(b.flight_time_min), 0) / 60.0,
                2
            )                                                       AS flight_hours,
            COUNT(DISTINCT b.id)                                    AS flight_count,
            ROUND(
                100.0 * COALESCE(SUM(b.flight_time_min), 0)
                / NULLIF(:available_minutes, 0),
                1
            )                                                       AS utilization_pct
        FROM operator_aircraft oa
        LEFT JOIN air_bookings b
               ON b.aircraft_id = oa.id
              AND b.status = 'Completed'
              AND b.operator_id = :operator_id
              {date_clause}
        WHERE oa.operator_id = :operator_id
        GROUP BY oa.id, oa.registration_mark, oa.aircraft_type_name
        ORDER BY flight_hours DESC
        """
    )

    result = await db.execute(sql, params)
    rows = [dict(r._mapping) for r in result.fetchall()]

    for r in rows:
        if r.get("utilization_pct") is None:
            r["utilization_pct"] = 0.0

    totals: dict = {
        "flight_hours": round(sum(r["flight_hours"] for r in rows), 2),
        "flight_count": sum(r["flight_count"] for r in rows),
    }

    return ReportOut(
        report_type="fleet_utilization",
        period_start=filters.period_start,
        period_end=filters.period_end,
        rows=rows,
        totals=totals,
    )


async def get_crew_utilization(
    db: AsyncSession,
    operator_id: str,
    filters: ReportFilter,
) -> ReportOut:
    params: dict = {"operator_id": operator_id}
    date_clause = _date_filter_sql("b", "etd", filters, params)

    if filters.crew_id:
        date_clause += " AND cm.id = :crew_id"
        params["crew_id"] = filters.crew_id

    # Join crew members to bookings via pilot_name / copilot_name text match
    sql = text(
        f"""
        SELECT
            cm.name                                                AS crew_name,
            cm.crew_role                                           AS role,
            ROUND(
                COALESCE(SUM(b.flight_time_min), 0) / 60.0,
                2
            )                                                      AS duty_hours,
            COUNT(DISTINCT b.id)                                   AS flight_count
        FROM operator_crew_members cm
        LEFT JOIN air_bookings b
               ON (b.pilot_name = cm.name OR b.copilot_name = cm.name)
              AND b.status = 'Completed'
              AND b.operator_id = :operator_id
              {date_clause}
        WHERE cm.operator_id = :operator_id
        GROUP BY cm.id, cm.name, cm.crew_role
        ORDER BY duty_hours DESC
        """
    )

    result = await db.execute(sql, params)
    rows = [dict(r._mapping) for r in result.fetchall()]

    totals: dict = {
        "duty_hours": round(sum(r["duty_hours"] for r in rows), 2),
        "flight_count": sum(r["flight_count"] for r in rows),
    }

    return ReportOut(
        report_type="crew_utilization",
        period_start=filters.period_start,
        period_end=filters.period_end,
        rows=rows,
        totals=totals,
    )

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
    """Return SQL fragments and populate params for date range filtering."""
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
    date_clause = _date_filter_sql("b", "departure_time", filters, params)

    sql = text(
        f"""
        SELECT
            DATE_FORMAT(b.departure_time, '%Y-%m') AS month,
            COALESCE(SUM(p.amount_minor), 0)         AS gross_minor,
            COALESCE(SUM(p.commission_minor), 0)     AS commission_minor,
            COALESCE(SUM(p.amount_minor) - SUM(p.commission_minor), 0) AS net_minor,
            COUNT(DISTINCT b.id)                     AS flight_count
        FROM bookings b
        LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'captured'
        WHERE b.operator_id = :operator_id
          AND b.status NOT IN ('cancelled', 'failed')
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
    date_clause = _date_filter_sql("b", "departure_time", filters, params)

    if filters.route_id:
        date_clause += " AND b.route_id = :route_id"
        params["route_id"] = filters.route_id
    if filters.aircraft_id:
        date_clause += " AND b.aircraft_id = :aircraft_id"
        params["aircraft_id"] = filters.aircraft_id

    sql = text(
        f"""
        SELECT
            DATE(b.departure_time) AS date,
            SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END)  AS completed,
            SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END)  AS cancelled,
            SUM(CASE WHEN b.is_on_time = 1 THEN 1 ELSE 0 END)        AS on_time,
            SUM(CASE WHEN b.is_delayed = 1 THEN 1 ELSE 0 END)        AS delayed,
            ROUND(
                100.0 * SUM(CASE WHEN b.is_on_time = 1 THEN 1 ELSE 0 END)
                / NULLIF(SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END), 0),
                1
            ) AS otp_pct
        FROM bookings b
        WHERE b.operator_id = :operator_id
          {date_clause}
        GROUP BY date
        ORDER BY date
        """
    )

    result = await db.execute(sql, params)
    rows = [dict(r._mapping) for r in result.fetchall()]

    # Convert None otp_pct to 0.0
    for r in rows:
        if r.get("otp_pct") is None:
            r["otp_pct"] = 0.0
        r["date"] = str(r["date"])

    totals: dict = {
        "completed": sum(r["completed"] for r in rows),
        "cancelled": sum(r["cancelled"] for r in rows),
        "on_time": sum(r["on_time"] for r in rows),
        "delayed": sum(r["delayed"] for r in rows),
    }
    total_completed = totals["completed"]
    totals["otp_pct"] = (
        round(100.0 * totals["on_time"] / total_completed, 1)
        if total_completed
        else 0.0
    )

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
    date_clause = _date_filter_sql("b", "departure_time", filters, params)

    if filters.route_id:
        date_clause += " AND b.route_id = :route_id"
        params["route_id"] = filters.route_id

    sql = text(
        f"""
        SELECT
            CONCAT(r.origin_code, ' → ', r.destination_code) AS route_label,
            COALESCE(SUM(b.seats_available), 0)              AS seats_available,
            COALESCE(SUM(b.seats_sold), 0)                   AS seats_sold,
            ROUND(
                100.0 * COALESCE(SUM(b.seats_sold), 0)
                / NULLIF(SUM(b.seats_available), 0),
                1
            ) AS load_factor_pct
        FROM bookings b
        JOIN routes r ON r.id = b.route_id
        WHERE b.operator_id = :operator_id
          AND b.status NOT IN ('cancelled', 'failed')
          {date_clause}
        GROUP BY b.route_id, route_label
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
    params: dict = {"operator_id": operator_id}
    date_clause = _date_filter_sql("b", "departure_time", filters, params)

    if filters.aircraft_id:
        date_clause += " AND a.id = :aircraft_id"
        params["aircraft_id"] = filters.aircraft_id

    sql = text(
        f"""
        SELECT
            a.registration                              AS aircraft_reg,
            COALESCE(at.name, a.aircraft_type)         AS aircraft_type,
            ROUND(
                COALESCE(SUM(TIMESTAMPDIFF(MINUTE, b.departure_time, b.arrival_time)), 0)
                / 60.0,
                2
            )                                           AS flight_hours,
            COUNT(DISTINCT b.id)                       AS flight_count,
            ROUND(
                100.0 * COALESCE(SUM(TIMESTAMPDIFF(MINUTE, b.departure_time, b.arrival_time)), 0)
                / NULLIF(:available_minutes, 0),
                1
            )                                           AS utilization_pct
        FROM aircrafts a
        LEFT JOIN aircraft_types at ON at.id = a.aircraft_type_id
        LEFT JOIN bookings b
               ON b.aircraft_id = a.id
              AND b.status = 'completed'
              AND b.operator_id = :operator_id
              {date_clause}
        WHERE a.operator_id = :operator_id
        GROUP BY a.id, aircraft_reg, aircraft_type
        ORDER BY flight_hours DESC
        """
    )

    # Default available minutes: 12 h/day * 30 days = 21600 per aircraft per month window
    params["available_minutes"] = 21600

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
    date_clause = _date_filter_sql("b", "departure_time", filters, params)

    if filters.crew_id:
        date_clause += " AND cm.id = :crew_id"
        params["crew_id"] = filters.crew_id

    sql = text(
        f"""
        SELECT
            CONCAT(cm.first_name, ' ', cm.last_name) AS crew_name,
            cm.role                                   AS role,
            ROUND(
                COALESCE(SUM(TIMESTAMPDIFF(MINUTE, b.departure_time, b.arrival_time)), 0)
                / 60.0,
                2
            )                                          AS duty_hours,
            COUNT(DISTINCT b.id)                      AS flight_count
        FROM crew_members cm
        LEFT JOIN flight_crew fc ON fc.crew_member_id = cm.id
        LEFT JOIN bookings b
               ON b.id = fc.booking_id
              AND b.status = 'completed'
              AND b.operator_id = :operator_id
              {date_clause}
        WHERE cm.operator_id = :operator_id
        GROUP BY cm.id, crew_name, role
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

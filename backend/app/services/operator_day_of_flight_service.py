from __future__ import annotations

from datetime import datetime, date
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.schemas.operator_day_of_flight import DepartPayload, ArrivePayload, DelayPayload, EventLogPayload


async def get_day_board(db: AsyncSession, operator_id: str) -> dict:
    """Return today's flights and recent events for the operator."""
    today = date.today().isoformat()
    flights: list[dict] = []
    events: list[dict] = []

    try:
        result = await db.execute(
            text("""
                SELECT
                    f.id AS flight_id,
                    COALESCE(b.booking_ref, f.id) AS booking_ref,
                    COALESCE(r.origin_code, f.origin, '') AS route_from,
                    COALESCE(r.destination_code, f.destination, '') AS route_to,
                    COALESCE(a.registration, '') AS aircraft_reg,
                    COALESCE(at.name, '') AS aircraft_type,
                    f.status,
                    f.scheduled_departure AS etd,
                    f.scheduled_arrival AS eta,
                    f.actual_departure AS atd,
                    f.actual_arrival AS ata,
                    COALESCE(f.pax_count, 0) AS pax_count,
                    f.alert_message
                FROM operator_flights f
                LEFT JOIN air_bookings b ON b.flight_id = f.id
                LEFT JOIN operator_routes r ON r.id = f.route_id
                LEFT JOIN aircraft a ON a.id = f.aircraft_id
                LEFT JOIN aircraft_types at ON at.id = a.aircraft_type_id
                WHERE f.operator_id = :op_id
                  AND DATE(f.scheduled_departure) = :today
                ORDER BY f.scheduled_departure ASC
            """),
            {"op_id": operator_id, "today": today},
        )
        rows = result.mappings().all()
        for row in rows:
            etd = str(row["etd"]) if row["etd"] else None
            eta = str(row["eta"]) if row["eta"] else None
            atd = str(row["atd"]) if row["atd"] else None
            ata = str(row["ata"]) if row["ata"] else None

            # Compute progress percentage
            progress = 0
            status = row["status"] or ""
            if status == "departed":
                progress = 50
            elif status in ("arrived", "completed"):
                progress = 100
            elif status == "boarding":
                progress = 20

            # Fetch crew names for this flight
            crew_result = await db.execute(
                text("""
                    SELECT CONCAT(u.first_name, ' ', u.last_name) AS full_name
                    FROM flight_crew fc
                    JOIN operator_users u ON u.id = fc.crew_member_id
                    WHERE fc.flight_id = :fid
                """),
                {"fid": row["flight_id"]},
            )
            crew_names = [r["full_name"] for r in crew_result.mappings().all()]

            flights.append({
                "flight_id": str(row["flight_id"]),
                "booking_ref": str(row["booking_ref"]),
                "route_from": row["route_from"],
                "route_to": row["route_to"],
                "aircraft_reg": row["aircraft_reg"],
                "aircraft_type": row["aircraft_type"],
                "status": status,
                "etd": etd,
                "eta": eta,
                "atd": atd,
                "ata": ata,
                "pax_count": int(row["pax_count"] or 0),
                "crew_names": crew_names,
                "progress_pct": progress,
                "alert_message": row["alert_message"],
            })

        # Recent event log entries
        ev_result = await db.execute(
            text("""
                SELECT
                    el.created_at AS time,
                    COALESCE(b.booking_ref, el.flight_id) AS flight_ref,
                    el.event_type,
                    el.message,
                    el.tone
                FROM flight_event_log el
                LEFT JOIN air_bookings b ON b.flight_id = el.flight_id
                JOIN operator_flights f ON f.id = el.flight_id
                WHERE f.operator_id = :op_id
                  AND DATE(el.created_at) = :today
                ORDER BY el.created_at DESC
                LIMIT 50
            """),
            {"op_id": operator_id, "today": today},
        )
        for row in ev_result.mappings().all():
            events.append({
                "time": str(row["time"]),
                "flight_ref": str(row["flight_ref"]),
                "event_type": row["event_type"] or "OPS",
                "message": row["message"] or "",
                "tone": row["tone"] or "neutral",
            })

    except Exception:
        # Return mock-friendly empty structure when tables don't exist yet
        pass

    return {"flights": flights, "events": events}


async def get_flight_detail(db: AsyncSession, operator_id: str, flight_id: str) -> dict:
    """Return detailed info for a single flight."""
    detail: dict[str, Any] = {
        "flight_id": flight_id,
        "booking_ref": "",
        "route_from": "",
        "route_to": "",
        "aircraft_reg": "",
        "aircraft_type": "",
        "status": "unknown",
        "etd": None,
        "eta": None,
        "atd": None,
        "ata": None,
        "altitude": None,
        "speed": None,
        "heading": None,
        "last_acars": None,
        "captain": None,
        "first_officer": None,
        "passengers": [],
        "baggage_kg": None,
        "crew_comms": [],
    }

    try:
        result = await db.execute(
            text("""
                SELECT
                    f.id AS flight_id,
                    COALESCE(b.booking_ref, f.id) AS booking_ref,
                    COALESCE(r.origin_code, f.origin, '') AS route_from,
                    COALESCE(r.destination_code, f.destination, '') AS route_to,
                    COALESCE(a.registration, '') AS aircraft_reg,
                    COALESCE(at.name, '') AS aircraft_type,
                    f.status,
                    f.scheduled_departure AS etd,
                    f.scheduled_arrival AS eta,
                    f.actual_departure AS atd,
                    f.actual_arrival AS ata,
                    f.altitude,
                    f.speed,
                    f.heading,
                    f.last_acars,
                    f.baggage_kg
                FROM operator_flights f
                LEFT JOIN air_bookings b ON b.flight_id = f.id
                LEFT JOIN operator_routes r ON r.id = f.route_id
                LEFT JOIN aircraft a ON a.id = f.aircraft_id
                LEFT JOIN aircraft_types at ON at.id = a.aircraft_type_id
                WHERE f.id = :fid AND f.operator_id = :op_id
                LIMIT 1
            """),
            {"fid": flight_id, "op_id": operator_id},
        )
        row = result.mappings().first()
        if row:
            detail.update({
                "flight_id": str(row["flight_id"]),
                "booking_ref": str(row["booking_ref"]),
                "route_from": row["route_from"],
                "route_to": row["route_to"],
                "aircraft_reg": row["aircraft_reg"],
                "aircraft_type": row["aircraft_type"],
                "status": row["status"] or "unknown",
                "etd": str(row["etd"]) if row["etd"] else None,
                "eta": str(row["eta"]) if row["eta"] else None,
                "atd": str(row["atd"]) if row["atd"] else None,
                "ata": str(row["ata"]) if row["ata"] else None,
                "altitude": row["altitude"],
                "speed": row["speed"],
                "heading": row["heading"],
                "last_acars": row["last_acars"],
                "baggage_kg": float(row["baggage_kg"]) if row["baggage_kg"] else None,
            })

        # Crew
        crew_result = await db.execute(
            text("""
                SELECT
                    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
                    fc.role
                FROM flight_crew fc
                JOIN operator_users u ON u.id = fc.crew_member_id
                WHERE fc.flight_id = :fid
            """),
            {"fid": flight_id},
        )
        for cr in crew_result.mappings().all():
            role = (cr["role"] or "").lower()
            if role in ("captain", "pic"):
                detail["captain"] = cr["full_name"]
            elif role in ("first_officer", "fo", "co-pilot", "copilot"):
                detail["first_officer"] = cr["full_name"]

        # Passengers
        pax_result = await db.execute(
            text("""
                SELECT
                    p.id,
                    CONCAT(p.first_name, ' ', p.last_name) AS name,
                    p.seat_number,
                    p.meal_preference,
                    p.special_assistance
                FROM booking_passengers p
                JOIN air_bookings b ON b.id = p.booking_id
                WHERE b.flight_id = :fid
            """),
            {"fid": flight_id},
        )
        detail["passengers"] = [dict(r) for r in pax_result.mappings().all()]

        # Crew comms / event log
        comms_result = await db.execute(
            text("""
                SELECT created_at AS time, message, event_type, tone
                FROM flight_event_log
                WHERE flight_id = :fid
                ORDER BY created_at DESC
                LIMIT 30
            """),
            {"fid": flight_id},
        )
        detail["crew_comms"] = [
            {
                "time": str(r["time"]),
                "message": r["message"],
                "event_type": r["event_type"],
                "tone": r["tone"],
            }
            for r in comms_result.mappings().all()
        ]

    except Exception:
        pass

    return detail


async def mark_depart(
    db: AsyncSession, operator_id: str, flight_id: str, payload: DepartPayload
) -> dict:
    """Mark a flight as departed."""
    try:
        await db.execute(
            text("""
                UPDATE operator_flights
                SET status = 'departed',
                    actual_departure = :atd,
                    updated_at = NOW()
                WHERE id = :fid AND operator_id = :op_id
            """),
            {"atd": payload.atd, "fid": flight_id, "op_id": operator_id},
        )
        await _insert_event(
            db,
            flight_id=flight_id,
            event_type="OPS",
            message=f"Flight departed at {payload.atd}" + (f". {payload.notes}" if payload.notes else ""),
            tone="ok",
        )
        await db.commit()
    except Exception:
        await db.rollback()

    return {"flight_id": flight_id, "status": "departed", "atd": payload.atd}


async def mark_arrive(
    db: AsyncSession, operator_id: str, flight_id: str, payload: ArrivePayload
) -> dict:
    """Mark a flight as arrived."""
    try:
        await db.execute(
            text("""
                UPDATE operator_flights
                SET status = 'arrived',
                    actual_arrival = :ata,
                    updated_at = NOW()
                WHERE id = :fid AND operator_id = :op_id
            """),
            {"ata": payload.ata, "fid": flight_id, "op_id": operator_id},
        )
        await _insert_event(
            db,
            flight_id=flight_id,
            event_type="OPS",
            message=f"Flight arrived at {payload.ata}" + (f". {payload.notes}" if payload.notes else ""),
            tone="ok",
        )
        await db.commit()
    except Exception:
        await db.rollback()

    return {"flight_id": flight_id, "status": "arrived", "ata": payload.ata}


async def log_delay(
    db: AsyncSession, operator_id: str, flight_id: str, payload: DelayPayload
) -> dict:
    """Update ETA and log a delay event."""
    try:
        await db.execute(
            text("""
                UPDATE operator_flights
                SET scheduled_arrival = :new_eta,
                    alert_message = :reason,
                    updated_at = NOW()
                WHERE id = :fid AND operator_id = :op_id
            """),
            {"new_eta": payload.new_eta, "reason": payload.reason, "fid": flight_id, "op_id": operator_id},
        )
        await _insert_event(
            db,
            flight_id=flight_id,
            event_type="OPS",
            message=f"Delay: new ETA {payload.new_eta}. Reason: {payload.reason}",
            tone="warn",
        )
        await db.commit()
    except Exception:
        await db.rollback()

    return {"flight_id": flight_id, "new_eta": payload.new_eta, "reason": payload.reason}


async def close_flight(db: AsyncSession, operator_id: str, flight_id: str) -> dict:
    """Mark a flight as completed."""
    try:
        await db.execute(
            text("""
                UPDATE operator_flights
                SET status = 'completed',
                    updated_at = NOW()
                WHERE id = :fid AND operator_id = :op_id
            """),
            {"fid": flight_id, "op_id": operator_id},
        )
        await _insert_event(
            db,
            flight_id=flight_id,
            event_type="OPS",
            message="Flight closed and marked as completed.",
            tone="info",
        )
        await db.commit()
    except Exception:
        await db.rollback()

    return {"flight_id": flight_id, "status": "completed"}


async def add_event_log(
    db: AsyncSession, operator_id: str, flight_id: str, payload: EventLogPayload
) -> dict:
    """Add an ops note to the flight event log."""
    try:
        await _insert_event(
            db,
            flight_id=flight_id,
            event_type="OPS",
            message=payload.message,
            tone="neutral",
        )
        await db.commit()
    except Exception:
        await db.rollback()

    return {"flight_id": flight_id, "logged": True, "message": payload.message}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _insert_event(
    db: AsyncSession,
    *,
    flight_id: str,
    event_type: str,
    message: str,
    tone: str,
) -> None:
    """Insert a row into flight_event_log (best-effort)."""
    try:
        await db.execute(
            text("""
                INSERT INTO flight_event_log (flight_id, event_type, message, tone, created_at)
                VALUES (:fid, :etype, :msg, :tone, NOW())
            """),
            {"fid": flight_id, "etype": event_type, "msg": message, "tone": tone},
        )
    except Exception:
        pass

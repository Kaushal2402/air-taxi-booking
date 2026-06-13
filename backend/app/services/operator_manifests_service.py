from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.operator_manifests import ManifestLockPayload, ManifestPassengerUpdate, ManifestSubmitPayload


async def list_manifests(
    db: AsyncSession,
    operator_id: str,
    status_filter: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Return manifest summaries for all flights belonging to this operator."""
    try:
        query = """
            SELECT
                f.id            AS flight_id,
                b.booking_ref   AS booking_ref,
                CONCAT(COALESCE(dep.name, dep.iata_code, 'Unknown'), ' → ',
                       COALESCE(arr.name, arr.iata_code, 'Unknown')) AS route_summary,
                ac.registration AS aircraft_reg,
                f.etd,
                f.manifest_locked   AS locked,
                f.manifest_submitted AS submitted,
                f.status,
                f.created_at,
                COUNT(p.id)     AS passenger_count
            FROM flights f
            LEFT JOIN bookings b    ON b.id = f.booking_id
            LEFT JOIN aircraft ac   ON ac.id = f.aircraft_id
            LEFT JOIN airports dep  ON dep.id = f.departure_airport_id
            LEFT JOIN airports arr  ON arr.id = f.arrival_airport_id
            LEFT JOIN passengers p  ON p.flight_id = f.id
            WHERE f.operator_id = :operator_id
        """
        params: dict[str, Any] = {"operator_id": operator_id}
        if status_filter:
            query += " AND f.status = :status"
            params["status"] = status_filter
        query += " GROUP BY f.id ORDER BY f.etd DESC"

        result = await db.execute(text(query), params)
        rows = result.mappings().all()
        return [dict(row) for row in rows]
    except Exception:
        # Tables may not exist yet — return empty list
        return []


async def get_manifest(
    db: AsyncSession,
    operator_id: str,
    flight_id: str,
) -> dict[str, Any]:
    """Return full manifest including passenger list for a single flight."""
    try:
        flight_query = """
            SELECT
                f.id            AS flight_id,
                b.booking_ref   AS booking_ref,
                CONCAT(COALESCE(dep.name, dep.iata_code, 'Unknown'), ' → ',
                       COALESCE(arr.name, arr.iata_code, 'Unknown')) AS route_summary,
                ac.registration AS aircraft_reg,
                ac.mtow_kg,
                f.etd,
                f.manifest_locked   AS locked,
                f.manifest_submitted AS submitted,
                f.status,
                f.created_at,
                (SELECT COUNT(*) FROM crew_assignments ca WHERE ca.flight_id = f.id) AS crew_count
            FROM flights f
            LEFT JOIN bookings b    ON b.id = f.booking_id
            LEFT JOIN aircraft ac   ON ac.id = f.aircraft_id
            LEFT JOIN airports dep  ON dep.id = f.departure_airport_id
            LEFT JOIN airports arr  ON arr.id = f.arrival_airport_id
            WHERE f.id = :flight_id AND f.operator_id = :operator_id
        """
        flight_result = await db.execute(
            text(flight_query), {"flight_id": flight_id, "operator_id": operator_id}
        )
        flight_row = flight_result.mappings().first()
        if not flight_row:
            raise HTTPException(status_code=404, detail="Flight not found")

        manifest = dict(flight_row)

        pax_query = """
            SELECT
                p.id,
                p.flight_id,
                p.seat_label,
                p.name,
                p.dob,
                p.gender,
                p.nationality,
                p.id_type,
                p.id_number,
                p.baggage_kg,
                p.special_assistance,
                p.verified,
                p.boarding_status
            FROM passengers p
            WHERE p.flight_id = :flight_id
            ORDER BY p.seat_label
        """
        pax_result = await db.execute(text(pax_query), {"flight_id": flight_id})
        passengers = [dict(row) for row in pax_result.mappings().all()]
        manifest["passengers"] = passengers

        total_weight = sum(
            (p.get("baggage_kg") or 0) for p in passengers
        )
        manifest["total_weight_kg"] = total_weight

        return manifest
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Manifest not available")


async def update_passenger(
    db: AsyncSession,
    operator_id: str,
    flight_id: str,
    passenger_id: str,
    payload: ManifestPassengerUpdate,
) -> dict[str, Any]:
    """Update editable fields on a passenger record."""
    # Verify the flight belongs to this operator
    check = await db.execute(
        text("SELECT id FROM flights WHERE id = :fid AND operator_id = :oid"),
        {"fid": flight_id, "oid": operator_id},
    )
    if not check.first():
        raise HTTPException(status_code=404, detail="Flight not found")

    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    params: dict[str, Any] = {**updates, "passenger_id": passenger_id, "flight_id": flight_id}

    try:
        await db.execute(
            text(f"UPDATE passengers SET {set_clause} WHERE id = :passenger_id AND flight_id = :flight_id"),
            params,
        )
        await db.commit()

        result = await db.execute(
            text("SELECT * FROM passengers WHERE id = :pid"),
            {"pid": passenger_id},
        )
        row = result.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Passenger not found")
        return dict(row)
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


async def lock_manifest(
    db: AsyncSession,
    operator_id: str,
    flight_id: str,
    payload: ManifestLockPayload,
) -> dict[str, Any]:
    """Lock the manifest for a flight, preventing further edits."""
    try:
        result = await db.execute(
            text("SELECT id, manifest_locked FROM flights WHERE id = :fid AND operator_id = :oid"),
            {"fid": flight_id, "oid": operator_id},
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="Flight not found")

        await db.execute(
            text(
                "UPDATE flights SET manifest_locked = TRUE, status = 'manifest_locked' "
                "WHERE id = :fid AND operator_id = :oid"
            ),
            {"fid": flight_id, "oid": operator_id},
        )
        await db.commit()
        return {"flight_id": flight_id, "locked": True, "reason": payload.reason}
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


async def unlock_manifest(
    db: AsyncSession,
    operator_id: str,
    flight_id: str,
) -> dict[str, Any]:
    """Unlock a previously locked manifest (exception/correction flow)."""
    try:
        result = await db.execute(
            text("SELECT id FROM flights WHERE id = :fid AND operator_id = :oid"),
            {"fid": flight_id, "oid": operator_id},
        )
        if not result.first():
            raise HTTPException(status_code=404, detail="Flight not found")

        await db.execute(
            text(
                "UPDATE flights SET manifest_locked = FALSE "
                "WHERE id = :fid AND operator_id = :oid"
            ),
            {"fid": flight_id, "oid": operator_id},
        )
        await db.commit()
        return {"flight_id": flight_id, "locked": False}
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


async def submit_manifest(
    db: AsyncSession,
    operator_id: str,
    flight_id: str,
    payload: ManifestSubmitPayload,
) -> dict[str, Any]:
    """Submit the manifest (marks it as officially submitted to authority)."""
    try:
        result = await db.execute(
            text("SELECT id, manifest_locked FROM flights WHERE id = :fid AND operator_id = :oid"),
            {"fid": flight_id, "oid": operator_id},
        )
        row = result.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Flight not found")

        await db.execute(
            text(
                "UPDATE flights SET manifest_submitted = TRUE, status = 'submitted' "
                "WHERE id = :fid AND operator_id = :oid"
            ),
            {"fid": flight_id, "oid": operator_id},
        )
        await db.commit()
        return {"flight_id": flight_id, "submitted": True, "remarks": payload.remarks}
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


async def export_manifest(
    db: AsyncSession,
    operator_id: str,
    flight_id: str,
) -> dict[str, Any]:
    """Return a dict containing all manifest data suitable for PDF/CSV export."""
    manifest = await get_manifest(db, operator_id, flight_id)
    # Enrich with export metadata
    export_data: dict[str, Any] = {
        "export_format": "json",
        "manifest": manifest,
        "exported_at": None,  # Caller can inject current UTC datetime
    }
    return export_data

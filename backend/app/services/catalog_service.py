from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ValidationException
from app.repositories.catalog_repository import CatalogRepository


# ── Geometry helpers ──────────────────────────────────────────────────────────

def _polygon_area_km2(polygon: List[List[float]]) -> float:
    """Approximate signed area (Shoelace formula) treating lat/lng as planar coords.
    Returns area in km² using 1° ≈ 111 km approximation — good enough for UI display."""
    if len(polygon) < 3:
        return 0.0
    n = len(polygon)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += polygon[i][1] * polygon[j][0]
        area -= polygon[j][1] * polygon[i][0]
    area = abs(area) / 2.0
    # Convert square degrees to km²: 1° lat ≈ 111 km, 1° lng ≈ 111 * cos(lat) km
    mid_lat = sum(p[0] for p in polygon) / n
    lat_factor = 111.0
    lng_factor = 111.0 * math.cos(math.radians(mid_lat))
    return area * lat_factor * lng_factor


def _validate_polygon(polygon: List[List[float]]) -> Dict[str, Any]:
    """Return a dict with {valid, message, vertex_count, area_km2}."""
    if len(polygon) < 3:
        return {"valid": False, "message": "Polygon requires at least 3 vertices", "vertex_count": len(polygon), "area_km2": None}
    for pair in polygon:
        if len(pair) != 2:
            return {"valid": False, "message": "Each vertex must be [lat, lng]", "vertex_count": len(polygon), "area_km2": None}
        lat, lng = pair
        if not (-90 <= lat <= 90):
            return {"valid": False, "message": f"Invalid latitude {lat}", "vertex_count": len(polygon), "area_km2": None}
        if not (-180 <= lng <= 180):
            return {"valid": False, "message": f"Invalid longitude {lng}", "vertex_count": len(polygon), "area_km2": None}
    area = _polygon_area_km2(polygon)
    return {
        "valid": True,
        "message": f"Polygon is valid · {len(polygon)} vertices · {area:.1f} km²",
        "vertex_count": len(polygon),
        "area_km2": round(area, 2),
    }


# ── Vehicle Classes ───────────────────────────────────────────────────────────

async def list_vehicle_classes(db: AsyncSession, include_inactive: bool = False):
    return await CatalogRepository(db).list_vehicle_classes(include_inactive)


async def create_vehicle_class(db: AsyncSession, data: dict):
    repo = CatalogRepository(db)
    if await repo.get_vehicle_class_by_code(data["code"]):
        raise ValidationException(f"Vehicle class code '{data['code']}' is already in use")
    now = datetime.now(timezone.utc)
    data.setdefault("created_at", now)
    data.setdefault("updated_at", now)
    return await repo.create_vehicle_class(data)


async def update_vehicle_class(db: AsyncSession, id: str, updates: dict):
    repo = CatalogRepository(db)
    obj = await repo.get_vehicle_class(id)
    if not obj:
        raise NotFoundException("VehicleClass")
    # Code is immutable once published
    updates.pop("code", None)
    if updates:
        await repo.update_vehicle_class(id, updates)
        await db.commit()
        await db.refresh(obj)
    return obj


async def deactivate_vehicle_class(db: AsyncSession, id: str):
    repo = CatalogRepository(db)
    obj = await repo.get_vehicle_class(id)
    if not obj:
        raise NotFoundException("VehicleClass")
    await repo.update_vehicle_class(id, {"is_active": False})


# ── Aircraft Types ────────────────────────────────────────────────────────────

async def list_aircraft_types(db: AsyncSession, include_inactive: bool = False):
    return await CatalogRepository(db).list_aircraft_types(include_inactive)


async def create_aircraft_type(db: AsyncSession, data: dict):
    repo = CatalogRepository(db)
    if await repo.get_aircraft_type_by_code(data["code"]):
        raise ValidationException(f"Aircraft type code '{data['code']}' is already in use")
    now = datetime.now(timezone.utc)
    data.setdefault("created_at", now)
    data.setdefault("updated_at", now)
    return await repo.create_aircraft_type(data)


async def update_aircraft_type(db: AsyncSession, id: str, updates: dict):
    repo = CatalogRepository(db)
    obj = await repo.get_aircraft_type(id)
    if not obj:
        raise NotFoundException("AircraftType")
    updates.pop("code", None)
    if updates:
        await repo.update_aircraft_type(id, updates)
        await db.commit()
        await db.refresh(obj)
    return obj


async def deactivate_aircraft_type(db: AsyncSession, id: str):
    repo = CatalogRepository(db)
    obj = await repo.get_aircraft_type(id)
    if not obj:
        raise NotFoundException("AircraftType")
    await repo.update_aircraft_type(id, {"is_active": False})


# ── Service Zones ─────────────────────────────────────────────────────────────

async def list_service_zones(db: AsyncSession, include_inactive: bool = False):
    return await CatalogRepository(db).list_service_zones(include_inactive)


async def create_service_zone(db: AsyncSession, data: dict):
    repo = CatalogRepository(db)
    if await repo.get_service_zone_by_code(data["code"]):
        raise ValidationException(f"Zone code '{data['code']}' is already in use")
    result = _validate_polygon(data.get("polygon", []))
    if not result["valid"]:
        raise ValidationException(result["message"])
    now = datetime.now(timezone.utc)
    data.setdefault("created_at", now)
    data.setdefault("updated_at", now)
    return await repo.create_service_zone(data)


async def update_service_zone(db: AsyncSession, id: str, updates: dict):
    repo = CatalogRepository(db)
    obj = await repo.get_service_zone(id)
    if not obj:
        raise NotFoundException("ServiceZone")
    updates.pop("code", None)
    if "polygon" in updates:
        result = _validate_polygon(updates["polygon"])
        if not result["valid"]:
            raise ValidationException(result["message"])
    if updates:
        await repo.update_service_zone(id, updates)
        await db.commit()
        await db.refresh(obj)
    return obj


async def publish_service_zone(db: AsyncSession, id: str):
    repo = CatalogRepository(db)
    obj = await repo.get_service_zone(id)
    if not obj:
        raise NotFoundException("ServiceZone")
    await repo.publish_service_zone(id)
    await db.commit()
    await db.refresh(obj)
    return obj


async def validate_zone_geometry(polygon: List[List[float]]) -> dict:
    return _validate_polygon(polygon)


# ── Air Routes ────────────────────────────────────────────────────────────────

async def list_air_routes(db: AsyncSession, include_inactive: bool = False):
    return await CatalogRepository(db).list_air_routes(include_inactive)


async def create_air_route(db: AsyncSession, data: dict):
    repo = CatalogRepository(db)
    if await repo.get_air_route_by_code(data["code"]):
        raise ValidationException(f"Route code '{data['code']}' is already in use")
    now = datetime.now(timezone.utc)
    data.setdefault("created_at", now)
    data.setdefault("updated_at", now)
    return await repo.create_air_route(data)


async def update_air_route(db: AsyncSession, id: str, updates: dict):
    repo = CatalogRepository(db)
    obj = await repo.get_air_route(id)
    if not obj:
        raise NotFoundException("AirRoute")
    updates.pop("code", None)
    if updates:
        await repo.update_air_route(id, updates)
        await db.commit()
        await db.refresh(obj)
    return obj


async def deactivate_air_route(db: AsyncSession, id: str):
    repo = CatalogRepository(db)
    obj = await repo.get_air_route(id)
    if not obj:
        raise NotFoundException("AirRoute")
    await repo.update_air_route(id, {"is_active": False})

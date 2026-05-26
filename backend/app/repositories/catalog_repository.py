from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import AircraftType, AirRoute, ServiceZone, VehicleClass


class CatalogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Vehicle Classes ───────────────────────────────────────────────────────

    async def list_vehicle_classes(self, include_inactive: bool = False) -> List[VehicleClass]:
        q = select(VehicleClass)
        if not include_inactive:
            q = q.where(VehicleClass.is_active.is_(True))
        q = q.order_by(VehicleClass.sort_order.asc(), VehicleClass.name.asc())
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_vehicle_class(self, id: str) -> Optional[VehicleClass]:
        result = await self.db.execute(select(VehicleClass).where(VehicleClass.id == id))
        return result.scalar_one_or_none()

    async def get_vehicle_class_by_code(self, code: str) -> Optional[VehicleClass]:
        result = await self.db.execute(select(VehicleClass).where(VehicleClass.code == code))
        return result.scalar_one_or_none()

    async def create_vehicle_class(self, data: dict) -> VehicleClass:
        obj = VehicleClass(**data)
        self.db.add(obj)
        await self.db.flush()
        return obj

    async def update_vehicle_class(self, id: str, data: dict) -> None:
        data["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(update(VehicleClass).where(VehicleClass.id == id).values(**data))

    async def count_zone_refs_for_class(self, code: str) -> int:
        """Count zones that include this vehicle class code in active_service_codes."""
        result = await self.db.execute(
            select(func.count())
            .select_from(ServiceZone)
            .where(ServiceZone.is_active.is_(True))
        )
        # JSON_CONTAINS is DB-specific; load all and check in Python for portability
        zones = await self.list_service_zones(include_inactive=False)
        return sum(1 for z in zones if z.active_service_codes and code in z.active_service_codes)

    # ── Aircraft Types ────────────────────────────────────────────────────────

    async def list_aircraft_types(self, include_inactive: bool = False) -> List[AircraftType]:
        q = select(AircraftType)
        if not include_inactive:
            q = q.where(AircraftType.is_active.is_(True))
        q = q.order_by(AircraftType.category.asc(), AircraftType.name.asc())
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_aircraft_type(self, id: str) -> Optional[AircraftType]:
        result = await self.db.execute(select(AircraftType).where(AircraftType.id == id))
        return result.scalar_one_or_none()

    async def get_aircraft_type_by_code(self, code: str) -> Optional[AircraftType]:
        result = await self.db.execute(select(AircraftType).where(AircraftType.code == code))
        return result.scalar_one_or_none()

    async def create_aircraft_type(self, data: dict) -> AircraftType:
        obj = AircraftType(**data)
        self.db.add(obj)
        await self.db.flush()
        return obj

    async def update_aircraft_type(self, id: str, data: dict) -> None:
        data["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(update(AircraftType).where(AircraftType.id == id).values(**data))

    async def count_route_refs_for_type(self, code: str) -> int:
        """Count active routes that list this aircraft type code."""
        routes = await self.list_air_routes(include_inactive=False)
        return sum(1 for r in routes if r.eligible_type_codes and code in r.eligible_type_codes)

    # ── Service Zones ─────────────────────────────────────────────────────────

    async def list_service_zones(self, include_inactive: bool = False) -> List[ServiceZone]:
        q = select(ServiceZone)
        if not include_inactive:
            q = q.where(ServiceZone.is_active.is_(True))
        q = q.order_by(ServiceZone.priority.asc(), ServiceZone.code.asc())
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_service_zone(self, id: str) -> Optional[ServiceZone]:
        result = await self.db.execute(select(ServiceZone).where(ServiceZone.id == id))
        return result.scalar_one_or_none()

    async def get_service_zone_by_code(self, code: str) -> Optional[ServiceZone]:
        result = await self.db.execute(select(ServiceZone).where(ServiceZone.code == code))
        return result.scalar_one_or_none()

    async def create_service_zone(self, data: dict) -> ServiceZone:
        obj = ServiceZone(**data)
        self.db.add(obj)
        await self.db.flush()
        return obj

    async def update_service_zone(self, id: str, data: dict) -> None:
        data["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(update(ServiceZone).where(ServiceZone.id == id).values(**data))

    async def publish_service_zone(self, id: str) -> None:
        """Increment version number to mark polygon changes as published."""
        zone = await self.get_service_zone(id)
        if zone:
            await self.db.execute(
                update(ServiceZone)
                .where(ServiceZone.id == id)
                .values(version=zone.version + 1, updated_at=datetime.now(timezone.utc))
            )

    # ── Air Routes ────────────────────────────────────────────────────────────

    async def list_air_routes(self, include_inactive: bool = False) -> List[AirRoute]:
        q = select(AirRoute)
        if not include_inactive:
            q = q.where(AirRoute.is_active.is_(True))
        q = q.order_by(AirRoute.code.asc())
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_air_route(self, id: str) -> Optional[AirRoute]:
        result = await self.db.execute(select(AirRoute).where(AirRoute.id == id))
        return result.scalar_one_or_none()

    async def get_air_route_by_code(self, code: str) -> Optional[AirRoute]:
        result = await self.db.execute(select(AirRoute).where(AirRoute.code == code))
        return result.scalar_one_or_none()

    async def create_air_route(self, data: dict) -> AirRoute:
        obj = AirRoute(**data)
        self.db.add(obj)
        await self.db.flush()
        return obj

    async def update_air_route(self, id: str, data: dict) -> None:
        data["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(update(AirRoute).where(AirRoute.id == id).values(**data))

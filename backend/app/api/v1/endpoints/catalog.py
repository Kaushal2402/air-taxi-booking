from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.catalog import (
    AircraftTypeCreate, AircraftTypeResponse, AircraftTypeUpdate,
    AirRouteCreate, AirRouteResponse, AirRouteUpdate,
    GeometryValidationResponse,
    ServiceZoneCreate, ServiceZoneResponse, ServiceZoneUpdate,
    VehicleClassCreate, VehicleClassResponse, VehicleClassUpdate,
)
from app.schemas.common import MessageResponse
from app.services import catalog_service

router = APIRouter()


# ── Vehicle Classes ───────────────────────────────────────────────────────────

@router.get("/vehicle-classes", response_model=List[VehicleClassResponse])
async def list_vehicle_classes(
    include_inactive: bool = Query(False),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.list_vehicle_classes(db, include_inactive)


@router.post("/vehicle-classes", response_model=VehicleClassResponse, status_code=201)
async def create_vehicle_class(
    body: VehicleClassCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.create_vehicle_class(db, body.model_dump())


@router.patch("/vehicle-classes/{id}", response_model=VehicleClassResponse)
async def update_vehicle_class(
    id: str,
    body: VehicleClassUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.update_vehicle_class(db, id, body.model_dump(exclude_unset=True))


@router.delete("/vehicle-classes/{id}", response_model=MessageResponse)
async def deactivate_vehicle_class(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await catalog_service.deactivate_vehicle_class(db, id)
    return MessageResponse(message="Vehicle class deactivated")


# ── Aircraft Types ────────────────────────────────────────────────────────────

@router.get("/aircraft-types", response_model=List[AircraftTypeResponse])
async def list_aircraft_types(
    include_inactive: bool = Query(False),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.list_aircraft_types(db, include_inactive)


@router.post("/aircraft-types", response_model=AircraftTypeResponse, status_code=201)
async def create_aircraft_type(
    body: AircraftTypeCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.create_aircraft_type(db, body.model_dump())


@router.patch("/aircraft-types/{id}", response_model=AircraftTypeResponse)
async def update_aircraft_type(
    id: str,
    body: AircraftTypeUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.update_aircraft_type(db, id, body.model_dump(exclude_unset=True))


@router.delete("/aircraft-types/{id}", response_model=MessageResponse)
async def deactivate_aircraft_type(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await catalog_service.deactivate_aircraft_type(db, id)
    return MessageResponse(message="Aircraft type deactivated")


# ── Service Zones ─────────────────────────────────────────────────────────────

@router.get("/zones", response_model=List[ServiceZoneResponse])
async def list_service_zones(
    include_inactive: bool = Query(False),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.list_service_zones(db, include_inactive)


@router.post("/zones", response_model=ServiceZoneResponse, status_code=201)
async def create_service_zone(
    body: ServiceZoneCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.create_service_zone(db, body.model_dump())


@router.patch("/zones/{id}", response_model=ServiceZoneResponse)
async def update_service_zone(
    id: str,
    body: ServiceZoneUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.update_service_zone(db, id, body.model_dump(exclude_unset=True))


@router.post("/zones/{id}/publish", response_model=ServiceZoneResponse)
async def publish_service_zone(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.publish_service_zone(db, id)


@router.post("/zones/validate-geometry", response_model=GeometryValidationResponse)
async def validate_zone_geometry(
    body: dict,
    _: AdminUser = Depends(get_current_admin_user),
):
    polygon = body.get("polygon", [])
    result = await catalog_service.validate_zone_geometry(polygon)
    return GeometryValidationResponse(**result)


@router.delete("/zones/{id}", response_model=MessageResponse)
async def deactivate_service_zone(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    from app.core.exceptions import NotFoundException
    from app.repositories.catalog_repository import CatalogRepository
    repo = CatalogRepository(db)
    obj = await repo.get_service_zone(id)
    if not obj:
        raise NotFoundException("ServiceZone")
    await repo.update_service_zone(id, {"is_active": False})
    return MessageResponse(message="Service zone deactivated")


# ── Air Routes ────────────────────────────────────────────────────────────────

@router.get("/air-routes", response_model=List[AirRouteResponse])
async def list_air_routes(
    include_inactive: bool = Query(False),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.list_air_routes(db, include_inactive)


@router.post("/air-routes", response_model=AirRouteResponse, status_code=201)
async def create_air_route(
    body: AirRouteCreate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.create_air_route(db, body.model_dump())


@router.patch("/air-routes/{id}", response_model=AirRouteResponse)
async def update_air_route(
    id: str,
    body: AirRouteUpdate,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await catalog_service.update_air_route(db, id, body.model_dump(exclude_unset=True))


@router.delete("/air-routes/{id}", response_model=MessageResponse)
async def deactivate_air_route(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await catalog_service.deactivate_air_route(db, id)
    return MessageResponse(message="Air route deactivated")

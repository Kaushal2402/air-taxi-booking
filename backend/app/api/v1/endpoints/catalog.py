from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query, Request

from app.database import get_db
from app.dependencies import get_current_admin_user, require_permission
from app.models.admin_user import AdminUser
from app.schemas.catalog import (
    AircraftTypeCreate, AircraftTypeResponse, AircraftTypeUpdate,
    AirRouteCreate, AirRouteResponse, AirRouteUpdate,
    GeometryValidationResponse,
    ServiceZoneCreate, ServiceZoneResponse, ServiceZoneUpdate,
    VehicleClassCreate, VehicleClassResponse, VehicleClassUpdate,
)
from app.schemas.common import MessageResponse
from app.services import audit_service, catalog_service

router = APIRouter()


# ── Vehicle Classes ───────────────────────────────────────────────────────────

@router.get("/vehicle-classes", response_model=List[VehicleClassResponse])
async def list_vehicle_classes(
    include_inactive: bool = Query(False),
    _: AdminUser = Depends(require_permission("catalog.vehicle_classes.view")),
    db=Depends(get_db),
):
    return await catalog_service.list_vehicle_classes(db, include_inactive)


@router.post("/vehicle-classes", response_model=VehicleClassResponse, status_code=201)
async def create_vehicle_class(
    body: VehicleClassCreate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("catalog.vehicle_classes.manage")),
    db=Depends(get_db),
):
    result = await catalog_service.create_vehicle_class(db, body.model_dump())
    try:
        await audit_service.log_event(db, actor_name=current_user.email, actor_role=current_user.role if hasattr(current_user, "role") else "Admin", action="catalog.vehicle_class_created", target=f"vehicle_class:{result.id}", category="Configuration", severity="med", source_ip=request.client.host if request.client else None)
    except Exception:
        pass
    return result


@router.patch("/vehicle-classes/{id}", response_model=VehicleClassResponse)
async def update_vehicle_class(
    id: str,
    body: VehicleClassUpdate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("catalog.vehicle_classes.manage")),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await catalog_service.update_vehicle_class(db, id, changes)
    try:
        await audit_service.log_event(db, actor_name=current_user.email, actor_role=current_user.role if hasattr(current_user, "role") else "Admin", action="catalog.vehicle_class_updated", target=f"vehicle_class:{id}", category="Configuration", severity="med", source_ip=request.client.host if request.client else None, after_data=changes)
    except Exception:
        pass
    return result


@router.delete("/vehicle-classes/{id}", response_model=MessageResponse)
async def deactivate_vehicle_class(
    id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("catalog.vehicle_classes.manage")),
    db=Depends(get_db),
):
    await catalog_service.deactivate_vehicle_class(db, id)
    try:
        await audit_service.log_event(db, actor_name=current_user.email, actor_role=current_user.role if hasattr(current_user, "role") else "Admin", action="catalog.vehicle_class_deactivated", target=f"vehicle_class:{id}", category="Configuration", severity="med", source_ip=request.client.host if request.client else None)
    except Exception:
        pass
    return MessageResponse(message="Vehicle class deactivated")


# ── Aircraft Types ────────────────────────────────────────────────────────────

@router.get("/aircraft-types", response_model=List[AircraftTypeResponse])
async def list_aircraft_types(
    include_inactive: bool = Query(False),
    _: AdminUser = Depends(require_permission("catalog.aircraft_types.view")),
    db=Depends(get_db),
):
    return await catalog_service.list_aircraft_types(db, include_inactive)


@router.post("/aircraft-types", response_model=AircraftTypeResponse, status_code=201)
async def create_aircraft_type(
    body: AircraftTypeCreate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("catalog.aircraft_types.manage")),
    db=Depends(get_db),
):
    result = await catalog_service.create_aircraft_type(db, body.model_dump())
    try:
        await audit_service.log_event(db, actor_name=current_user.email, actor_role=current_user.role if hasattr(current_user, "role") else "Admin", action="catalog.aircraft_type_created", target=f"aircraft_type:{result.id}", category="Configuration", severity="med", source_ip=request.client.host if request.client else None)
    except Exception:
        pass
    return result


@router.patch("/aircraft-types/{id}", response_model=AircraftTypeResponse)
async def update_aircraft_type(
    id: str,
    body: AircraftTypeUpdate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("catalog.aircraft_types.manage")),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await catalog_service.update_aircraft_type(db, id, changes)
    try:
        await audit_service.log_event(db, actor_name=current_user.email, actor_role=current_user.role if hasattr(current_user, "role") else "Admin", action="catalog.aircraft_type_updated", target=f"aircraft_type:{id}", category="Configuration", severity="med", source_ip=request.client.host if request.client else None, after_data=changes)
    except Exception:
        pass
    return result


@router.delete("/aircraft-types/{id}", response_model=MessageResponse)
async def deactivate_aircraft_type(
    id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("catalog.aircraft_types.manage")),
    db=Depends(get_db),
):
    await catalog_service.deactivate_aircraft_type(db, id)
    try:
        await audit_service.log_event(db, actor_name=current_user.email, actor_role=current_user.role if hasattr(current_user, "role") else "Admin", action="catalog.aircraft_type_deactivated", target=f"aircraft_type:{id}", category="Configuration", severity="med", source_ip=request.client.host if request.client else None)
    except Exception:
        pass
    return MessageResponse(message="Aircraft type deactivated")


# ── Service Zones ─────────────────────────────────────────────────────────────

@router.get("/zones", response_model=List[ServiceZoneResponse])
async def list_service_zones(
    include_inactive: bool = Query(False),
    _: AdminUser = Depends(require_permission("catalog.zones.view")),
    db=Depends(get_db),
):
    return await catalog_service.list_service_zones(db, include_inactive)


@router.post("/zones", response_model=ServiceZoneResponse, status_code=201)
async def create_service_zone(
    body: ServiceZoneCreate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("catalog.zones.manage")),
    db=Depends(get_db),
):
    result = await catalog_service.create_service_zone(db, body.model_dump())
    try:
        await audit_service.log_event(db, actor_name=current_user.email, actor_role=current_user.role if hasattr(current_user, "role") else "Admin", action="catalog.service_zone_created", target=f"service_zone:{result.id}", category="Configuration", severity="med", source_ip=request.client.host if request.client else None)
    except Exception:
        pass
    return result


@router.patch("/zones/{id}", response_model=ServiceZoneResponse)
async def update_service_zone(
    id: str,
    body: ServiceZoneUpdate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("catalog.zones.manage")),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await catalog_service.update_service_zone(db, id, changes)
    try:
        await audit_service.log_event(db, actor_name=current_user.email, actor_role=current_user.role if hasattr(current_user, "role") else "Admin", action="catalog.service_zone_updated", target=f"service_zone:{id}", category="Configuration", severity="med", source_ip=request.client.host if request.client else None, after_data=changes)
    except Exception:
        pass
    return result


@router.post("/zones/{id}/publish", response_model=ServiceZoneResponse)
async def publish_service_zone(
    id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("catalog.zones.manage")),
    db=Depends(get_db),
):
    result = await catalog_service.publish_service_zone(db, id)
    try:
        await audit_service.log_event(db, actor_name=current_user.email, actor_role=current_user.role if hasattr(current_user, "role") else "Admin", action="catalog.service_zone_published", target=f"service_zone:{id}", category="Configuration", severity="med", source_ip=request.client.host if request.client else None)
    except Exception:
        pass
    return result


@router.post("/zones/validate-geometry", response_model=GeometryValidationResponse)
async def validate_zone_geometry(
    body: dict,
    _: AdminUser = Depends(require_permission("catalog.zones.view")),
):
    polygon = body.get("polygon", [])
    result = await catalog_service.validate_zone_geometry(polygon)
    return GeometryValidationResponse(**result)


@router.delete("/zones/{id}", response_model=MessageResponse)
async def deactivate_service_zone(
    id: str,
    _: AdminUser = Depends(require_permission("catalog.zones.manage")),
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
    _: AdminUser = Depends(require_permission("catalog.routes.view")),
    db=Depends(get_db),
):
    return await catalog_service.list_air_routes(db, include_inactive)


@router.post("/air-routes", response_model=AirRouteResponse, status_code=201)
async def create_air_route(
    body: AirRouteCreate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("catalog.routes.manage")),
    db=Depends(get_db),
):
    result = await catalog_service.create_air_route(db, body.model_dump())
    try:
        await audit_service.log_event(db, actor_name=current_user.email, actor_role=current_user.role if hasattr(current_user, "role") else "Admin", action="catalog.air_route_created", target=f"air_route:{result.id}", category="Configuration", severity="med", source_ip=request.client.host if request.client else None)
    except Exception:
        pass
    return result


@router.patch("/air-routes/{id}", response_model=AirRouteResponse)
async def update_air_route(
    id: str,
    body: AirRouteUpdate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("catalog.routes.manage")),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await catalog_service.update_air_route(db, id, changes)
    try:
        await audit_service.log_event(db, actor_name=current_user.email, actor_role=current_user.role if hasattr(current_user, "role") else "Admin", action="catalog.air_route_updated", target=f"air_route:{id}", category="Configuration", severity="med", source_ip=request.client.host if request.client else None, after_data=changes)
    except Exception:
        pass
    return result


@router.delete("/air-routes/{id}", response_model=MessageResponse)
async def deactivate_air_route(
    id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("catalog.routes.manage")),
    db=Depends(get_db),
):
    await catalog_service.deactivate_air_route(db, id)
    try:
        await audit_service.log_event(db, actor_name=current_user.email, actor_role=current_user.role if hasattr(current_user, "role") else "Admin", action="catalog.air_route_deactivated", target=f"air_route:{id}", category="Configuration", severity="med", source_ip=request.client.host if request.client else None)
    except Exception:
        pass
    return MessageResponse(message="Air route deactivated")

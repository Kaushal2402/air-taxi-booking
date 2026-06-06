"""
Reference lookup endpoints — authenticated but no specific permission required.
Returns minimal id+name data for use in dropdowns and filters across the admin panel.
Any valid admin session can call these regardless of their role permissions.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.models.catalog import AircraftType, AirRoute, ServiceZone, VehicleClass  # type: ignore[attr-defined]
from app.models.driver import Driver
from app.models.operator import Operator

router = APIRouter()


class RefItem(BaseModel):
    id: str
    name: str


class RefZone(BaseModel):
    id: str
    name: str
    city: str | None = None


class RefRoute(BaseModel):
    id: str
    origin_name: str
    destination_name: str
    label: str  # "Origin → Destination"


class RefDriver(BaseModel):
    id: str
    name: str
    status: str


class RefOperator(BaseModel):
    id: str
    name: str
    status: str


@router.get("/vehicle-classes", response_model=list[RefItem])
async def ref_vehicle_classes(
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(VehicleClass.id, VehicleClass.name).order_by(VehicleClass.name)
    )).all()
    return [RefItem(id=r.id, name=r.name) for r in rows]


@router.get("/aircraft-types", response_model=list[RefItem])
async def ref_aircraft_types(
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(AircraftType.id, AircraftType.name).order_by(AircraftType.name)
    )).all()
    return [RefItem(id=r.id, name=r.name) for r in rows]


@router.get("/zones", response_model=list[RefZone])
async def ref_zones(
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(ServiceZone.id, ServiceZone.name, ServiceZone.tax_jurisdiction).order_by(ServiceZone.name)
    )).all()
    return [RefZone(id=r.id, name=r.name, city=r.tax_jurisdiction) for r in rows]


@router.get("/air-routes", response_model=list[RefRoute])
async def ref_air_routes(
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(AirRoute.id, AirRoute.origin_name, AirRoute.destination_name)
        .order_by(AirRoute.origin_name)
    )).all()
    return [
        RefRoute(
            id=r.id,
            origin_name=r.origin_name,
            destination_name=r.destination_name,
            label=f"{r.origin_name} → {r.destination_name}",
        )
        for r in rows
    ]


@router.get("/operators", response_model=list[RefOperator])
async def ref_operators(
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(Operator.id, Operator.name, Operator.status)
        .where(Operator.status.in_(["active", "approved"]))
        .order_by(Operator.name)
    )).all()
    return [RefOperator(id=r.id, name=r.name, status=r.status) for r in rows]


@router.get("/drivers", response_model=list[RefDriver])
async def ref_drivers(
    _: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(Driver.id, Driver.name, Driver.status)
        .where(Driver.status == "active")
        .order_by(Driver.name)
    )).all()
    return [RefDriver(id=str(r.id), name=r.name, status=r.status) for r in rows]

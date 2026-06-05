from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models.admin_user import AdminUser
from app.schemas.pricing import (
    AirRuleCreate, AirRuleResponse, AirRuleUpdate,
    PaginatedAirRules,
    PaginatedRoadRules,
    PaginatedTaxRules,
    RoadRuleCreate, RoadRuleResponse, RoadRuleUpdate,
    SimulateRequest, SimulateResponse,
    TaxRuleCreate, TaxRuleResponse, TaxRuleUpdate,
)
from app.schemas.common import MessageResponse
from app.services import audit_service, pricing_service

pricing_router = APIRouter()


# ── Road Fare Rules ───────────────────────────────────────────────────────────

@pricing_router.get("/road-rules", response_model=PaginatedRoadRules)
async def list_road_rules(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    vehicle_class_id: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await pricing_service.list_road_rules(
        db,
        search=search,
        status=status,
        vehicle_class_id=vehicle_class_id,
        zone_id=zone_id,
        page=page,
        per_page=per_page,
    )


@pricing_router.post("/road-rules", response_model=RoadRuleResponse, status_code=201)
async def create_road_rule(
    body: RoadRuleCreate,
    request: Request,
    admin: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await pricing_service.create_road_rule(db, body.model_dump())
    try:
        await audit_service.log_event(db, actor_name=admin.email, actor_role=admin.role if hasattr(admin, "role") else "Admin", action="pricing.road.created", target=f"road_rule:{result.id}", category="Pricing", severity="med", source_ip=request.client.host if request.client else None)
    except Exception:
        pass
    return result


@pricing_router.get("/road-rules/{id}", response_model=RoadRuleResponse)
async def get_road_rule(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await pricing_service.get_road_rule(db, id)


@pricing_router.patch("/road-rules/{id}", response_model=RoadRuleResponse)
async def update_road_rule(
    id: str,
    body: RoadRuleUpdate,
    request: Request,
    admin: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await pricing_service.update_road_rule(db, id, changes)
    try:
        await audit_service.log_event(db, actor_name=admin.email, actor_role=admin.role if hasattr(admin, "role") else "Admin", action="pricing.road.updated", target=f"road_rule:{id}", category="Pricing", severity="med", source_ip=request.client.host if request.client else None, after_data=changes)
    except Exception:
        pass
    return result


@pricing_router.post("/road-rules/{id}/publish", response_model=RoadRuleResponse)
async def publish_road_rule(
    id: str,
    request: Request,
    admin: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await pricing_service.publish_road_rule(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="pricing.road.publish",
            target=f"road_rule:{id}",
            category="Pricing",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@pricing_router.delete("/road-rules/{id}", response_model=MessageResponse)
async def delete_road_rule(
    id: str,
    request: Request,
    admin: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await pricing_service.delete_road_rule(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="pricing.road.delete",
            target=f"road_rule:{id}",
            category="Pricing",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="Rule deleted")


# ── Air Fare Rules ────────────────────────────────────────────────────────────

@pricing_router.get("/air-rules", response_model=PaginatedAirRules)
async def list_air_rules(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await pricing_service.list_air_rules(
        db,
        search=search,
        status=status,
        category=category,
        page=page,
        per_page=per_page,
    )


@pricing_router.post("/air-rules", response_model=AirRuleResponse, status_code=201)
async def create_air_rule(
    body: AirRuleCreate,
    request: Request,
    admin: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await pricing_service.create_air_rule(db, body.model_dump())
    try:
        await audit_service.log_event(db, actor_name=admin.email, actor_role=admin.role if hasattr(admin, "role") else "Admin", action="pricing.air.created", target=f"air_rule:{result.id}", category="Pricing", severity="med", source_ip=request.client.host if request.client else None)
    except Exception:
        pass
    return result


@pricing_router.get("/air-rules/{id}", response_model=AirRuleResponse)
async def get_air_rule(
    id: str,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await pricing_service.get_air_rule(db, id)


@pricing_router.patch("/air-rules/{id}", response_model=AirRuleResponse)
async def update_air_rule(
    id: str,
    body: AirRuleUpdate,
    request: Request,
    admin: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await pricing_service.update_air_rule(db, id, changes)
    try:
        await audit_service.log_event(db, actor_name=admin.email, actor_role=admin.role if hasattr(admin, "role") else "Admin", action="pricing.air.updated", target=f"air_rule:{id}", category="Pricing", severity="med", source_ip=request.client.host if request.client else None, after_data=changes)
    except Exception:
        pass
    return result


@pricing_router.post("/air-rules/{id}/publish", response_model=AirRuleResponse)
async def publish_air_rule(
    id: str,
    request: Request,
    admin: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await pricing_service.publish_air_rule(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="pricing.air.publish",
            target=f"air_rule:{id}",
            category="Pricing",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@pricing_router.delete("/air-rules/{id}", response_model=MessageResponse)
async def delete_air_rule(
    id: str,
    request: Request,
    admin: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await pricing_service.delete_air_rule(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="pricing.air.delete",
            target=f"air_rule:{id}",
            category="Pricing",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="Air rule deleted")


# ── Tax Rules ─────────────────────────────────────────────────────────────────

@pricing_router.get("/taxes", response_model=PaginatedTaxRules)
async def list_taxes(
    active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await pricing_service.list_taxes(db, active=active, page=page, per_page=per_page)


@pricing_router.post("/taxes", response_model=TaxRuleResponse, status_code=201)
async def create_tax(
    body: TaxRuleCreate,
    request: Request,
    admin: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    result = await pricing_service.create_tax(db, body.model_dump())
    try:
        await audit_service.log_event(db, actor_name=admin.email, actor_role=admin.role if hasattr(admin, "role") else "Admin", action="pricing.tax.created", target=f"tax_rule:{result.id}", category="Pricing", severity="med", source_ip=request.client.host if request.client else None)
    except Exception:
        pass
    return result


@pricing_router.patch("/taxes/{id}", response_model=TaxRuleResponse)
async def update_tax(
    id: str,
    body: TaxRuleUpdate,
    request: Request,
    admin: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await pricing_service.update_tax(db, id, changes)
    try:
        await audit_service.log_event(db, actor_name=admin.email, actor_role=admin.role if hasattr(admin, "role") else "Admin", action="pricing.tax.updated", target=f"tax_rule:{id}", category="Pricing", severity="med", source_ip=request.client.host if request.client else None, after_data=changes)
    except Exception:
        pass
    return result


@pricing_router.delete("/taxes/{id}", response_model=MessageResponse)
async def delete_tax(
    id: str,
    request: Request,
    admin: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    await pricing_service.delete_tax(db, id)
    try:
        await audit_service.log_event(db, actor_name=admin.email, actor_role=admin.role if hasattr(admin, "role") else "Admin", action="pricing.tax.deleted", target=f"tax_rule:{id}", category="Pricing", severity="med", source_ip=request.client.host if request.client else None)
    except Exception:
        pass
    return MessageResponse(message="Tax rule deleted")


# ── Fare Simulator ────────────────────────────────────────────────────────────

@pricing_router.post("/simulate", response_model=SimulateResponse)
async def simulate_fare(
    body: SimulateRequest,
    _: AdminUser = Depends(get_current_admin_user),
    db=Depends(get_db),
):
    return await pricing_service.simulate_fare(db, body)

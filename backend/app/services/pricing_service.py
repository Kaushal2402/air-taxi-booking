from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pricing import AirFareRule, PricingRule, TaxRule
from app.models.catalog import ServiceZone, VehicleClass
from app.core.currency import currency_symbol
from app.services.settings_service import get_base_currency, get_settings, is_kill_switch_active
from app.schemas.pricing import (
    SimulateBreakdownItem,
    SimulateRequest,
    SimulateResponse,
    SimulateRuleResult,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _time_to_minutes(time_str: str) -> int:
    """Convert 'HH:MM' to minutes since midnight."""
    h, m = time_str.split(":")
    return int(h) * 60 + int(m)


def _time_in_window(time_str: str, window_start: Optional[str], window_end: Optional[str]) -> bool:
    """Return True if time_str falls within [window_start, window_end].
    Handles overnight windows (e.g. 23:00–05:00 wraps midnight).
    If either bound is None, the modifier is always active (no time restriction).
    """
    if window_start is None or window_end is None:
        return True
    t = _time_to_minutes(time_str)
    s = _time_to_minutes(window_start)
    e = _time_to_minutes(window_end)
    if s <= e:
        return s <= t <= e
    # Overnight wrap
    return t >= s or t <= e


def _generate_rule_code(zone_code: str, class_code: str, version: int) -> str:
    """Format: PR-{ZONE_CODE}-{CLASS_CODE}-{version zero-padded to 2 digits}."""
    return f"PR-{zone_code.upper()}-{class_code.upper()}-{version:02d}"


def _generate_air_rule_code() -> str:
    """Simple unique code for air fare rules using a short UUID fragment."""
    return f"PR-AIR-{uuid.uuid4().hex[:8].upper()}"


# ── Road (Ground) Fare Rules ──────────────────────────────────────────────────

async def list_road_rules(
    db: AsyncSession,
    search: Optional[str] = None,
    status: Optional[str] = None,
    vehicle_class_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    page: int = 1,
    per_page: int = 25,
) -> Dict[str, Any]:
    per_page = min(per_page, 100)
    offset = (page - 1) * per_page

    stmt = select(PricingRule)

    if status:
        stmt = stmt.where(PricingRule.status == status)
    if vehicle_class_id:
        stmt = stmt.where(PricingRule.vehicle_class_id == vehicle_class_id)
    if zone_id:
        stmt = stmt.where(PricingRule.zone_id == zone_id)

    # For search we need to join zone/vehicle_class names — do a sub-query approach
    if search:
        zone_sub = select(ServiceZone.id).where(ServiceZone.name.ilike(f"%{search}%"))
        vc_sub = select(VehicleClass.id).where(VehicleClass.name.ilike(f"%{search}%"))
        stmt = stmt.where(
            or_(PricingRule.zone_id.in_(zone_sub), PricingRule.vehicle_class_id.in_(vc_sub))
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total: int = total_result.scalar_one()

    stmt = stmt.order_by(PricingRule.created_at.desc()).offset(offset).limit(per_page)
    result = await db.execute(stmt)
    rules = list(result.scalars().all())

    # Eagerly attach zone_name / vehicle_class_name
    items = []
    for rule in rules:
        zone_res = await db.execute(select(ServiceZone).where(ServiceZone.id == rule.zone_id))
        zone = zone_res.scalar_one_or_none()
        vc_res = await db.execute(select(VehicleClass).where(VehicleClass.id == rule.vehicle_class_id))
        vc = vc_res.scalar_one_or_none()
        rule.__dict__["zone_name"] = zone.name if zone else None
        rule.__dict__["vehicle_class_name"] = vc.name if vc else None
        items.append(rule)

    return {"items": items, "total": total, "page": page, "per_page": per_page}


async def get_road_rule(db: AsyncSession, id: str) -> PricingRule:
    result = await db.execute(select(PricingRule).where(PricingRule.id == id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Road rule not found")

    zone_res = await db.execute(select(ServiceZone).where(ServiceZone.id == rule.zone_id))
    zone = zone_res.scalar_one_or_none()
    vc_res = await db.execute(select(VehicleClass).where(VehicleClass.id == rule.vehicle_class_id))
    vc = vc_res.scalar_one_or_none()
    rule.__dict__["zone_name"] = zone.name if zone else None
    rule.__dict__["vehicle_class_name"] = vc.name if vc else None
    return rule


async def create_road_rule(db: AsyncSession, data: Dict[str, Any]) -> PricingRule:
    # Validate zone and vehicle_class exist
    zone_res = await db.execute(select(ServiceZone).where(ServiceZone.id == data["zone_id"]))
    zone = zone_res.scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="ServiceZone not found")

    vc_res = await db.execute(select(VehicleClass).where(VehicleClass.id == data["vehicle_class_id"]))
    vc = vc_res.scalar_one_or_none()
    if not vc:
        raise HTTPException(status_code=404, detail="VehicleClass not found")

    version = 1
    rule_code = _generate_rule_code(zone.code, vc.code, version)

    now = _utcnow()
    rule = PricingRule(
        rule_code=rule_code,
        status="draft",
        version=version,
        created_at=now,
        updated_at=now,
        **{k: v for k, v in data.items()},
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    rule.__dict__["zone_name"] = zone.name
    rule.__dict__["vehicle_class_name"] = vc.name
    return rule


async def update_road_rule(db: AsyncSession, id: str, data: Dict[str, Any]) -> PricingRule:
    result = await db.execute(select(PricingRule).where(PricingRule.id == id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Road rule not found")
    if rule.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft rules can be updated")

    for k, v in data.items():
        setattr(rule, k, v)
    rule.updated_at = _utcnow()
    await db.commit()
    await db.refresh(rule)

    zone_res = await db.execute(select(ServiceZone).where(ServiceZone.id == rule.zone_id))
    zone = zone_res.scalar_one_or_none()
    vc_res = await db.execute(select(VehicleClass).where(VehicleClass.id == rule.vehicle_class_id))
    vc = vc_res.scalar_one_or_none()
    rule.__dict__["zone_name"] = zone.name if zone else None
    rule.__dict__["vehicle_class_name"] = vc.name if vc else None
    return rule


async def publish_road_rule(db: AsyncSession, id: str) -> PricingRule:
    result = await db.execute(select(PricingRule).where(PricingRule.id == id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Road rule not found")
    if rule.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft rules can be published")

    # Find current live rule for same zone + vehicle_class → set to past
    live_stmt = select(PricingRule).where(
        PricingRule.zone_id == rule.zone_id,
        PricingRule.vehicle_class_id == rule.vehicle_class_id,
        PricingRule.status == "live",
    )
    live_result = await db.execute(live_stmt)
    for live_rule in live_result.scalars().all():
        live_rule.status = "past"
        live_rule.updated_at = _utcnow()

    # Determine next version: max existing version for this zone+class + 1
    max_ver_stmt = select(func.max(PricingRule.version)).where(
        PricingRule.zone_id == rule.zone_id,
        PricingRule.vehicle_class_id == rule.vehicle_class_id,
    )
    max_ver_res = await db.execute(max_ver_stmt)
    max_version: int = max_ver_res.scalar_one() or 0
    new_version = max_version + 1

    # Regenerate code with new version
    zone_res = await db.execute(select(ServiceZone).where(ServiceZone.id == rule.zone_id))
    zone = zone_res.scalar_one_or_none()
    vc_res = await db.execute(select(VehicleClass).where(VehicleClass.id == rule.vehicle_class_id))
    vc = vc_res.scalar_one_or_none()

    now = _utcnow()
    rule.status = "live"
    rule.version = new_version
    rule.published_at = now
    rule.updated_at = now
    if zone and vc:
        rule.rule_code = _generate_rule_code(zone.code, vc.code, new_version)

    await db.commit()
    await db.refresh(rule)
    rule.__dict__["zone_name"] = zone.name if zone else None
    rule.__dict__["vehicle_class_name"] = vc.name if vc else None
    return rule


async def delete_road_rule(db: AsyncSession, id: str) -> None:
    result = await db.execute(select(PricingRule).where(PricingRule.id == id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Road rule not found")
    if rule.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft rules can be deleted")
    await db.delete(rule)
    await db.commit()


# ── Air Fare Rules ────────────────────────────────────────────────────────────

async def list_air_rules(
    db: AsyncSession,
    search: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    per_page: int = 25,
) -> Dict[str, Any]:
    per_page = min(per_page, 100)
    offset = (page - 1) * per_page

    stmt = select(AirFareRule)

    if status:
        stmt = stmt.where(AirFareRule.status == status)
    if category:
        stmt = stmt.where(AirFareRule.category == category)
    if search:
        stmt = stmt.where(
            or_(
                AirFareRule.route_name.ilike(f"%{search}%"),
                AirFareRule.aircraft_type.ilike(f"%{search}%"),
                AirFareRule.rule_code.ilike(f"%{search}%"),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total: int = total_result.scalar_one()

    stmt = stmt.order_by(AirFareRule.created_at.desc()).offset(offset).limit(per_page)
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return {"items": items, "total": total, "page": page, "per_page": per_page}


async def get_air_rule(db: AsyncSession, id: str) -> AirFareRule:
    result = await db.execute(select(AirFareRule).where(AirFareRule.id == id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Air fare rule not found")
    return rule


async def create_air_rule(db: AsyncSession, data: Dict[str, Any]) -> AirFareRule:
    now = _utcnow()
    rule_code = _generate_air_rule_code()
    rule = AirFareRule(
        rule_code=rule_code,
        status="draft",
        version=1,
        created_at=now,
        updated_at=now,
        **{k: v for k, v in data.items()},
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


async def update_air_rule(db: AsyncSession, id: str, data: Dict[str, Any]) -> AirFareRule:
    result = await db.execute(select(AirFareRule).where(AirFareRule.id == id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Air fare rule not found")
    if rule.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft rules can be updated")

    for k, v in data.items():
        setattr(rule, k, v)
    rule.updated_at = _utcnow()
    await db.commit()
    await db.refresh(rule)
    return rule


async def publish_air_rule(db: AsyncSession, id: str) -> AirFareRule:
    result = await db.execute(select(AirFareRule).where(AirFareRule.id == id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Air fare rule not found")
    if rule.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft rules can be published")

    # Find current live rule for same route + category → set to past
    live_stmt = select(AirFareRule).where(
        AirFareRule.route_name == rule.route_name,
        AirFareRule.category == rule.category,
        AirFareRule.status == "live",
    )
    live_result = await db.execute(live_stmt)
    for live_rule in live_result.scalars().all():
        live_rule.status = "past"
        live_rule.updated_at = _utcnow()

    # Determine next version
    max_ver_stmt = select(func.max(AirFareRule.version)).where(
        AirFareRule.route_name == rule.route_name,
        AirFareRule.category == rule.category,
    )
    max_ver_res = await db.execute(max_ver_stmt)
    max_version: int = max_ver_res.scalar_one() or 0
    new_version = max_version + 1

    now = _utcnow()
    rule.status = "live"
    rule.version = new_version
    rule.published_at = now
    rule.updated_at = now

    await db.commit()
    await db.refresh(rule)
    return rule


async def delete_air_rule(db: AsyncSession, id: str) -> None:
    result = await db.execute(select(AirFareRule).where(AirFareRule.id == id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Air fare rule not found")
    if rule.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft rules can be deleted")
    await db.delete(rule)
    await db.commit()


# ── Tax Rules ─────────────────────────────────────────────────────────────────

async def list_taxes(
    db: AsyncSession,
    active: Optional[bool] = None,
    page: int = 1,
    per_page: int = 50,
) -> Dict[str, Any]:
    per_page = min(per_page, 200)
    offset = (page - 1) * per_page

    stmt = select(TaxRule)
    if active is not None:
        stmt = stmt.where(TaxRule.active == active)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total: int = total_result.scalar_one()

    stmt = stmt.order_by(TaxRule.created_at.desc()).offset(offset).limit(per_page)
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return {"items": items, "total": total, "page": page, "per_page": per_page}


async def create_tax(db: AsyncSession, data: Dict[str, Any]) -> TaxRule:
    now = _utcnow()
    tax = TaxRule(created_at=now, updated_at=now, **data)
    db.add(tax)
    await db.commit()
    await db.refresh(tax)
    return tax


async def update_tax(db: AsyncSession, id: str, data: Dict[str, Any]) -> TaxRule:
    result = await db.execute(select(TaxRule).where(TaxRule.id == id))
    tax = result.scalar_one_or_none()
    if not tax:
        raise HTTPException(status_code=404, detail="Tax rule not found")
    for k, v in data.items():
        setattr(tax, k, v)
    tax.updated_at = _utcnow()
    await db.commit()
    await db.refresh(tax)
    return tax


async def delete_tax(db: AsyncSession, id: str) -> None:
    result = await db.execute(select(TaxRule).where(TaxRule.id == id))
    tax = result.scalar_one_or_none()
    if not tax:
        raise HTTPException(status_code=404, detail="Tax rule not found")
    await db.delete(tax)
    await db.commit()


# ── Fare Simulator ────────────────────────────────────────────────────────────

def _compute_fare(
    rule: PricingRule,
    req: SimulateRequest,
    sym: str = "₹",
    platform_surge_ceiling: float = 2.0,
    platform_free_waiting_minutes: Optional[int] = None,
    platform_waiting_charge_per_min: Optional[float] = None,
    surge_disabled: bool = False,
) -> SimulateRuleResult:
    """Compute fare for a single PricingRule given simulation inputs."""
    base_fare = float(rule.base_fare)
    per_km = float(rule.per_km)
    per_min = float(rule.per_min)
    min_fare = float(rule.min_fare)
    free_km = int(rule.free_km)
    free_min = int(rule.free_min)
    waiting_per_min = float(rule.waiting_per_min)
    # Platform settings override per-rule waiting values when set
    if platform_free_waiting_minutes is not None:
        free_min = platform_free_waiting_minutes
    if platform_waiting_charge_per_min is not None:
        waiting_per_min = platform_waiting_charge_per_min
    # Per-rule cap is clamped to the platform-wide ceiling (settings.surge_ceiling)
    surge_cap = min(float(rule.surge_cap), platform_surge_ceiling)

    breakdown: List[SimulateBreakdownItem] = []

    # Base fare
    breakdown.append(SimulateBreakdownItem(
        component="Base fare",
        rule_ref="base",
        inputs="—",
        amount=round(base_fare, 2),
    ))

    # Distance charge
    billable_km = max(0.0, req.distance_km - free_km)
    dist_amount = round(billable_km * per_km, 2)
    breakdown.append(SimulateBreakdownItem(
        component=f"Distance · {req.distance_km}km",
        rule_ref=f"{sym}{per_km}/km",
        inputs=f"{billable_km} × {per_km}",
        amount=dist_amount,
    ))

    # Time charge
    billable_min = max(0.0, req.duration_min - free_min)
    time_amount = round(billable_min * per_min, 2)
    breakdown.append(SimulateBreakdownItem(
        component=f"Time · {req.duration_min}min",
        rule_ref=f"{sym}{per_min}/min",
        inputs=f"{billable_min} × {per_min}",
        amount=time_amount,
    ))

    # Waiting charge (use free_min as grace for waiting too)
    billable_wait = max(0.0, req.waiting_min - free_min)
    wait_amount = round(billable_wait * waiting_per_min, 2)
    breakdown.append(SimulateBreakdownItem(
        component="Waiting",
        rule_ref=f"{sym}{waiting_per_min}/min after {free_min}",
        inputs=f"{billable_wait} × {waiting_per_min}",
        amount=wait_amount,
    ))

    subtotal = base_fare + dist_amount + time_amount + wait_amount

    # Modifiers
    modifier_total = 0.0
    modifiers = rule.modifiers or []
    for mod in modifiers:
        if isinstance(mod, dict):
            mod_name = mod.get("name", "Modifier")
            mod_window_start = mod.get("window_start")
            mod_window_end = mod.get("window_end")
            mod_type = mod.get("type", "pct")
            mod_value = float(mod.get("value", 0))
        else:
            mod_name = mod.name
            mod_window_start = mod.window_start
            mod_window_end = mod.window_end
            mod_type = mod.type
            mod_value = mod.value

        if not _time_in_window(req.time_of_day, mod_window_start, mod_window_end):
            continue

        if mod_type == "pct":
            mod_amount = round(subtotal * mod_value / 100.0, 2)
            inputs_str = f"{req.time_of_day} match"
        else:  # flat
            mod_amount = round(mod_value, 2)
            inputs_str = "always on"

        modifier_total += mod_amount
        breakdown.append(SimulateBreakdownItem(
            component=mod_name,
            rule_ref=f"+{mod_value}% modifier" if mod_type == "pct" else f"flat {sym}{mod_value}",
            inputs=inputs_str,
            amount=mod_amount,
        ))

    # Surge
    surge_amount = 0.0
    if not surge_disabled and req.demand_supply_ratio > 1.0:
        effective_multiplier = min(req.demand_supply_ratio, surge_cap)
        surge_amount = round(subtotal * (effective_multiplier - 1.0), 2)
        breakdown.append(SimulateBreakdownItem(
            component=f"Surge · {req.demand_supply_ratio}×",
            rule_ref=f"zone tier · capped at {surge_cap}×",
            inputs=f"{effective_multiplier}× on base",
            amount=surge_amount,
        ))

    # Toll
    if req.toll > 0:
        breakdown.append(SimulateBreakdownItem(
            component="Toll",
            rule_ref="pass-through",
            inputs="provided",
            amount=round(req.toll, 2),
        ))

    # Promo
    if req.promo_discount > 0:
        breakdown.append(SimulateBreakdownItem(
            component="Promo",
            rule_ref="discount",
            inputs="provided",
            amount=round(-req.promo_discount, 2),
        ))

    taxable = subtotal + modifier_total + surge_amount + req.toll - req.promo_discount
    fare_total = max(min_fare, round(taxable, 2))

    return SimulateRuleResult(
        rule_id=str(rule.id),
        rule_code=str(rule.rule_code),
        version=int(rule.version),
        status=str(rule.status),
        fare_total=fare_total,
        breakdown=breakdown,
    )


async def simulate_fare(db: AsyncSession, req: SimulateRequest) -> SimulateResponse:
    rules_to_simulate: List[PricingRule] = []

    if req.rule_ids:
        # Fetch specific rules by ID
        for rule_id in req.rule_ids:
            res = await db.execute(select(PricingRule).where(PricingRule.id == rule_id))
            rule = res.scalar_one_or_none()
            if rule:
                rules_to_simulate.append(rule)
    else:
        # Auto-select: live rule + any draft for same zone + vehicle_class
        auto_stmt = select(PricingRule).where(
            PricingRule.zone_id == req.zone_id,
            PricingRule.vehicle_class_id == req.vehicle_class_id,
            or_(PricingRule.status == "live", PricingRule.status == "draft"),
        )
        auto_res = await db.execute(auto_stmt)
        rules_to_simulate = list(auto_res.scalars().all())

    if not rules_to_simulate:
        raise HTTPException(
            status_code=404,
            detail="No pricing rules found for the given zone and vehicle class",
        )

    currency = await get_base_currency(db)
    sym = currency_symbol(currency)
    settings = await get_settings(db)
    ceiling = float(settings.surge_ceiling or 2.0)
    platform_free_wait = settings.free_waiting_minutes
    platform_wait_rate = settings.waiting_charge_per_min
    surge_disabled = await is_kill_switch_active(db, "surge_pricing")
    results = [
        _compute_fare(rule, req, sym, ceiling, platform_free_wait, platform_wait_rate, surge_disabled)
        for rule in rules_to_simulate
    ]
    return SimulateResponse(results=results)

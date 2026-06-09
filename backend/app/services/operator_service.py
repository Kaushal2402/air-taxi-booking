from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ValidationException
from app.models.operator import Aircraft, Operator, OperatorDocument, Pilot
from app.services.settings_service import get_settings
from app.schemas.operators import (
    AircraftListResponse,
    AircraftResponse,
    OperatorDetail,
    OperatorDocumentResponse,
    OperatorListResponse,
    OperatorPerformanceResponse,
    OperatorResponse,
    PilotListResponse,
    PilotResponse,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _airworthiness_status(expiry_date: object) -> str:
    """Derive airworthiness status from the expiry date."""
    if expiry_date is None:
        return "ok"
    from datetime import date, timedelta
    today = date.today()
    if isinstance(expiry_date, str):
        expiry_date = date.fromisoformat(expiry_date)
    if expiry_date < today:
        return "expired"
    if expiry_date <= today + timedelta(days=30):
        return "expiring"
    return "ok"


# ── Operator list & CRUD ──────────────────────────────────────────────────────

async def list_operators(
    db: AsyncSession,
    status: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> OperatorListResponse:
    page_size = min(page_size, 100)

    base_q = select(Operator)

    if search:
        like = f"%{search}%"
        base_q = base_q.where(
            or_(
                Operator.name.ilike(like),
                Operator.hq_city.ilike(like),
                Operator.company_registration_no.ilike(like),
            )
        )

    if status:
        status_list = [s.strip() for s in status.split(",") if s.strip()]
        if len(status_list) > 1:
            base_q = base_q.where(Operator.status.in_(status_list))
        else:
            base_q = base_q.where(Operator.status == status_list[0])

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * page_size
    rows_q = base_q.order_by(Operator.created_at.desc()).offset(offset).limit(page_size)
    rows_result = await db.execute(rows_q)
    items = list(rows_result.scalars().all())

    # Batch-fetch fleet and crew counts for all operators in one query each
    operator_ids = [o.id for o in items]
    fleet_counts: dict[str, int] = {}
    pilot_counts: dict[str, int] = {}
    if operator_ids:
        fc_rows = await db.execute(
            select(Aircraft.operator_id, func.count(Aircraft.id).label("cnt"))
            .where(Aircraft.operator_id.in_(operator_ids))
            .group_by(Aircraft.operator_id)
        )
        fleet_counts = {r.operator_id: r.cnt for r in fc_rows}

        pc_rows = await db.execute(
            select(Pilot.operator_id, func.count(Pilot.id).label("cnt"))
            .where(Pilot.operator_id.in_(operator_ids))
            .group_by(Pilot.operator_id)
        )
        pilot_counts = {r.operator_id: r.cnt for r in pc_rows}

    def _to_response(o: Operator) -> OperatorResponse:
        resp = OperatorResponse.model_validate(o)
        resp.fleet_count = fleet_counts.get(o.id, 0)
        resp.pilot_count = pilot_counts.get(o.id, 0)
        return resp

    return OperatorListResponse(
        items=[_to_response(o) for o in items],
        total=total,
    )


async def create_operator(db: AsyncSession, data: dict) -> Operator:
    # Use platform default commission if not explicitly provided
    commission_pct = data.get("commission_pct")
    if commission_pct is None:
        platform = await get_settings(db)
        commission_pct = platform.default_commission_pct

    operator = Operator(
        id=str(uuid.uuid4()),
        name=data["name"],
        company_registration_no=data.get("company_registration_no"),
        hq_city=data.get("hq_city"),
        cert_type=data.get("cert_type"),
        notes=data.get("notes"),
        commission_pct=commission_pct,
        status="pending",
    )
    db.add(operator)
    await db.commit()
    await db.refresh(operator)
    return operator


async def get_operator(db: AsyncSession, operator_id: str) -> Operator:
    result = await db.execute(select(Operator).where(Operator.id == operator_id))
    operator = result.scalar_one_or_none()
    if not operator:
        raise NotFoundException("Operator", operator_id)
    return operator


async def get_operator_detail(db: AsyncSession, operator_id: str) -> OperatorDetail:
    operator = await get_operator(db, operator_id)

    fleet_result = await db.execute(
        select(func.count()).where(Aircraft.operator_id == operator_id)
    )
    fleet_count = fleet_result.scalar_one()

    pilot_result = await db.execute(
        select(func.count()).where(Pilot.operator_id == operator_id)
    )
    pilot_count = pilot_result.scalar_one()

    docs_result = await db.execute(
        select(OperatorDocument)
        .where(OperatorDocument.operator_id == operator_id)
        .order_by(OperatorDocument.created_at.asc())
    )
    docs = list(docs_result.scalars().all())

    base = OperatorResponse.model_validate(operator).model_dump(exclude={"fleet_count", "pilot_count"})
    return OperatorDetail(
        **base,
        fleet_count=fleet_count,
        pilot_count=pilot_count,
        docs=[OperatorDocumentResponse.model_validate(d) for d in docs],
    )


async def update_operator(db: AsyncSession, operator_id: str, data: dict) -> Operator:
    operator = await get_operator(db, operator_id)
    for key, value in data.items():
        setattr(operator, key, value)
    await db.commit()
    await db.refresh(operator)
    return operator


# ── Operator status transitions ───────────────────────────────────────────────

async def approve_operator(db: AsyncSession, operator_id: str) -> Operator:
    operator = await get_operator(db, operator_id)
    settings = await get_settings(db)

    # Enforce site visit requirement if enabled in platform settings
    if settings.operator_site_visit_required and operator.site_visit_status != "completed":
        raise ValidationException(
            "Operator cannot be approved: platform policy requires a completed site visit. "
            f"Current site visit status: '{operator.site_visit_status or 'not set'}'."
        )

    operator.status = "approved"
    operator.rejection_reason = None
    await db.commit()
    await db.refresh(operator)
    return operator


async def reject_operator(db: AsyncSession, operator_id: str, reason: str) -> Operator:
    operator = await get_operator(db, operator_id)
    operator.status = "rejected"
    operator.rejection_reason = reason
    await db.commit()
    await db.refresh(operator)
    return operator


async def pause_operator(db: AsyncSession, operator_id: str, reason: str | None) -> Operator:
    operator = await get_operator(db, operator_id)
    operator.status = "paused"
    if reason:
        operator.notes = reason
    from app.services.operator_auth_service import revoke_all_sessions_for_org
    await revoke_all_sessions_for_org(db, operator_id)
    await db.commit()
    await db.refresh(operator)
    return operator


async def reactivate_operator(db: AsyncSession, operator_id: str) -> Operator:
    operator = await get_operator(db, operator_id)
    operator.status = "active"
    await db.commit()
    await db.refresh(operator)
    return operator


async def configure_commission(
    db: AsyncSession, operator_id: str, commission_pct: float
) -> Operator:
    operator = await get_operator(db, operator_id)
    operator.commission_pct = commission_pct
    await db.commit()
    await db.refresh(operator)
    return operator


async def get_performance(
    db: AsyncSession, operator_id: str
) -> OperatorPerformanceResponse:
    # Stub — no booking data yet
    await get_operator(db, operator_id)  # validate existence
    return OperatorPerformanceResponse(
        otp_pct=0.0,
        load_factor_pct=0.0,
        booking_count_mtd=0,
        cancellation_rate_pct=0.0,
        payouts_mtd_amount=0.0,
    )


# ── Operator documents ────────────────────────────────────────────────────────

async def list_operator_docs(
    db: AsyncSession, operator_id: str
) -> list[OperatorDocument]:
    await get_operator(db, operator_id)  # validate existence
    result = await db.execute(
        select(OperatorDocument)
        .where(OperatorDocument.operator_id == operator_id)
        .order_by(OperatorDocument.created_at.asc())
    )
    return list(result.scalars().all())


async def add_operator_doc(
    db: AsyncSession, operator_id: str, data: dict
) -> OperatorDocument:
    await get_operator(db, operator_id)  # validate existence
    doc = OperatorDocument(
        id=str(uuid.uuid4()),
        operator_id=operator_id,
        doc_type=data["doc_type"],
        file_url=data["file_url"],
        expires_at=data.get("expires_at"),
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def update_operator_doc(
    db: AsyncSession, operator_id: str, doc_id: str, data: dict
) -> OperatorDocument:
    await get_operator(db, operator_id)  # validate existence
    result = await db.execute(
        select(OperatorDocument).where(
            OperatorDocument.id == doc_id,
            OperatorDocument.operator_id == operator_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundException("OperatorDocument", doc_id)
    for key, value in data.items():
        setattr(doc, key, value)
    await db.commit()
    await db.refresh(doc)
    return doc


# ── Aircraft ──────────────────────────────────────────────────────────────────

async def list_aircraft(
    db: AsyncSession,
    operator_id: str | None = None,
    status: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> AircraftListResponse:
    page_size = min(page_size, 100)

    base_q = select(Aircraft)

    if operator_id:
        base_q = base_q.where(Aircraft.operator_id == operator_id)

    if search:
        like = f"%{search}%"
        base_q = base_q.where(Aircraft.registration_mark.ilike(like))

    if status:
        base_q = base_q.where(Aircraft.status == status)

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * page_size
    rows_q = base_q.order_by(Aircraft.created_at.desc()).offset(offset).limit(page_size)
    rows_result = await db.execute(rows_q)
    items = list(rows_result.scalars().all())

    return AircraftListResponse(
        items=[AircraftResponse.model_validate(a) for a in items],
        total=total,
    )


async def create_aircraft(db: AsyncSession, data: dict) -> Aircraft:
    # Validate operator exists
    result = await db.execute(
        select(Operator).where(Operator.id == data["operator_id"])
    )
    if not result.scalar_one_or_none():
        raise NotFoundException("Operator", data["operator_id"])

    expiry = data.get("airworthiness_expiry")
    aw_status = _airworthiness_status(expiry)

    aircraft = Aircraft(
        id=str(uuid.uuid4()),
        operator_id=data["operator_id"],
        registration_mark=data["registration_mark"],
        seat_capacity=data["seat_capacity"],
        aircraft_type_id=data.get("aircraft_type_id"),
        mtow_kg=data.get("mtow_kg"),
        range_nm=data.get("range_nm"),
        airworthiness_expiry=expiry,
        airworthiness_doc_url=data.get("airworthiness_doc_url"),
        airworthiness_status=aw_status,
        notes=data.get("notes"),
        status="pending_review",
    )
    db.add(aircraft)
    await db.commit()
    await db.refresh(aircraft)
    return aircraft


async def get_aircraft(db: AsyncSession, aircraft_id: str) -> Aircraft:
    result = await db.execute(select(Aircraft).where(Aircraft.id == aircraft_id))
    aircraft = result.scalar_one_or_none()
    if not aircraft:
        raise NotFoundException("Aircraft", aircraft_id)
    return aircraft


async def update_aircraft(db: AsyncSession, aircraft_id: str, data: dict) -> Aircraft:
    aircraft = await get_aircraft(db, aircraft_id)
    for key, value in data.items():
        setattr(aircraft, key, value)
    # Recompute airworthiness_status if expiry changed
    if "airworthiness_expiry" in data:
        aircraft.airworthiness_status = _airworthiness_status(data["airworthiness_expiry"])
    await db.commit()
    await db.refresh(aircraft)
    return aircraft


async def approve_aircraft(db: AsyncSession, aircraft_id: str) -> Aircraft:
    aircraft = await get_aircraft(db, aircraft_id)
    aircraft.status = "ready"
    await db.commit()
    await db.refresh(aircraft)
    return aircraft


async def ground_aircraft(db: AsyncSession, aircraft_id: str, reason: str) -> Aircraft:
    aircraft = await get_aircraft(db, aircraft_id)
    aircraft.status = "grounded"
    # Only mark airworthiness as expired if it was already expired — don't clobber
    # a valid certificate when grounding for operational / admin reasons.
    if aircraft.airworthiness_status not in ("expiring", "expired"):
        pass  # leave airworthiness_status unchanged
    aircraft.notes = reason
    await db.commit()
    await db.refresh(aircraft)
    return aircraft


async def unground_aircraft(db: AsyncSession, aircraft_id: str) -> Aircraft:
    aircraft = await get_aircraft(db, aircraft_id)
    aircraft.status = "ready"
    # Recompute airworthiness from expiry date
    aircraft.airworthiness_status = _airworthiness_status(aircraft.airworthiness_expiry)
    await db.commit()
    await db.refresh(aircraft)
    return aircraft


async def set_maintenance(
    db: AsyncSession,
    aircraft_id: str,
    starts_at: object,
    ends_at: object,
    notes: str | None,
) -> Aircraft:
    aircraft = await get_aircraft(db, aircraft_id)
    aircraft.status = "maintenance"

    existing = aircraft.maintenance_windows or []
    # Convert datetime objects to ISO strings for JSON storage
    starts_str = starts_at.isoformat() if hasattr(starts_at, "isoformat") else str(starts_at)
    ends_str = ends_at.isoformat() if hasattr(ends_at, "isoformat") else str(ends_at)
    existing.append({"starts_at": starts_str, "ends_at": ends_str, "notes": notes})
    aircraft.maintenance_windows = existing

    await db.commit()
    await db.refresh(aircraft)
    return aircraft


# ── Pilots ────────────────────────────────────────────────────────────────────

async def list_pilots(
    db: AsyncSession,
    operator_id: str | None = None,
    status: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> PilotListResponse:
    page_size = min(page_size, 100)

    base_q = select(Pilot)

    if operator_id:
        base_q = base_q.where(Pilot.operator_id == operator_id)

    if search:
        like = f"%{search}%"
        base_q = base_q.where(
            or_(
                Pilot.name.ilike(like),
                Pilot.license_no.ilike(like),
            )
        )

    if status:
        base_q = base_q.where(Pilot.status == status)

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * page_size
    rows_q = base_q.order_by(Pilot.created_at.desc()).offset(offset).limit(page_size)
    rows_result = await db.execute(rows_q)
    items = list(rows_result.scalars().all())

    return PilotListResponse(
        items=[PilotResponse.model_validate(p) for p in items],
        total=total,
    )


async def create_pilot(db: AsyncSession, data: dict) -> Pilot:
    # Validate operator exists
    result = await db.execute(
        select(Operator).where(Operator.id == data["operator_id"])
    )
    if not result.scalar_one_or_none():
        raise NotFoundException("Operator", data["operator_id"])

    pilot = Pilot(
        id=str(uuid.uuid4()),
        operator_id=data["operator_id"],
        name=data["name"],
        license_no=data.get("license_no"),
        license_type=data.get("license_type"),
        type_ratings=data.get("type_ratings"),
        medical_expiry=data.get("medical_expiry"),
        notes=data.get("notes"),
        status="pending_review",
    )
    db.add(pilot)
    await db.commit()
    await db.refresh(pilot)
    return pilot


async def get_pilot(db: AsyncSession, pilot_id: str) -> Pilot:
    result = await db.execute(select(Pilot).where(Pilot.id == pilot_id))
    pilot = result.scalar_one_or_none()
    if not pilot:
        raise NotFoundException("Pilot", pilot_id)
    return pilot


async def update_pilot(db: AsyncSession, pilot_id: str, data: dict) -> Pilot:
    pilot = await get_pilot(db, pilot_id)
    for key, value in data.items():
        setattr(pilot, key, value)
    await db.commit()
    await db.refresh(pilot)
    return pilot


async def approve_pilot(db: AsyncSession, pilot_id: str) -> Pilot:
    pilot = await get_pilot(db, pilot_id)
    pilot.status = "active"
    await db.commit()
    await db.refresh(pilot)
    return pilot


async def ground_pilot(db: AsyncSession, pilot_id: str, reason: str) -> Pilot:
    pilot = await get_pilot(db, pilot_id)
    pilot.status = "grounded"
    pilot.notes = reason
    await db.commit()
    await db.refresh(pilot)
    return pilot


# ── Compliance summaries ──────────────────────────────────────────────────────

async def get_aircraft_compliance_summary(db: AsyncSession) -> dict:
    """Return counts of aircraft by airworthiness status, plus those expiring within 30 days."""
    from datetime import date, timedelta
    today = date.today()
    in_30 = today + timedelta(days=30)

    rows = (await db.execute(select(Aircraft))).scalars().all()

    expired = [a for a in rows if a.airworthiness_status == "expired"]
    expiring = [a for a in rows if a.airworthiness_status == "expiring"]
    grounded = [a for a in rows if a.status == "grounded"]
    ok = [a for a in rows if a.airworthiness_status == "ok" and a.status not in ("grounded", "pending_review")]

    def _row(a: Aircraft) -> dict:
        return {
            "id": a.id,
            "registration_mark": a.registration_mark,
            "operator_id": a.operator_id,
            "status": a.status,
            "airworthiness_status": a.airworthiness_status,
            "airworthiness_expiry": str(a.airworthiness_expiry) if a.airworthiness_expiry else None,
        }

    return {
        "total": len(rows),
        "ok": len(ok),
        "expiring_count": len(expiring),
        "expired_count": len(expired),
        "grounded_count": len(grounded),
        "expiring": [_row(a) for a in expiring],
        "expired": [_row(a) for a in expired],
    }


async def get_pilots_compliance_summary(db: AsyncSession) -> dict:
    """Return counts of pilots by medical expiry status."""
    from datetime import date, timedelta
    today = date.today()
    in_30 = today + timedelta(days=30)
    in_60 = today + timedelta(days=60)

    rows = (await db.execute(select(Pilot))).scalars().all()

    def _parse(d: object) -> object:
        if d is None:
            return None
        from datetime import date as _date
        if isinstance(d, str):
            try:
                return _date.fromisoformat(d)
            except ValueError:
                return None
        return d

    expired_med = []
    expiring_30 = []
    expiring_60 = []
    no_medical = []
    ok = []

    for p in rows:
        exp = _parse(p.medical_expiry)
        if exp is None:
            no_medical.append(p)
        elif exp < today:
            expired_med.append(p)
        elif exp <= in_30:
            expiring_30.append(p)
        elif exp <= in_60:
            expiring_60.append(p)
        else:
            ok.append(p)

    def _row(p: Pilot) -> dict:
        return {
            "id": p.id,
            "name": p.name,
            "operator_id": p.operator_id,
            "status": p.status,
            "license_no": p.license_no,
            "medical_expiry": str(p.medical_expiry) if p.medical_expiry else None,
        }

    return {
        "total": len(rows),
        "ok_count": len(ok),
        "no_medical_count": len(no_medical),
        "expired_medical_count": len(expired_med),
        "expiring_30d_count": len(expiring_30),
        "expiring_60d_count": len(expiring_60),
        "expired_medical": [_row(p) for p in expired_med],
        "expiring_30d": [_row(p) for p in expiring_30],
        "expiring_60d": [_row(p) for p in expiring_60],
        "no_medical": [_row(p) for p in no_medical],
    }

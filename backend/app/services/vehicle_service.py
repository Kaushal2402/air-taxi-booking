from __future__ import annotations

import os
import shutil
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import VehicleClass
from app.models.driver import Driver
from app.models.vehicle import Vehicle, VehicleDocument
from app.models.vehicle_maintenance import VehicleMaintenance
from app.models.vendor import Vendor
from app.schemas.vehicle import (
    VehicleDocumentResponse,
    VehicleListResponse,
    VehicleMaintenanceResponse,
    VehicleResponse,
    VehicleDetailResponse,
    VendorListResponse,
    VendorResponse,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _driver_code(driver: Driver) -> Optional[str]:
    if driver.seq_id is None:
        return None
    return f"D-{driver.seq_id:05d}"


async def _get_vehicle_class(db: AsyncSession, vc_id: str) -> Optional[VehicleClass]:
    result = await db.execute(select(VehicleClass).where(VehicleClass.id == vc_id))
    return result.scalar_one_or_none()


async def _get_vendor(db: AsyncSession, vendor_id: str) -> Optional[Vendor]:
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    return result.scalar_one_or_none()


async def _get_driver(db: AsyncSession, driver_id: str) -> Optional[Driver]:
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    return result.scalar_one_or_none()


async def _build_vehicle_response(
    db: AsyncSession,
    vehicle: Vehicle,
) -> dict:
    """Build a VehicleResponse dict with joined name fields."""
    vc = await _get_vehicle_class(db, vehicle.vehicle_class_id)
    vendor = await _get_vendor(db, vehicle.owner_vendor_id) if vehicle.owner_vendor_id else None
    driver = await _get_driver(db, vehicle.linked_driver_id) if vehicle.linked_driver_id else None

    data = VehicleResponse.model_validate(vehicle).model_dump()
    data["vehicle_class_name"] = vc.name if vc else None
    data["vehicle_class_code"] = vc.code if vc else None
    data["owner_vendor_name"] = vendor.name if vendor else None
    data["linked_driver_name"] = driver.name if driver else None
    data["linked_driver_code"] = _driver_code(driver) if driver else None
    return data


# ── Vehicles CRUD ─────────────────────────────────────────────────────────────

async def list_vehicles(
    db: AsyncSession,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    doc_status: Optional[str] = None,
    vehicle_class_id: Optional[str] = None,
    owner_type: Optional[str] = None,
    owner_vendor_id: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    page: int = 1,
    per_page: int = 25,
) -> dict:
    per_page = min(per_page, 100)

    base_q = select(Vehicle)

    if search:
        like = f"%{search}%"
        base_q = base_q.where(
            or_(
                Vehicle.plate_no.ilike(like),
                Vehicle.make.ilike(like),
                Vehicle.model.ilike(like),
            )
        )

    if status_filter:
        base_q = base_q.where(Vehicle.status == status_filter)

    if doc_status:
        base_q = base_q.where(Vehicle.doc_status == doc_status)

    if vehicle_class_id:
        base_q = base_q.where(Vehicle.vehicle_class_id == vehicle_class_id)

    if owner_type:
        base_q = base_q.where(Vehicle.owner_type == owner_type)

    if owner_vendor_id:
        base_q = base_q.where(Vehicle.owner_vendor_id == owner_vendor_id)

    if year_min is not None:
        base_q = base_q.where(Vehicle.year >= year_min)

    if year_max is not None:
        base_q = base_q.where(Vehicle.year <= year_max)

    # Total count
    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Paginated rows
    offset = (page - 1) * per_page
    rows_q = base_q.order_by(Vehicle.created_at.desc()).offset(offset).limit(per_page)
    rows_result = await db.execute(rows_q)
    vehicles = list(rows_result.scalars().all())

    # Status counts — base without status/doc_status filters
    all_q = select(Vehicle)
    if search:
        like = f"%{search}%"
        all_q = all_q.where(
            or_(
                Vehicle.plate_no.ilike(like),
                Vehicle.make.ilike(like),
                Vehicle.model.ilike(like),
            )
        )
    if vehicle_class_id:
        all_q = all_q.where(Vehicle.vehicle_class_id == vehicle_class_id)
    if owner_type:
        all_q = all_q.where(Vehicle.owner_type == owner_type)
    if owner_vendor_id:
        all_q = all_q.where(Vehicle.owner_vendor_id == owner_vendor_id)
    if year_min is not None:
        all_q = all_q.where(Vehicle.year >= year_min)
    if year_max is not None:
        all_q = all_q.where(Vehicle.year <= year_max)

    all_count = (await db.execute(select(func.count()).select_from(all_q.subquery()))).scalar_one()
    active_count = (await db.execute(
        select(func.count()).select_from(all_q.where(Vehicle.status == "active").subquery())
    )).scalar_one()
    docs_expiring_count = (await db.execute(
        select(func.count()).select_from(all_q.where(Vehicle.doc_status == "expiring").subquery())
    )).scalar_one()
    docs_expired_count = (await db.execute(
        select(func.count()).select_from(all_q.where(Vehicle.doc_status == "expired").subquery())
    )).scalar_one()
    grounded_count = (await db.execute(
        select(func.count()).select_from(all_q.where(Vehicle.status == "suspended").subquery())
    )).scalar_one()
    unlinked_count = (await db.execute(
        select(func.count()).select_from(
            all_q.where(and_(Vehicle.linked_driver_id.is_(None), Vehicle.status == "active")).subquery()
        )
    )).scalar_one()

    status_counts = {
        "all": all_count,
        "active": active_count,
        "docs_expiring": docs_expiring_count,
        "docs_expired": docs_expired_count,
        "grounded": grounded_count,
        "unlinked": unlinked_count,
    }

    # Build enriched items
    items = []
    for v in vehicles:
        items.append(await _build_vehicle_response(db, v))

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "status_counts": status_counts,
    }


async def get_vehicle(db: AsyncSession, vehicle_id: str) -> Vehicle:
    """Fetch vehicle by UUID or plate_no."""
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()

    if not vehicle:
        # Try by plate_no
        result = await db.execute(select(Vehicle).where(Vehicle.plate_no == vehicle_id))
        vehicle = result.scalar_one_or_none()

    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle


async def get_vehicle_detail(db: AsyncSession, vehicle_id: str) -> dict:
    vehicle = await get_vehicle(db, vehicle_id)

    base = await _build_vehicle_response(db, vehicle)

    # Load documents
    doc_result = await db.execute(
        select(VehicleDocument)
        .where(VehicleDocument.vehicle_id == vehicle.id)
        .order_by(VehicleDocument.created_at.asc())
    )
    docs = [VehicleDocumentResponse.model_validate(d).model_dump() for d in doc_result.scalars().all()]

    # Load maintenances
    maint_result = await db.execute(
        select(VehicleMaintenance)
        .where(VehicleMaintenance.vehicle_id == vehicle.id)
        .order_by(VehicleMaintenance.scheduled_date.asc())
    )
    maints = [VehicleMaintenanceResponse.model_validate(m).model_dump() for m in maint_result.scalars().all()]

    base["documents"] = docs
    base["maintenances"] = maints
    return base


async def create_vehicle(db: AsyncSession, data: dict) -> dict:
    # Validate vehicle_class_id
    vc = await _get_vehicle_class(db, data["vehicle_class_id"])
    if not vc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="vehicle_class_id not found")

    # If vendor type, validate vendor
    if data.get("owner_type") == "vendor":
        if not data.get("owner_vendor_id"):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="owner_vendor_id required for vendor type")
        vendor = await _get_vendor(db, data["owner_vendor_id"])
        if not vendor:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="owner_vendor_id not found")

    # Check plate uniqueness
    existing = await db.execute(select(Vehicle).where(Vehicle.plate_no == data["plate_no"]))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A vehicle with this plate number already exists")

    vehicle = Vehicle(
        id=str(uuid.uuid4()),
        plate_no=data["plate_no"],
        make=data["make"],
        model=data["model"],
        year=data["year"],
        color=data.get("color"),
        fuel_type=data.get("fuel_type"),
        vehicle_class_id=data["vehicle_class_id"],
        owner_type=data.get("owner_type", "owner_driver"),
        owner_vendor_id=data.get("owner_vendor_id"),
        status="pending",
        doc_status="pending",
        odometer_km=0,
    )
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return await _build_vehicle_response(db, vehicle)


async def update_vehicle(db: AsyncSession, vehicle_id: str, updates: dict) -> dict:
    vehicle = await get_vehicle(db, vehicle_id)

    # Validate FKs if being changed
    if "vehicle_class_id" in updates:
        vc = await _get_vehicle_class(db, updates["vehicle_class_id"])
        if not vc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="vehicle_class_id not found")

    if "owner_vendor_id" in updates and updates["owner_vendor_id"]:
        vendor = await _get_vendor(db, updates["owner_vendor_id"])
        if not vendor:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="owner_vendor_id not found")

    for key, value in updates.items():
        setattr(vehicle, key, value)

    await db.commit()
    await db.refresh(vehicle)
    return await _build_vehicle_response(db, vehicle)


async def approve_vehicle(db: AsyncSession, vehicle_id: str) -> dict:
    vehicle = await get_vehicle(db, vehicle_id)
    vehicle.status = "active"
    await db.commit()
    await db.refresh(vehicle)
    return await _build_vehicle_response(db, vehicle)


async def ground_vehicle(db: AsyncSession, vehicle_id: str, reason: str) -> dict:
    vehicle = await get_vehicle(db, vehicle_id)
    vehicle.status = "suspended"
    vehicle.flag_reason = reason
    await db.commit()
    await db.refresh(vehicle)
    return await _build_vehicle_response(db, vehicle)


async def reactivate_vehicle(db: AsyncSession, vehicle_id: str) -> dict:
    vehicle = await get_vehicle(db, vehicle_id)
    vehicle.status = "active"
    vehicle.flag_reason = None
    await db.commit()
    await db.refresh(vehicle)
    return await _build_vehicle_response(db, vehicle)


async def link_driver(db: AsyncSession, vehicle_id: str, driver_id: str) -> dict:
    vehicle = await get_vehicle(db, vehicle_id)

    if vehicle.status != "active":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Vehicle must be active to link a driver",
        )

    # Validate driver exists and has acceptable status
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")

    if driver.status not in ("active", "approved"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Driver must have status 'active' or 'approved' to link",
        )

    # Check driver not already linked to another vehicle
    existing_link = await db.execute(
        select(Vehicle).where(
            and_(Vehicle.linked_driver_id == driver_id, Vehicle.id != vehicle_id)
        )
    )
    if existing_link.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Driver is already linked to another vehicle",
        )

    # Get vehicle class for back-compat update
    vc = await _get_vehicle_class(db, vehicle.vehicle_class_id)

    vehicle.linked_driver_id = driver.id
    vehicle.linked_since = datetime.now(timezone.utc)

    # Back-compat: update driver vehicle fields
    driver.vehicle_plate = vehicle.plate_no
    driver.vehicle_class = vc.code if vc else None

    await db.commit()
    await db.refresh(vehicle)
    return await _build_vehicle_response(db, vehicle)


async def unlink_driver(db: AsyncSession, vehicle_id: str) -> dict:
    vehicle = await get_vehicle(db, vehicle_id)

    if vehicle.linked_driver_id:
        # Back-compat: clear driver vehicle fields
        result = await db.execute(select(Driver).where(Driver.id == vehicle.linked_driver_id))
        driver = result.scalar_one_or_none()
        if driver:
            driver.vehicle_plate = None
            driver.vehicle_class = None

    vehicle.linked_driver_id = None
    vehicle.linked_since = None

    await db.commit()
    await db.refresh(vehicle)
    return await _build_vehicle_response(db, vehicle)


async def reassign_class(db: AsyncSession, vehicle_id: str, vehicle_class_id: str) -> dict:
    vehicle = await get_vehicle(db, vehicle_id)

    vc = await _get_vehicle_class(db, vehicle_class_id)
    if not vc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="vehicle_class_id not found")

    vehicle.vehicle_class_id = vehicle_class_id

    await db.commit()
    await db.refresh(vehicle)
    return await _build_vehicle_response(db, vehicle)


# ── Vehicle Documents ─────────────────────────────────────────────────────────

async def get_documents(db: AsyncSession, vehicle_id: str) -> list:
    vehicle = await get_vehicle(db, vehicle_id)

    result = await db.execute(
        select(VehicleDocument)
        .where(VehicleDocument.vehicle_id == vehicle.id)
        .order_by(VehicleDocument.created_at.asc())
    )
    return list(result.scalars().all())


async def create_document(db: AsyncSession, vehicle_id: str, data: dict) -> VehicleDocument:
    vehicle = await get_vehicle(db, vehicle_id)

    doc = VehicleDocument(
        id=str(uuid.uuid4()),
        vehicle_id=vehicle.id,
        doc_type=data["doc_type"],
        doc_number=data.get("doc_number"),
        issued_date=data.get("issued_date"),
        expiry_date=data.get("expiry_date"),
        status="pending",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def _recompute_doc_status(db: AsyncSession, vehicle_id: str) -> None:
    """Recompute vehicle.doc_status based on current document states."""
    result = await db.execute(
        select(VehicleDocument).where(VehicleDocument.vehicle_id == vehicle_id)
    )
    docs = list(result.scalars().all())

    vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = vehicle_result.scalar_one_or_none()
    if not vehicle:
        return

    today = datetime.now(timezone.utc).date()
    expiry_threshold = today + timedelta(days=30)

    if not docs:
        vehicle.doc_status = "pending"
    elif any(
        d.expiry_date is not None and d.expiry_date < today
        for d in docs if d.status in ("ok", "expiring")
    ):
        vehicle.doc_status = "expired"
    elif any(
        d.expiry_date is not None and d.expiry_date <= expiry_threshold
        for d in docs if d.status in ("ok", "expiring")
    ):
        vehicle.doc_status = "expiring"
    elif all(d.status == "ok" for d in docs):
        vehicle.doc_status = "ok"
    else:
        vehicle.doc_status = "pending"

    await db.commit()


async def review_document(
    db: AsyncSession,
    vehicle_id: str,
    doc_id: str,
    action: str,
    expiry_date: Optional[date],
    review_note: Optional[str],
    admin_email: str,
) -> VehicleDocument:
    vehicle = await get_vehicle(db, vehicle_id)

    result = await db.execute(
        select(VehicleDocument).where(
            and_(
                VehicleDocument.id == doc_id,
                VehicleDocument.vehicle_id == vehicle.id,
            )
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    now = datetime.now(timezone.utc)

    if action == "approve":
        doc.status = "ok"
        if expiry_date:
            doc.expiry_date = expiry_date
        doc.review_note = review_note
        doc.reviewed_by = admin_email
        doc.reviewed_at = now

    elif action == "reject":
        doc.status = "rejected"
        doc.review_note = review_note
        doc.reviewed_by = admin_email
        doc.reviewed_at = now

    elif action == "request_reupload":
        doc.status = "pending"
        doc.review_note = review_note
        doc.reviewed_by = admin_email
        doc.reviewed_at = now

    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="action must be 'approve', 'reject', or 'request_reupload'",
        )

    await db.commit()
    await db.refresh(doc)

    # Recompute vehicle doc_status
    await _recompute_doc_status(db, vehicle.id)

    return doc


_ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
    "application/pdf",
}

_UPLOAD_DIR = "static/documents"
_VEHICLE_PHOTO_DIR = "static/vehicles"


async def upload_document_image(
    db: AsyncSession,
    vehicle_id: str,
    doc_id: str,
    file: UploadFile,
) -> VehicleDocument:
    content_type = (file.content_type or "").lower()
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{content_type}'. Allowed: JPEG, PNG, WebP, GIF, PDF.",
        )

    vehicle = await get_vehicle(db, vehicle_id)

    result = await db.execute(
        select(VehicleDocument).where(
            and_(
                VehicleDocument.id == doc_id,
                VehicleDocument.vehicle_id == vehicle.id,
            )
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    ext_map = {
        "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
        "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf",
    }
    ext = ext_map.get(content_type, "bin")

    os.makedirs(_UPLOAD_DIR, exist_ok=True)
    filename = f"{doc_id}.{ext}"
    file_path = os.path.join(_UPLOAD_DIR, filename)

    with open(file_path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    doc.image_url = f"/static/documents/{filename}"
    await db.commit()
    await db.refresh(doc)
    return doc


async def upload_vehicle_image(
    db: AsyncSession,
    vehicle_id: str,
    file: UploadFile,
) -> dict:
    _PHOTO_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    content_type = (file.content_type or "").lower()
    if content_type not in _PHOTO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported file type. Allowed: JPEG, PNG, WebP.",
        )

    vehicle = await get_vehicle(db, vehicle_id)

    ext_map = {"image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp"}
    ext = ext_map.get(content_type, "jpg")

    os.makedirs(_VEHICLE_PHOTO_DIR, exist_ok=True)
    filename = f"{vehicle.id}.{ext}"
    file_path = os.path.join(_VEHICLE_PHOTO_DIR, filename)

    with open(file_path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    vehicle.image_url = f"/static/vehicles/{filename}"
    await db.commit()
    await db.refresh(vehicle)
    return await _build_vehicle_response(db, vehicle)


# ── Vehicle Maintenances ──────────────────────────────────────────────────────

async def get_maintenances(db: AsyncSession, vehicle_id: str) -> list:
    vehicle = await get_vehicle(db, vehicle_id)

    result = await db.execute(
        select(VehicleMaintenance)
        .where(VehicleMaintenance.vehicle_id == vehicle.id)
        .order_by(VehicleMaintenance.scheduled_date.asc())
    )
    return list(result.scalars().all())


async def create_maintenance(db: AsyncSession, vehicle_id: str, data: dict) -> VehicleMaintenance:
    vehicle = await get_vehicle(db, vehicle_id)

    maint = VehicleMaintenance(
        id=str(uuid.uuid4()),
        vehicle_id=vehicle.id,
        milestone_label=data["milestone_label"],
        milestone_km=data.get("milestone_km"),
        scheduled_date=data.get("scheduled_date"),
        service_center=data.get("service_center"),
        notes=data.get("notes"),
        status=data.get("status", "pending"),
    )
    db.add(maint)
    await db.commit()
    await db.refresh(maint)
    return maint


async def update_maintenance(
    db: AsyncSession,
    vehicle_id: str,
    m_id: str,
    updates: dict,
) -> VehicleMaintenance:
    vehicle = await get_vehicle(db, vehicle_id)

    result = await db.execute(
        select(VehicleMaintenance).where(
            and_(
                VehicleMaintenance.id == m_id,
                VehicleMaintenance.vehicle_id == vehicle.id,
            )
        )
    )
    maint = result.scalar_one_or_none()
    if not maint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance record not found")

    for key, value in updates.items():
        setattr(maint, key, value)

    await db.commit()
    await db.refresh(maint)
    return maint


async def delete_maintenance(db: AsyncSession, vehicle_id: str, m_id: str) -> None:
    vehicle = await get_vehicle(db, vehicle_id)

    result = await db.execute(
        select(VehicleMaintenance).where(
            and_(
                VehicleMaintenance.id == m_id,
                VehicleMaintenance.vehicle_id == vehicle.id,
            )
        )
    )
    maint = result.scalar_one_or_none()
    if not maint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance record not found")

    await db.delete(maint)
    await db.commit()


# ── Vendors ───────────────────────────────────────────────────────────────────

async def _vendor_counts(db: AsyncSession, vendor_id: str) -> dict:
    vehicle_count_q = select(func.count()).where(Vehicle.owner_vendor_id == vendor_id)
    vehicle_count = (await db.execute(vehicle_count_q)).scalar_one()
    # Driver count: stub as 0 (drivers don't have vendor_id yet)
    return {"vehicle_count": vehicle_count, "driver_count": 0}


async def list_vendors(
    db: AsyncSession,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    per_page: int = 25,
) -> dict:
    per_page = min(per_page, 100)

    base_q = select(Vendor)

    if search:
        like = f"%{search}%"
        base_q = base_q.where(Vendor.name.ilike(like))

    if status_filter:
        base_q = base_q.where(Vendor.status == status_filter)

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * per_page
    rows_q = base_q.order_by(Vendor.created_at.desc()).offset(offset).limit(per_page)
    rows_result = await db.execute(rows_q)
    vendors = list(rows_result.scalars().all())

    items = []
    for v in vendors:
        counts = await _vendor_counts(db, v.id)
        item = VendorResponse.model_validate(v).model_dump()
        item.update(counts)
        items.append(item)

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


async def get_vendor(db: AsyncSession, vendor_id: str) -> Vendor:
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return vendor


async def get_vendor_detail(db: AsyncSession, vendor_id: str) -> dict:
    vendor = await get_vendor(db, vendor_id)
    counts = await _vendor_counts(db, vendor.id)
    item = VendorResponse.model_validate(vendor).model_dump()
    item.update(counts)
    return item


async def create_vendor(db: AsyncSession, data: dict) -> dict:
    vendor = Vendor(
        id=str(uuid.uuid4()),
        name=data["name"],
        city=data.get("city"),
        phone=data.get("phone"),
        email=data.get("email"),
        status=data.get("status", "review"),
        commission_rate=data.get("commission_rate", 22.0),
        commission_type=data.get("commission_type", "percentage"),
    )
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    counts = await _vendor_counts(db, vendor.id)
    item = VendorResponse.model_validate(vendor).model_dump()
    item.update(counts)
    return item


async def update_vendor(db: AsyncSession, vendor_id: str, updates: dict) -> dict:
    vendor = await get_vendor(db, vendor_id)

    for key, value in updates.items():
        setattr(vendor, key, value)

    await db.commit()
    await db.refresh(vendor)
    counts = await _vendor_counts(db, vendor.id)
    item = VendorResponse.model_validate(vendor).model_dump()
    item.update(counts)
    return item


async def activate_vendor(db: AsyncSession, vendor_id: str) -> dict:
    vendor = await get_vendor(db, vendor_id)
    vendor.status = "active"
    await db.commit()
    await db.refresh(vendor)
    counts = await _vendor_counts(db, vendor.id)
    item = VendorResponse.model_validate(vendor).model_dump()
    item.update(counts)
    return item


async def suspend_vendor(db: AsyncSession, vendor_id: str, reason: str) -> dict:
    vendor = await get_vendor(db, vendor_id)
    vendor.status = "suspended"
    vendor.flag_reason = reason
    await db.commit()
    await db.refresh(vendor)
    counts = await _vendor_counts(db, vendor.id)
    item = VendorResponse.model_validate(vendor).model_dump()
    item.update(counts)
    return item

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile

from app.database import get_db
from app.dependencies import get_current_admin_user, require_permission
from app.models.admin_user import AdminUser
from app.schemas.common import MessageResponse
from app.schemas.vehicle import (
    GroundVehicleRequest,
    LinkDriverRequest,
    ReassignClassRequest,
    SuspendVendorRequest,
    VehicleCreate,
    VehicleDocumentCreate,
    VehicleDocumentReview,
    VehicleDocumentResponse,
    VehicleMaintenanceCreate,
    VehicleMaintenanceResponse,
    VehicleMaintenanceUpdate,
    VendorCreate,
    VendorUpdate,
    VehicleUpdate,
)
from app.services import audit_service, vehicle_service

vehicles_router = APIRouter()
vendors_router = APIRouter()


# ── Vehicles ──────────────────────────────────────────────────────────────────

@vehicles_router.get("")
async def list_vehicles(
    search: str | None = Query(None),
    status: str | None = Query(None),
    doc_status: str | None = Query(None),
    vehicle_class_id: str | None = Query(None),
    owner_type: str | None = Query(None),
    owner_vendor_id: str | None = Query(None),
    year_min: int | None = Query(None, ge=1990),
    year_max: int | None = Query(None, le=2100),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    _: AdminUser = Depends(require_permission("vehicles.view")),
    db=Depends(get_db),
):
    return await vehicle_service.list_vehicles(
        db,
        search=search,
        status_filter=status,
        doc_status=doc_status,
        vehicle_class_id=vehicle_class_id,
        owner_type=owner_type,
        owner_vendor_id=owner_vendor_id,
        year_min=year_min,
        year_max=year_max,
        page=page,
        per_page=per_page,
    )


@vehicles_router.post("", status_code=201)
async def create_vehicle(
    body: VehicleCreate,
    _: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    return await vehicle_service.create_vehicle(db, body.model_dump())


@vehicles_router.get("/{id}")
async def get_vehicle_detail(
    id: str,
    _: AdminUser = Depends(require_permission("vehicles.view")),
    db=Depends(get_db),
):
    return await vehicle_service.get_vehicle_detail(db, id)


@vehicles_router.patch("/{id}")
async def update_vehicle(
    id: str,
    body: VehicleUpdate,
    _: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    return await vehicle_service.update_vehicle(db, id, body.model_dump(exclude_unset=True))


@vehicles_router.post("/{id}/approve")
async def approve_vehicle(
    id: str,
    request: Request,
    admin: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    result = await vehicle_service.approve_vehicle(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="vehicle.approve",
            target=f"vehicle:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@vehicles_router.post("/{id}/ground")
async def ground_vehicle(
    id: str,
    body: GroundVehicleRequest,
    request: Request,
    admin: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    result = await vehicle_service.ground_vehicle(db, id, body.reason)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="vehicle.ground",
            target=f"vehicle:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@vehicles_router.post("/{id}/reactivate")
async def reactivate_vehicle(
    id: str,
    request: Request,
    admin: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    result = await vehicle_service.reactivate_vehicle(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="vehicle.reactivate",
            target=f"vehicle:{id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@vehicles_router.post("/{id}/link-driver")
async def link_driver(
    id: str,
    body: LinkDriverRequest,
    request: Request,
    admin: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    result = await vehicle_service.link_driver(db, id, body.driver_id)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="vehicle.link_driver",
            target=f"vehicle:{id} driver:{body.driver_id}",
            category="Operations",
            severity="low",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@vehicles_router.post("/{id}/unlink-driver")
async def unlink_driver(
    id: str,
    request: Request,
    admin: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    result = await vehicle_service.unlink_driver(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="vehicle.unlink_driver",
            target=f"vehicle:{id}",
            category="Operations",
            severity="low",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@vehicles_router.post("/{id}/reassign-class")
async def reassign_class(
    id: str,
    body: ReassignClassRequest,
    _: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    return await vehicle_service.reassign_class(db, id, body.vehicle_class_id)


@vehicles_router.post("/{id}/upload-image")
async def upload_vehicle_image(
    id: str,
    file: UploadFile = File(...),
    _: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    return await vehicle_service.upload_vehicle_image(db, id, file)


# ── Vehicle Documents ─────────────────────────────────────────────────────────

@vehicles_router.get("/{id}/documents")
async def get_documents(
    id: str,
    _: AdminUser = Depends(require_permission("vehicles.view")),
    db=Depends(get_db),
):
    docs = await vehicle_service.get_documents(db, id)
    return {"items": [VehicleDocumentResponse.model_validate(d).model_dump() for d in docs]}


@vehicles_router.post("/{id}/documents", status_code=201, response_model=VehicleDocumentResponse)
async def create_document(
    id: str,
    body: VehicleDocumentCreate,
    _: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    return await vehicle_service.create_document(db, id, body.model_dump())


@vehicles_router.patch("/{id}/documents/{doc_id}", response_model=VehicleDocumentResponse)
async def review_document(
    id: str,
    doc_id: str,
    body: VehicleDocumentReview,
    request: Request,
    admin: AdminUser = Depends(require_permission("kyc.documents.approve")),
    db=Depends(get_db),
):
    result = await vehicle_service.review_document(
        db,
        vehicle_id=id,
        doc_id=doc_id,
        action=body.action,
        expiry_date=body.expiry_date,
        review_note=body.review_note,
        admin_email=admin.email,
    )
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="vehicle.document.review",
            target=f"vehicle:{id} doc:{doc_id}",
            category="Operations",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@vehicles_router.post("/{id}/documents/{doc_id}/upload", response_model=VehicleDocumentResponse)
async def upload_document_image(
    id: str,
    doc_id: str,
    file: UploadFile = File(...),
    _: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    return await vehicle_service.upload_document_image(db, id, doc_id, file)


# ── Vehicle Maintenances ──────────────────────────────────────────────────────

@vehicles_router.get("/{id}/maintenances")
async def get_maintenances(
    id: str,
    _: AdminUser = Depends(require_permission("vehicles.view")),
    db=Depends(get_db),
):
    maints = await vehicle_service.get_maintenances(db, id)
    return {"items": [VehicleMaintenanceResponse.model_validate(m).model_dump() for m in maints]}


@vehicles_router.post("/{id}/maintenances", status_code=201, response_model=VehicleMaintenanceResponse)
async def create_maintenance(
    id: str,
    body: VehicleMaintenanceCreate,
    _: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    return await vehicle_service.create_maintenance(db, id, body.model_dump())


@vehicles_router.patch("/{id}/maintenances/{m_id}", response_model=VehicleMaintenanceResponse)
async def update_maintenance(
    id: str,
    m_id: str,
    body: VehicleMaintenanceUpdate,
    _: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    return await vehicle_service.update_maintenance(db, id, m_id, body.model_dump(exclude_unset=True))


@vehicles_router.delete("/{id}/maintenances/{m_id}", response_model=MessageResponse)
async def delete_maintenance(
    id: str,
    m_id: str,
    _: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    await vehicle_service.delete_maintenance(db, id, m_id)
    return MessageResponse(message="Maintenance record deleted")


# ── Vendors ───────────────────────────────────────────────────────────────────

@vendors_router.get("")
async def list_vendors(
    search: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    _: AdminUser = Depends(require_permission("vehicles.view")),
    db=Depends(get_db),
):
    return await vehicle_service.list_vendors(
        db,
        search=search,
        status_filter=status,
        page=page,
        per_page=per_page,
    )


@vendors_router.post("", status_code=201)
async def create_vendor(
    body: VendorCreate,
    _: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    return await vehicle_service.create_vendor(db, body.model_dump())


@vendors_router.get("/{id}")
async def get_vendor_detail(
    id: str,
    _: AdminUser = Depends(require_permission("vehicles.view")),
    db=Depends(get_db),
):
    return await vehicle_service.get_vendor_detail(db, id)


@vendors_router.patch("/{id}")
async def update_vendor(
    id: str,
    body: VendorUpdate,
    _: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    return await vehicle_service.update_vendor(db, id, body.model_dump(exclude_unset=True))


@vendors_router.post("/{id}/activate")
async def activate_vendor(
    id: str,
    request: Request,
    admin: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    result = await vehicle_service.activate_vendor(db, id)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="vendor.activate",
            target=f"vendor:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@vendors_router.post("/{id}/suspend")
async def suspend_vendor(
    id: str,
    body: SuspendVendorRequest,
    request: Request,
    admin: AdminUser = Depends(require_permission("vehicles.manage")),
    db=Depends(get_db),
):
    result = await vehicle_service.suspend_vendor(db, id, body.reason)
    try:
        await audit_service.log_event(
            db,
            actor_name=admin.email,
            actor_role=admin.role if hasattr(admin, "role") else "Admin",
            action="vendor.suspend",
            target=f"vendor:{id}",
            category="Operations",
            severity="high",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result

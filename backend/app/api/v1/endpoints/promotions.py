from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, status

from app.database import get_db
from app.dependencies import get_current_admin_user, require_permission
from app.models.admin_user import AdminUser
from app.schemas.common import MessageResponse
from app.schemas.promotions import (
    PaginatedPromotions,
    PromotionAnalytics,
    PromotionCreate,
    PromotionResponse,
    PromotionUpdate,
    ReferralProgramResponse,
    ReferralProgramUpdate,
    ReferralStats,
)
from app.services import audit_service, promotions_service

import math

promotions_router = APIRouter()
referrals_router = APIRouter()


# ── Promotions ─────────────────────────────────────────────────────────────────

@promotions_router.get("", response_model=PaginatedPromotions)
async def list_promotions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    status: str | None = Query(None),
    _: AdminUser = Depends(require_permission("promotions.view")),
    db=Depends(get_db),
):
    items, total = await promotions_service.list_promotions(
        db, page=page, page_size=page_size, search=search, status=status
    )
    pages = math.ceil(total / page_size) if total else 1
    return PaginatedPromotions(items=items, total=total, page=page, pages=pages)


@promotions_router.post("", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    body: PromotionCreate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("promotions.create")),
    db=Depends(get_db),
):
    result = await promotions_service.create_promotion(db, body.model_dump())
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="promotion.created",
            target=f"promotion:{result.id}",
            category="Marketing",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data={"name": getattr(result, "name", None)},
        )
    except Exception:
        pass
    return result


# IMPORTANT: analytics MUST be registered before /{id} to avoid being swallowed by the wildcard
@promotions_router.get("/analytics", response_model=PromotionAnalytics)
async def get_analytics(
    days: int = Query(14, ge=1, le=365),
    _: AdminUser = Depends(require_permission("promotions.view")),
    db=Depends(get_db),
):
    data = await promotions_service.get_analytics(db, days=days)
    return PromotionAnalytics(**data)


@promotions_router.get("/{promotion_id}", response_model=PromotionResponse)
async def get_promotion(
    promotion_id: str,
    _: AdminUser = Depends(require_permission("promotions.view")),
    db=Depends(get_db),
):
    return await promotions_service.get_promotion(db, promotion_id)


@promotions_router.patch("/{promotion_id}", response_model=PromotionResponse)
async def update_promotion(
    promotion_id: str,
    body: PromotionUpdate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("promotions.edit")),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await promotions_service.update_promotion(db, promotion_id, changes)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="promotion.updated",
            target=f"promotion:{promotion_id}",
            category="Marketing",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data=changes,
        )
    except Exception:
        pass
    return result


@promotions_router.post("/{promotion_id}/activate", response_model=PromotionResponse)
async def activate_promotion(
    promotion_id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("promotions.edit")),
    db=Depends(get_db),
):
    result = await promotions_service.activate_promotion(db, promotion_id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="promotion.activated",
            target=f"promotion:{promotion_id}",
            category="Marketing",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@promotions_router.post("/{promotion_id}/pause", response_model=PromotionResponse)
async def pause_promotion(
    promotion_id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("promotions.edit")),
    db=Depends(get_db),
):
    result = await promotions_service.pause_promotion(db, promotion_id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="promotion.paused",
            target=f"promotion:{promotion_id}",
            category="Marketing",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return result


@promotions_router.delete("/{promotion_id}", response_model=MessageResponse)
async def delete_promotion(
    promotion_id: str,
    request: Request,
    current_user: AdminUser = Depends(require_permission("promotions.delete")),
    db=Depends(get_db),
):
    await promotions_service.delete_promotion(db, promotion_id)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="promotion.deleted",
            target=f"promotion:{promotion_id}",
            category="Marketing",
            severity="med",
            source_ip=request.client.host if request.client else None,
        )
    except Exception:
        pass
    return MessageResponse(message="Promotion deleted.")


# ── Referrals ──────────────────────────────────────────────────────────────────

@referrals_router.get("/program", response_model=ReferralProgramResponse)
async def get_referral_program(
    _: AdminUser = Depends(require_permission("referrals.view")),
    db=Depends(get_db),
):
    return await promotions_service.get_referral_program(db)


@referrals_router.patch("/program", response_model=ReferralProgramResponse)
async def update_referral_program(
    body: ReferralProgramUpdate,
    request: Request,
    current_user: AdminUser = Depends(require_permission("referrals.manage")),
    db=Depends(get_db),
):
    changes = body.model_dump(exclude_unset=True)
    result = await promotions_service.update_referral_program(db, changes)
    try:
        await audit_service.log_event(
            db,
            actor_name=current_user.email,
            actor_role=current_user.role if hasattr(current_user, "role") else "Admin",
            action="referral.program_updated",
            target="referral_program",
            category="Marketing",
            severity="med",
            source_ip=request.client.host if request.client else None,
            after_data=changes,
        )
    except Exception:
        pass
    return result


@referrals_router.get("/stats", response_model=ReferralStats)
async def get_referral_stats(
    _: AdminUser = Depends(require_permission("referrals.view")),
    db=Depends(get_db),
):
    data = await promotions_service.get_referral_stats(db)
    return ReferralStats(**data)

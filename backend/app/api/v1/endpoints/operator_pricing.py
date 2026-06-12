from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.operator_auth import get_current_operator_user
from app.database import get_db
from app.models.operator_user import OperatorUser
from app.schemas.operator_pricing import (
    CharterQuoteCreate,
    CharterQuoteOut,
    CharterQuoteUpdate,
    CorporateAgreementCreate,
    CorporateAgreementOut,
    CorporateAgreementUpdate,
    PricingRuleCreate,
    PricingRuleOut,
    PricingRuleUpdate,
    SurchargeCreate,
    SurchargeOut,
    SurchargeUpdate,
)
from app.services import operator_pricing_service

router = APIRouter(prefix="/pricing", tags=["operator-pricing"])


@router.get("/rules", response_model=list[PricingRuleOut])
async def list_pricing_rules(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.list_pricing_rules(db, current_user.operator_id)


@router.post("/rules", response_model=PricingRuleOut, status_code=201)
async def create_pricing_rule(
    payload: PricingRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.create_pricing_rule(db, current_user.operator_id, payload)


@router.patch("/rules/{rule_id}", response_model=PricingRuleOut)
async def update_pricing_rule(
    rule_id: str,
    payload: PricingRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.update_pricing_rule(db, current_user.operator_id, rule_id, payload)


@router.get("/surcharges", response_model=list[SurchargeOut])
async def list_surcharges(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.list_surcharges(db, current_user.operator_id)


@router.post("/surcharges", response_model=SurchargeOut, status_code=201)
async def create_surcharge(
    payload: SurchargeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.create_surcharge(db, current_user.operator_id, payload)


@router.patch("/surcharges/{surcharge_id}", response_model=SurchargeOut)
async def update_surcharge(
    surcharge_id: str,
    payload: SurchargeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.update_surcharge(db, current_user.operator_id, surcharge_id, payload)


@router.get("/corporate-agreements", response_model=list[CorporateAgreementOut])
async def list_corporate_agreements(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.list_corporate_agreements(db, current_user.operator_id)


@router.post("/corporate-agreements", response_model=CorporateAgreementOut, status_code=201)
async def create_corporate_agreement(
    payload: CorporateAgreementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.create_corporate_agreement(db, current_user.operator_id, payload)


@router.patch("/corporate-agreements/{agreement_id}", response_model=CorporateAgreementOut)
async def update_corporate_agreement(
    agreement_id: str,
    payload: CorporateAgreementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.update_corporate_agreement(
        db, current_user.operator_id, agreement_id, payload
    )


@router.get("/quotes", response_model=list[CharterQuoteOut])
async def list_quotes(
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.list_quotes(db, current_user.operator_id)


@router.post("/quotes", response_model=CharterQuoteOut, status_code=201)
async def create_quote(
    payload: CharterQuoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.create_quote(db, current_user.operator_id, current_user.id, payload)


@router.patch("/quotes/{quote_id}", response_model=CharterQuoteOut)
async def update_quote(
    quote_id: str,
    payload: CharterQuoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.update_quote(db, current_user.operator_id, quote_id, payload)


@router.post("/quotes/{quote_id}/send", response_model=CharterQuoteOut)
async def send_quote(
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: OperatorUser = Depends(get_current_operator_user),
):
    return await operator_pricing_service.send_quote(db, current_user.operator_id, quote_id)

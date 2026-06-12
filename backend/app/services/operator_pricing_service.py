from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.operator_pricing import (
    OperatorCharterQuote,
    OperatorCorporateAgreement,
    OperatorPricingRule,
    OperatorSurcharge,
)
from app.schemas.operator_pricing import (
    CharterQuoteCreate,
    CharterQuoteUpdate,
    CorporateAgreementCreate,
    CorporateAgreementUpdate,
    PricingRuleCreate,
    PricingRuleUpdate,
    SurchargeCreate,
    SurchargeUpdate,
)


async def list_pricing_rules(db: AsyncSession, operator_id: str) -> list[OperatorPricingRule]:
    result = await db.execute(
        select(OperatorPricingRule)
        .where(OperatorPricingRule.operator_id == operator_id)
        .order_by(OperatorPricingRule.created_at.desc())
    )
    return list(result.scalars().all())


async def create_pricing_rule(db: AsyncSession, operator_id: str, payload: PricingRuleCreate) -> OperatorPricingRule:
    rule = OperatorPricingRule(operator_id=operator_id, **payload.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


async def update_pricing_rule(
    db: AsyncSession, operator_id: str, rule_id: str, payload: PricingRuleUpdate
) -> OperatorPricingRule:
    rule = await _get_rule(db, operator_id, rule_id)
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(rule, k, v)
    rule.version += 1
    await db.commit()
    await db.refresh(rule)
    return rule


async def _get_rule(db: AsyncSession, operator_id: str, rule_id: str) -> OperatorPricingRule:
    result = await db.execute(
        select(OperatorPricingRule)
        .where(OperatorPricingRule.id == rule_id, OperatorPricingRule.operator_id == operator_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    return rule


async def list_surcharges(db: AsyncSession, operator_id: str) -> list[OperatorSurcharge]:
    result = await db.execute(
        select(OperatorSurcharge)
        .where(OperatorSurcharge.operator_id == operator_id)
        .order_by(OperatorSurcharge.created_at)
    )
    return list(result.scalars().all())


async def create_surcharge(db: AsyncSession, operator_id: str, payload: SurchargeCreate) -> OperatorSurcharge:
    surcharge = OperatorSurcharge(operator_id=operator_id, **payload.model_dump())
    db.add(surcharge)
    await db.commit()
    await db.refresh(surcharge)
    return surcharge


async def update_surcharge(
    db: AsyncSession, operator_id: str, surcharge_id: str, payload: SurchargeUpdate
) -> OperatorSurcharge:
    result = await db.execute(
        select(OperatorSurcharge)
        .where(OperatorSurcharge.id == surcharge_id, OperatorSurcharge.operator_id == operator_id)
    )
    surcharge = result.scalar_one_or_none()
    if not surcharge:
        raise HTTPException(status_code=404, detail="Surcharge not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(surcharge, k, v)
    await db.commit()
    await db.refresh(surcharge)
    return surcharge


async def list_corporate_agreements(db: AsyncSession, operator_id: str) -> list[OperatorCorporateAgreement]:
    result = await db.execute(
        select(OperatorCorporateAgreement)
        .where(OperatorCorporateAgreement.operator_id == operator_id)
        .order_by(OperatorCorporateAgreement.created_at.desc())
    )
    return list(result.scalars().all())


async def create_corporate_agreement(
    db: AsyncSession, operator_id: str, payload: CorporateAgreementCreate
) -> OperatorCorporateAgreement:
    agreement = OperatorCorporateAgreement(operator_id=operator_id, **payload.model_dump())
    db.add(agreement)
    await db.commit()
    await db.refresh(agreement)
    return agreement


async def update_corporate_agreement(
    db: AsyncSession, operator_id: str, agreement_id: str, payload: CorporateAgreementUpdate
) -> OperatorCorporateAgreement:
    result = await db.execute(
        select(OperatorCorporateAgreement)
        .where(
            OperatorCorporateAgreement.id == agreement_id,
            OperatorCorporateAgreement.operator_id == operator_id,
        )
    )
    agreement = result.scalar_one_or_none()
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(agreement, k, v)
    await db.commit()
    await db.refresh(agreement)
    return agreement


async def list_quotes(db: AsyncSession, operator_id: str) -> list[OperatorCharterQuote]:
    result = await db.execute(
        select(OperatorCharterQuote)
        .where(OperatorCharterQuote.operator_id == operator_id)
        .order_by(OperatorCharterQuote.created_at.desc())
    )
    return list(result.scalars().all())


async def create_quote(db: AsyncSession, operator_id: str, user_id: str, payload: CharterQuoteCreate) -> OperatorCharterQuote:
    quote = OperatorCharterQuote(operator_id=operator_id, created_by=user_id, **payload.model_dump())
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return quote


async def update_quote(
    db: AsyncSession, operator_id: str, quote_id: str, payload: CharterQuoteUpdate
) -> OperatorCharterQuote:
    quote = await _get_quote(db, operator_id, quote_id)
    if quote.status not in ("draft",):
        raise HTTPException(status_code=400, detail="Only draft quotes can be edited")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(quote, k, v)
    await db.commit()
    await db.refresh(quote)
    return quote


async def send_quote(db: AsyncSession, operator_id: str, quote_id: str) -> OperatorCharterQuote:
    quote = await _get_quote(db, operator_id, quote_id)
    if quote.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft quotes can be sent")
    from datetime import timedelta
    quote.status = "sent"
    quote.expires_at = datetime.utcnow() + timedelta(hours=quote.validity_hours)
    await db.commit()
    await db.refresh(quote)
    return quote


async def _get_quote(db: AsyncSession, operator_id: str, quote_id: str) -> OperatorCharterQuote:
    result = await db.execute(
        select(OperatorCharterQuote)
        .where(OperatorCharterQuote.id == quote_id, OperatorCharterQuote.operator_id == operator_id)
    )
    quote = result.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote

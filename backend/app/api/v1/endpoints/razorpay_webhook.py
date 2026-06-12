from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Request
from sqlalchemy import select

from app.database import get_db
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.post("")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Receive and process Razorpay webhook events.

    Events handled:
      - payment.captured  → mark Payment captured, store payment_id in gateway_ref
      - payment.failed    → mark Payment failed
      - refund.processed  → mark Refund processed
    """
    body = await request.body()

    # ── Verify signature ──────────────────────────────────────────────────────
    try:
        from app.providers import get_payment_provider
        provider = get_payment_provider()
        if x_razorpay_signature and not provider.verify_webhook_signature(body, x_razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    except HTTPException:
        raise
    except Exception:
        # If provider not configured, skip verification in dev
        pass

    import json
    try:
        event = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type: str = event.get("event", "")
    payload: dict = event.get("payload", {})

    from app.models.payment import Payment, PaymentStatus, Refund

    # ── payment.captured ──────────────────────────────────────────────────────
    if event_type == "payment.captured":
        payment_entity: dict = payload.get("payment", {}).get("entity", {})
        razorpay_payment_id: str = payment_entity.get("id", "")
        razorpay_order_id: str = payment_entity.get("order_id", "")
        amount: int = payment_entity.get("amount", 0)
        gateway_fee: int = payment_entity.get("fee", 0)

        if razorpay_order_id:
            result = await db.execute(
                select(Payment).where(Payment.gateway_order_id == razorpay_order_id)
            )
            payment = result.scalar_one_or_none()
            if payment:
                payment.status = PaymentStatus.captured
                payment.gateway_ref = razorpay_payment_id  # now usable for refunds
                payment.gateway_fee = gateway_fee
                payment.net_amount = amount - gateway_fee
                await db.commit()

    # ── payment.failed ────────────────────────────────────────────────────────
    elif event_type == "payment.failed":
        payment_entity = payload.get("payment", {}).get("entity", {})
        razorpay_order_id = payment_entity.get("order_id", "")

        if razorpay_order_id:
            result = await db.execute(
                select(Payment).where(Payment.gateway_order_id == razorpay_order_id)
            )
            payment = result.scalar_one_or_none()
            if payment:
                payment.status = PaymentStatus.failed
                await db.commit()

    # ── refund.processed ─────────────────────────────────────────────────────
    elif event_type == "refund.processed":
        refund_entity: dict = payload.get("refund", {}).get("entity", {})
        razorpay_refund_id: str = refund_entity.get("id", "")

        if razorpay_refund_id:
            result = await db.execute(
                select(Refund).where(Refund.gateway_refund_id == razorpay_refund_id)
            )
            refund = result.scalar_one_or_none()
            if refund:
                refund.status = "processed"
                await db.commit()

    return {"status": "ok"}

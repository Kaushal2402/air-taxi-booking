from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.air_booking import (
    AirBooking,
    AirBookingNote,
    AirBookingPassenger,
    AirBookingTimeline,
    CharterQuote,
)
from app.models.audit import AuditLog
from app.models.booking import (
    BookingAdminNote,
    BookingFareComponent,
    BookingTimelineEvent,
    Dispute,
    RoadBooking,
)
from app.models.customer import Customer
from app.models.payment import Payment, ReconciliationBatch, ReconciliationUnmatched, Refund
from app.models.payout import PayoutAdjustment, PayoutPayee, PayoutRun
from app.services.settings_service import get_settings

logger = logging.getLogger(__name__)


@dataclass
class PurgeReport:
    road_bookings_deleted: int = 0
    air_bookings_deleted: int = 0
    customers_anonymized: int = 0
    payments_deleted: int = 0
    payout_runs_deleted: int = 0
    audit_logs_deleted: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def total_affected(self) -> int:
        return (
            self.road_bookings_deleted
            + self.air_bookings_deleted
            + self.customers_anonymized
            + self.payments_deleted
            + self.payout_runs_deleted
            + self.audit_logs_deleted
        )


# ── Gap 1 & 2: Trip & Booking Records ────────────────────────────────────────

async def purge_trips(db: AsyncSession, settings) -> tuple[int, int]:
    """
    Delete road and air booking rows (plus all child rows) older than
    data_retention_trip_days. Only terminal bookings are purged — active
    or in-progress bookings are never deleted regardless of age.
    Returns (road_deleted, air_deleted).
    """
    days = settings.data_retention_trip_days or 2555  # 7-year default
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    terminal_statuses = {
        "Completed", "Cancelled", "Expired", "NoShow", "Rejected", "Failed",
    }

    # ── Road bookings ──────────────────────────────────────────────────────────
    old_road_q = select(RoadBooking.id).where(
        RoadBooking.status.in_(terminal_statuses),
        RoadBooking.created_at < cutoff,
    )
    old_road_ids_result = await db.execute(old_road_q)
    old_road_ids = [r[0] for r in old_road_ids_result.fetchall()]

    if old_road_ids:
        # Child tables first (no DB-level cascade on booking child tables)
        await db.execute(delete(Dispute).where(Dispute.booking_id.in_(old_road_ids)))
        await db.execute(delete(BookingAdminNote).where(BookingAdminNote.booking_id.in_(old_road_ids)))
        await db.execute(delete(BookingFareComponent).where(BookingFareComponent.booking_id.in_(old_road_ids)))
        await db.execute(delete(BookingTimelineEvent).where(BookingTimelineEvent.booking_id.in_(old_road_ids)))
        await db.execute(delete(RoadBooking).where(RoadBooking.id.in_(old_road_ids)))

    # ── Air bookings ───────────────────────────────────────────────────────────
    old_air_q = select(AirBooking.id).where(
        AirBooking.status.in_(terminal_statuses),
        AirBooking.created_at < cutoff,
    )
    old_air_ids_result = await db.execute(old_air_q)
    old_air_ids = [r[0] for r in old_air_ids_result.fetchall()]

    if old_air_ids:
        await db.execute(delete(AirBookingNote).where(AirBookingNote.booking_id.in_(old_air_ids)))
        await db.execute(delete(AirBookingTimeline).where(AirBookingTimeline.booking_id.in_(old_air_ids)))
        await db.execute(delete(AirBookingPassenger).where(AirBookingPassenger.booking_id.in_(old_air_ids)))
        await db.execute(delete(CharterQuote).where(CharterQuote.booking_id.in_(old_air_ids)))
        await db.execute(delete(AirBooking).where(AirBooking.id.in_(old_air_ids)))

    await db.commit()
    logger.info("purge_trips: deleted %d road, %d air bookings (cutoff=%s)", len(old_road_ids), len(old_air_ids), cutoff.date())
    return len(old_road_ids), len(old_air_ids)


# ── Gap 3: Customer PII ───────────────────────────────────────────────────────

async def purge_pii(db: AsyncSession, settings) -> int:
    """
    Anonymize PII fields on Customer rows whose last_active_at (or created_at
    as fallback) is older than data_retention_pii_days. Only runs when
    privacy_auto_anonymize is enabled in platform settings.
    Returns count of customers anonymized.
    """
    if not settings.privacy_auto_anonymize:
        return 0

    days = settings.data_retention_pii_days or 1095  # 3-year default
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Select customers whose last activity is before the cutoff and who are
    # not already anonymized (name doesn't start with [ANON])
    old_customers_q = select(Customer.id).where(
        Customer.status.in_(["inactive", "banned", "deleted"]),
        # Use last_active_at if present, else fall back to created_at
        (Customer.last_active_at < cutoff),
        ~Customer.name.like("[ANON%"),
    )
    result = await db.execute(old_customers_q)
    ids = [r[0] for r in result.fetchall()]

    if ids:
        await db.execute(
            update(Customer)
            .where(Customer.id.in_(ids))
            .values(
                name="[ANON]",
                phone=f"[ANON-{Customer.id}]",
                email=f"[ANON-{Customer.id}]@redacted",
            )
        )
        await db.commit()

    logger.info("purge_pii: anonymized %d customers (cutoff=%s)", len(ids), cutoff.date())
    return len(ids)


# ── Gap 4 & 5: Financial Records ─────────────────────────────────────────────

async def purge_financials(db: AsyncSession, settings) -> tuple[int, int]:
    """
    Delete Payment rows (and associated Refunds) and PayoutRun rows older than
    data_retention_financial_years. ReconciliationBatch rows follow the same
    window. Returns (payments_deleted, payout_runs_deleted).
    """
    years = settings.data_retention_financial_years or 7
    cutoff = datetime.now(timezone.utc) - timedelta(days=years * 365)

    # ── Payments & refunds ─────────────────────────────────────────────────────
    old_payments_q = select(Payment.id).where(Payment.created_at < cutoff)
    result = await db.execute(old_payments_q)
    payment_ids = [r[0] for r in result.fetchall()]

    if payment_ids:
        # Refunds cascade via Payment FK but execute explicitly for safety
        await db.execute(delete(Refund).where(Refund.payment_id.in_(payment_ids)))
        await db.execute(delete(Payment).where(Payment.id.in_(payment_ids)))

    # Reconciliation batches follow financial retention window
    await db.execute(delete(ReconciliationBatch).where(ReconciliationBatch.created_at < cutoff))
    await db.execute(delete(ReconciliationUnmatched).where(ReconciliationUnmatched.created_at < cutoff))

    # ── Payout runs ────────────────────────────────────────────────────────────
    old_runs_q = select(PayoutRun.id).where(PayoutRun.created_at < cutoff)
    result2 = await db.execute(old_runs_q)
    run_ids = [r[0] for r in result2.fetchall()]

    if run_ids:
        # PayoutAdjustments → PayoutPayees → PayoutRun (cascade via ORM relationship)
        payee_ids_q = select(PayoutPayee.id).where(PayoutPayee.run_id.in_(run_ids))
        payee_result = await db.execute(payee_ids_q)
        payee_ids = [r[0] for r in payee_result.fetchall()]
        if payee_ids:
            await db.execute(delete(PayoutAdjustment).where(PayoutAdjustment.payee_id.in_(payee_ids)))
        await db.execute(delete(PayoutPayee).where(PayoutPayee.run_id.in_(run_ids)))
        await db.execute(delete(PayoutRun).where(PayoutRun.id.in_(run_ids)))

    await db.commit()
    logger.info(
        "purge_financials: deleted %d payments, %d payout runs (cutoff=%s)",
        len(payment_ids), len(run_ids), cutoff.date(),
    )
    return len(payment_ids), len(run_ids)


# ── Gap 6: Audit Logs ─────────────────────────────────────────────────────────

async def purge_audit_logs(db: AsyncSession, settings) -> int:
    """
    Delete AuditLog rows older than data_retention_audit_years.
    Returns count deleted.
    """
    years = settings.data_retention_audit_years or 7
    cutoff = datetime.now(timezone.utc) - timedelta(days=years * 365)

    result = await db.execute(
        select(AuditLog.id).where(AuditLog.timestamp < cutoff)
    )
    ids = [r[0] for r in result.fetchall()]

    if ids:
        await db.execute(delete(AuditLog).where(AuditLog.id.in_(ids)))
        await db.commit()

    logger.info("purge_audit_logs: deleted %d rows (cutoff=%s)", len(ids), cutoff.date())
    return len(ids)


# ── Gap 7: Master orchestrator ────────────────────────────────────────────────

async def run_all_purges(db: AsyncSession) -> PurgeReport:
    """
    Read current platform settings and run all four retention purges.
    Safe to call repeatedly — only deletes beyond the configured windows.
    """
    report = PurgeReport()
    settings = await get_settings(db)

    try:
        road, air = await purge_trips(db, settings)
        report.road_bookings_deleted = road
        report.air_bookings_deleted = air
    except Exception as exc:
        logger.exception("purge_trips failed")
        report.errors.append(f"trips: {exc}")

    try:
        report.customers_anonymized = await purge_pii(db, settings)
    except Exception as exc:
        logger.exception("purge_pii failed")
        report.errors.append(f"pii: {exc}")

    try:
        payments, runs = await purge_financials(db, settings)
        report.payments_deleted = payments
        report.payout_runs_deleted = runs
    except Exception as exc:
        logger.exception("purge_financials failed")
        report.errors.append(f"financials: {exc}")

    try:
        report.audit_logs_deleted = await purge_audit_logs(db, settings)
    except Exception as exc:
        logger.exception("purge_audit_logs failed")
        report.errors.append(f"audit: {exc}")

    logger.info(
        "run_all_purges complete: %d total affected, %d errors",
        report.total_affected,
        len(report.errors),
    )
    return report

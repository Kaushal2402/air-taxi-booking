"""
Seed script for Module 18 — Support & Ticketing Console.

Inserts:
  • 6 SLA policies (one per main category)
  • 8 sample tickets with messages (mirrors the screens.jsx wireframe data)

Run from the backend/ directory:
    source venv/bin/activate
    python seed_support.py
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.models.support import SlaPolicy, Ticket, TicketMessage

_settings = get_settings()
engine  = create_async_engine(_settings.DATABASE_URL, echo=False)
Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

NOW = datetime.now(timezone.utc)


# ── SLA Policies ───────────────────────────────────────────────────────────────
SLA_SEED = [
    dict(category="refunds_billing",
         urgent_first_response_minutes=15,  urgent_resolution_minutes=120,
         high_first_response_minutes=30,    high_resolution_minutes=240,
         med_first_response_minutes=120,    med_resolution_minutes=720,
         low_first_response_minutes=480,    low_resolution_minutes=2880),
    dict(category="booking_road",
         urgent_first_response_minutes=10,  urgent_resolution_minutes=60,
         high_first_response_minutes=30,    high_resolution_minutes=180,
         med_first_response_minutes=120,    med_resolution_minutes=480,
         low_first_response_minutes=360,    low_resolution_minutes=1440),
    dict(category="booking_air",
         urgent_first_response_minutes=10,  urgent_resolution_minutes=60,
         high_first_response_minutes=20,    high_resolution_minutes=120,
         med_first_response_minutes=60,     med_resolution_minutes=360,
         low_first_response_minutes=240,    low_resolution_minutes=1440),
    dict(category="payouts",
         urgent_first_response_minutes=30,  urgent_resolution_minutes=240,
         high_first_response_minutes=60,    high_resolution_minutes=480,
         med_first_response_minutes=240,    med_resolution_minutes=1440,
         low_first_response_minutes=480,    low_resolution_minutes=2880),
    dict(category="documents_kyc",
         urgent_first_response_minutes=60,  urgent_resolution_minutes=480,
         high_first_response_minutes=120,   high_resolution_minutes=720,
         med_first_response_minutes=480,    med_resolution_minutes=2880,
         low_first_response_minutes=1440,   low_resolution_minutes=4320),
    dict(category="app_issue",
         urgent_first_response_minutes=30,  urgent_resolution_minutes=240,
         high_first_response_minutes=120,   high_resolution_minutes=720,
         med_first_response_minutes=480,    med_resolution_minutes=2880,
         low_first_response_minutes=1440,   low_resolution_minutes=4320),
]

# ── Ticket seed data ───────────────────────────────────────────────────────────
# sla_due: positive = minutes from now (open), negative = already breached
TICKET_SEED = [
    dict(
        ticket_ref="TKT-44821", who="Meera Iyer",      type="customer", cat="refunds_billing",
        prio="urgent", status="open",        assignee=None,
        sla_due=-12,  breach=True,
        subject="Duplicate charge on card — need refund urgently",
        msg="I was charged twice for my trip BK-RD-77201 yesterday. Both ₹420 charges hit my card. Please refund one immediately.",
    ),
    dict(
        ticket_ref="TKT-44818", who="Rohit Sharma",    type="driver",   cat="payouts",
        prio="high",   status="in_progress", assignee="Dev Malhotra",
        sla_due=38,   breach=False,
        subject="Weekly payout not received — 3 days overdue",
        msg="My payout for the week of May 20–26 was supposed to be processed on May 28. It has not arrived in my bank account. Payout ID PAY-8812.",
    ),
    dict(
        ticket_ref="TKT-44815", who="Skyline Charter", type="operator", cat="booking_air",
        prio="high",   status="open",        assignee=None,
        sla_due=72,   breach=False,
        subject="Manifest won't lock — MTOW mismatch for BK-AIR-9920",
        msg="Passenger manifest for BLR→GOI (BK-AIR-9920) won't lock — system says weight exceeds MTOW but our numbers are under. Departure is in 3 hours. Need help urgently.",
    ),
    dict(
        ticket_ref="TKT-44810", who="Anika Bose",      type="customer", cat="app_issue",
        prio="med",    status="in_progress", assignee="Reema Shah",
        sla_due=184,  breach=False,
        subject="App crashing on payment screen after iOS 17.4 update",
        msg="After updating to iOS 17.4 the app crashes every time I reach the payment confirmation screen. Can't complete any bookings.",
    ),
    dict(
        ticket_ref="TKT-44807", who="Vikram Nair",     type="driver",   cat="documents_kyc",
        prio="med",    status="open",        assignee=None,
        sla_due=280,  breach=False,
        subject="RC book upload failing — document rejected",
        msg="I have been trying to upload my updated RC book for 2 days. The system keeps showing 'invalid document' even though it is a clear PDF from the RTO portal.",
    ),
    dict(
        ticket_ref="TKT-44802", who="Lena Park",       type="customer", cat="app_issue",
        prio="low",    status="in_progress", assignee="Dev Malhotra",
        sla_due=430,  breach=False,
        subject="Lost item — left phone in cab after trip BK-RD-76940",
        msg="I left my Samsung Galaxy S23 in the cab after my trip yesterday evening (BK-RD-76940). The driver name shown was Ravi Kumar. Please help me recover it.",
    ),
    dict(
        ticket_ref="TKT-44799", who="Arjun Rao",       type="customer", cat="refunds_billing",
        prio="urgent", status="open",        assignee=None,
        sla_due=-4,   breach=True,
        subject="Overcharged — surge applied incorrectly",
        msg="My receipt shows ₹680 but the quoted fare was ₹340. A 2× surge was applied but the app did not warn me before booking. Trip ID BK-RD-76788.",
    ),
    dict(
        ticket_ref="TKT-44790", who="BlueJet Air",     type="operator", cat="onboarding",
        prio="low",    status="resolved",    assignee="Sana Reyes",
        sla_due=None, breach=False,
        subject="Onboarding checklist — missing aircraft documents step",
        msg="We have uploaded all aircraft certificates but the onboarding checklist still shows step 3 (Aircraft documents) as incomplete. We cannot go live.",
    ),
]

INTERNAL_NOTES = {
    "TKT-44815": "Internal: aircraft AC-204 MTOW shows 2,720kg in catalog but ops sheet says 2,950kg. Possible stale aircraft record — looping in Aircraft team.",
    "TKT-44799": "Internal: surge override was applied at zone level — checking if zone config was set correctly at 18:45 yesterday.",
}

REPLIES = {
    "TKT-44818": [
        ("Dev Malhotra", "Looking into your payout now. Can you confirm your bank account last 4 digits?", "reply"),
    ],
    "TKT-44810": [
        ("Reema Shah",   "Thanks for reporting. We have escalated to the mobile team. Can you share your device model and iOS version?", "reply"),
        ("Reema Shah",   "Internal: confirmed on test device — crash in PaymentViewController line 214. Fix being deployed in 2.4.1.", "internal_note"),
    ],
    "TKT-44802": [
        ("Dev Malhotra", "Contacting Ravi Kumar now to check if he has found the phone. Will update you within 2 hours.", "reply"),
    ],
    "TKT-44790": [
        ("Sana Reyes",   "Checked the onboarding state — document step was stuck in 'pending review'. Manually advanced. You should now see step 3 as complete.", "reply"),
        ("Sana Reyes",   "Resolved — doc review state machine bug. Ticket for eng team filed separately.", "reply"),
    ],
}


async def seed():
    async with Session() as db:
        # ── SLA Policies ──────────────────────────────────────────────────────
        existing_cats = set(
            (await db.execute(select(SlaPolicy.category))).scalars().all()
        )
        added_policies = 0
        for row in SLA_SEED:
            if row["category"] not in existing_cats:
                db.add(SlaPolicy(**row))
                added_policies += 1
        await db.flush()
        print(f"  SLA policies: {added_policies} added, {len(existing_cats)} already existed")

        # ── Tickets ───────────────────────────────────────────────────────────
        existing_refs = set(
            (await db.execute(select(Ticket.ticket_ref))).scalars().all()
        )
        added_tickets = 0
        for t in TICKET_SEED:
            if t["ticket_ref"] in existing_refs:
                continue

            sla_due_at: datetime | None = None
            if t["sla_due"] is not None:
                sla_due_at = NOW + timedelta(minutes=t["sla_due"])

            ticket = Ticket(
                id=str(uuid.uuid4()),
                ticket_ref=t["ticket_ref"],
                requester_type=t["type"],
                requester_id=str(uuid.uuid4()),
                requester_name=t["who"],
                category=t["cat"],
                priority=t["prio"],
                status=t["status"],
                subject=t["subject"],
                sla_due_at=sla_due_at,
                sla_breached=t["breach"],
                resolution_code="no_action_needed" if t["status"] == "resolved" else None,
                resolved_at=NOW - timedelta(hours=2) if t["status"] == "resolved" else None,
            )
            db.add(ticket)
            await db.flush()

            # Initial message from requester
            db.add(TicketMessage(
                id=str(uuid.uuid4()),
                ticket_id=ticket.id,
                kind="reply",
                author_id=str(uuid.uuid4()),
                author_name=t["who"],
                author_role=t["type"].capitalize(),
                body=t["msg"],
            ))

            # Internal note if any
            if t["ticket_ref"] in INTERNAL_NOTES:
                db.add(TicketMessage(
                    id=str(uuid.uuid4()),
                    ticket_id=ticket.id,
                    kind="internal_note",
                    author_id=str(uuid.uuid4()),
                    author_name=t["assignee"] or "Support Agent",
                    author_role="Support",
                    body=INTERNAL_NOTES[t["ticket_ref"]],
                ))

            # Additional replies
            for (author, body, kind) in REPLIES.get(t["ticket_ref"], []):
                db.add(TicketMessage(
                    id=str(uuid.uuid4()),
                    ticket_id=ticket.id,
                    kind=kind,
                    author_id=str(uuid.uuid4()),
                    author_name=author,
                    author_role="Support",
                    body=body,
                ))

            added_tickets += 1

        await db.commit()
        print(f"  Tickets:      {added_tickets} added, {len(existing_refs)} already existed")
        print("Done! ✓")


if __name__ == "__main__":
    asyncio.run(seed())

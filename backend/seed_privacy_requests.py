"""Seed example privacy requests for dev/demo."""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import text
from app.database import engine


REQUESTS = [
    # (customer_name, customer_email, request_type, status, days_ago, sla_offset_hours, resolved_by, resolution_note, notes, sla_breached, auto_processed)
    ("Rahul Mehta",      "rahul.mehta@email.com",    "export",   "pending",    1,  72, None,          None,                                        "Need my booking history for tax filing.",           False, False),
    ("Priya Sharma",     "priya.sharma@email.com",   "deletion", "pending",    2,  72, None,          None,                                        "I no longer wish to use this service.",             False, False),
    ("Arjun Nair",       "arjun.nair@email.com",     "export",   "processing", 3,  72, None,          None,                                        "Requested for personal records.",                   False, False),
    ("Sneha Kapoor",     "sneha.kapoor@email.com",   "deletion", "processing", 5,  72, None,          None,                                        "Please delete all my data including ride history.", False, False),
    ("Vikram Singh",     "vikram.singh@email.com",   "export",   "completed",  10, 72, "admin@acme.com", "Data export package prepared and dispatched.", None,                                           False, False),
    ("Ananya Desai",     "ananya.desai@email.com",   "deletion", "completed",  15, 72, "admin@acme.com", "Customer PII anonymised. Booking records retained for legal hold.", None,                    False, False),
    ("Karan Joshi",      "karan.joshi@email.com",    "export",   "rejected",   8,  72, "admin@acme.com", "Unable to verify identity. Please contact support with valid ID.", "Why was I rejected?",    False, False),
    ("Meera Pillai",     "meera.pillai@email.com",   "deletion", "pending",    0,  72, None,          None,                                        None,                                                False, False),
    ("Rohan Gupta",      "rohan.gupta@email.com",    "export",   "pending",    4,  24, None,          None,                                        "Please send all data ASAP.",                        True,  False),
    ("Divya Reddy",      "divya.reddy@email.com",    "deletion", "completed",  20, 72, None,          "Auto-processed by nightly purge job.",       None,                                                False, True),
]


async def run():
    now = datetime.now(timezone.utc)

    async with engine.begin() as conn:
        # Fetch real customer IDs if any exist, otherwise use dummy UUIDs
        result = await conn.execute(text("SELECT id, name, email FROM customers LIMIT 10"))
        customers = result.fetchall()

        inserted = 0
        for i, (c_name, c_email, req_type, status, days_ago, sla_h, resolved_by, resolution_note, notes, sla_breached, auto_processed) in enumerate(REQUESTS):
            # Use real customer if available, otherwise fake ID
            if i < len(customers):
                cid, cname, cemail = str(customers[i][0]), customers[i][1], customers[i][2]
            else:
                cid = str(uuid.uuid4())
                cname, cemail = c_name, c_email

            created_at = now - timedelta(days=days_ago)
            sla_due_at = created_at + timedelta(hours=sla_h)
            completed_at = (created_at + timedelta(hours=sla_h - 5)) if status in ("completed", "rejected") else None

            rid = str(uuid.uuid4())

            await conn.execute(text("""
                INSERT INTO privacy_requests
                    (id, customer_id, customer_name, customer_email,
                     request_type, status, sla_due_at, sla_breached,
                     auto_processed, resolved_by, resolution_note,
                     completed_at, notes, created_at, updated_at)
                VALUES
                    (:id, :cid, :cname, :cemail,
                     :req_type, :status, :sla_due_at, :sla_breached,
                     :auto_processed, :resolved_by, :resolution_note,
                     :completed_at, :notes, :created_at, :updated_at)
            """), {
                "id": rid,
                "cid": cid,
                "cname": cname,
                "cemail": cemail,
                "req_type": req_type,
                "status": status,
                "sla_due_at": sla_due_at,
                "sla_breached": sla_breached,
                "auto_processed": auto_processed,
                "resolved_by": resolved_by,
                "resolution_note": resolution_note,
                "completed_at": completed_at,
                "notes": notes,
                "created_at": created_at,
                "updated_at": created_at,
            })
            inserted += 1
            print(f"  [{status:12}] {req_type:8} — {cname} ({cemail})")

        print(f"\nDone — {inserted} privacy requests inserted.")


asyncio.run(run())

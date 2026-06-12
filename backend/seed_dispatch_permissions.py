"""
Seed script for Module 06 — Dispatch Console permissions.

Inserts:
  • 4 entries in permission_catalog for dispatch.*
  • 1 system Role "Dispatcher"
  • All 4 dispatch permissions granted to the Dispatcher role

Run from the backend/ directory:
    source venv/bin/activate
    python seed_dispatch_permissions.py
"""
from __future__ import annotations

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.models.rbac import PermissionCatalog, PermissionState, Role, RolePermission
from app.models import *  # noqa: ensure all models are registered

_settings = get_settings()
engine = create_async_engine(_settings.DATABASE_URL, echo=False)
Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ── Permission catalog entries ────────────────────────────────────────────────
DISPATCH_PERMISSIONS = [
    dict(
        key="dispatch.console.view",
        description="View the live dispatch queue, SLA monitor, eligible drivers, supply stats, and surge override history.",
        domain="dispatch",
        is_scopeable=False,
    ),
    dict(
        key="dispatch.manual_assign",
        description="Manually assign a driver to a queued booking from the dispatch console.",
        domain="dispatch",
        is_scopeable=False,
    ),
    dict(
        key="dispatch.exception.resolve",
        description="Mark a dispatch exception as resolved and record the action taken.",
        domain="dispatch",
        is_scopeable=False,
    ),
    dict(
        key="dispatch.surge.override",
        description="Create a time-bound manual surge multiplier override for a service zone.",
        domain="dispatch",
        is_scopeable=False,
    ),
]

# ── Dispatcher role definition ────────────────────────────────────────────────
DISPATCHER_ROLE = dict(
    name="Dispatcher",
    description="Operations staff who monitor the live dispatch queue, assign drivers, resolve exceptions, and manage surge pricing.",
    is_system=True,
    scope="Global",
)


async def seed() -> None:
    async with Session() as db:
        # 1. Upsert permission catalog entries
        print("Seeding permission catalog…")
        for perm in DISPATCH_PERMISSIONS:
            existing = await db.get(PermissionCatalog, perm["key"])
            if existing:
                print(f"  [skip] {perm['key']} already exists")
            else:
                db.add(PermissionCatalog(**perm))
                print(f"  [add]  {perm['key']}")
        await db.flush()

        # 2. Upsert Dispatcher role
        print("\nSeeding Dispatcher role…")
        role_result = await db.execute(
            select(Role).where(Role.name == DISPATCHER_ROLE["name"])
        )
        dispatcher_role = role_result.scalar_one_or_none()
        if dispatcher_role:
            print(f"  [skip] Role '{DISPATCHER_ROLE['name']}' already exists (id={dispatcher_role.id})")
        else:
            dispatcher_role = Role(**DISPATCHER_ROLE)
            db.add(dispatcher_role)
            await db.flush()
            print(f"  [add]  Role '{DISPATCHER_ROLE['name']}' (id={dispatcher_role.id})")

        # 3. Grant all dispatch permissions to the Dispatcher role
        print("\nGranting dispatch permissions to Dispatcher role…")
        for perm in DISPATCH_PERMISSIONS:
            existing_rp = await db.execute(
                select(RolePermission).where(
                    RolePermission.role_id == dispatcher_role.id,
                    RolePermission.permission_key == perm["key"],
                )
            )
            if existing_rp.scalar_one_or_none():
                print(f"  [skip] {perm['key']} already granted")
            else:
                db.add(RolePermission(
                    role_id=dispatcher_role.id,
                    permission_key=perm["key"],
                    state=PermissionState.granted,
                ))
                print(f"  [add]  {perm['key']} → granted")

        await db.commit()

    await engine.dispose()
    print("\nDone. Assign the 'Dispatcher' role to admin users via the Operator Auth module.")


if __name__ == "__main__":
    asyncio.run(seed())

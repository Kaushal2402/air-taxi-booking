from __future__ import annotations

import json
from collections import defaultdict

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_user import AdminUser
from app.models.rbac import PermissionCatalog, Role, RolePermission
from app.schemas.rbac import (
    PermissionCatalogItem,
    PermissionDomainGroup,
    RoleCreate,
    RoleDetailResponse,
    RolePermissionItem,
    RolePermissionResponse,
    RoleResponse,
    RoleUpdate,
)

# ── Seed data ─────────────────────────────────────────────────────────────────

PERMISSION_SEED: list[dict] = [
    # Dashboard
    {"key": "dashboard.view",             "description": "See the operations dashboard",             "domain": "Dashboard",         "is_scopeable": False},
    {"key": "dashboard.revenue.view",     "description": "See revenue KPIs and trends",              "domain": "Dashboard",         "is_scopeable": False},
    {"key": "dashboard.livemap.view",     "description": "Access the live operations map",            "domain": "Dashboard",         "is_scopeable": False},
    {"key": "dashboard.quickactions.use", "description": "Use quick-create and broadcast actions",   "domain": "Dashboard",         "is_scopeable": False},
    # Dispatch
    {"key": "dispatch.console.view",      "description": "Open the dispatch console and live queue", "domain": "Dispatch",          "is_scopeable": True},
    {"key": "dispatch.manual_assign",     "description": "Force-assign a driver from the eligible list", "domain": "Dispatch",     "is_scopeable": True},
    {"key": "dispatch.surge.override",    "description": "Manually set a surge multiplier within cap", "domain": "Dispatch",       "is_scopeable": False},
    {"key": "dispatch.exception.resolve", "description": "Resolve dispatch exceptions and stuck states", "domain": "Dispatch",     "is_scopeable": True},
    # Bookings · Road
    {"key": "bookings.road.view",             "description": "List and inspect road bookings",       "domain": "Bookings · Road",   "is_scopeable": False},
    {"key": "bookings.road.create_assisted",  "description": "Create a booking on behalf of a customer", "domain": "Bookings · Road", "is_scopeable": False},
    {"key": "bookings.road.reassign",         "description": "Reassign an accepted ride to another driver", "domain": "Bookings · Road", "is_scopeable": True},
    {"key": "bookings.road.force_assign",     "description": "Bypass auto-dispatch and assign manually", "domain": "Bookings · Road", "is_scopeable": True},
    {"key": "bookings.road.cancel",           "description": "Cancel a road booking with reason",    "domain": "Bookings · Road",   "is_scopeable": False},
    {"key": "bookings.road.adjust_fare",      "description": "Post a corrective fare adjustment",    "domain": "Bookings · Road",   "is_scopeable": False},
    {"key": "bookings.road.refund",           "description": "Initiate or approve a refund on a road booking", "domain": "Bookings · Road", "is_scopeable": False},
    {"key": "bookings.road.dispute.resolve",  "description": "Close a disputed booking with refund/clawback", "domain": "Bookings · Road", "is_scopeable": False},
    # Bookings · Air
    {"key": "bookings.air.view",              "description": "List and inspect air bookings",        "domain": "Bookings · Air",    "is_scopeable": False},
    {"key": "bookings.air.create",            "description": "Create an air booking on behalf of customer", "domain": "Bookings · Air", "is_scopeable": False},
    {"key": "bookings.air.confirm",           "description": "Confirm a charter booking",            "domain": "Bookings · Air",    "is_scopeable": False},
    {"key": "bookings.air.cancel",            "description": "Cancel an air booking with reason",    "domain": "Bookings · Air",    "is_scopeable": False},
    {"key": "bookings.air.manifest.edit",     "description": "Edit the passenger manifest",          "domain": "Bookings · Air",    "is_scopeable": False},
    {"key": "bookings.air.refund",            "description": "Initiate or approve an air booking refund", "domain": "Bookings · Air", "is_scopeable": False},
    {"key": "bookings.air.pricing.override",  "description": "Override charter pricing manually",   "domain": "Bookings · Air",    "is_scopeable": False},
    # Drivers
    {"key": "drivers.view",               "description": "View driver profiles and documents",       "domain": "Drivers & Fleet",   "is_scopeable": False},
    {"key": "drivers.create",             "description": "Onboard a new driver",                     "domain": "Drivers & Fleet",   "is_scopeable": False},
    {"key": "drivers.edit",               "description": "Edit driver profile and vehicle assignment", "domain": "Drivers & Fleet", "is_scopeable": False},
    {"key": "drivers.approve",            "description": "Approve a driver pending review",          "domain": "Drivers & Fleet",   "is_scopeable": False},
    {"key": "drivers.suspend",            "description": "Suspend or deactivate a driver",           "domain": "Drivers & Fleet",   "is_scopeable": False},
    {"key": "drivers.kyc.review",         "description": "Review and approve KYC documents",        "domain": "Drivers & Fleet",   "is_scopeable": False},
    {"key": "vehicles.view",              "description": "View vehicle records",                     "domain": "Drivers & Fleet",   "is_scopeable": False},
    {"key": "vehicles.manage",            "description": "Add, edit, or remove vehicles",            "domain": "Drivers & Fleet",   "is_scopeable": False},
    # Operators · Air
    {"key": "operators.view",             "description": "View air operator profiles",               "domain": "Operators · Air",   "is_scopeable": False},
    {"key": "operators.create",           "description": "Onboard a new air operator",               "domain": "Operators · Air",   "is_scopeable": False},
    {"key": "operators.edit",             "description": "Edit operator details and compliance docs", "domain": "Operators · Air",  "is_scopeable": False},
    {"key": "operators.approve",          "description": "Approve an operator pending review",       "domain": "Operators · Air",   "is_scopeable": False},
    {"key": "operators.suspend",          "description": "Suspend an operator from the platform",   "domain": "Operators · Air",   "is_scopeable": False},
    {"key": "aircraft.view",              "description": "View aircraft records and scheduling",     "domain": "Operators · Air",   "is_scopeable": False},
    {"key": "aircraft.manage",            "description": "Add, edit, or remove aircraft",            "domain": "Operators · Air",   "is_scopeable": False},
    # Customers
    {"key": "customers.view",             "description": "View customer profiles",                   "domain": "Customers",         "is_scopeable": False},
    {"key": "customers.edit",             "description": "Edit customer profile fields",             "domain": "Customers",         "is_scopeable": False},
    {"key": "customers.suspend",          "description": "Suspend a customer account",               "domain": "Customers",         "is_scopeable": False},
    {"key": "customers.wallet.view",      "description": "View customer wallet and transactions",    "domain": "Customers",         "is_scopeable": False},
    {"key": "customers.wallet.adjust",    "description": "Add or deduct wallet credits",             "domain": "Customers",         "is_scopeable": False},
    {"key": "customers.data.export",      "description": "Export customer data (DPDP compliance)",  "domain": "Customers",         "is_scopeable": False},
    {"key": "customers.data.delete",      "description": "Erase a customer's personal data",        "domain": "Customers",         "is_scopeable": False},
    # Catalog
    {"key": "catalog.vehicle_classes.view",  "description": "View vehicle class definitions",       "domain": "Catalog",           "is_scopeable": False},
    {"key": "catalog.vehicle_classes.manage","description": "Create and edit vehicle classes",      "domain": "Catalog",           "is_scopeable": False},
    {"key": "catalog.zones.view",            "description": "View service zones",                   "domain": "Catalog",           "is_scopeable": False},
    {"key": "catalog.zones.manage",          "description": "Create and edit service zones",        "domain": "Catalog",           "is_scopeable": False},
    {"key": "catalog.aircraft_types.view",   "description": "View aircraft type definitions",       "domain": "Catalog",           "is_scopeable": False},
    {"key": "catalog.aircraft_types.manage", "description": "Create and edit aircraft types",       "domain": "Catalog",           "is_scopeable": False},
    {"key": "catalog.routes.view",           "description": "View air routes",                      "domain": "Catalog",           "is_scopeable": False},
    {"key": "catalog.routes.manage",         "description": "Create and edit air routes",           "domain": "Catalog",           "is_scopeable": False},
    # Pricing
    {"key": "pricing.rules.view",         "description": "View pricing rules and fare tables",      "domain": "Pricing",           "is_scopeable": False},
    {"key": "pricing.rules.manage",       "description": "Create and edit pricing rules",           "domain": "Pricing",           "is_scopeable": False},
    {"key": "pricing.surge.view",         "description": "View surge configurations",               "domain": "Pricing",           "is_scopeable": False},
    {"key": "pricing.surge.manage",       "description": "Configure surge multipliers",             "domain": "Pricing",           "is_scopeable": False},
    # Promotions
    {"key": "promotions.view",            "description": "View promotions and coupons",             "domain": "Promotions",        "is_scopeable": False},
    {"key": "promotions.create",          "description": "Create a new promotion",                  "domain": "Promotions",        "is_scopeable": False},
    {"key": "promotions.edit",            "description": "Edit or pause a promotion",               "domain": "Promotions",        "is_scopeable": False},
    {"key": "promotions.delete",          "description": "Delete a promotion",                      "domain": "Promotions",        "is_scopeable": False},
    {"key": "referrals.view",             "description": "View referral programmes",                "domain": "Promotions",        "is_scopeable": False},
    {"key": "referrals.manage",           "description": "Create and edit referral programmes",     "domain": "Promotions",        "is_scopeable": False},
    # Payments
    {"key": "payments.view",              "description": "View payment transactions",               "domain": "Payments",          "is_scopeable": False},
    {"key": "payments.refund.initiate",   "description": "Initiate a refund",                       "domain": "Payments",          "is_scopeable": False},
    {"key": "payments.refund.approve",    "description": "Approve a refund above threshold",        "domain": "Payments",          "is_scopeable": False},
    {"key": "payments.reconcile",         "description": "Run payment reconciliation",              "domain": "Payments",          "is_scopeable": False},
    # Payouts
    {"key": "payouts.view",               "description": "View payout runs and disbursements",      "domain": "Payouts",           "is_scopeable": False},
    {"key": "payouts.create",             "description": "Create a new payout run",                 "domain": "Payouts",           "is_scopeable": False},
    {"key": "payouts.approve",            "description": "Approve a payout run",                    "domain": "Payouts",           "is_scopeable": False},
    {"key": "payouts.hold",               "description": "Place a hold on a payout item",           "domain": "Payouts",           "is_scopeable": False},
    # Support
    {"key": "support.tickets.view",       "description": "View support tickets",                    "domain": "Support",           "is_scopeable": False},
    {"key": "support.tickets.reply",      "description": "Reply to and update tickets",             "domain": "Support",           "is_scopeable": False},
    {"key": "support.tickets.close",      "description": "Close or resolve a ticket",               "domain": "Support",           "is_scopeable": False},
    {"key": "support.tickets.escalate",   "description": "Escalate a ticket to a higher tier",     "domain": "Support",           "is_scopeable": False},
    # KYC
    {"key": "kyc.documents.view",         "description": "View KYC documents and statuses",        "domain": "KYC",               "is_scopeable": False},
    {"key": "kyc.documents.approve",      "description": "Approve a KYC document",                 "domain": "KYC",               "is_scopeable": False},
    {"key": "kyc.documents.reject",       "description": "Reject a KYC document with reason",      "domain": "KYC",               "is_scopeable": False},
    {"key": "kyc.expiry.manage",          "description": "Manage document expiry reminders",       "domain": "KYC",               "is_scopeable": False},
    {"key": "kyc.privacy.delete",         "description": "Process right-to-erasure requests",      "domain": "KYC",               "is_scopeable": False},
    # Notifications
    {"key": "notifications.templates.view",    "description": "View notification templates",       "domain": "Notifications",     "is_scopeable": False},
    {"key": "notifications.templates.manage",  "description": "Create and edit notification templates", "domain": "Notifications","is_scopeable": False},
    {"key": "notifications.broadcast.send",    "description": "Send a broadcast notification",     "domain": "Notifications",     "is_scopeable": False},
    {"key": "notifications.delivery.view",     "description": "View delivery logs",                "domain": "Notifications",     "is_scopeable": False},
    # Branding · Settings
    {"key": "branding.view",              "description": "View branding settings",                  "domain": "Branding · System", "is_scopeable": False},
    {"key": "branding.manage",            "description": "Edit branding and white-label settings",  "domain": "Branding · System", "is_scopeable": False},
    {"key": "settings.view",              "description": "View platform settings and feature flags", "domain": "Branding · System", "is_scopeable": False},
    {"key": "settings.manage",            "description": "Edit platform settings and feature flags", "domain": "Branding · System", "is_scopeable": False},
    {"key": "admin_users.view",           "description": "View admin user accounts",               "domain": "Branding · System", "is_scopeable": False},
    {"key": "admin_users.manage",         "description": "Create, edit, and deactivate admins",    "domain": "Branding · System", "is_scopeable": False},
    # Audit · Integrations
    {"key": "audit.events.view",          "description": "View audit event log",                   "domain": "Audit · Integrations", "is_scopeable": False},
    {"key": "audit.security.view",        "description": "View security and compliance dashboards","domain": "Audit · Integrations", "is_scopeable": False},
    {"key": "audit.export",               "description": "Export audit logs",                      "domain": "Audit · Integrations", "is_scopeable": False},
    {"key": "rbac.roles.view",            "description": "View role definitions",                  "domain": "Audit · Integrations", "is_scopeable": False},
    {"key": "rbac.roles.manage",          "description": "Create and edit roles and permissions",  "domain": "Audit · Integrations", "is_scopeable": False},
    {"key": "reports.view",               "description": "View reports and analytics",             "domain": "Audit · Integrations", "is_scopeable": False},
]


async def ensure_permission_catalog(db: AsyncSession) -> None:
    """Idempotent seed: insert any missing permission keys."""
    existing = set(
        (await db.execute(select(PermissionCatalog.key))).scalars().all()
    )
    to_insert = [p for p in PERMISSION_SEED if p["key"] not in existing]
    for p in to_insert:
        db.add(PermissionCatalog(**p))
    if to_insert:
        await db.commit()


# ── Role CRUD ─────────────────────────────────────────────────────────────────

async def list_roles(db: AsyncSession) -> list[RoleResponse]:
    await ensure_permission_catalog(db)
    result = await db.execute(
        select(Role).where(Role.is_active == True).order_by(Role.created_at)
    )
    roles = result.scalars().all()

    # count members per role (admin_users whose role column matches role name)
    admin_res = await db.execute(select(AdminUser.role))
    role_name_counts: dict[str, int] = defaultdict(int)
    for (rn,) in admin_res:
        if rn:
            role_name_counts[rn] += 1

    # count permissions granted per role
    perm_res = await db.execute(
        select(RolePermission.role_id, func.count(RolePermission.id))
        .where(RolePermission.state != "none")
        .group_by(RolePermission.role_id)
    )
    perm_counts: dict[str, int] = dict(perm_res.all())

    out = []
    for r in roles:
        out.append(RoleResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            is_system=r.is_system,
            scope=r.scope,
            version=r.version,
            is_active=r.is_active,
            member_count=role_name_counts.get(r.name, 0),
            permission_count=perm_counts.get(r.id, 0),
            created_at=r.created_at,
            updated_at=r.updated_at,
        ))
    return out


async def get_role(db: AsyncSession, role_id: str) -> Role:
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


async def create_role(db: AsyncSession, body: RoleCreate) -> Role:
    existing = await db.execute(select(Role).where(Role.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Role name already exists")
    role = Role(
        name=body.name,
        description=body.description,
        is_system=body.is_system,
        scope=body.scope,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


async def update_role(db: AsyncSession, role_id: str, body: RoleUpdate) -> Role:
    role = await get_role(db, role_id)
    if role.is_system:
        raise HTTPException(status_code=403, detail="System roles cannot be edited")
    if body.name is not None:
        role.name = body.name
    if body.description is not None:
        role.description = body.description
    if body.scope is not None:
        role.scope = body.scope
    role.version = role.version + 1
    await db.commit()
    await db.refresh(role)
    return role


async def delete_role(db: AsyncSession, role_id: str) -> None:
    role = await get_role(db, role_id)
    if role.is_system:
        raise HTTPException(status_code=403, detail="System roles cannot be deleted")
    role.is_active = False
    await db.commit()


# ── Permissions ───────────────────────────────────────────────────────────────

async def list_permission_catalog(db: AsyncSession) -> list[PermissionDomainGroup]:
    await ensure_permission_catalog(db)

    catalog_res = await db.execute(
        select(PermissionCatalog).order_by(PermissionCatalog.domain, PermissionCatalog.key)
    )
    catalog = catalog_res.scalars().all()

    # count how many active roles hold each permission
    held_res = await db.execute(
        select(RolePermission.permission_key, func.count(RolePermission.id))
        .where(RolePermission.state != "none")
        .group_by(RolePermission.permission_key)
    )
    held_counts: dict[str, int] = dict(held_res.all())

    grouped: dict[str, list] = defaultdict(list)
    for p in catalog:
        grouped[p.domain].append(PermissionCatalogItem(
            key=p.key,
            description=p.description,
            domain=p.domain,
            is_scopeable=p.is_scopeable,
            held_by=held_counts.get(p.key, 0),
        ))

    return [PermissionDomainGroup(domain=d, items=items) for d, items in grouped.items()]


async def get_role_permissions(db: AsyncSession, role_id: str) -> list[RolePermissionResponse]:
    await ensure_permission_catalog(db)
    role = await get_role(db, role_id)

    catalog_res = await db.execute(select(PermissionCatalog))
    catalog: dict[str, PermissionCatalog] = {p.key: p for p in catalog_res.scalars().all()}

    rp_res = await db.execute(
        select(RolePermission).where(RolePermission.role_id == role.id)
    )
    existing: dict[str, RolePermission] = {rp.permission_key: rp for rp in rp_res.scalars().all()}

    out = []
    for key, perm in catalog.items():
        rp = existing.get(key)
        out.append(RolePermissionResponse(
            permission_key=key,
            description=perm.description,
            domain=perm.domain,
            is_scopeable=perm.is_scopeable,
            state=rp.state if rp else "none",
            scope_data=rp.scope_data if rp else None,
        ))
    return out


async def set_role_permissions(
    db: AsyncSession,
    role_id: str,
    items: list[RolePermissionItem],
) -> list[RolePermissionResponse]:
    role = await get_role(db, role_id)

    rp_res = await db.execute(
        select(RolePermission).where(RolePermission.role_id == role.id)
    )
    existing: dict[str, RolePermission] = {rp.permission_key: rp for rp in rp_res.scalars().all()}

    for item in items:
        if item.permission_key in existing:
            existing[item.permission_key].state = item.state
            existing[item.permission_key].scope_data = item.scope_data
        else:
            rp = RolePermission(
                role_id=role.id,
                permission_key=item.permission_key,
                state=item.state,
                scope_data=item.scope_data,
            )
            db.add(rp)

    role.version = role.version + 1
    await db.commit()
    return await get_role_permissions(db, role_id)


async def get_rbac_stats(db: AsyncSession) -> dict:
    await ensure_permission_catalog(db)

    total = (await db.execute(select(func.count(Role.id)).where(Role.is_active == True))).scalar_one()
    system = (await db.execute(
        select(func.count(Role.id)).where(Role.is_active == True, Role.is_system == True)
    )).scalar_one()
    total_perms = (await db.execute(select(func.count(PermissionCatalog.key)))).scalar_one()

    admin_res = await db.execute(select(func.count(AdminUser.id)))
    admins = admin_res.scalar_one()

    return {
        "total_roles": total,
        "system_roles": system,
        "custom_roles": total - system,
        "total_permissions": total_perms,
        "admins_assigned": admins,
        "pending_review": 0,
    }

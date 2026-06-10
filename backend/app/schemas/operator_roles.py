from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


SYSTEM_ROLES = [
    "operator_admin",
    "ops_manager",
    "dispatcher",
    "finance",
    "crew_coordinator",
    "viewer",
]

ALL_OPERATOR_PERMISSIONS = [
    "operator.auth.profile",
    "operator.auth.security",
    "operator.profile.view",
    "operator.profile.edit",
    "operator.onboarding.submit",
    "operator.payout_details.edit",
    "operator.dashboard.view",
    "operator.dashboard.revenue",
    "operator.team.view",
    "operator.team.invite",
    "operator.team.suspend",
    "operator.roles.manage",
    "operator.roles.assign",
    "operator.aircraft.view",
    "operator.aircraft.manage",
    "operator.aircraft.maintenance",
    "operator.aircraft.documents",
    "operator.crew.view",
    "operator.crew.manage",
    "operator.crew.documents",
    "operator.crew.roster",
    "operator.routes.view",
    "operator.routes.manage",
    "operator.schedule.manage",
    "operator.schedule.publish",
    "operator.pricing.view",
    "operator.pricing.manage",
    "operator.quotes.create",
    "operator.quotes.send",
    "operator.requests.view",
    "operator.requests.accept",
    "operator.requests.reject",
    "operator.requests.quote",
    "operator.assignment.view",
    "operator.assignment.assign",
    "operator.assignment.reassign",
    "operator.manifest.view",
    "operator.manifest.edit",
    "operator.manifest.lock",
    "operator.manifest.post_lock_edit",
    "operator.flightops.view",
    "operator.flightops.update",
    "operator.flightops.close",
    "operator.cancel.view",
    "operator.cancel.execute",
    "operator.reschedule.execute",
    "operator.forcemajeure.apply",
    "operator.settlements.view",
    "operator.settlements.export",
    "operator.settlements.query",
    "operator.reports.operational",
    "operator.reports.financial",
    "operator.reports.export",
    "operator.reports.schedule",
    "operator.documents.view",
    "operator.documents.upload",
    "operator.notifications.view",
    "operator.notifications.preferences",
    "operator.communication.view",
    "operator.settings.view",
    "operator.settings.edit",
    "operator.companion.assignments",
    "operator.companion.status_update",
]

ROLE_DEFAULT_PERMISSIONS: dict[str, list[str]] = {
    "operator_admin": ALL_OPERATOR_PERMISSIONS,
    "ops_manager": [
        "operator.auth.profile", "operator.auth.security",
        "operator.profile.view", "operator.dashboard.view", "operator.dashboard.revenue",
        "operator.team.view",
        "operator.aircraft.view", "operator.aircraft.manage", "operator.aircraft.maintenance", "operator.aircraft.documents",
        "operator.crew.view", "operator.crew.manage", "operator.crew.documents", "operator.crew.roster",
        "operator.routes.view", "operator.routes.manage", "operator.schedule.manage", "operator.schedule.publish",
        "operator.pricing.view", "operator.pricing.manage", "operator.quotes.create", "operator.quotes.send",
        "operator.requests.view", "operator.requests.accept", "operator.requests.reject", "operator.requests.quote",
        "operator.assignment.view", "operator.assignment.assign", "operator.assignment.reassign",
        "operator.manifest.view", "operator.manifest.edit", "operator.manifest.lock", "operator.manifest.post_lock_edit",
        "operator.flightops.view", "operator.flightops.update", "operator.flightops.close",
        "operator.cancel.view", "operator.cancel.execute", "operator.reschedule.execute", "operator.forcemajeure.apply",
        "operator.settlements.view",
        "operator.reports.operational", "operator.reports.export",
        "operator.documents.view", "operator.documents.upload",
        "operator.notifications.view", "operator.notifications.preferences", "operator.communication.view",
        "operator.settings.view",
    ],
    "dispatcher": [
        "operator.auth.profile", "operator.auth.security",
        "operator.dashboard.view",
        "operator.requests.view", "operator.requests.accept", "operator.requests.reject",
        "operator.assignment.view", "operator.assignment.assign", "operator.assignment.reassign",
        "operator.manifest.view", "operator.manifest.edit", "operator.manifest.lock",
        "operator.flightops.view", "operator.flightops.update", "operator.flightops.close",
        "operator.cancel.view", "operator.cancel.execute", "operator.reschedule.execute",
        "operator.notifications.view", "operator.notifications.preferences",
    ],
    "finance": [
        "operator.auth.profile", "operator.auth.security",
        "operator.profile.view", "operator.payout_details.edit",
        "operator.dashboard.view", "operator.dashboard.revenue",
        "operator.pricing.view", "operator.pricing.manage", "operator.quotes.create", "operator.quotes.send",
        "operator.requests.quote",
        "operator.settlements.view", "operator.settlements.export", "operator.settlements.query",
        "operator.reports.operational", "operator.reports.financial", "operator.reports.export", "operator.reports.schedule",
        "operator.notifications.view", "operator.notifications.preferences",
    ],
    "crew_coordinator": [
        "operator.auth.profile", "operator.auth.security",
        "operator.dashboard.view",
        "operator.crew.view", "operator.crew.manage", "operator.crew.documents", "operator.crew.roster",
        "operator.assignment.view", "operator.assignment.assign",
        "operator.manifest.view",
        "operator.flightops.view",
        "operator.notifications.view", "operator.notifications.preferences",
        "operator.companion.assignments", "operator.companion.status_update",
    ],
    "viewer": [
        "operator.auth.profile", "operator.auth.security",
        "operator.profile.view", "operator.dashboard.view",
        "operator.aircraft.view", "operator.crew.view",
        "operator.routes.view",
        "operator.pricing.view",
        "operator.requests.view",
        "operator.assignment.view",
        "operator.manifest.view",
        "operator.flightops.view",
        "operator.cancel.view",
        "operator.settlements.view",
        "operator.reports.operational",
        "operator.documents.view",
        "operator.notifications.view",
    ],
}


class OperatorRoleResponse(BaseModel):
    id: str
    name: str
    display_name: str
    is_system: bool
    permissions: list[str]
    user_count: int = 0

    model_config = {"from_attributes": True}


class OperatorRoleCreate(BaseModel):
    name: str
    display_name: str
    permissions: list[str]


class OperatorRoleUpdate(BaseModel):
    display_name: Optional[str] = None
    permissions: Optional[list[str]] = None


class AssignRoleRequest(BaseModel):
    role_id: str


class AvailablePermissionsResponse(BaseModel):
    permissions: list[str]

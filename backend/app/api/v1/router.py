from fastapi import APIRouter

from app.api.v1.endpoints import auth, admin_users, catalog
from app.api.v1.endpoints.air_bookings import router as air_bookings_router
from app.api.v1.endpoints.customers import router as customers_router
from app.api.v1.endpoints.drivers import router as drivers_router
from app.api.v1.endpoints.bookings import road_bookings_router
from app.api.v1.endpoints.kyc import router as kyc_router
from app.api.v1.endpoints.operators import operators_router, aircraft_router, pilots_router
from app.api.v1.endpoints.vehicles import vehicles_router, vendors_router
from app.api.v1.endpoints.pricing import pricing_router
from app.api.v1.endpoints.promotions import promotions_router, referrals_router
from app.api.v1.endpoints.settings import settings_router
from app.api.v1.endpoints.audit import audit_router
from app.api.v1.endpoints.uploads import router as uploads_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.dispatch import router as dispatch_router
from app.api.v1.endpoints.support import router as support_router
from app.api.v1.endpoints.payments import router as payments_router
from app.api.v1.endpoints.payouts import router as payouts_router
from app.api.v1.endpoints.reports import router as reports_router
from app.api.v1.endpoints.branding import router as branding_router
from app.api.v1.endpoints.rbac import rbac_router
from app.api.v1.endpoints.notifications import notifications_router
from app.api.v1.endpoints.sos import router as sos_router
from app.api.v1.endpoints.data_purge import router as data_purge_router
from app.api.v1.endpoints.privacy import router as privacy_router
from app.api.v1.endpoints.reference import router as reference_router
from app.api.v1.endpoints.operator_auth import router as operator_auth_router
from app.api.v1.endpoints.operator_users import router as operator_users_router
from app.api.v1.endpoints.operator_profile import router as operator_profile_router
from app.api.v1.endpoints.operator_dashboard import router as operator_dashboard_router
from app.api.v1.endpoints.operator_roles import router as operator_roles_router
from app.api.v1.endpoints.operator_aircraft import router as operator_aircraft_router
from app.api.v1.endpoints.operator_crew import router as operator_crew_router
from app.api.v1.endpoints.operator_routes import router as operator_routes_router

api_router = APIRouter()

api_router.include_router(auth.router,           prefix="/auth",           tags=["Auth"])
api_router.include_router(admin_users.router,    prefix="/admin-users",    tags=["Admin Users"])
api_router.include_router(catalog.router,        prefix="/catalog",        tags=["Catalog"])
api_router.include_router(customers_router,      prefix="/customers",      tags=["Customers"])
api_router.include_router(drivers_router,        prefix="/drivers",        tags=["Drivers"])
api_router.include_router(road_bookings_router,  prefix="/bookings/road",  tags=["Bookings Road"])
api_router.include_router(air_bookings_router,   prefix="/bookings/air",   tags=["Bookings Air"])
api_router.include_router(kyc_router,            prefix="/kyc",            tags=["KYC"])
api_router.include_router(operators_router,      prefix="/operators",      tags=["Operators"])
api_router.include_router(aircraft_router,       prefix="/aircraft",       tags=["Aircraft"])
api_router.include_router(pilots_router,         prefix="/pilots",         tags=["Pilots"])
api_router.include_router(vehicles_router,       prefix="/vehicles",       tags=["Vehicles"])
api_router.include_router(vendors_router,        prefix="/vendors",        tags=["Vendors"])
api_router.include_router(pricing_router,        prefix="/pricing",        tags=["Pricing"])
api_router.include_router(promotions_router,     prefix="/promotions",     tags=["Promotions"])
api_router.include_router(referrals_router,      prefix="/referrals",      tags=["Referrals"])
api_router.include_router(settings_router,       prefix="/settings",       tags=["Settings"])
api_router.include_router(audit_router,          prefix="/audit",          tags=["Audit"])
api_router.include_router(uploads_router,        prefix="/uploads",        tags=["Uploads"])
api_router.include_router(dashboard_router,      prefix="/dashboard",      tags=["Dashboard"])
api_router.include_router(dispatch_router,       prefix="/dispatch",       tags=["Dispatch"])
api_router.include_router(support_router,        prefix="/support",        tags=["Support"])
api_router.include_router(payments_router,       prefix="/payments",       tags=["payments"])
api_router.include_router(payouts_router,        prefix="/payouts",        tags=["Payouts"])
api_router.include_router(reports_router,        prefix="/reports",        tags=["Reports"])
api_router.include_router(branding_router,       prefix="/branding",       tags=["Branding"])
api_router.include_router(rbac_router,           prefix="/rbac",           tags=["RBAC"])
api_router.include_router(notifications_router,  prefix="/notifications",  tags=["Notifications"])
api_router.include_router(sos_router,            prefix="/sos",            tags=["Safety SOS"])
api_router.include_router(data_purge_router,     prefix="/data/purge",     tags=["Data Retention"])
api_router.include_router(privacy_router,        prefix="/privacy",        tags=["Privacy Requests"])
api_router.include_router(reference_router,      prefix="/ref",            tags=["Reference Lookups"])
api_router.include_router(operator_auth_router,      prefix="/operator/auth",      tags=["Operator Auth"])
api_router.include_router(operator_users_router,     prefix="/operator/users",     tags=["Operator Users"])
api_router.include_router(operator_profile_router,   prefix="/operator",           tags=["Operator Profile"])
api_router.include_router(operator_dashboard_router, prefix="/operator",           tags=["Operator Dashboard"])
api_router.include_router(operator_roles_router,     prefix="/operator",           tags=["Operator Roles"])
api_router.include_router(operator_aircraft_router,  prefix="/operator",           tags=["Operator Aircraft"])
api_router.include_router(operator_crew_router,      prefix="/operator",           tags=["Operator Crew"])
api_router.include_router(operator_routes_router,    prefix="/operator",           tags=["Operator Routes"])

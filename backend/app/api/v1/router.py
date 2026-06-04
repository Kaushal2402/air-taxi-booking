from fastapi import APIRouter

from app.api.v1.endpoints import auth, admin_users, catalog
from app.api.v1.endpoints.air_bookings import router as air_bookings_router
from app.api.v1.endpoints.customers import router as customers_router
from app.api.v1.endpoints.drivers import router as drivers_router
from app.api.v1.endpoints.bookings import road_bookings_router
from app.api.v1.endpoints.kyc import router as kyc_router
from app.api.v1.endpoints.operators import operators_router, aircraft_router
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

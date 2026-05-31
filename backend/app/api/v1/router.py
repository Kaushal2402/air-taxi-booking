from fastapi import APIRouter

from app.api.v1.endpoints import auth, admin_users, catalog
from app.api.v1.endpoints.customers import router as customers_router
from app.api.v1.endpoints.drivers import router as drivers_router
from app.api.v1.endpoints.bookings import road_bookings_router

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(admin_users.router, prefix="/admin-users", tags=["Admin Users"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["Catalog"])
api_router.include_router(customers_router, prefix="/customers", tags=["customers"])
api_router.include_router(drivers_router, prefix="/drivers", tags=["Drivers"])
api_router.include_router(road_bookings_router, prefix="/bookings/road", tags=["Bookings Road"])

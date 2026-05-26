from fastapi import APIRouter

from app.api.v1.endpoints import auth, admin_users, catalog

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(admin_users.router, prefix="/admin-users", tags=["Admin Users"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["Catalog"])

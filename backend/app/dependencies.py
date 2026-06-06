from __future__ import annotations

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.database import get_db
from app.models.admin_user import AdminUser
from app.models.rbac import Role, RolePermission
from app.repositories.admin_user_repository import AdminUserRepository

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_admin_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db=Depends(get_db),
) -> AdminUser:
    if not credentials:
        raise UnauthorizedException()

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") == "partial_auth":
        raise UnauthorizedException("Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException()

    repo = AdminUserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException()
    if user.status == "suspended":
        raise ForbiddenException("Account suspended")

    # Verify the session embedded in the token is still active.
    # This ensures revoked sessions are rejected immediately on the next request
    # rather than waiting for the access token to expire.
    session_id = payload.get("sid")
    if session_id:
        session = await repo.get_session_by_id(session_id)
        if not session:
            raise UnauthorizedException("Session has been revoked")

    return user


def require_role(*roles: str):
    async def _check(user: AdminUser = Depends(get_current_admin_user)) -> AdminUser:
        if user.role not in roles:
            raise ForbiddenException(f"Role '{user.role}' does not have access to this resource")
        return user
    return _check


def require_permission(key: str):
    """Gate an endpoint behind a specific permission key.

    Super admin bypasses all checks.
    All other roles must have the permission in the role_permissions table
    with state 'granted' or 'scoped'.
    """
    async def _check(
        user: AdminUser = Depends(get_current_admin_user),
        db=Depends(get_db),
    ) -> AdminUser:
        if user.role == "super_admin":
            return user

        # Resolve role row by name
        role_row = (await db.execute(
            select(Role).where(Role.name == user.role, Role.is_active == True)  # noqa: E712
        )).scalar_one_or_none()

        if not role_row:
            raise ForbiddenException(f"Role '{user.role}' is not active or does not exist")

        # Check permission state
        perm = (await db.execute(
            select(RolePermission).where(
                RolePermission.role_id == role_row.id,
                RolePermission.permission_key == key,
                RolePermission.state.in_(["granted", "scoped"]),
            )
        )).scalar_one_or_none()

        if not perm:
            raise ForbiddenException(
                f"Access denied — '{key}' permission required for this action"
            )
        return user

    return _check


def get_request_meta(request: Request) -> dict:
    return {
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "location": None,  # Geo-lookup would go here
        "timezone": request.headers.get("x-timezone"),  # IANA tz from browser, e.g. "Asia/Kolkata"
    }

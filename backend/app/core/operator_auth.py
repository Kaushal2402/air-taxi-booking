from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.database import get_db
from app.models.operator import Operator
from app.models.operator_user import OperatorSession, OperatorUser

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_operator_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> OperatorUser:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("kind") != "operator":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    operator_user_id: str | None = payload.get("sub")
    session_id: str | None = payload.get("sid")
    if not operator_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # Verify session is still active (not revoked — e.g. after password change)
    if session_id:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        session_result = await db.execute(
            select(OperatorSession).where(OperatorSession.id == session_id)
        )
        session: OperatorSession | None = session_result.scalar_one_or_none()
        if (
            not session
            or session.revoked_at is not None
            or session.expires_at.replace(tzinfo=timezone.utc) < now
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked. Please log in again.",
            )

    result = await db.execute(select(OperatorUser).where(OperatorUser.id == operator_user_id))
    user: OperatorUser | None = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.status}",
        )

    # Check operator org suspension
    org_result = await db.execute(select(Operator).where(Operator.id == user.operator_id))
    org: Operator | None = org_result.scalar_one_or_none()
    if org and org.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operator organisation is suspended. Contact support.",
        )

    return user

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, computed_field, field_validator


class OperatorUserOut(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    phone_verified: bool = False
    operator_role: str
    status: str
    twofa_enabled: bool
    twofa_enrolled_at: Optional[datetime] = None
    operator_id: str
    operator_name: Optional[str] = None
    avatar_url: Optional[str] = None
    password_changed_at: Optional[datetime] = None
    # Display preferences
    timezone: str = "Asia/Kolkata"
    language: str = "en"
    date_format: str = "DD/MM/YYYY"
    time_format: str = "24h"

    @field_validator("avatar_url", mode="before")
    @classmethod
    def _resolve_avatar(cls, v: Optional[str]) -> Optional[str]:
        from app.core.storage_utils import resolve_url
        return resolve_url(v)

    # Aliases expected by the frontend
    @computed_field  # type: ignore[misc]
    @property
    def role(self) -> str:
        return self.operator_role

    @computed_field  # type: ignore[misc]
    @property
    def two_factor_enabled(self) -> bool:
        return self.twofa_enabled

    model_config = {"from_attributes": True}


class OperatorLoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_device: bool = False


class OperatorTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: OperatorUserOut
    requires_2fa: bool = False
    two_fa_token: Optional[str] = None


class OperatorRefreshRequest(BaseModel):
    refresh_token: str
    push_token: str | None = None


class OperatorForgotPasswordRequest(BaseModel):
    email: EmailStr


class OperatorPasswordResetRequest(BaseModel):
    token: str
    new_password: str


class OperatorUpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None


class OperatorNotificationPrefOut(BaseModel):
    alert_type: str
    email: bool
    push: bool
    sms: bool
    model_config = {"from_attributes": True}


class OperatorNotificationPrefUpdate(BaseModel):
    alert_type: str
    email: bool
    push: bool
    sms: bool


class OperatorPermissionSummaryOut(BaseModel):
    operations: str
    fleet_crew: str
    finance: str
    all_granted: bool


class OperatorChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class Operator2FAEnrollResponse(BaseModel):
    secret: str
    otpauth_uri: str


class Operator2FAConfirmRequest(BaseModel):
    code: str


class Operator2FAVerifyRequest(BaseModel):
    two_fa_token: str
    code: str


class Operator2FADisableRequest(BaseModel):
    code: str


class OperatorInviteUserRequest(BaseModel):
    name: str
    email: EmailStr
    operator_role: str = "viewer"
    phone: Optional[str] = None


class OperatorInviteUserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    operator_role: str
    status: str
    operator_id: str
    twofa_enabled: bool = False
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class OperatorAcceptInviteRequest(BaseModel):
    token: str
    password: str


class OperatorAcceptInviteResponse(BaseModel):
    message: str
    needs_2fa_setup: bool = False


class Operator2FAEmailCodeRequest(BaseModel):
    two_fa_token: str


class Operator2FAEmailCodeVerifyRequest(BaseModel):
    two_fa_token: str
    code: str


class OperatorSessionOut(BaseModel):
    id: str
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_current: bool = False

    model_config = {"from_attributes": True}


class OperatorLoginHistoryOut(BaseModel):
    id: str
    ip_address: Optional[str] = None
    success: bool
    event_type: str = "sign_in"
    attempted_at: datetime
    model_config = {"from_attributes": True}

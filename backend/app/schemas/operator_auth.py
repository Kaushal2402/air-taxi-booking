from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, computed_field


class OperatorUserOut(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    operator_role: str
    status: str
    twofa_enabled: bool
    operator_id: str
    operator_name: Optional[str] = None
    avatar_url: Optional[str] = None

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


class OperatorForgotPasswordRequest(BaseModel):
    email: EmailStr


class OperatorPasswordResetRequest(BaseModel):
    token: str
    new_password: str


class OperatorUpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


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


class OperatorSessionOut(BaseModel):
    id: str
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_current: bool = False

    model_config = {"from_attributes": True}

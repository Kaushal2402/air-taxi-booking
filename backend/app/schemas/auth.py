from __future__ import annotations
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class LoginResponse(BaseModel):
    requires_2fa: bool
    partial_token: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    user: AdminUserBrief | None = None


class TwoFAVerifyRequest(BaseModel):
    partial_token: str
    code: str
    trust_device: bool = False


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: AdminUserBrief


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class AdminUserBrief(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    two_factor_enabled: bool

    model_config = {"from_attributes": True}


class AdminUserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    two_factor_enabled: bool
    last_sign_in_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminSessionResponse(BaseModel):
    id: str
    device_name: str | None
    device_os: str | None
    ip_address: str | None
    location: str | None
    two_fa_method: str | None
    last_activity_at: datetime
    is_current: bool = False

    model_config = {"from_attributes": True}


class SignInHistoryEntry(BaseModel):
    id: str
    event_type: str
    ip_address: str | None
    location: str | None
    result: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    name: str | None = None


class InviteAdminRequest(BaseModel):
    name: str
    email: EmailStr
    role: str


class TOTPSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str


class TOTPEnrollRequest(BaseModel):
    code: str

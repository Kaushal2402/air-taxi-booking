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
    # Only populated when requires_2fa=True — lets the frontend show/hide SMS option
    has_phone: bool = False


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
    phone: str | None = None
    avatar_url: str | None = None
    locale: str = "en"

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
    phone: str | None = None
    avatar_url: str | None = None
    locale: str = "en"
    failed_attempts: int = 0
    locked_until: datetime | None = None

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
    user_agent: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedHistoryResponse(BaseModel):
    items: list[SignInHistoryEntry]
    total: int
    page: int
    limit: int
    pages: int


class BackupCodesResponse(BaseModel):
    codes: list[str]         # plaintext — shown exactly once
    total: int
    remaining: int


class BackupCodeStatusResponse(BaseModel):
    total: int
    used: int
    remaining: int
    generated: bool          # True when at least one code exists


class BackupVerifyRequest(BaseModel):
    partial_token: str
    code: str                # user types e.g. "A3B2-C7D9" or "A3B2C7D9"


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    locale: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is None or v.strip() == "":
            return None
        import re
        if not re.match(r"^\+[1-9]\d{6,14}$", v.strip()):
            raise ValueError("Phone must be in E.164 format, e.g. +14155552671")
        return v.strip()

    @field_validator("locale")
    @classmethod
    def validate_locale(cls, v: str | None) -> str | None:
        if v is None:
            return None
        allowed = {
            "en", "en-GB", "fr", "de", "es", "pt",
            "ar", "ja", "zh-CN", "hi", "ru", "it",
        }
        if v not in allowed:
            raise ValueError(f"Unsupported locale: {v}")
        return v


class InviteAdminRequest(BaseModel):
    name: str
    email: EmailStr
    role: str


class TOTPSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str


class TOTPEnrollRequest(BaseModel):
    code: str


class InviteAcceptRequest(BaseModel):
    token: str
    password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class Disable2FARequest(BaseModel):
    code: str   # current 6-digit TOTP code from the user's authenticator app


class EmailOTPRequest(BaseModel):
    partial_token: str


class EmailOTPResponse(BaseModel):
    sent_at: str          # ISO-8601 UTC timestamp of when the code was sent
    cooldown_seconds: int  # seconds the client must wait before it can resend


class SmsOTPRequest(BaseModel):
    partial_token: str


class SmsOTPResponse(BaseModel):
    sent_at: str
    cooldown_seconds: int
    masked_phone: str      # e.g. "+91****89" — for display only


class OtpVerifyRequest(BaseModel):
    partial_hash: str   # SHA-256 hex of the partial_token issued at login step-1
    code: str           # 6-digit OTP entered by the user
    remember_me: bool = False

from __future__ import annotations

from pydantic import BaseModel, EmailStr


class OperatorLoginRequest(BaseModel):
    email: EmailStr
    password: str


class OperatorUserOut(BaseModel):
    id: str
    name: str
    email: str
    phone: str | None
    operator_role: str
    status: str
    twofa_enabled: bool
    operator_id: str

    model_config = {"from_attributes": True}


class OperatorTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: OperatorUserOut


class OperatorRefreshRequest(BaseModel):
    refresh_token: str


class OperatorForgotPasswordRequest(BaseModel):
    email: EmailStr


class OperatorPasswordResetRequest(BaseModel):
    token: str
    new_password: str


class OperatorUpdateProfileRequest(BaseModel):
    name: str | None = None
    phone: str | None = None

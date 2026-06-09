"""add_operator_auth_tables

Revision ID: c9d8e7f6a5b4
Revises: 72b323e01867
Create Date: 2026-06-09 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c9d8e7f6a5b4"
down_revision: Union[str, None] = "72b323e01867"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "operator_users",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("operator_id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("operator_role", sa.String(50), nullable=False, server_default="viewer"),
        sa.Column("status", sa.String(20), nullable=False, server_default="invited"),
        sa.Column("twofa_enabled", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("twofa_secret", sa.String(64), nullable=True),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["operator_id"], ["operators.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_operator_users_operator_id", "operator_users", ["operator_id"])
    op.create_index("ix_operator_users_email", "operator_users", ["email"], unique=True)
    op.create_index("ix_operator_users_status", "operator_users", ["status"])

    op.create_table(
        "operator_sessions",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("operator_user_id", sa.String(36), nullable=False),
        sa.Column("refresh_token_hash", sa.String(255), nullable=False),
        sa.Column("device_info", sa.String(255), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["operator_user_id"], ["operator_users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_operator_sessions_operator_user_id", "operator_sessions", ["operator_user_id"])

    op.create_table(
        "operator_login_attempts",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("attempted_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_operator_login_attempts_email", "operator_login_attempts", ["email"])

    op.create_table(
        "operator_password_reset_tokens",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("operator_user_id", sa.String(36), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["operator_user_id"], ["operator_users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_operator_password_reset_tokens_operator_user_id", "operator_password_reset_tokens", ["operator_user_id"])
    op.create_index("ix_operator_password_reset_tokens_token_hash", "operator_password_reset_tokens", ["token_hash"])


def downgrade() -> None:
    op.drop_table("operator_password_reset_tokens")
    op.drop_table("operator_login_attempts")
    op.drop_table("operator_sessions")
    op.drop_table("operator_users")

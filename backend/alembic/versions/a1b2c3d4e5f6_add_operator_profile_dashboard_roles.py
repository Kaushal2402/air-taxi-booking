"""add_operator_profile_dashboard_roles

Revision ID: a1b2c3d4e5f6
Revises: f1e2d3c4b5a6
Create Date: 2026-06-10

Adds Module 2 (onboarding/profile), Module 3 (dashboard), Module 4 (roles) tables and columns.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f1e2d3c4b5a6"
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    # Module 2 — extend operators table with onboarding/profile fields
    op.add_column("operators", sa.Column("trade_name", sa.String(200), nullable=True))
    op.add_column("operators", sa.Column("contact_email", sa.String(255), nullable=True))
    op.add_column("operators", sa.Column("contact_phone", sa.String(30), nullable=True))
    op.add_column(
        "operators",
        sa.Column("onboarding_status", sa.String(30), nullable=True, server_default="draft"),
    )

    # Module 4 — operator_roles table
    op.create_table(
        "operator_roles",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "operator_id",
            sa.String(36),
            sa.ForeignKey("operators.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default="0"),
    )

    # Module 4 — operator_role_permissions table
    op.create_table(
        "operator_role_permissions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "operator_role_id",
            sa.String(36),
            sa.ForeignKey("operator_roles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("permission", sa.String(120), nullable=False),
    )

    # Module 4 — add operator_role_id FK to operator_users
    op.add_column(
        "operator_users",
        sa.Column("operator_role_id", sa.String(36), nullable=True, index=True),
    )


def downgrade() -> None:
    op.drop_column("operator_users", "operator_role_id")
    op.drop_table("operator_role_permissions")
    op.drop_table("operator_roles")
    op.drop_column("operators", "onboarding_status")
    op.drop_column("operators", "contact_phone")
    op.drop_column("operators", "contact_email")
    op.drop_column("operators", "trade_name")

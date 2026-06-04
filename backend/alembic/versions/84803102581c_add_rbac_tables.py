"""add_rbac_tables

Revision ID: 84803102581c
Revises: 071e0ba839ff
Create Date: 2026-06-04 02:43:06.360686

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '84803102581c'
down_revision: Union[str, None] = '071e0ba839ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("description", sa.String(500), nullable=False, server_default=""),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("scope", sa.String(200), nullable=False, server_default="Global"),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), onupdate=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "permission_catalog",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("description", sa.String(500), nullable=False, server_default=""),
        sa.Column("domain", sa.String(100), nullable=False, server_default=""),
        sa.Column("is_scopeable", sa.Boolean(), nullable=False, server_default=sa.text("0")),
    )

    op.create_table(
        "role_permissions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("role_id", sa.String(36), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("permission_key", sa.String(100), sa.ForeignKey("permission_catalog.key", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("state", sa.String(20), nullable=False, server_default="none"),
        sa.Column("scope_data", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), onupdate=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("role_permissions")
    op.drop_table("permission_catalog")
    op.drop_table("roles")

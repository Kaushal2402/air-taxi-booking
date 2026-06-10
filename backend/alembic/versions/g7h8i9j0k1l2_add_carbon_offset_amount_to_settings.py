"""add_carbon_offset_amount_to_settings

Revision ID: g7h8i9j0k1l2
Revises: f3e55df2c10e
Create Date: 2026-06-11 00:00:00.000000

"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision = 'g7h8i9j0k1l2'
down_revision = 'f3e55df2c10e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'platform_settings',
        sa.Column('carbon_offset_amount_minor', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('platform_settings', 'carbon_offset_amount_minor')

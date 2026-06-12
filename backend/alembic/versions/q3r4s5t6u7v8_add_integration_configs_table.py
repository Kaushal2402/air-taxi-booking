"""add integration_configs table

Revision ID: q3r4s5t6u7v8
Revises: p2q3r4s5t6u7
Create Date: 2026-06-12
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = 'q3r4s5t6u7v8'
down_revision = 'p2q3r4s5t6u7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'integration_configs',
        sa.Column('key',        sa.String(100), primary_key=True),
        sa.Column('value',      sa.Text(),      nullable=False),
        sa.Column('created_at', sa.DateTime(),  nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(),  nullable=False, server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('integration_configs')

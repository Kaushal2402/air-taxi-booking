"""add device_tokens table

Revision ID: r4s5t6u7v8w9
Revises: q3r4s5t6u7v8
Create Date: 2026-06-12
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = 'r4s5t6u7v8w9'
down_revision = 'q3r4s5t6u7v8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'device_tokens',
        sa.Column('id',          sa.String(36),  primary_key=True),
        sa.Column('user_type',   sa.String(20),  nullable=False),
        sa.Column('user_id',     sa.String(36),  nullable=False),
        sa.Column('token',       sa.String(512), nullable=False),
        sa.Column('platform',    sa.String(20),  nullable=True),
        sa.Column('device_name', sa.String(200), nullable=True),
        sa.Column('last_seen_at',sa.DateTime(),  nullable=True),
        sa.Column('created_at',  sa.DateTime(),  nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at',  sa.DateTime(),  nullable=False, server_default=sa.func.now(),
                  onupdate=sa.func.now()),
        sa.UniqueConstraint('token', name='uq_device_tokens_token'),
    )
    op.create_index('ix_device_tokens_user', 'device_tokens', ['user_type', 'user_id'])


def downgrade() -> None:
    op.drop_index('ix_device_tokens_user', table_name='device_tokens')
    op.drop_table('device_tokens')

"""add admin_alerts table

Revision ID: p2q3r4s5t6u7
Revises: n1o2p3q4r5s6
Create Date: 2026-06-12
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = 'p2q3r4s5t6u7'
down_revision = '0b72e45cdc5f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'admin_alerts',
        sa.Column('id',            sa.String(36),  primary_key=True),
        sa.Column('admin_user_id', sa.String(36),  nullable=True,  index=True),
        sa.Column('category',      sa.String(30),  nullable=False, server_default='system'),
        sa.Column('title',         sa.String(200), nullable=False),
        sa.Column('body',          sa.Text(),      nullable=True),
        sa.Column('href',          sa.String(300), nullable=True),
        sa.Column('is_read',       sa.Boolean(),   nullable=False, server_default=sa.false()),
        sa.Column('read_at',       sa.DateTime(),  nullable=True),
        sa.Column('created_at',    sa.DateTime(),  nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at',    sa.DateTime(),  nullable=False, server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )
    op.create_index('ix_admin_alerts_user_read', 'admin_alerts',
                    ['admin_user_id', 'is_read'])


def downgrade() -> None:
    op.drop_index('ix_admin_alerts_user_read', table_name='admin_alerts')
    op.drop_table('admin_alerts')

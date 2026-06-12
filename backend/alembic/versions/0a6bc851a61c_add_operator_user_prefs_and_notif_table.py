"""add_operator_user_prefs_and_notif_table

Revision ID: 0a6bc851a61c
Revises: ae5f413fe843
Create Date: 2026-06-13 01:24:23.462749

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import app.models.base

revision: str = '0a6bc851a61c'
down_revision: Union[str, None] = 'ae5f413fe843'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'operator_notification_prefs',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('operator_user_id', sa.String(36), nullable=False),
        sa.Column('alert_type', sa.String(80), nullable=False),
        sa.Column('email', sa.Boolean(), nullable=False),
        sa.Column('push', sa.Boolean(), nullable=False),
        sa.Column('sms', sa.Boolean(), nullable=False),
        sa.Column('created_at', app.models.base.UTCDateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', app.models.base.UTCDateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['operator_user_id'], ['operator_users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('operator_user_id', 'alert_type', name='uq_op_notif_pref'),
    )
    op.create_index('ix_operator_notification_prefs_operator_user_id', 'operator_notification_prefs', ['operator_user_id'])

    op.add_column('operator_users', sa.Column('twofa_enrolled_at', app.models.base.UTCDateTime(), nullable=True))
    op.add_column('operator_users', sa.Column('phone_verified', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    op.add_column('operator_users', sa.Column('password_changed_at', app.models.base.UTCDateTime(), nullable=True))
    op.add_column('operator_users', sa.Column('timezone', sa.String(60), nullable=False, server_default='Asia/Kolkata'))
    op.add_column('operator_users', sa.Column('language', sa.String(20), nullable=False, server_default='en-IN'))
    op.add_column('operator_users', sa.Column('date_format', sa.String(30), nullable=False, server_default='DD MMM YYYY'))
    op.add_column('operator_users', sa.Column('time_format', sa.String(10), nullable=False, server_default='24h'))


def downgrade() -> None:
    op.drop_column('operator_users', 'time_format')
    op.drop_column('operator_users', 'date_format')
    op.drop_column('operator_users', 'language')
    op.drop_column('operator_users', 'timezone')
    op.drop_column('operator_users', 'password_changed_at')
    op.drop_column('operator_users', 'phone_verified')
    op.drop_column('operator_users', 'twofa_enrolled_at')
    op.drop_index('ix_operator_notification_prefs_operator_user_id', table_name='operator_notification_prefs')
    op.drop_table('operator_notification_prefs')

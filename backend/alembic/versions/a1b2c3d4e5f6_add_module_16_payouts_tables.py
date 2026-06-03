"""add_module_16_payouts_tables

Revision ID: a1b2c3d4e5f6
Revises: dd3bbfd12a26
Create Date: 2026-06-03 09:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'dd3bbfd12a26'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'payout_runs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('run_ref', sa.String(32), unique=True, nullable=False),
        sa.Column('run_type', sa.Enum(
            'driver_weekly', 'operator_monthly', 'referral', 'vendor',
            name='payoutruntype'
        ), nullable=False),
        sa.Column('status', sa.Enum(
            'draft', 'review', 'approved', 'scheduled', 'processing', 'paid', 'failed', 'cancelled',
            name='payoutrunstatus'
        ), nullable=False, server_default='draft'),
        sa.Column('period_label', sa.String(64), nullable=False),
        sa.Column('period_start', sa.DateTime, nullable=True),
        sa.Column('period_end', sa.DateTime, nullable=True),
        sa.Column('payee_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('gross_amount', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('deduction_amount', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('hold_amount', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('net_amount', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('scheduled_at', sa.DateTime, nullable=True),
        sa.Column('approved_by', sa.String(36), nullable=True),
        sa.Column('approved_at', sa.DateTime, nullable=True),
        sa.Column('rejection_reason', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_payout_runs_run_ref', 'payout_runs', ['run_ref'])
    op.create_index('ix_payout_runs_status', 'payout_runs', ['status'])
    op.create_index('ix_payout_runs_run_type', 'payout_runs', ['run_type'])

    op.create_table(
        'payout_payees',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('run_id', sa.String(36), sa.ForeignKey('payout_runs.id'), nullable=False),
        sa.Column('entity_type', sa.String(32), nullable=False),
        sa.Column('entity_id', sa.String(36), nullable=False),
        sa.Column('entity_name', sa.String(128), nullable=False),
        sa.Column('entity_ref', sa.String(32), nullable=True),
        sa.Column('trip_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('gross_amount', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('incentive_amount', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('deduction_amount', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('hold_amount', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('net_amount', sa.Numeric(18, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.Enum(
            'pending', 'ready', 'hold', 'bank_fail', 'paid', 'cancelled',
            name='payeestatus'
        ), nullable=False, server_default='pending'),
        sa.Column('bank_account_ref', sa.String(64), nullable=True),
        sa.Column('utr_number', sa.String(64), nullable=True),
        sa.Column('paid_at', sa.DateTime, nullable=True),
        sa.Column('hold_reason', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_payout_payees_run_id', 'payout_payees', ['run_id'])
    op.create_index('ix_payout_payees_entity_id', 'payout_payees', ['entity_id'])
    op.create_index('ix_payout_payees_status', 'payout_payees', ['status'])

    op.create_table(
        'payout_adjustments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('payee_id', sa.String(36), sa.ForeignKey('payout_payees.id'), nullable=False),
        sa.Column('adjustment_type', sa.Enum(
            'deduction', 'addition', 'clawback', 'penalty',
            name='adjustmenttype'
        ), nullable=False),
        sa.Column('description', sa.String(256), nullable=False),
        sa.Column('amount', sa.Numeric(18, 2), nullable=False),
        sa.Column('reference', sa.String(128), nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_payout_adjustments_payee_id', 'payout_adjustments', ['payee_id'])


def downgrade() -> None:
    op.drop_table('payout_adjustments')
    op.drop_table('payout_payees')
    op.drop_table('payout_runs')
    op.execute('DROP TYPE IF EXISTS adjustmenttype')
    op.execute('DROP TYPE IF EXISTS payeestatus')
    op.execute('DROP TYPE IF EXISTS payoutrunstatus')
    op.execute('DROP TYPE IF EXISTS payoutruntype')

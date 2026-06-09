"""add_operator_email_otps

Revision ID: c6258df72715
Revises: e6f7a8b9c0d1
Create Date: 2026-06-10 00:34:21.914746

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'c6258df72715'
down_revision: Union[str, None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('operator_email_otps',
    sa.Column('operator_user_id', sa.String(length=36), nullable=False),
    sa.Column('code_hash', sa.String(length=255), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('used_at', sa.DateTime(), nullable=True),
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.ForeignKeyConstraint(['operator_user_id'], ['operator_users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_operator_email_otps_operator_user_id'), 'operator_email_otps', ['operator_user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_operator_email_otps_operator_user_id'), table_name='operator_email_otps')
    op.drop_table('operator_email_otps')
    # legacy noise kept for reference only — removed from execution
    return
    op.create_index('ix_report_templates_tag', 'report_templates', ['tag'], unique=False)
    op.create_index('ix_report_templates_is_standard', 'report_templates', ['is_standard'], unique=False)
    op.drop_constraint(None, 'report_schedules', type_='foreignkey')
    op.create_foreign_key('report_schedules_ibfk_1', 'report_schedules', 'report_templates', ['template_id'], ['id'])
    op.create_index('ix_report_schedules_template_id', 'report_schedules', ['template_id'], unique=False)
    op.drop_constraint(None, 'report_exports', type_='foreignkey')
    op.create_foreign_key('report_exports_ibfk_1', 'report_exports', 'report_templates', ['template_id'], ['id'])
    op.create_index('ix_report_exports_template_id', 'report_exports', ['template_id'], unique=False)
    op.create_index('ix_report_exports_status', 'report_exports', ['status'], unique=False)
    op.create_index('ix_payout_runs_status', 'payout_runs', ['status'], unique=False)
    op.create_index('ix_payout_runs_run_type', 'payout_runs', ['run_type'], unique=False)
    op.create_index('ix_payout_runs_run_ref', 'payout_runs', ['run_ref'], unique=False)
    op.create_index('ix_payout_payees_status', 'payout_payees', ['status'], unique=False)
    op.create_index('ix_payout_payees_run_id', 'payout_payees', ['run_id'], unique=False)
    op.create_index('ix_payout_payees_entity_id', 'payout_payees', ['entity_id'], unique=False)
    op.create_index('ix_payout_adjustments_payee_id', 'payout_adjustments', ['payee_id'], unique=False)
    op.drop_index(op.f('ix_notification_templates_template_code'), table_name='notification_templates')
    op.create_index('template_code', 'notification_templates', ['template_code'], unique=True)
    op.drop_index(op.f('ix_notification_logs_template_id'), table_name='notification_logs')
    op.drop_constraint(None, 'brand_touchpoints', type_='foreignkey')
    op.create_foreign_key('brand_touchpoints_ibfk_1', 'brand_touchpoints', 'brand_profiles', ['profile_id'], ['id'])
    op.create_index('ix_brand_touchpoints_profile_id', 'brand_touchpoints', ['profile_id'], unique=False)
    op.create_index('ix_brand_profiles_status', 'brand_profiles', ['status'], unique=False)
    op.create_index('ix_brand_profiles_brand_ref', 'brand_profiles', ['brand_ref'], unique=False)
    op.drop_constraint(None, 'brand_assets', type_='foreignkey')
    op.create_foreign_key('brand_assets_ibfk_1', 'brand_assets', 'brand_profiles', ['profile_id'], ['id'])
    op.create_index('ix_brand_assets_profile_id', 'brand_assets', ['profile_id'], unique=False)
    op.create_table('sos_events',
    sa.Column('id', mysql.VARCHAR(length=36), nullable=False),
    sa.Column('booking_id', mysql.VARCHAR(length=36), nullable=True),
    sa.Column('booking_type', mysql.VARCHAR(length=10), nullable=True),
    sa.Column('triggered_by', mysql.VARCHAR(length=10), nullable=False),
    sa.Column('triggered_by_id', mysql.VARCHAR(length=36), nullable=True),
    sa.Column('lat', mysql.FLOAT(), nullable=True),
    sa.Column('lng', mysql.FLOAT(), nullable=True),
    sa.Column('contact_number_dialled', mysql.VARCHAR(length=20), nullable=True),
    sa.Column('location_shared', mysql.TINYINT(display_width=1), autoincrement=False, nullable=True),
    sa.Column('ops_alerted', mysql.TINYINT(display_width=1), autoincrement=False, nullable=True),
    sa.Column('notes', mysql.TEXT(), nullable=True),
    sa.Column('status', mysql.VARCHAR(length=20), server_default=sa.text("'open'"), nullable=False),
    sa.Column('resolved_by', mysql.VARCHAR(length=120), nullable=True),
    sa.Column('resolution_notes', mysql.TEXT(), nullable=True),
    sa.Column('created_at', mysql.DATETIME(), nullable=True),
    sa.Column('updated_at', mysql.DATETIME(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    mysql_collate='utf8mb4_0900_ai_ci',
    mysql_default_charset='utf8mb4',
    mysql_engine='InnoDB'
    )
    op.create_index('ix_sos_events_triggered_by_id', 'sos_events', ['triggered_by_id'], unique=False)
    op.create_index('ix_sos_events_booking_id', 'sos_events', ['booking_id'], unique=False)
    op.create_table('privacy_requests',
    sa.Column('id', mysql.VARCHAR(length=36), nullable=False),
    sa.Column('customer_id', mysql.VARCHAR(length=36), nullable=False),
    sa.Column('customer_name', mysql.VARCHAR(length=80), nullable=True),
    sa.Column('customer_email', mysql.VARCHAR(length=120), nullable=True),
    sa.Column('request_type', mysql.VARCHAR(length=20), nullable=False),
    sa.Column('status', mysql.VARCHAR(length=20), server_default=sa.text("'pending'"), nullable=False),
    sa.Column('sla_due_at', mysql.DATETIME(), nullable=True),
    sa.Column('sla_breached', mysql.TINYINT(display_width=1), server_default=sa.text("'0'"), autoincrement=False, nullable=False),
    sa.Column('auto_processed', mysql.TINYINT(display_width=1), server_default=sa.text("'0'"), autoincrement=False, nullable=False),
    sa.Column('resolved_by', mysql.VARCHAR(length=120), nullable=True),
    sa.Column('resolution_note', mysql.TEXT(), nullable=True),
    sa.Column('completed_at', mysql.DATETIME(), nullable=True),
    sa.Column('notes', mysql.TEXT(), nullable=True),
    sa.Column('created_at', mysql.DATETIME(), server_default=sa.text('(now())'), nullable=False),
    sa.Column('updated_at', mysql.DATETIME(), server_default=sa.text('(now())'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    mysql_collate='utf8mb4_0900_ai_ci',
    mysql_default_charset='utf8mb4',
    mysql_engine='InnoDB'
    )
    op.create_index('ix_privacy_requests_customer_id', 'privacy_requests', ['customer_id'], unique=False)
    op.drop_index(op.f('ix_operator_email_otps_operator_user_id'), table_name='operator_email_otps')
    op.drop_table('operator_email_otps')
    # ### end Alembic commands ###

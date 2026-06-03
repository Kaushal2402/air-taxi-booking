"""add_module_17_reports_tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-03 09:30:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'report_templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('description', sa.String(256), nullable=True),
        sa.Column('report_type', sa.String(64), nullable=False, server_default='custom'),
        sa.Column('tag', sa.String(32), nullable=True),
        sa.Column('icon', sa.String(32), nullable=True),
        sa.Column('default_frequency', sa.Enum(
            'once', 'daily', 'weekly', 'monthly',
            name='reportfrequency'
        ), nullable=False, server_default='once'),
        sa.Column('default_format', sa.Enum(
            'pdf', 'xlsx', 'csv', 'json',
            name='reportformat'
        ), nullable=False, server_default='pdf'),
        sa.Column('config', sa.JSON, nullable=True),
        sa.Column('is_standard', sa.Boolean, nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_report_templates_tag', 'report_templates', ['tag'])
    op.create_index('ix_report_templates_is_standard', 'report_templates', ['is_standard'])

    op.create_table(
        'report_schedules',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('template_id', sa.String(36), sa.ForeignKey('report_templates.id'), nullable=False),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('frequency', sa.Enum(
            'once', 'daily', 'weekly', 'monthly',
            name='reportfrequency'
        ), nullable=False),
        sa.Column('format', sa.Enum(
            'pdf', 'xlsx', 'csv', 'json',
            name='reportformat'
        ), nullable=False),
        sa.Column('recipients', sa.Text, nullable=False),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('next_run_at', sa.DateTime, nullable=True),
        sa.Column('last_run_at', sa.DateTime, nullable=True),
        sa.Column('config', sa.JSON, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_report_schedules_template_id', 'report_schedules', ['template_id'])

    op.create_table(
        'report_exports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('template_id', sa.String(36), sa.ForeignKey('report_templates.id'), nullable=True),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('format', sa.Enum(
            'pdf', 'xlsx', 'csv', 'json',
            name='reportformat'
        ), nullable=False),
        sa.Column('status', sa.Enum(
            'draft', 'running', 'done', 'failed', 'scheduled',
            name='reportstatus'
        ), nullable=False, server_default='running'),
        sa.Column('file_url', sa.String(512), nullable=True),
        sa.Column('file_size_kb', sa.String(32), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('config', sa.JSON, nullable=True),
        sa.Column('requested_by', sa.String(36), nullable=True),
        sa.Column('started_at', sa.DateTime, nullable=False),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_report_exports_template_id', 'report_exports', ['template_id'])
    op.create_index('ix_report_exports_status', 'report_exports', ['status'])


def downgrade() -> None:
    op.drop_table('report_exports')
    op.drop_table('report_schedules')
    op.drop_table('report_templates')
    op.execute('DROP TYPE IF EXISTS reportstatus')
    op.execute('DROP TYPE IF EXISTS reportformat')
    op.execute('DROP TYPE IF EXISTS reportfrequency')

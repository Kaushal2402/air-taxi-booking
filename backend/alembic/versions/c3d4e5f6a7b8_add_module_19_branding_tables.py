"""add_module_19_branding_tables

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-03 10:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'brand_profiles',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('brand_ref', sa.String(32), unique=True, nullable=False),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('scope', sa.String(256), nullable=True),
        sa.Column('status', sa.Enum(
            'draft', 'review', 'live', 'archived',
            name='brandstatus'
        ), nullable=False, server_default='draft'),
        sa.Column('primary_color', sa.String(16), nullable=True),
        sa.Column('ink_color', sa.String(16), nullable=True),
        sa.Column('surface_color', sa.String(16), nullable=True),
        sa.Column('bg_color', sa.String(16), nullable=True),
        sa.Column('success_color', sa.String(16), nullable=True),
        sa.Column('display_font', sa.String(64), nullable=True),
        sa.Column('text_font', sa.String(64), nullable=True),
        sa.Column('corner_radius', sa.String(32), nullable=True),
        sa.Column('button_style', sa.String(32), nullable=True),
        sa.Column('is_white_label', sa.Boolean, nullable=False, server_default='0'),
        sa.Column('partner_name', sa.String(128), nullable=True),
        sa.Column('published_at', sa.DateTime, nullable=True),
        sa.Column('published_by', sa.String(36), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('extra_config', sa.JSON, nullable=True),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_brand_profiles_status', 'brand_profiles', ['status'])
    op.create_index('ix_brand_profiles_brand_ref', 'brand_profiles', ['brand_ref'])

    op.create_table(
        'brand_assets',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('profile_id', sa.String(36), sa.ForeignKey('brand_profiles.id'), nullable=False),
        sa.Column('asset_type', sa.String(64), nullable=False),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('format', sa.String(32), nullable=True),
        sa.Column('used_in', sa.String(128), nullable=True),
        sa.Column('version', sa.String(16), nullable=True),
        sa.Column('file_url', sa.String(512), nullable=True),
        sa.Column('file_size_kb', sa.String(32), nullable=True),
        sa.Column('status', sa.Enum(
            'live', 'stale', 'draft', 'archived',
            name='assetstatus'
        ), nullable=False, server_default='draft'),
        sa.Column('uploaded_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_brand_assets_profile_id', 'brand_assets', ['profile_id'])

    op.create_table(
        'brand_touchpoints',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('profile_id', sa.String(36), sa.ForeignKey('brand_profiles.id'), nullable=False),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('description', sa.String(256), nullable=True),
        sa.Column('coverage', sa.String(64), nullable=True),
        sa.Column('icon', sa.String(32), nullable=True),
        sa.Column('status', sa.Enum(
            'live', 'review', 'disabled',
            name='touchpointstatus'
        ), nullable=False, server_default='disabled'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_brand_touchpoints_profile_id', 'brand_touchpoints', ['profile_id'])


def downgrade() -> None:
    op.drop_table('brand_touchpoints')
    op.drop_table('brand_assets')
    op.drop_table('brand_profiles')
    op.execute('DROP TYPE IF EXISTS touchpointstatus')
    op.execute('DROP TYPE IF EXISTS assetstatus')
    op.execute('DROP TYPE IF EXISTS brandstatus')

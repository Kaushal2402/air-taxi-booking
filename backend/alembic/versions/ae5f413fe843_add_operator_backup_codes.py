"""add_operator_backup_codes

Revision ID: ae5f413fe843
Revises: c9c58e57805e
Create Date: 2026-06-13 00:53:07.180360

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import app.models.base

# revision identifiers, used by Alembic.
revision: str = 'ae5f413fe843'
down_revision: Union[str, None] = 'c9c58e57805e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'operator_backup_codes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('operator_user_id', sa.String(length=36), nullable=False),
        sa.Column('code_hash', sa.String(length=255), nullable=False),
        sa.Column('used_at', app.models.base.UTCDateTime(), nullable=True),
        sa.Column('created_at', app.models.base.UTCDateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', app.models.base.UTCDateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['operator_user_id'], ['operator_users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_operator_backup_codes_operator_user_id'),
        'operator_backup_codes',
        ['operator_user_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_operator_backup_codes_operator_user_id'), table_name='operator_backup_codes')
    op.drop_table('operator_backup_codes')

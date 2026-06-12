"""add_event_type_to_login_attempts

Revision ID: 0bc6765a2760
Revises: 0a6bc851a61c
Create Date: 2026-06-13 01:59:42.407146

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0bc6765a2760'
down_revision: Union[str, None] = '0a6bc851a61c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'operator_login_attempts',
        sa.Column('event_type', sa.String(40), nullable=False, server_default='sign_in'),
    )


def downgrade() -> None:
    op.drop_column('operator_login_attempts', 'event_type')

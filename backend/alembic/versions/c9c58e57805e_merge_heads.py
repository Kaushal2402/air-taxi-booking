"""merge_heads

Revision ID: c9c58e57805e
Revises: n1o2p3q4r5s6, s5t6u7v8w9x0
Create Date: 2026-06-13 00:52:49.163635

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9c58e57805e'
down_revision: Union[str, None] = ('n1o2p3q4r5s6', 's5t6u7v8w9x0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

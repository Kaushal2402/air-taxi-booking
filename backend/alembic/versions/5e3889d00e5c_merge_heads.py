"""merge_heads

Revision ID: 5e3889d00e5c
Revises: b07cdf4be1af, e5a1f2c3b4d5
Create Date: 2026-05-31 14:17:33.672315

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e3889d00e5c'
down_revision: Union[str, None] = ('b07cdf4be1af', 'e5a1f2c3b4d5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

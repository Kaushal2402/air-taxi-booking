"""add_operator_auth_and_invite_tables

Revision ID: e6f7a8b9c0d1
Revises: b3c4d5e6f7a8, d2e3f4a5b6c7, c9d8e7f6a5b4
Create Date: 2026-06-09 00:00:00.000000

Merge revision: joins the operator_auth branch (c9d8e7f6a5b4) and the two
existing heads (b3c4d5e6f7a8, d2e3f4a5b6c7) so all tables are created in one
upgrade pass.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e6f7a8b9c0d1"
down_revision: Union[str, tuple, None] = ("b3c4d5e6f7a8", "d2e3f4a5b6c7", "c9d8e7f6a5b4")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "operator_invite_tokens",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("operator_user_id", sa.String(36), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["operator_user_id"], ["operator_users.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_operator_invite_tokens_operator_user_id", "operator_invite_tokens", ["operator_user_id"])
    op.create_index("ix_operator_invite_tokens_token_hash", "operator_invite_tokens", ["token_hash"])


def downgrade() -> None:
    op.drop_index("ix_operator_invite_tokens_token_hash", table_name="operator_invite_tokens")
    op.drop_index("ix_operator_invite_tokens_operator_user_id", table_name="operator_invite_tokens")
    op.drop_table("operator_invite_tokens")

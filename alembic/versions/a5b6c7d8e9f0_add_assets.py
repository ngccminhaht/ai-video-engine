"""add_assets

Revision ID: a5b6c7d8e9f0
Revises: f4d5e6a7b8c9
Create Date: 2026-07-11 17:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "a5b6c7d8e9f0"
down_revision: Union[str, None] = "f4d5e6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assets",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("user_id", sa.String(length=26), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("asset_metadata", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("assets", schema=None) as batch_op:
        batch_op.create_index("ix_assets_user_id", ["user_id"], unique=False)
        batch_op.create_index("ix_assets_user_id_type", ["user_id", "type"], unique=False)
        batch_op.create_index("ix_assets_status", ["status"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("assets", schema=None) as batch_op:
        batch_op.drop_index("ix_assets_status")
        batch_op.drop_index("ix_assets_user_id_type")
        batch_op.drop_index("ix_assets_user_id")
    op.drop_table("assets")

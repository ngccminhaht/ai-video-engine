"""add_user_id_to_jobs

Revision ID: d2b3c4e5f6a7
Revises: c1a2b3d4e5f6
Create Date: 2026-07-11 16:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "d2b3c4e5f6a7"
down_revision: Union[str, None] = "c1a2b3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("jobs", schema=None) as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.String(length=26), nullable=True))
        batch_op.add_column(sa.Column("project_id", sa.String(length=26), nullable=True))
        batch_op.add_column(sa.Column("progress", sa.Integer(), server_default="0", nullable=False))
        batch_op.add_column(sa.Column("stage", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("credits_held", sa.Integer(), server_default="0", nullable=False))
        batch_op.add_column(sa.Column("credits_charged", sa.Integer(), server_default="0", nullable=False))
        batch_op.add_column(sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False))
        batch_op.create_index("ix_jobs_user_id", ["user_id"], unique=False)
        batch_op.create_index("ix_jobs_project_id", ["project_id"], unique=False)
        batch_op.create_index("ix_jobs_created_at", ["created_at"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("jobs", schema=None) as batch_op:
        batch_op.drop_index("ix_jobs_created_at")
        batch_op.drop_index("ix_jobs_project_id")
        batch_op.drop_index("ix_jobs_user_id")
        batch_op.drop_column("is_deleted")
        batch_op.drop_column("credits_charged")
        batch_op.drop_column("credits_held")
        batch_op.drop_column("stage")
        batch_op.drop_column("progress")
        batch_op.drop_column("project_id")
        batch_op.drop_column("user_id")

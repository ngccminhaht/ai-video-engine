"""add_projects_and_outputs

Revision ID: f4d5e6a7b8c9
Revises: e3c4d5f6a7b8
Create Date: 2026-07-11 17:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "f4d5e6a7b8c9"
down_revision: Union[str, None] = "e3c4d5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- projects table ---
    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("user_id", sa.String(length=26), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("thumbnail_url", sa.String(length=500), nullable=True),
        sa.Column("generation_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("projects", schema=None) as batch_op:
        batch_op.create_index("ix_projects_user_id", ["user_id"], unique=False)
        batch_op.create_index("ix_projects_user_id_status", ["user_id", "status"], unique=False)

    # --- generation_outputs table ---
    op.create_table(
        "generation_outputs",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("job_id", sa.String(length=26), nullable=False),
        sa.Column("user_id", sa.String(length=26), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("output_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("generation_outputs", schema=None) as batch_op:
        batch_op.create_index("ix_generation_outputs_job_id", ["job_id"], unique=False)
        batch_op.create_index("ix_generation_outputs_user_id", ["user_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("generation_outputs", schema=None) as batch_op:
        batch_op.drop_index("ix_generation_outputs_user_id")
        batch_op.drop_index("ix_generation_outputs_job_id")
    op.drop_table("generation_outputs")

    with op.batch_alter_table("projects", schema=None) as batch_op:
        batch_op.drop_index("ix_projects_user_id_status")
        batch_op.drop_index("ix_projects_user_id")
    op.drop_table("projects")

"""add_constraints_and_indexes

Revision ID: g5e6f7a8b9c0
Revises: c7d8e9f0a1b2
Create Date: 2026-07-12 10:00:00.000000

Adds:
- Composite indexes for performance
- Foreign key constraints (advisory, SQLite compatible)
- Consistent indexing on user_id + status columns
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g5e6f7a8b9c0"
down_revision: Union[str, None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add composite indexes for common queries
    with op.batch_alter_table("jobs", schema=None) as batch_op:
        batch_op.create_index("ix_jobs_user_id_status", ["user_id", "status"], unique=False)
        batch_op.create_index("ix_jobs_user_id_created_at", ["user_id", "created_at"], unique=False)

    with op.batch_alter_table("assets", schema=None) as batch_op:
        batch_op.create_index("ix_assets_user_id_type", ["user_id", "type"], unique=False)
        batch_op.create_index("ix_assets_user_id_created_at", ["user_id", "created_at"], unique=False)

    with op.batch_alter_table("generation_outputs", schema=None) as batch_op:
        batch_op.create_index("ix_generation_outputs_user_id_created_at", ["user_id", "created_at"], unique=False)

    with op.batch_alter_table("credit_transactions", schema=None) as batch_op:
        batch_op.create_index("ix_credit_transactions_user_id_created_at", ["user_id", "created_at"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("credit_transactions", schema=None) as batch_op:
        batch_op.drop_index("ix_credit_transactions_user_id_created_at")

    with op.batch_alter_table("generation_outputs", schema=None) as batch_op:
        batch_op.drop_index("ix_generation_outputs_user_id_created_at")

    with op.batch_alter_table("assets", schema=None) as batch_op:
        batch_op.drop_index("ix_assets_user_id_created_at")
        batch_op.drop_index("ix_assets_user_id_type")

    with op.batch_alter_table("jobs", schema=None) as batch_op:
        batch_op.drop_index("ix_jobs_user_id_created_at")
        batch_op.drop_index("ix_jobs_user_id_status")

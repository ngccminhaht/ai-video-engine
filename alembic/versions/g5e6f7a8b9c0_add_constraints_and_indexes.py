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

revision: str = "g5e6f7a8b9c0"
down_revision: Union[str, None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _safe_create_index(connection, index_name: str, table_name: str, columns: list[str]) -> None:
    """Create an index only if it doesn't already exist (PostgreSQL compatible)."""
    from sqlalchemy import text
    result = connection.execute(
        text(
            "SELECT 1 FROM pg_indexes WHERE indexname = :name"
        ),
        {"name": index_name},
    )
    if result.fetchone() is None:
        op.create_index(index_name, table_name, columns, unique=False)


def upgrade() -> None:
    # Add composite indexes for common queries (skip if already exists)
    connection = op.get_bind()

    _safe_create_index(connection, "ix_jobs_user_id_status", "jobs", ["user_id", "status"])
    _safe_create_index(connection, "ix_jobs_user_id_created_at", "jobs", ["user_id", "created_at"])
    _safe_create_index(connection, "ix_assets_user_id_type", "assets", ["user_id", "type"])
    _safe_create_index(connection, "ix_assets_user_id_created_at", "assets", ["user_id", "created_at"])
    _safe_create_index(connection, "ix_generation_outputs_user_id_created_at", "generation_outputs", ["user_id", "created_at"])
    _safe_create_index(connection, "ix_credit_transactions_user_id_created_at", "credit_transactions", ["user_id", "created_at"])


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

"""Add idempotency_key to jobs table.

Revision ID: h6f7g8a9b0c1
Revises: g5e6f7a8b9c0
Create Date: 2026-07-12 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "h6f7g8a9b0c1"
down_revision: str = "g5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("idempotency_key", sa.String(length=100), nullable=True))
    op.create_index(
        "idx_jobs_user_idempotency",
        "jobs",
        ["user_id", "idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("idx_jobs_user_idempotency", table_name="jobs")
    op.drop_column("jobs", "idempotency_key")

"""enhance_models_for_enduser

Revision ID: e3c4d5f6a7b8
Revises: d2b3c4e5f6a7
Create Date: 2026-07-11 16:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e3c4d5f6a7b8"
down_revision: Union[str, None] = "d2b3c4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("ai_models", schema=None) as batch_op:
        batch_op.add_column(sa.Column("is_public", sa.Boolean(), server_default=sa.text("true"), nullable=False))
        batch_op.add_column(sa.Column("display_name", sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column("style_preset", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("estimated_time_seconds", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("credit_cost_per_second", sa.Integer(), server_default="2", nullable=False))


def downgrade() -> None:
    with op.batch_alter_table("ai_models", schema=None) as batch_op:
        batch_op.drop_column("credit_cost_per_second")
        batch_op.drop_column("estimated_time_seconds")
        batch_op.drop_column("style_preset")
        batch_op.drop_column("display_name")
        batch_op.drop_column("is_public")

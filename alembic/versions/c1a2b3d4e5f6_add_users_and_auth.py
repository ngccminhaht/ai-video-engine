"""add_users_and_auth

Revision ID: c1a2b3d4e5f6
Revises: b558c2d2cfc6
Create Date: 2026-07-11 15:15:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1a2b3d4e5f6"
down_revision: Union[str, None] = "b558c2d2cfc6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users table ---
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="USER"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("credits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.create_index("ix_users_email", ["email"], unique=True)
        batch_op.create_index("ix_users_role", ["role"], unique=False)
        batch_op.create_index("ix_users_status", ["status"], unique=False)

    # --- refresh_tokens table ---
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=26), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("refresh_tokens", schema=None) as batch_op:
        batch_op.create_index("ix_refresh_tokens_user_id", ["user_id"], unique=False)
        batch_op.create_index("ix_refresh_tokens_expires_at", ["expires_at"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("refresh_tokens", schema=None) as batch_op:
        batch_op.drop_index("ix_refresh_tokens_expires_at")
        batch_op.drop_index("ix_refresh_tokens_user_id")
    op.drop_table("refresh_tokens")

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_index("ix_users_status")
        batch_op.drop_index("ix_users_role")
        batch_op.drop_index("ix_users_email")
    op.drop_table("users")

"""add user timezone, preferred_currency, notification_preferences

Revision ID: 20260909_add_user_profile_fields
Revises: 20260909_add_refresh_tokens
Create Date: 2026-09-09 00:05:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260909_add_user_profile_fields"
down_revision = "20260909_add_refresh_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"))
    op.add_column(
        "users", sa.Column("preferred_currency", sa.String(length=10), nullable=False, server_default="USD")
    )
    op.add_column(
        "users",
        sa.Column("notification_preferences", sa.JSON(), nullable=False, server_default="{}"),
    )
    op.alter_column("users", "timezone", server_default=None)
    op.alter_column("users", "preferred_currency", server_default=None)
    op.alter_column("users", "notification_preferences", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "notification_preferences")
    op.drop_column("users", "preferred_currency")
    op.drop_column("users", "timezone")

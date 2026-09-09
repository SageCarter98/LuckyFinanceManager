"""add user roles

Revision ID: 20260905_add_user_role
Revises: 20260905_add_notifications
Create Date: 2026-09-05 17:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260905_add_user_role"
down_revision = "20260905_add_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("role", sa.String(length=20), nullable=True, server_default="user"))
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("role", nullable=False, server_default="user")


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("role")

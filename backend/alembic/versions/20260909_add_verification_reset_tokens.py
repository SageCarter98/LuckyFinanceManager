"""add user email-verification and password-reset token columns

Revision ID: 20260909_add_verification_reset_tokens
Revises: 20260909_add_tenant_deleted_at
Create Date: 2026-09-09 00:15:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260909_add_verification_reset_tokens"
down_revision = "20260909_add_tenant_deleted_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("verification_token_hash", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("verification_expires_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("reset_token_hash", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("reset_expires_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "reset_expires_at")
    op.drop_column("users", "reset_token_hash")
    op.drop_column("users", "verification_expires_at")
    op.drop_column("users", "verification_token_hash")

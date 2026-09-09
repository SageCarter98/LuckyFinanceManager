"""add refresh_tokens table

Revision ID: 20260909_add_refresh_tokens
Revises: 20260907_postgres_rls
Create Date: 2026-09-09 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260909_add_refresh_tokens"
down_revision = "20260907_postgres_rls"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tenant_id", sa.String(length=36), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("token_hash", sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.execute("ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;")
    op.execute(
        "CREATE POLICY tenant_isolation_refresh_tokens ON refresh_tokens "
        "USING (tenant_id::text = app_current_tenant_id()) "
        "WITH CHECK (tenant_id::text = app_current_tenant_id());"
    )
    op.execute("ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;")


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_refresh_tokens ON refresh_tokens;")
    op.drop_table("refresh_tokens")

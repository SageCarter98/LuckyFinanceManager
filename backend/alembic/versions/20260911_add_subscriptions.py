"""add subscriptions table

Revision ID: 20260911_add_subscriptions
Revises: 20260909_add_verification_reset_tokens
Create Date: 2026-09-11 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260911_add_subscriptions"
down_revision = "20260909_add_verification_reset_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tenant_id", sa.String(length=36), sa.ForeignKey("tenants.id"), nullable=False, unique=True, index=True),
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=True, unique=True, index=True),
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True, unique=True, index=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="none"),
        sa.Column("price_id", sa.String(length=255), nullable=True),
        sa.Column("trial_end", sa.DateTime(), nullable=True),
        sa.Column("current_period_end", sa.DateTime(), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("canceled_at", sa.DateTime(), nullable=True),
        sa.Column("grace_period_ends_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.alter_column("subscriptions", "status", server_default=None)
    op.alter_column("subscriptions", "cancel_at_period_end", server_default=None)

    op.execute("ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;")
    op.execute(
        "CREATE POLICY tenant_isolation_subscriptions ON subscriptions "
        "USING (tenant_id::text = app_current_tenant_id()) "
        "WITH CHECK (tenant_id::text = app_current_tenant_id());"
    )
    op.execute("ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;")


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_subscriptions ON subscriptions;")
    op.drop_table("subscriptions")

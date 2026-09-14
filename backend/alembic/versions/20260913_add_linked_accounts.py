"""add linked_accounts and linked_account_transactions tables (FE-14.x)

Revision ID: 20260913_add_linked_accounts
Revises: 20260911_add_admin_access_log
Create Date: 2026-09-13 00:00:00.000000

Both tables are tenant-scoped and get the same RLS treatment as
20260907_postgres_rls's original TABLES list (not added to that list
directly -- these tables didn't exist yet when that migration ran, and
rewriting history is worse than a second, identical policy here).
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260913_add_linked_accounts"
down_revision = "20260911_add_admin_access_log"
branch_labels = None
depends_on = None

_RLS_TABLES = ["linked_accounts", "linked_account_transactions"]


def upgrade() -> None:
    op.create_table(
        "linked_accounts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tenant_id", sa.String(length=36), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("external_account_ref", sa.String(length=255), nullable=False),
        sa.Column("institution_name", sa.String(length=255), nullable=False),
        sa.Column("account_type", sa.String(length=50), nullable=False),
        sa.Column("account_number_last4", sa.String(length=4), nullable=False),
        sa.Column("native_currency", sa.String(length=10), nullable=False, server_default="USD"),
        sa.Column("current_balance", sa.Numeric(18, 2), nullable=False, server_default="0.00"),
        sa.Column("consent_status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("last_synced_at", sa.DateTime(), nullable=True),
        sa.Column("last_sync_failed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "linked_account_transactions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("tenant_id", sa.String(length=36), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column(
            "linked_account_id", sa.String(length=36), sa.ForeignKey("linked_accounts.id"), nullable=False, index=True
        ),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    for table_name in _RLS_TABLES:
        op.execute(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;")
        op.execute(
            f"CREATE POLICY tenant_isolation_{table_name} ON {table_name} "
            f"USING (tenant_id::text = app_current_tenant_id()) "
            f"WITH CHECK (tenant_id::text = app_current_tenant_id());"
        )
        op.execute(f"ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;")


def downgrade() -> None:
    for table_name in reversed(_RLS_TABLES):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table_name} ON {table_name};")
        op.execute(f"ALTER TABLE {table_name} DISABLE ROW LEVEL SECURITY;")
    op.drop_table("linked_account_transactions")
    op.drop_table("linked_accounts")

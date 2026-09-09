"""add postgres row-level security policies

Revision ID: 20260907_postgres_rls
Revises: 20260905_add_user_role
Create Date: 2026-09-07 09:30:00.000000
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260907_postgres_rls"
down_revision = "20260905_add_user_role"
branch_labels = None
depends_on = None

TABLES = [
    "accounts",
    "categories",
    "transactions",
    "recurring_bills",
    "savings_goals",
    "notifications",
]


def upgrade() -> None:
    op.execute("CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS text AS $$ BEGIN RETURN current_setting('app.tenant_id', true); END; $$ LANGUAGE plpgsql;")
    for table_name in TABLES:
        op.execute(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;")
        op.execute(
            f"CREATE POLICY tenant_isolation_{table_name} ON {table_name} "
            f"USING (tenant_id::text = app_current_tenant_id()) "
            f"WITH CHECK (tenant_id::text = app_current_tenant_id());"
        )
        op.execute(f"ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;")


def downgrade() -> None:
    for table_name in reversed(TABLES):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table_name} ON {table_name};")
        op.execute(f"ALTER TABLE {table_name} DISABLE ROW LEVEL SECURITY;")
    op.execute("DROP FUNCTION IF EXISTS app_current_tenant_id();")

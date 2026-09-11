"""add admin read-only bypass to postgres RLS policies

Revision ID: 20260911_admin_rls_bypass
Revises: 20260911_add_subscriptions
Create Date: 2026-09-11 12:00:00.000000

The staff support console (Workstream G) queries /admin/tenant/search and
/admin/tenant/{id}/summary across every tenant, but 20260907_postgres_rls's
policies have no carve-out for that -- an admin's session is pinned to their
own tenant_id like anyone else's, so on real Postgres the console's
cross-tenant counts silently come back scoped (effectively empty for every
tenant but the admin's own). This only went unnoticed because RLS is a
no-op on SQLite, which is all that's ever been exercised locally.

Fix: a second, ADDITIONAL permissive policy, scoped to `FOR SELECT` only,
that grants visibility when a session-local app.bypass_rls flag is set.
Postgres OR's multiple permissive policies together for the same command,
so SELECT becomes "tenant matches OR bypass_rls()" while the original
tenant_isolation_* policy (untouched by this migration) still governs
INSERT/UPDATE/DELETE alone, unconditionally requiring tenant_id to match
app.tenant_id via its own USING/WITH CHECK.

This is deliberately NOT done by widening the existing policy's USING
clause with an OR: that clause also governs DELETE eligibility, which has
no WITH CHECK to catch what USING lets through -- an admin session with a
widened USING would then be able to delete another tenant's rows outright.
Keeping the bypass on its own FOR SELECT policy means a bypassed session
can never do anything but read outside its own tenant, which is what
keeps the "staff cannot mutate tenant financial data" acceptance criterion
true at the database level, not just because admin.py happens to only
define GET routes today.

app.bypass_rls is set via set_config(..., true) (transaction-local) only
inside app.dependencies.get_current_admin_user, so it is only ever set for
requests that already passed the role == "admin" check -- never globally
for an admin's session.
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260911_admin_rls_bypass"
down_revision = "20260911_add_subscriptions"
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
    op.execute(
        "CREATE OR REPLACE FUNCTION app_bypass_rls() RETURNS boolean AS $$ "
        "BEGIN RETURN coalesce(current_setting('app.bypass_rls', true), '') = 'true'; END; "
        "$$ LANGUAGE plpgsql;"
    )
    for table_name in TABLES:
        op.execute(
            f"CREATE POLICY admin_bypass_read_{table_name} ON {table_name} "
            f"FOR SELECT USING (app_bypass_rls());"
        )


def downgrade() -> None:
    for table_name in reversed(TABLES):
        op.execute(f"DROP POLICY IF EXISTS admin_bypass_read_{table_name} ON {table_name};")
    op.execute("DROP FUNCTION IF EXISTS app_bypass_rls();")

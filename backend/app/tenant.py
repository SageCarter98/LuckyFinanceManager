from sqlalchemy import text

from app.database import engine


def apply_tenant_context(db, tenant_id: str | None) -> None:
    if tenant_id is None:
        return

    if engine.dialect.name == "postgresql":
        # Postgres's SET/SET LOCAL does not accept a bind parameter for the
        # value ("SET LOCAL app.tenant_id = $1" is a syntax error) -- this
        # was never caught because RLS/this code path has only ever run
        # against SQLite in tests (which no-ops here) or in theory, never
        # against real Postgres, until this was discovered exercising the
        # new CI rls-verification job. set_config() is a regular SQL
        # function call, so it accepts a normal bind parameter; its third
        # argument (is_local=true) reproduces SET LOCAL's transaction-scoped
        # (not session-wide) semantics.
        db.execute(text("SELECT set_config('app.tenant_id', :tenant_id, true)"), {"tenant_id": str(tenant_id)})


def apply_admin_bypass(db) -> None:
    """Widens RLS visibility (SELECT/UPDATE/DELETE only, see
    20260911_admin_rls_bypass) to every tenant for the rest of this
    transaction. Only call this after the caller's role has already been
    checked to be "admin" -- see app.dependencies.get_current_admin_user,
    the only place this is called from."""
    if engine.dialect.name == "postgresql":
        db.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))

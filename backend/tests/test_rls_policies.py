"""Verifies the Postgres row-level-security policies added in
alembic/versions/20260907_postgres_rls.py actually enforce tenant
isolation at the DATABASE level -- not just the application-layer
`.filter(Model.tenant_id == ...)` scoping every router already adds.

This is deliberately NOT part of test_api.py/test_subscriptions.py:
- Both of those override DATABASE_URL to a local sqlite file and reset the
  schema via Base.metadata.drop_all/create_all, which never runs the
  Postgres-only RLS migration at all.
- Running this file's assertions inside that same process would require
  Base.metadata.drop_all/create_all to run AFTER `alembic upgrade head`
  already created the tables with RLS attached -- drop_all/create_all
  would blow the policies away (they're raw SQL, not part of the ORM
  metadata) and recreate plain, unprotected tables.

So this file connects directly via SQLAlchemy against whatever
DATABASE_URL is already pointed at a *migrated* Postgres database (CI's
`rls-verification` job runs `alembic upgrade head` before this file),
and skips entirely everywhere else (including local dev on SQLite).

Also deliberately does not import app.main (which would call
Base.metadata.create_all() again at import time) -- this file only ever
reads app.models for the ORM class definitions.
"""

import os
import uuid

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.models import Account, LinkedAccount, LinkedAccountTransaction, Tenant

DATABASE_URL = os.environ.get("DATABASE_URL", "")

pytestmark = pytest.mark.skipif(
    not DATABASE_URL.startswith("postgresql"),
    reason="RLS is Postgres-only; requires a real Postgres DATABASE_URL with "
    "`alembic upgrade head` already applied (see CI's rls-verification job).",
)

engine = create_engine(DATABASE_URL) if DATABASE_URL.startswith("postgresql") else None


def _set_tenant(session: Session, tenant_id: str | None) -> None:
    if tenant_id is None:
        return
    # SET LOCAL does not accept a bind parameter for the value in Postgres
    # ("SET LOCAL app.tenant_id = $1" is a syntax error) -- set_config() is
    # a plain SQL function call and does. Same fix as app/tenant.py's
    # apply_tenant_context, which had the identical bug.
    session.execute(text("SELECT set_config('app.tenant_id', :tenant_id, true)"), {"tenant_id": tenant_id})


def _seed_tenant_with_account(tenant_id: str) -> str:
    """Creates a Tenant (unprotected by RLS -- it has no tenant_id column
    of its own) and one Account scoped to it. The Account insert must run
    with app.tenant_id already set to this tenant, or FORCE ROW LEVEL
    SECURITY's WITH CHECK clause rejects the insert outright."""
    account_id = str(uuid.uuid4())
    with Session(engine) as session:
        session.add(Tenant(id=tenant_id))
        session.flush()
        _set_tenant(session, tenant_id)
        session.add(
            Account(
                id=account_id,
                tenant_id=tenant_id,
                name="RLS test account",
                account_type="checking",
                native_currency="USD",
            )
        )
        session.commit()
    return account_id


def test_rls_scopes_reads_to_the_session_tenant_at_the_database_level():
    tenant_a = str(uuid.uuid4())
    tenant_b = str(uuid.uuid4())
    account_a = _seed_tenant_with_account(tenant_a)
    _seed_tenant_with_account(tenant_b)

    # A bare, unfiltered query -- proving the POLICY hides tenant B's row,
    # not any WHERE clause this test forgot to omit.
    with Session(engine) as session:
        _set_tenant(session, tenant_a)
        rows = session.execute(text("SELECT id FROM accounts")).fetchall()

    assert [row[0] for row in rows] == [account_a]


def test_rls_denies_all_rows_when_no_tenant_context_is_set():
    tenant_a = str(uuid.uuid4())
    _seed_tenant_with_account(tenant_a)

    # No SET LOCAL app.tenant_id at all -- app_current_tenant_id() returns
    # NULL, and `tenant_id::text = NULL` is never true. Proves default-deny,
    # not default-allow-then-filter.
    with Session(engine) as session:
        rows = session.execute(text("SELECT id FROM accounts")).fetchall()

    assert rows == []


def test_rls_bypass_flag_widens_reads_across_tenants():
    tenant_a = str(uuid.uuid4())
    tenant_b = str(uuid.uuid4())
    account_a = _seed_tenant_with_account(tenant_a)
    account_b = _seed_tenant_with_account(tenant_b)

    # No app.tenant_id at all, only the bypass flag -- proves the OR branch
    # in USING itself grants visibility, not some leftover tenant context.
    # Scoped to just this test's two tenants: this file's tests all share one
    # live database with no inter-test cleanup, so an unscoped `SELECT *` here
    # would also pick up rows other tests in this same run seeded (verified --
    # this failed for exactly that reason before the WHERE clause was added,
    # in both a fresh CI container and local runs, ruling out "stale local
    # data" as the cause). Filtering by tenant_id keeps the assertion an exact
    # equality -- still proving bypass returns rows spanning both tenants in
    # one query -- without depending on the rest of the table being empty.
    with Session(engine) as session:
        session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        rows = session.execute(
            text("SELECT id FROM accounts WHERE tenant_id IN (:a, :b)"),
            {"a": tenant_a, "b": tenant_b},
        ).fetchall()

    assert {row[0] for row in rows} == {account_a, account_b}


def test_rls_bypass_flag_does_not_relax_write_check():
    tenant_a = str(uuid.uuid4())
    tenant_b = str(uuid.uuid4())
    with Session(engine) as session:
        session.add(Tenant(id=tenant_a))
        session.add(Tenant(id=tenant_b))
        session.commit()

    # Bypass only appears in USING, never WITH CHECK -- an insert claiming
    # tenant B must still be rejected even with the flag set, so a staff
    # console session can never come to double as a write escape hatch.
    with pytest.raises(DBAPIError):
        with Session(engine) as session:
            _set_tenant(session, tenant_a)
            session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
            session.add(
                Account(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant_b,
                    name="Should still be rejected",
                    account_type="checking",
                    native_currency="USD",
                )
            )
            session.commit()


def test_rls_bypass_flag_does_not_permit_deleting_another_tenants_row():
    tenant_a = str(uuid.uuid4())
    tenant_b = str(uuid.uuid4())
    account_a = _seed_tenant_with_account(tenant_a)
    account_b = _seed_tenant_with_account(tenant_b)

    # The bypass policy is FOR SELECT only -- DELETE is still governed
    # solely by the original tenant-scoped policy. If bypass had instead
    # been added by OR-ing into that policy's USING clause, this DELETE
    # would silently succeed cross-tenant (DELETE has no WITH CHECK to
    # catch what USING lets through).
    with Session(engine) as session:
        _set_tenant(session, tenant_a)
        session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        session.execute(text("DELETE FROM accounts WHERE id = :id"), {"id": account_b})
        session.commit()

    with Session(engine) as session:
        _set_tenant(session, tenant_a)
        session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        rows = {
            row[0]
            for row in session.execute(
                text("SELECT id FROM accounts WHERE tenant_id IN (:a, :b)"),
                {"a": tenant_a, "b": tenant_b},
            ).fetchall()
        }

    assert rows == {account_a, account_b}, "tenant B's row must survive the cross-tenant DELETE attempt (tenant A's own row was never targeted)"


def test_rls_rejects_writes_for_a_different_tenant():
    tenant_a = str(uuid.uuid4())
    tenant_b = str(uuid.uuid4())
    with Session(engine) as session:
        session.add(Tenant(id=tenant_a))
        session.add(Tenant(id=tenant_b))
        session.commit()

    # Session is scoped to tenant A, but the row being inserted claims
    # tenant B -- WITH CHECK must reject this at the database level.
    with pytest.raises(DBAPIError):
        with Session(engine) as session:
            _set_tenant(session, tenant_a)
            session.add(
                Account(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant_b,
                    name="Should be rejected",
                    account_type="checking",
                    native_currency="USD",
                )
            )
            session.commit()


def _seed_tenant_with_linked_account(tenant_id: str) -> str:
    """Same shape as _seed_tenant_with_account, for the two tables added in
    20260913_add_linked_accounts -- covers both tables the FE-14.x feature
    added, not just linked_accounts, since each has its own policy."""
    linked_account_id = str(uuid.uuid4())
    with Session(engine) as session:
        session.add(Tenant(id=tenant_id))
        session.flush()
        _set_tenant(session, tenant_id)
        session.add(
            LinkedAccount(
                id=linked_account_id,
                tenant_id=tenant_id,
                provider="stub-sandbox-connector",
                external_account_ref="stub_test",
                institution_name="RLS Test Bank",
                account_type="checking",
                account_number_last4="1234",
                native_currency="USD",
            )
        )
        session.flush()
        session.add(
            LinkedAccountTransaction(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                linked_account_id=linked_account_id,
                description="RLS test transaction",
                amount="-10.00",
                currency="USD",
                transaction_date="2026-09-01",
            )
        )
        session.commit()
    return linked_account_id


def test_rls_scopes_linked_accounts_to_the_session_tenant():
    tenant_a = str(uuid.uuid4())
    tenant_b = str(uuid.uuid4())
    linked_account_a = _seed_tenant_with_linked_account(tenant_a)
    _seed_tenant_with_linked_account(tenant_b)

    with Session(engine) as session:
        _set_tenant(session, tenant_a)
        rows = session.execute(text("SELECT id FROM linked_accounts")).fetchall()

    assert [row[0] for row in rows] == [linked_account_a]


def test_rls_scopes_linked_account_transactions_to_the_session_tenant():
    tenant_a = str(uuid.uuid4())
    tenant_b = str(uuid.uuid4())
    _seed_tenant_with_linked_account(tenant_a)
    _seed_tenant_with_linked_account(tenant_b)

    with Session(engine) as session:
        _set_tenant(session, tenant_a)
        rows = session.execute(text("SELECT tenant_id FROM linked_account_transactions")).fetchall()

    assert rows == [(tenant_a,)]


def test_rls_rejects_cross_tenant_write_to_linked_accounts():
    tenant_a = str(uuid.uuid4())
    tenant_b = str(uuid.uuid4())
    with Session(engine) as session:
        session.add(Tenant(id=tenant_a))
        session.add(Tenant(id=tenant_b))
        session.commit()

    with pytest.raises(DBAPIError):
        with Session(engine) as session:
            _set_tenant(session, tenant_a)
            session.add(
                LinkedAccount(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant_b,
                    provider="stub-sandbox-connector",
                    external_account_ref="stub_test",
                    institution_name="Should be rejected",
                    account_type="checking",
                    account_number_last4="1234",
                    native_currency="USD",
                )
            )
            session.commit()

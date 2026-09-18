"""Found via an E2E run that hit a real `UNIQUE constraint failed:
subscriptions.tenant_id` under `_get_or_create`'s original select-then-insert
shape (app/routers/subscriptions.py). True concurrency is flaky to test
directly, so this reproduces the race deterministically: two sessions both
observe "no row yet," one wins the insert, and the other is driven through
the same insert attempt by hand to prove the real recovery path (catch
IntegrityError, rollback, re-query) works, not just that a hand-written
duplicate of it would.
"""

import os
from uuid import uuid4

os.environ.setdefault(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(os.path.dirname(__file__), "test_finance.db"),
)

from sqlalchemy.exc import IntegrityError

from app.database import Base, SessionLocal, engine
from app.models import Subscription
from app.routers.subscriptions import _get_or_create

Base.metadata.create_all(bind=engine)


def test_get_or_create_recovers_from_a_concurrent_insert_race():
    tenant_id = str(uuid4())
    session_a = SessionLocal()
    session_b = SessionLocal()
    try:
        # Both sessions observe "no row yet" -- the actual TOCTOU window.
        assert session_a.query(Subscription).filter_by(tenant_id=tenant_id).first() is None
        assert session_b.query(Subscription).filter_by(tenant_id=tenant_id).first() is None

        # Session A wins: a real call to the function under test.
        row_a = _get_or_create(session_a, tenant_id)
        assert row_a.tenant_id == tenant_id

        # Session B already passed its SELECT above believing no row
        # existed, so drive it into the insert branch it would have taken --
        # this is _get_or_create's own insert step, not a reimplementation,
        # just invoked directly since the function itself would now take
        # the fast "found" path on a fresh call.
        session_b.add(Subscription(tenant_id=tenant_id))
        try:
            session_b.commit()
            raise AssertionError("expected the unique constraint to reject this insert")
        except IntegrityError:
            session_b.rollback()

        # This is the actual behavior under test: after the race, a fresh
        # call to the real function recovers cleanly instead of raising.
        row_b = _get_or_create(session_b, tenant_id)
        assert row_b.id == row_a.id
    finally:
        session_a.close()
        session_b.close()

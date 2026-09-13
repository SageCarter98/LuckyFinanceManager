import pytest

from app.core import rate_limit


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """The rate limiter (app/core/rate_limit.py) is deliberately global,
    in-memory, per-process state -- correct for production, but every test
    file shares one TestClient "IP" (starlette's fake test client host),
    so without a reset the real test suite's normal call volume would trip
    limits meant for production abuse. Reset before every test rather than
    disabling the limiter in tests, so the limiter's actual behavior stays
    exercised by whichever test wants to check it specifically."""
    rate_limit.reset()
    yield

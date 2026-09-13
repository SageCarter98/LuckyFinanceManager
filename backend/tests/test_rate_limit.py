import os
from uuid import uuid4

os.environ.setdefault(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(os.path.dirname(__file__), "test_finance.db"),
)

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_login_rate_limit_returns_429_after_max_attempts():
    email = f"ratelimit-{uuid4().hex[:8]}@example.com"
    client.post(
        "/api/auth/signup",
        json={"email": email, "password": "StrongPass123!", "full_name": "Rate Limit"},
    )

    # login's limit is 10/60s -- the first 10 attempts are each individually
    # rejected as bad credentials (401), not blocked by the limiter itself.
    for _ in range(10):
        resp = client.post("/api/auth/login", json={"email": email, "password": "WrongPassword!"})
        assert resp.status_code == 401

    blocked = client.post("/api/auth/login", json={"email": email, "password": "WrongPassword!"})
    assert blocked.status_code == 429


def test_rate_limit_is_scoped_per_route_not_shared_globally():
    email = f"ratelimit2-{uuid4().hex[:8]}@example.com"
    for _ in range(10):
        client.post("/api/auth/login", json={"email": email, "password": "WrongPassword!"})
    exhausted = client.post("/api/auth/login", json={"email": email, "password": "WrongPassword!"})
    assert exhausted.status_code == 429

    # A separate route's bucket (forgot-password) must be unaffected by
    # login's bucket being exhausted -- proves buckets are keyed per-route,
    # not one shared counter per client.
    forgot = client.post("/api/auth/forgot-password", json={"email": email})
    assert forgot.status_code == 200

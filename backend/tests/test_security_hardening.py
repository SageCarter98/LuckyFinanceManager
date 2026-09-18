"""G4.09 security/privacy review: verifies the two controls added by that
review, not just that they exist in source.
"""

import os
import subprocess
import sys
import tempfile

os.environ.setdefault(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(os.path.dirname(__file__), "test_finance.db"),
)

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_responses_carry_hardening_headers():
    response = client.get("/health")
    assert response.headers["Content-Security-Policy"] == "default-src 'none'; frame-ancestors 'none'"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert response.headers["Strict-Transport-Security"] == "max-age=63072000; includeSubDomains; preload"


_BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))


def _run_get_settings(env_overrides: dict[str, str]) -> subprocess.CompletedProcess:
    env = {**os.environ, **env_overrides}
    env.pop("SECRET_KEY", None)
    env.update(env_overrides)
    # PYTHONPATH (not cwd=backend/) so `import app.config` resolves while
    # pydantic-settings' env_file=".env" lookup (relative to cwd) does NOT
    # pick up this developer's real local backend/.env -- that file exists
    # for running the app against real Postgres and sets its own
    # placeholder SECRET_KEY, which would otherwise mask exactly the
    # "nothing set at all" case this test needs to exercise.
    env["PYTHONPATH"] = _BACKEND_DIR
    return subprocess.run(
        [sys.executable, "-c", "from app.config import get_settings; get_settings()"],
        cwd=tempfile.gettempdir(),
        env=env,
        capture_output=True,
        text=True,
    )


def test_production_boot_fails_closed_on_default_secret_key():
    """Subprocess, not monkeypatch: get_settings() is @lru_cache'd and
    app.config is already imported (with its cache populated) everywhere
    else in this suite -- only a fresh interpreter actually exercises the
    module-level check in app/config.py."""
    result = _run_get_settings({"ENVIRONMENT": "production", "DATABASE_URL": "postgresql://x/y"})
    assert result.returncode != 0
    assert "SECRET_KEY" in result.stderr


def test_production_boot_succeeds_with_real_secret_key():
    result = _run_get_settings(
        {"ENVIRONMENT": "production", "DATABASE_URL": "postgresql://x/y", "SECRET_KEY": "a-real-secret"}
    )
    assert result.returncode == 0, result.stderr

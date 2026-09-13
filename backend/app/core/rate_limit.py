"""In-memory, per-process rate limiting for authentication endpoints
(Privacy_Impact_Assessment.md P3 / Security_Design.md section 1: no
brute-force protection existed anywhere in this codebase).

Deliberately in-memory, not a distributed store (Redis etc.) -- correct
for this project's current single-instance deployment (one Render web
service), and disclosed as a real limitation: if this service is ever
scaled to more than one process/instance, each instance enforces its own
limit independently, meaning the effective limit multiplies by instance
count. Fix at that point, not before it's a real constraint.
"""

import logging
import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status

logger = logging.getLogger("app.rate_limit")

_WINDOW_SECONDS = 60.0
_buckets: dict[tuple[str, str], list[float]] = defaultdict(list)
_lock = Lock()


def reset() -> None:
    """Test-only: clears all rate-limit state. Call between tests so one
    test file's request volume doesn't trip limits meant for production
    abuse, not legitimate test traffic sharing TestClient's one fake IP."""
    with _lock:
        _buckets.clear()


def _client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def rate_limiter(name: str, max_attempts: int):
    """FastAPI dependency factory: at most max_attempts calls to routes
    using the returned dependency, per client IP, per rolling 60s window,
    keyed by `name` so different routes don't share one bucket."""

    def dependency(request: Request) -> None:
        key = (name, _client_key(request))
        now = time.monotonic()
        with _lock:
            attempts = _buckets[key]
            cutoff = now - _WINDOW_SECONDS
            while attempts and attempts[0] < cutoff:
                attempts.pop(0)
            if len(attempts) >= max_attempts:
                logger.warning(
                    "rate_limit_exceeded",
                    extra={"extra_fields": {"route": name, "client": _client_key(request)}},
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many attempts. Try again in a minute.",
                )
            attempts.append(now)

    return dependency

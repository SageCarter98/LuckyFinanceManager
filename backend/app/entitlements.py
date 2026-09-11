"""FR-12.2/FR-12.9 entitlement logic: whether a tenant currently has access
to subscription-gated features (bank-linking and Gross Balance). Manual
finance endpoints must never consult this -- only a future bank router
would."""

from datetime import datetime, timezone

from app.models import Subscription, utc_now


def _aware(value: datetime | None) -> datetime | None:
    """Same normalization as app/routers/auth.py's `_aware`: SQLite
    round-trips DateTime columns as naive, so a naive value read back from
    the database must be treated as UTC before comparing against
    datetime.now(utc) -- otherwise Python raises on naive-vs-aware."""
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


def is_entitled(subscription: Subscription | None) -> bool:
    if subscription is None:
        return False
    if subscription.status in ("trialing", "active"):
        return True
    grace_period_ends_at = _aware(subscription.grace_period_ends_at)
    if subscription.status == "past_due" and grace_period_ends_at:
        return utc_now() < grace_period_ends_at
    return False

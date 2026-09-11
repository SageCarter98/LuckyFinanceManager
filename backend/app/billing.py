"""Shared Stripe <-> local Subscription row sync logic, used by both
app/routers/subscriptions.py (direct API calls) and
app/routers/stripe_webhook.py (webhook-driven updates). Kept in one place
so the two never drift on how a Stripe subscription object maps to our
local fields."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import Subscription


def _from_unix(value: int | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromtimestamp(value, tz=timezone.utc)


def find_subscription(
    db: Session,
    *,
    tenant_id: str | None = None,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
) -> Subscription | None:
    query = db.query(Subscription)
    if tenant_id is not None:
        return query.filter(Subscription.tenant_id == tenant_id).first()
    if stripe_subscription_id is not None:
        row = query.filter(Subscription.stripe_subscription_id == stripe_subscription_id).first()
        if row is not None:
            return row
    if stripe_customer_id is not None:
        return query.filter(Subscription.stripe_customer_id == stripe_customer_id).first()
    return None


def sync_from_stripe_subscription(row: Subscription, stripe_sub: Any) -> None:
    """Mirrors a Stripe Subscription object's fields onto the local row.
    Accepts either a real `stripe.Subscription` (attribute access) or a
    plain dict (as used by tests/mocks), matching how the Stripe SDK
    itself supports both access styles."""

    def get(key: str) -> Any:
        return stripe_sub[key] if isinstance(stripe_sub, dict) else getattr(stripe_sub, key, None)

    row.stripe_subscription_id = get("id") or row.stripe_subscription_id
    row.status = get("status") or row.status
    row.current_period_end = _from_unix(get("current_period_end")) or row.current_period_end
    row.trial_end = _from_unix(get("trial_end"))
    row.cancel_at_period_end = bool(get("cancel_at_period_end"))
    items = get("items")
    if items:
        data = items["data"] if isinstance(items, dict) else items.data
        if data:
            first = data[0]
            row.price_id = first["price"]["id"] if isinstance(first, dict) else first.price.id

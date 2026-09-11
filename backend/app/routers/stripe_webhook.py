from datetime import datetime, timedelta, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.billing import find_subscription, sync_from_stripe_subscription
from app.config import get_settings
from app.database import get_db
from app.models import Notification, Subscription

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

settings = get_settings()


def _get(obj, key: str):
    return obj[key] if isinstance(obj, dict) else getattr(obj, key, None)


def _handle_checkout_completed(db: Session, session_obj) -> None:
    if _get(session_obj, "mode") != "subscription":
        return
    metadata = _get(session_obj, "metadata") or {}
    tenant_id = metadata.get("tenant_id") if isinstance(metadata, dict) else getattr(metadata, "tenant_id", None)
    if not tenant_id:
        return

    row = find_subscription(db, tenant_id=tenant_id)
    if row is None:
        row = Subscription(tenant_id=tenant_id)
        db.add(row)

    row.stripe_customer_id = _get(session_obj, "customer") or row.stripe_customer_id
    stripe_subscription_id = _get(session_obj, "subscription")
    if stripe_subscription_id:
        row.stripe_subscription_id = stripe_subscription_id
        stripe_sub = stripe.Subscription.retrieve(stripe_subscription_id)
        sync_from_stripe_subscription(row, stripe_sub)
    db.commit()


def _handle_subscription_updated(db: Session, stripe_sub) -> None:
    row = find_subscription(
        db,
        stripe_subscription_id=_get(stripe_sub, "id"),
        stripe_customer_id=_get(stripe_sub, "customer"),
    )
    if row is None:
        return

    was_past_due = row.status == "past_due"
    sync_from_stripe_subscription(row, stripe_sub)

    if row.status == "past_due" and not was_past_due:
        row.grace_period_ends_at = datetime.now(timezone.utc) + timedelta(days=settings.billing_grace_period_days)
    elif row.status != "past_due":
        row.grace_period_ends_at = None

    db.commit()


def _handle_invoice_payment_failed(db: Session, invoice) -> None:
    row = find_subscription(
        db,
        stripe_subscription_id=_get(invoice, "subscription"),
        stripe_customer_id=_get(invoice, "customer"),
    )
    if row is None:
        return
    db.add(
        Notification(
            tenant_id=row.tenant_id,
            user_id=None,
            kind="billing_payment_failed",
            title="Payment failed",
            message="A payment on your subscription failed. We'll retry automatically; "
            "please update your payment method to avoid losing access when the grace period ends.",
        )
    )
    db.commit()


def _handle_invoice_payment_succeeded(db: Session, invoice) -> None:
    row = find_subscription(
        db,
        stripe_subscription_id=_get(invoice, "subscription"),
        stripe_customer_id=_get(invoice, "customer"),
    )
    if row is None:
        return
    was_past_due = row.status == "past_due"
    if was_past_due:
        row.status = "active"
        row.grace_period_ends_at = None
        db.add(
            Notification(
                tenant_id=row.tenant_id,
                user_id=None,
                kind="billing_payment_succeeded",
                title="Payment received",
                message="Your payment succeeded and your subscription is active again.",
            )
        )
    db.commit()


def _handle_subscription_deleted(db: Session, stripe_sub) -> None:
    row = find_subscription(db, stripe_subscription_id=_get(stripe_sub, "id"))
    if row is None:
        return
    row.status = "canceled"
    row.canceled_at = row.canceled_at or datetime.now(timezone.utc)
    db.commit()


_HANDLERS = {
    "checkout.session.completed": lambda db, obj: _handle_checkout_completed(db, obj),
    "customer.subscription.updated": lambda db, obj: _handle_subscription_updated(db, obj),
    "invoice.payment_failed": lambda db, obj: _handle_invoice_payment_failed(db, obj),
    "invoice.payment_succeeded": lambda db, obj: _handle_invoice_payment_succeeded(db, obj),
    "customer.subscription.deleted": lambda db, obj: _handle_subscription_deleted(db, obj),
}


@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Deliberately unauthenticated -- Stripe calls this directly with no
    bearer token; the signature check below is the auth boundary instead.
    Also deliberately does not pre-filter by tenant_id like every other
    router in this codebase: there is no authenticated tenant context on an
    incoming webhook, so handlers look the tenant up via the Stripe IDs
    carried on the event itself. Disclosed, intentional exception -- not an
    oversight."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature") from exc

    event_type = event["type"] if isinstance(event, dict) else event.type
    data_object = event["data"]["object"] if isinstance(event, dict) else event.data.object

    handler = _HANDLERS.get(event_type)
    if handler:
        handler(db, data_object)

    return {"received": True}

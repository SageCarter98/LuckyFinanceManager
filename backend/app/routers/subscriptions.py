from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.entitlements import is_entitled
from app.models import Subscription, User
from app.schemas import BillingHistoryItem, CheckoutSessionRead, SubscriptionStatusRead

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

settings = get_settings()
stripe.api_key = settings.stripe_secret_key


def _get_or_create(db: Session, tenant_id: str) -> Subscription:
    """Found by an E2E run that hit a real `UNIQUE constraint failed:
    subscriptions.tenant_id` under this method's original select-then-insert
    shape -- a plain TOCTOU race (two requests for the same tenant, e.g. a
    client-side retry, both pass the SELECT before either commits). Whether
    that run's specific trigger was a genuine double-submit or an artifact
    of heavy system load wasn't conclusively isolated, but the race is real
    by inspection regardless, and `subscriptions.tenant_id` is correctly
    unique (one subscription per tenant is the actual business rule) -- so
    the fix is to make the loser of the race recover, not to remove the
    constraint."""
    row = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
    if row is not None:
        return row
    row = Subscription(tenant_id=tenant_id)
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        row = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
        if row is None:
            raise
    return row


def _status_response(row: Subscription) -> SubscriptionStatusRead:
    return SubscriptionStatusRead(
        status=row.status,
        is_entitled=is_entitled(row),
        trial_end=row.trial_end,
        current_period_end=row.current_period_end,
        cancel_at_period_end=row.cancel_at_period_end,
        grace_period_ends_at=row.grace_period_ends_at,
        plan_amount_cents=settings.stripe_plan_amount_cents,
        plan_currency=settings.stripe_plan_currency,
    )


@router.get("/status", response_model=SubscriptionStatusRead)
def get_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _get_or_create(db, current_user.tenant_id)
    return _status_response(row)


@router.post("/checkout-session", response_model=CheckoutSessionRead)
def create_checkout_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _get_or_create(db, current_user.tenant_id)
    if row.status in ("trialing", "active"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A subscription is already active")

    if row.stripe_customer_id is None:
        customer = stripe.Customer.create(
            email=current_user.email,
            metadata={"tenant_id": current_user.tenant_id},
        )
        row.stripe_customer_id = customer["id"] if isinstance(customer, dict) else customer.id
        db.commit()

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=row.stripe_customer_id,
        line_items=[{"price": settings.stripe_price_id, "quantity": 1}],
        subscription_data={
            "trial_period_days": settings.stripe_trial_days,
            "metadata": {"tenant_id": current_user.tenant_id},
        },
        metadata={"tenant_id": current_user.tenant_id},
        success_url=f"{settings.frontend_base_url}/subscription?checkout=success",
        cancel_url=f"{settings.frontend_base_url}/subscription?checkout=cancelled",
    )
    checkout_url = session["url"] if isinstance(session, dict) else session.url
    return CheckoutSessionRead(checkout_url=checkout_url)


@router.post("/cancel", response_model=SubscriptionStatusRead)
def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _get_or_create(db, current_user.tenant_id)
    if not row.stripe_subscription_id or row.status not in ("trialing", "active"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active subscription to cancel")

    stripe.Subscription.modify(row.stripe_subscription_id, cancel_at_period_end=True)
    row.cancel_at_period_end = True
    row.canceled_at = datetime.now(timezone.utc)
    db.commit()
    return _status_response(row)


@router.post("/dev-grant-trial", response_model=SubscriptionStatusRead, include_in_schema=False)
def dev_grant_trial(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dev/E2E-only: activates a trial without a real Stripe checkout. No
    Stripe test-mode account exists yet (see FE-12 implementation notes),
    so this is what lets banking's E2E consent/link/sync/unlink flow --
    gated by require_active_entitlement -- be exercised in a real browser
    at all. Same purpose as banking's own lapse-consent dev endpoint:
    hidden from the OpenAPI schema, never a real product endpoint, and
    refuses outright in production so it can never become a
    free-entitlement bypass."""
    if settings.is_production:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    row = _get_or_create(db, current_user.tenant_id)
    row.status = "trialing"
    db.commit()
    return _status_response(row)


@router.get("/billing-history", response_model=list[BillingHistoryItem])
def get_billing_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _get_or_create(db, current_user.tenant_id)
    if not row.stripe_customer_id:
        return []

    invoices = stripe.Invoice.list(customer=row.stripe_customer_id, limit=24)
    data = invoices["data"] if isinstance(invoices, dict) else invoices.data
    items = []
    for invoice in data:

        def get(key: str):
            return invoice[key] if isinstance(invoice, dict) else getattr(invoice, key, None)

        items.append(
            BillingHistoryItem(
                id=get("id"),
                amount_due=get("amount_due"),
                amount_paid=get("amount_paid"),
                currency=get("currency"),
                status=get("status"),
                created_at=datetime.fromtimestamp(get("created"), tz=timezone.utc),
                hosted_invoice_url=get("hosted_invoice_url"),
                invoice_pdf_url=get("invoice_pdf"),
            )
        )
    return items

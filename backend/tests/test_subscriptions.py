import os
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

os.environ.setdefault(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(os.path.dirname(__file__), "test_finance.db"),
)

import stripe
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app

# Same import-time reset as test_api.py -- safe because pytest imports all
# test modules (running both files' drop_all/create_all) before executing
# any test function body.
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)


def _signup_login(email: str, full_name: str):
    signup = client.post(
        "/api/auth/signup",
        json={"email": email, "password": "StrongPass123!", "full_name": full_name},
    )
    assert signup.status_code == 201, signup.text

    login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "StrongPass123!"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _tenant_id(headers):
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200, me.text
    return me.json()["tenant_id"]


def _checkout_completed_event(tenant_id, customer_id, subscription_id):
    return {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "mode": "subscription",
                "customer": customer_id,
                "subscription": subscription_id,
                "metadata": {"tenant_id": tenant_id},
            }
        },
    }


def _subscription_updated_event(subscription_id, customer_id, sub_status, **overrides):
    obj = {
        "id": subscription_id,
        "customer": customer_id,
        "status": sub_status,
        "current_period_end": int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp()),
        "trial_end": None,
        "cancel_at_period_end": False,
        "items": {"data": [{"price": {"id": "price_test123"}}]},
    }
    obj.update(overrides)
    return {"type": "customer.subscription.updated", "data": {"object": obj}}


def _invoice_event(event_type, subscription_id, customer_id):
    return {
        "type": event_type,
        "data": {"object": {"subscription": subscription_id, "customer": customer_id}},
    }


def _subscription_deleted_event(subscription_id):
    return {"type": "customer.subscription.deleted", "data": {"object": {"id": subscription_id}}}


def _post_webhook(event):
    with patch("app.routers.stripe_webhook.stripe.Webhook.construct_event", return_value=event):
        return client.post("/api/webhooks/stripe", content=b"{}", headers={"stripe-signature": "test"})


def _start_trial(headers, tenant_id):
    """Drives a tenant from status="none" to "trialing", exactly the way a
    real Checkout + webhook round-trip would, with every Stripe call
    mocked. Returns (customer_id, subscription_id, checkout_call_kwargs)."""
    customer_id = f"cus_{uuid4().hex[:10]}"
    subscription_id = f"sub_{uuid4().hex[:10]}"

    with patch("app.routers.subscriptions.stripe.Customer.create", return_value={"id": customer_id}), patch(
        "app.routers.subscriptions.stripe.checkout.Session.create"
    ) as mock_create:
        mock_create.return_value = {"url": "https://checkout.stripe.com/test-session"}
        response = client.post("/api/subscriptions/checkout-session", headers=headers)
        assert response.status_code == 200, response.text
        checkout_kwargs = mock_create.call_args.kwargs

    trial_end = int((datetime.now(timezone.utc) + timedelta(days=14)).timestamp())
    with patch("app.routers.stripe_webhook.stripe.Subscription.retrieve") as mock_retrieve:
        mock_retrieve.return_value = {
            "id": subscription_id,
            "customer": customer_id,
            "status": "trialing",
            "current_period_end": trial_end,
            "trial_end": trial_end,
            "cancel_at_period_end": False,
            "items": {"data": [{"price": {"id": "price_test123"}}]},
        }
        webhook_response = _post_webhook(_checkout_completed_event(tenant_id, customer_id, subscription_id))
        assert webhook_response.status_code == 200, webhook_response.text

    return customer_id, subscription_id, checkout_kwargs


def test_manual_endpoints_are_never_gated_for_a_brand_new_user():
    # FR-12.1/FR-12.9 regression guard: a tenant that never subscribed must
    # still get full access to every manual finance endpoint.
    headers = _signup_login(f"sub-manual-{uuid4().hex[:8]}@example.com", "Manual User")

    accounts_response = client.get("/api/accounts", headers=headers)
    assert accounts_response.status_code == 200, accounts_response.text

    status_response = client.get("/api/subscriptions/status", headers=headers)
    assert status_response.status_code == 200, status_response.text
    body = status_response.json()
    assert body["status"] == "none"
    assert body["is_entitled"] is False


def test_checkout_session_starts_a_trial_and_status_reflects_it():
    headers = _signup_login(f"sub-checkout-{uuid4().hex[:8]}@example.com", "Checkout User")
    tenant_id = _tenant_id(headers)

    _customer_id, _subscription_id, checkout_kwargs = _start_trial(headers, tenant_id)

    # FR-12.5: the trial length is config-driven (14 by default), not hardcoded.
    assert checkout_kwargs["subscription_data"]["trial_period_days"] == 14

    status_response = client.get("/api/subscriptions/status", headers=headers).json()
    assert status_response["status"] == "trialing"
    assert status_response["is_entitled"] is True


def test_trialing_transitions_to_active_via_subscription_updated_webhook():
    headers = _signup_login(f"sub-active-{uuid4().hex[:8]}@example.com", "Active User")
    tenant_id = _tenant_id(headers)
    customer_id, subscription_id, _ = _start_trial(headers, tenant_id)

    webhook_response = _post_webhook(_subscription_updated_event(subscription_id, customer_id, "active"))
    assert webhook_response.status_code == 200, webhook_response.text

    status_response = client.get("/api/subscriptions/status", headers=headers).json()
    assert status_response["status"] == "active"
    assert status_response["is_entitled"] is True


def test_failed_payment_sets_grace_period_and_notifies_then_cancellation_removes_entitlement():
    headers = _signup_login(f"sub-pastdue-{uuid4().hex[:8]}@example.com", "PastDue User")
    tenant_id = _tenant_id(headers)
    customer_id, subscription_id, _ = _start_trial(headers, tenant_id)
    _post_webhook(_subscription_updated_event(subscription_id, customer_id, "active"))

    past_due_response = _post_webhook(_subscription_updated_event(subscription_id, customer_id, "past_due"))
    assert past_due_response.status_code == 200, past_due_response.text

    status_response = client.get("/api/subscriptions/status", headers=headers).json()
    # FR-12.6: a grace period keeps access while a failed payment retries.
    assert status_response["status"] == "past_due"
    assert status_response["is_entitled"] is True
    assert status_response["grace_period_ends_at"] is not None

    failed_response = _post_webhook(_invoice_event("invoice.payment_failed", subscription_id, customer_id))
    assert failed_response.status_code == 200, failed_response.text

    notifications = client.get("/api/notifications", headers=headers)
    assert notifications.status_code == 200, notifications.text
    assert any(item["kind"] == "billing_payment_failed" for item in notifications.json())

    deleted_response = _post_webhook(_subscription_deleted_event(subscription_id))
    assert deleted_response.status_code == 200, deleted_response.text

    status_response = client.get("/api/subscriptions/status", headers=headers).json()
    assert status_response["status"] == "canceled"
    assert status_response["is_entitled"] is False


def test_cancel_at_period_end_preserves_access_then_reactivation_is_allowed():
    headers = _signup_login(f"sub-cancel-{uuid4().hex[:8]}@example.com", "Cancel User")
    tenant_id = _tenant_id(headers)
    customer_id, subscription_id, _ = _start_trial(headers, tenant_id)
    _post_webhook(_subscription_updated_event(subscription_id, customer_id, "active"))

    with patch("app.routers.subscriptions.stripe.Subscription.modify") as mock_modify:
        cancel_response = client.post("/api/subscriptions/cancel", headers=headers)
    assert cancel_response.status_code == 200, cancel_response.text
    mock_modify.assert_called_once_with(subscription_id, cancel_at_period_end=True)

    body = cancel_response.json()
    # FR-12.8: cancelling preserves access through the paid period -- status
    # must NOT flip immediately, only cancel_at_period_end.
    assert body["cancel_at_period_end"] is True
    assert body["status"] == "active"
    assert body["is_entitled"] is True

    deleted_response = _post_webhook(_subscription_deleted_event(subscription_id))
    assert deleted_response.status_code == 200, deleted_response.text
    status_response = client.get("/api/subscriptions/status", headers=headers).json()
    assert status_response["status"] == "canceled"
    assert status_response["is_entitled"] is False

    with patch(
        "app.routers.subscriptions.stripe.Customer.create", return_value={"id": f"cus_{uuid4().hex[:10]}"}
    ), patch("app.routers.subscriptions.stripe.checkout.Session.create") as mock_create:
        mock_create.return_value = {"url": "https://checkout.stripe.com/reactivate"}
        reactivate_response = client.post("/api/subscriptions/checkout-session", headers=headers)
    assert reactivate_response.status_code == 200, reactivate_response.text


def test_webhook_rejects_invalid_signature():
    with patch(
        "app.routers.stripe_webhook.stripe.Webhook.construct_event",
        side_effect=stripe.error.SignatureVerificationError("bad signature", "sig_header"),
    ):
        response = client.post("/api/webhooks/stripe", content=b"{}", headers={"stripe-signature": "bad"})
    assert response.status_code == 400, response.text


def test_billing_history_maps_stripe_invoices():
    headers = _signup_login(f"sub-history-{uuid4().hex[:8]}@example.com", "History User")
    tenant_id = _tenant_id(headers)
    _start_trial(headers, tenant_id)

    fake_invoice = {
        "id": "in_test1",
        "amount_due": 999,
        "amount_paid": 999,
        "currency": "usd",
        "status": "paid",
        "created": int(datetime.now(timezone.utc).timestamp()),
        "hosted_invoice_url": "https://invoice.stripe.com/i/test",
        "invoice_pdf": "https://invoice.stripe.com/i/test.pdf",
    }
    with patch("app.routers.subscriptions.stripe.Invoice.list", return_value={"data": [fake_invoice]}):
        response = client.get("/api/subscriptions/billing-history", headers=headers)
    assert response.status_code == 200, response.text
    items = response.json()
    assert len(items) == 1
    assert items[0]["amount_due"] == 999
    assert items[0]["hosted_invoice_url"] == "https://invoice.stripe.com/i/test"


def test_checkout_session_rejected_when_already_subscribed():
    headers = _signup_login(f"sub-conflict-{uuid4().hex[:8]}@example.com", "Conflict User")
    tenant_id = _tenant_id(headers)
    _start_trial(headers, tenant_id)

    with patch("app.routers.subscriptions.stripe.checkout.Session.create") as mock_create:
        response = client.post("/api/subscriptions/checkout-session", headers=headers)
    assert response.status_code == 409, response.text
    mock_create.assert_not_called()


def test_entitlement_guard_matrix():
    # No bank router exists yet to exercise require_active_entitlement
    # end-to-end via HTTP (Workstream F is blocked) -- this tests the pure
    # is_entitled() function directly, disclosed rather than skipped.
    from app.entitlements import is_entitled
    from app.models import Subscription

    def make(sub_status, grace_delta=None):
        grace = datetime.now(timezone.utc) + grace_delta if grace_delta is not None else None
        return Subscription(tenant_id="t", status=sub_status, grace_period_ends_at=grace)

    assert is_entitled(None) is False
    assert is_entitled(make("trialing")) is True
    assert is_entitled(make("active")) is True
    assert is_entitled(make("past_due", timedelta(hours=1))) is True
    assert is_entitled(make("past_due", timedelta(hours=-1))) is False
    assert is_entitled(make("past_due")) is False
    assert is_entitled(make("canceled")) is False
    assert is_entitled(make("none")) is False
    assert is_entitled(make("incomplete")) is False

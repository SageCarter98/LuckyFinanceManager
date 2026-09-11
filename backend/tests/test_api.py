import os
from datetime import date
from uuid import uuid4

os.environ.setdefault(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(os.path.dirname(__file__), "test_finance.db"),
)

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


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


def test_signup_login_and_profile():
    email = f"alpha-{uuid4().hex[:8]}@example.com"
    headers = _signup_login(email, "Alpha User")

    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    payload = me.json()
    assert payload["email"] == email
    assert payload["full_name"] == "Alpha User"
    assert payload["timezone"] == "UTC"
    assert payload["preferred_currency"] == "USD"
    assert payload["notification_preferences"] == {}


def test_signup_issues_dev_verification_token_and_verify_email_flow():
    email = f"verify-{uuid4().hex[:8]}@example.com"
    signup = client.post(
        "/api/auth/signup",
        json={"email": email, "password": "StrongPass123!", "full_name": "Verify User"},
    )
    assert signup.status_code == 201, signup.text
    dev_token = signup.json()["dev_verification_token"]
    assert dev_token  # dev/test environment -- never populated in production
    assert signup.json()["email_verified"] is False

    bad = client.post("/api/auth/verify-email", json={"token": "not-a-real-token"})
    assert bad.status_code == 400

    ok = client.post("/api/auth/verify-email", json={"token": dev_token})
    assert ok.status_code == 200, ok.text
    assert ok.json()["email_verified"] is True

    # Single-use: the same token cannot verify twice.
    reused = client.post("/api/auth/verify-email", json={"token": dev_token})
    assert reused.status_code == 400


def test_resend_verification_issues_new_token_and_noops_once_verified():
    email = f"resend-{uuid4().hex[:8]}@example.com"
    headers = _signup_login(email, "Resend User")

    resent = client.post("/api/auth/resend-verification", headers=headers)
    assert resent.status_code == 200, resent.text
    new_token = resent.json()["dev_token"]
    assert new_token

    verify = client.post("/api/auth/verify-email", json={"token": new_token})
    assert verify.status_code == 200, verify.text

    already = client.post("/api/auth/resend-verification", headers=headers)
    assert already.status_code == 200, already.text
    assert already.json()["status"] == "already_verified"
    assert already.json()["dev_token"] is None


def test_forgot_and_reset_password_flow_and_account_enumeration_safety():
    email = f"reset-{uuid4().hex[:8]}@example.com"
    client.post("/api/auth/signup", json={"email": email, "password": "OldPass123!", "full_name": "Reset User"})
    login = client.post("/api/auth/login", json={"email": email, "password": "OldPass123!"})
    old_refresh_token = login.json()["refresh_token"]

    unknown = client.post("/api/auth/forgot-password", json={"email": "no-such-user@example.com"})
    assert unknown.status_code == 200, unknown.text
    assert unknown.json()["dev_token"] is None  # same shape as a real account -- no enumeration signal

    known = client.post("/api/auth/forgot-password", json={"email": email})
    assert known.status_code == 200, known.text
    reset_token = known.json()["dev_token"]
    assert reset_token

    reset = client.post("/api/auth/reset-password", json={"token": reset_token, "new_password": "NewPass456!"})
    assert reset.status_code == 200, reset.text

    old_password_fails = client.post("/api/auth/login", json={"email": email, "password": "OldPass123!"})
    assert old_password_fails.status_code == 401

    new_password_works = client.post("/api/auth/login", json={"email": email, "password": "NewPass456!"})
    assert new_password_works.status_code == 200

    # The reset revoked every pre-existing refresh token.
    old_session_dead = client.post("/api/auth/refresh", json={"refresh_token": old_refresh_token})
    assert old_session_dead.status_code == 401

    # Reset tokens are single-use.
    reused = client.post("/api/auth/reset-password", json={"token": reset_token, "new_password": "AnotherPass789!"})
    assert reused.status_code == 400


def test_update_profile_partial_and_email_is_not_editable():
    email = f"profile-{uuid4().hex[:8]}@example.com"
    headers = _signup_login(email, "Original Name")

    updated = client.put(
        "/api/auth/me",
        headers=headers,
        json={"full_name": "New Name", "timezone": "America/New_York"},
    )
    assert updated.status_code == 200, updated.text
    payload = updated.json()
    assert payload["full_name"] == "New Name"
    assert payload["timezone"] == "America/New_York"
    assert payload["preferred_currency"] == "USD"  # untouched by a partial update
    assert payload["email"] == email  # UserUpdate has no email field at all

    prefs = client.put(
        "/api/auth/me",
        headers=headers,
        json={"notification_preferences": {"bill_due": False, "goal_progress": True}},
    )
    assert prefs.status_code == 200, prefs.text
    assert prefs.json()["notification_preferences"] == {"bill_due": False, "goal_progress": True}
    assert prefs.json()["full_name"] == "New Name"  # earlier update persisted


def test_refresh_rotates_token_and_old_one_is_rejected():
    email = f"refresh-{uuid4().hex[:8]}@example.com"
    client.post("/api/auth/signup", json={"email": email, "password": "StrongPass123!", "full_name": "Refresh User"})
    login = client.post("/api/auth/login", json={"email": email, "password": "StrongPass123!"})
    assert login.status_code == 200, login.text
    original_refresh = login.json()["refresh_token"]

    refreshed = client.post("/api/auth/refresh", json={"refresh_token": original_refresh})
    assert refreshed.status_code == 200, refreshed.text
    new_access = refreshed.json()["access_token"]
    new_refresh = refreshed.json()["refresh_token"]
    assert new_refresh != original_refresh

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_access}"})
    assert me.status_code == 200

    # The rotated-out token must not be usable again (replay protection).
    reused = client.post("/api/auth/refresh", json={"refresh_token": original_refresh})
    assert reused.status_code == 401


def test_access_token_cannot_be_used_as_refresh_token_and_vice_versa():
    email = f"tokentype-{uuid4().hex[:8]}@example.com"
    client.post("/api/auth/signup", json={"email": email, "password": "StrongPass123!", "full_name": "Token Type"})
    login = client.post("/api/auth/login", json={"email": email, "password": "StrongPass123!"})
    access_token = login.json()["access_token"]
    refresh_token = login.json()["refresh_token"]

    misuse_as_refresh = client.post("/api/auth/refresh", json={"refresh_token": access_token})
    assert misuse_as_refresh.status_code == 401

    misuse_as_access = client.get("/api/auth/me", headers={"Authorization": f"Bearer {refresh_token}"})
    assert misuse_as_access.status_code == 401


def test_logout_revokes_refresh_token():
    email = f"logout-{uuid4().hex[:8]}@example.com"
    client.post("/api/auth/signup", json={"email": email, "password": "StrongPass123!", "full_name": "Logout User"})
    login = client.post("/api/auth/login", json={"email": email, "password": "StrongPass123!"})
    refresh_token = login.json()["refresh_token"]

    logout = client.post("/api/auth/logout", json={"refresh_token": refresh_token})
    assert logout.status_code == 204

    blocked = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert blocked.status_code == 401

    # Logging out again (or with a token that was never valid) still succeeds
    # from the client's perspective -- the end state ("not logged in") holds.
    repeat = client.post("/api/auth/logout", json={"refresh_token": refresh_token})
    assert repeat.status_code == 204


def test_delete_me_soft_deletes_and_blocks_further_access():
    email = f"delete-{uuid4().hex[:8]}@example.com"
    headers = _signup_login(email, "Delete User")

    delete = client.delete("/api/auth/me", headers=headers)
    assert delete.status_code == 204

    blocked_me = client.get("/api/auth/me", headers=headers)
    assert blocked_me.status_code == 401

    blocked_login = client.post("/api/auth/login", json={"email": email, "password": "StrongPass123!"})
    assert blocked_login.status_code == 401


def test_transaction_list_pagination():
    email = f"paginate-{uuid4().hex[:8]}@example.com"
    headers = _signup_login(email, "Paginate User")

    account = client.post(
        "/api/accounts",
        headers=headers,
        json={"name": "Checking", "account_type": "checking", "native_currency": "USD"},
    )
    account_id = account.json()["id"]

    for i in range(5):
        client.post(
            "/api/transactions",
            headers=headers,
            json={
                "account_id": account_id,
                "category_id": None,
                "transaction_type": "expense",
                "amount": 1 + i,
                "currency": "USD",
                "transaction_date": f"2026-01-{i + 1:02d}",
                "note": f"txn-{i}",
            },
        )

    page1 = client.get("/api/transactions", headers=headers, params={"limit": 2, "offset": 0})
    assert page1.status_code == 200, page1.text
    assert len(page1.json()) == 2

    page2 = client.get("/api/transactions", headers=headers, params={"limit": 2, "offset": 2})
    assert len(page2.json()) == 2

    page3 = client.get("/api/transactions", headers=headers, params={"limit": 2, "offset": 4})
    assert len(page3.json()) == 1

    # No overlap between pages.
    ids_seen = {t["id"] for t in page1.json() + page2.json() + page3.json()}
    assert len(ids_seen) == 5

    over_limit = client.get("/api/transactions", headers=headers, params={"limit": 500})
    assert over_limit.status_code == 422  # limit is capped at 200 by the endpoint


def test_cross_tenant_account_visibility_and_transaction_creation():
    tenant_a_email = f"tenant-a-{uuid4().hex[:8]}@example.com"
    tenant_b_email = f"tenant-b-{uuid4().hex[:8]}@example.com"

    headers_a = _signup_login(tenant_a_email, "Tenant A")
    headers_b = _signup_login(tenant_b_email, "Tenant B")

    account_a = client.post(
        "/api/accounts",
        headers=headers_a,
        json={"name": "Checking", "account_type": "checking", "native_currency": "USD"},
    )
    assert account_a.status_code == 201, account_a.text
    account_a_id = account_a.json()["id"]

    account_b_list = client.get("/api/accounts", headers=headers_b)
    assert account_b_list.status_code == 200
    assert account_b_list.json() == []

    category_a = client.post(
        "/api/categories",
        headers=headers_a,
        json={"name": "Groceries", "monthly_limit": 500},
    )
    assert category_a.status_code == 201, category_a.text

    tx = client.post(
        "/api/transactions",
        headers=headers_a,
        json={
            "account_id": account_a_id,
            "category_id": category_a.json()["id"],
            "transaction_type": "expense",
            "amount": 25.5,
            "currency": "USD",
            "transaction_date": "2026-01-05",
            "note": "Groceries",
        },
    )
    assert tx.status_code == 201, tx.text
    assert tx.json()["amount"] == "25.50"

    account_after = client.get(f"/api/accounts/{account_a_id}", headers=headers_a)
    assert account_after.status_code == 200
    assert account_after.json()["current_balance"] == "-25.50"

    tenant_b_tx = client.get("/api/transactions", headers=headers_b)
    assert tenant_b_tx.status_code == 200
    assert tenant_b_tx.json() == []


def test_recurring_bill_generation_creates_transaction_and_notification():
    email = f"bill-{uuid4().hex[:8]}@example.com"
    headers = _signup_login(email, "Bill User")

    account = client.post(
        "/api/accounts",
        headers=headers,
        json={"name": "Bills", "account_type": "checking", "native_currency": "USD"},
    )
    assert account.status_code == 201, account.text
    account_id = account.json()["id"]

    bill = client.post(
        "/api/recurring-bills",
        headers=headers,
        json={
            "name": "Internet",
            "account_id": account_id,
            "amount": 49.99,
            "currency": "USD",
            "frequency": "monthly",
            "due_day": date.today().day,
        },
    )
    assert bill.status_code == 201, bill.text

    result = client.post("/api/recurring-bills/generate-due", headers=headers)
    assert result.status_code == 200, result.text
    assert result.json()["generated"] >= 1

    notifications = client.get("/api/notifications", headers=headers)
    assert notifications.status_code == 200, notifications.text
    assert any(item["kind"] == "bill_generated" for item in notifications.json())


def test_recurring_bill_generation_respects_disabled_notification_preference():
    email = f"billquiet-{uuid4().hex[:8]}@example.com"
    headers = _signup_login(email, "Quiet Bill User")

    prefs = client.put(
        "/api/auth/me",
        headers=headers,
        json={"notification_preferences": {"bill_generated": False}},
    )
    assert prefs.status_code == 200, prefs.text

    account = client.post(
        "/api/accounts",
        headers=headers,
        json={"name": "Bills", "account_type": "checking", "native_currency": "USD"},
    )
    account_id = account.json()["id"]

    bill = client.post(
        "/api/recurring-bills",
        headers=headers,
        json={
            "name": "Water",
            "account_id": account_id,
            "amount": 19.99,
            "currency": "USD",
            "frequency": "monthly",
            "due_day": date.today().day,
        },
    )
    assert bill.status_code == 201, bill.text

    result = client.post("/api/recurring-bills/generate-due", headers=headers)
    assert result.status_code == 200, result.text
    # The transaction still generates -- only the notification is suppressed.
    assert result.json()["generated"] >= 1

    notifications = client.get("/api/notifications", headers=headers)
    assert notifications.status_code == 200, notifications.text
    assert not any(item["kind"] == "bill_generated" for item in notifications.json())


def test_admin_can_lookup_tenant_by_email():
    from app.database import SessionLocal
    from app.models import User

    support_email = f"support-{uuid4().hex[:8]}@example.com"
    support_headers = _signup_login(support_email, "Support User")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == support_email.lower()).first()
        assert user is not None
        user.role = "admin"
        db.commit()
    finally:
        db.close()

    # No reason -> rejected before any lookup happens.
    missing_reason = client.get("/api/admin/tenant/search", headers=support_headers, params={"email": support_email})
    assert missing_reason.status_code == 422

    result = client.get(
        "/api/admin/tenant/search",
        headers=support_headers,
        params={"email": support_email, "reason": "verifying own signup for this test"},
    )
    assert result.status_code == 200, result.text
    payload = result.json()
    # Identifiers are masked -- never the raw, searchable value back over the wire.
    assert payload["email"] == "s***@example.com"
    assert payload["full_name"] == "S*** U***"
    assert payload["role"] == "admin"

    block = client.get(
        "/api/admin/tenant/search",
        headers={"Authorization": "Bearer invalid"},
        params={"email": support_email, "reason": "should never reach the lookup"},
    )
    assert block.status_code == 401

    # Every access request is audited, hit or miss, with the raw (unmasked)
    # target and the reason given -- the point of an audit trail is that it
    # doesn't share the same masking as what staff see on screen.
    db = SessionLocal()
    try:
        from app.models import AdminAccessLog

        logs = db.query(AdminAccessLog).filter(AdminAccessLog.target_email == support_email.lower()).all()
        assert len(logs) == 1
        assert logs[0].action == "tenant_search"
        assert logs[0].reason == "verifying own signup for this test"
        assert logs[0].target_user_id is not None
    finally:
        db.close()

    miss = client.get(
        "/api/admin/tenant/search",
        headers=support_headers,
        params={"email": "no-such-user@example.com", "reason": "confirming 404 path is audited too"},
    )
    assert miss.status_code == 404

    db = SessionLocal()
    try:
        from app.models import AdminAccessLog

        miss_log = (
            db.query(AdminAccessLog).filter(AdminAccessLog.target_email == "no-such-user@example.com").first()
        )
        assert miss_log is not None
        assert miss_log.target_user_id is None
    finally:
        db.close()


def test_admin_tenant_summary_requires_reason_and_is_audited():
    from app.database import SessionLocal
    from app.models import AdminAccessLog, User

    support_email = f"support-{uuid4().hex[:8]}@example.com"
    support_headers = _signup_login(support_email, "Support Two")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == support_email.lower()).first()
        assert user is not None
        user.role = "admin"
        db.commit()
        tenant_id = user.tenant_id
    finally:
        db.close()

    missing_reason = client.get(f"/api/admin/tenant/{tenant_id}/summary", headers=support_headers)
    assert missing_reason.status_code == 422

    result = client.get(
        f"/api/admin/tenant/{tenant_id}/summary",
        headers=support_headers,
        params={"reason": "checking own tenant summary for this test"},
    )
    assert result.status_code == 200, result.text
    assert result.json()["tenant_id"] == tenant_id
    assert result.json()["user_count"] == 1

    db = SessionLocal()
    try:
        log = (
            db.query(AdminAccessLog)
            .filter(AdminAccessLog.action == "tenant_summary", AdminAccessLog.target_tenant_id == tenant_id)
            .first()
        )
        assert log is not None
        assert log.reason == "checking own tenant summary for this test"
    finally:
        db.close()

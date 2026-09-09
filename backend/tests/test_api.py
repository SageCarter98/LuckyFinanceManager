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


def test_admin_can_lookup_tenant_by_email():
    from sqlalchemy.orm import Session

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

    result = client.get("/api/admin/tenant/search", headers=support_headers, params={"email": support_email})
    assert result.status_code == 200, result.text
    payload = result.json()
    assert payload["email"] == support_email.lower()
    assert payload["role"] == "admin"

    block = client.get("/api/admin/tenant/search", headers={"Authorization": "Bearer invalid"}, params={"email": support_email})
    assert block.status_code == 401

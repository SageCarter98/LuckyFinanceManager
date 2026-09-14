import os

os.environ.setdefault(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(os.path.dirname(__file__), "test_finance.db"),
)

from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import Subscription

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)


def _signup_login(email: str, full_name: str = "Test User"):
    signup = client.post(
        "/api/auth/signup",
        json={"email": email, "password": "StrongPass123!", "full_name": full_name},
    )
    assert signup.status_code == 201, signup.text

    login = client.post("/api/auth/login", json={"email": email, "password": "StrongPass123!"})
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _tenant_id(headers):
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200, me.text
    return me.json()["tenant_id"]


def _grant_entitlement(tenant_id: str):
    with SessionLocal() as db:
        db.add(Subscription(tenant_id=tenant_id, status="trialing", trial_end=None))
        db.commit()


def test_banking_requires_active_entitlement():
    headers = _signup_login("nobank@example.com")
    resp = client.get("/api/banking/accounts", headers=headers)
    assert resp.status_code == 402, resp.text


def test_link_list_detail_and_gross_balance():
    headers = _signup_login("banked@example.com")
    tenant_id = _tenant_id(headers)
    _grant_entitlement(tenant_id)

    institutions = client.get("/api/banking/institutions", headers=headers)
    assert institutions.status_code == 200, institutions.text
    assert len(institutions.json()) >= 1
    institution_name = institutions.json()[0]

    linked = client.post("/api/banking/accounts", json={"institution_name": institution_name}, headers=headers)
    assert linked.status_code == 201, linked.text
    body = linked.json()
    assert body["institution_name"] == institution_name
    assert body["provider"] == "stub-sandbox-connector"
    assert len(body["account_number_last4"]) == 4
    # Never a real credential/token anywhere in the response.
    assert "external_account_ref" not in body
    assert "access_token" not in body

    listed = client.get("/api/banking/accounts", headers=headers)
    assert listed.status_code == 200, listed.text
    assert len(listed.json()) == 1

    detail = client.get(f"/api/banking/accounts/{body['id']}", headers=headers)
    assert detail.status_code == 200, detail.text
    assert len(detail.json()["recent_transactions"]) > 0

    gross = client.get("/api/banking/gross-balance", headers=headers)
    assert gross.status_code == 200, gross.text
    gross_body = gross.json()
    assert gross_body["display_currency"] == "USD"
    assert len(gross_body["accounts"]) == 1
    assert gross_body["accounts"][0]["linked_account_id"] == body["id"]
    assert "rates_as_of" in gross_body


def test_unlink_purges_transactions():
    headers = _signup_login("unlink@example.com")
    tenant_id = _tenant_id(headers)
    _grant_entitlement(tenant_id)

    institution_name = client.get("/api/banking/institutions", headers=headers).json()[0]
    linked = client.post("/api/banking/accounts", json={"institution_name": institution_name}, headers=headers)
    account_id = linked.json()["id"]

    unlink = client.delete(f"/api/banking/accounts/{account_id}", headers=headers)
    assert unlink.status_code == 204, unlink.text

    still_there = client.get(f"/api/banking/accounts/{account_id}", headers=headers)
    assert still_there.status_code == 404, still_there.text


def test_lapsed_consent_blocks_sync_until_reauthorized():
    headers = _signup_login("lapsed@example.com")
    tenant_id = _tenant_id(headers)
    _grant_entitlement(tenant_id)

    institution_name = client.get("/api/banking/institutions", headers=headers).json()[0]
    linked = client.post("/api/banking/accounts", json={"institution_name": institution_name}, headers=headers)
    account_id = linked.json()["id"]

    lapse = client.post(f"/api/banking/accounts/{account_id}/lapse-consent", headers=headers)
    assert lapse.status_code == 200, lapse.text
    assert lapse.json()["consent_status"] == "lapsed"

    sync_blocked = client.post(f"/api/banking/accounts/{account_id}/sync", headers=headers)
    assert sync_blocked.status_code == 409, sync_blocked.text

    reauth = client.post(f"/api/banking/accounts/{account_id}/reauthorize", headers=headers)
    assert reauth.status_code == 200, reauth.text
    assert reauth.json()["consent_status"] == "active"

    sync_ok = client.post(f"/api/banking/accounts/{account_id}/sync", headers=headers)
    assert sync_ok.status_code == 200, sync_ok.text


def test_cross_tenant_linked_account_is_not_found():
    headers_a = _signup_login("tenant-a@example.com")
    tenant_a = _tenant_id(headers_a)
    _grant_entitlement(tenant_a)
    institution_name = client.get("/api/banking/institutions", headers=headers_a).json()[0]
    linked = client.post("/api/banking/accounts", json={"institution_name": institution_name}, headers=headers_a)
    account_id = linked.json()["id"]

    headers_b = _signup_login("tenant-b@example.com")
    tenant_b = _tenant_id(headers_b)
    _grant_entitlement(tenant_b)

    cross = client.get(f"/api/banking/accounts/{account_id}", headers=headers_b)
    assert cross.status_code == 404, cross.text

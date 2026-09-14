import logging
from datetime import datetime, timedelta, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.rate_limit import rate_limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_opaque_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.database import get_db
from app.dependencies import get_current_user
from app.models import RefreshToken, Subscription, Tenant, User
from app.tenant import apply_tenant_context
from app.schemas import (
    DevOnlyTokenResponse,
    ForgotPasswordRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenPair,
    UserCreate,
    UserLogin,
    UserRead,
    UserUpdate,
    VerifyEmailRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()
stripe.api_key = settings.stripe_secret_key
logger = logging.getLogger("app.auth")

# Per-IP, per-route rate limits (Privacy_Impact_Assessment.md P3). Values
# are a deliberate floor, not a tuned production figure: generous enough
# not to lock out a real user retrying a typo'd password, tight enough to
# make scripted credential stuffing slow and noisy rather than free.
_signup_limit = rate_limiter("signup", max_attempts=10)
_login_limit = rate_limiter("login", max_attempts=10)
_refresh_limit = rate_limiter("refresh", max_attempts=30)
_forgot_password_limit = rate_limiter("forgot-password", max_attempts=5)

VERIFICATION_TOKEN_TTL = timedelta(hours=24)
RESET_TOKEN_TTL = timedelta(hours=1)


def _aware(value: datetime | None) -> datetime | None:
    """SQLite (used in tests/dev) round-trips DateTime columns as naive;
    Postgres (production) can return either depending on driver config --
    normalize to UTC-aware before any comparison against datetime.now(utc)."""
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


def _issue_verification_token(user: User) -> str:
    raw = generate_opaque_token()
    user.verification_token_hash = hash_token(raw)
    user.verification_expires_at = datetime.now(timezone.utc) + VERIFICATION_TOKEN_TTL
    return raw


def _issue_reset_token(user: User) -> str:
    raw = generate_opaque_token()
    user.reset_token_hash = hash_token(raw)
    user.reset_expires_at = datetime.now(timezone.utc) + RESET_TOKEN_TTL
    return raw


def _issue_token_pair(db: Session, user: User) -> TokenPair:
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            tenant_id=user.tenant_id,
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    db.commit()
    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/signup", response_model=UserRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(_signup_limit)])
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    tenant = Tenant()
    db.add(tenant)
    db.flush()

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        tenant_id=tenant.id,
        role="user",
        email_verified=False,
    )
    db.add(user)
    db.flush()
    raw_verification_token = _issue_verification_token(user)
    db.commit()

    response = UserRead.model_validate(user)
    # No email provider is chosen yet (open decision) -- this is the only
    # way to actually exercise verification today, and it's fail-closed:
    # dev_verification_token is never populated when is_production is True.
    if not settings.is_production:
        response.dev_verification_token = raw_verification_token
    return response


@router.post("/login", response_model=TokenPair, dependencies=[Depends(_login_limit)])
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    # Same "Invalid credentials" message for wrong password, unknown email, and a
    # deactivated/deleted account -- distinguishing them would both leak whether an
    # email is registered and confirm to an attacker that an account was deleted.
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        logger.warning("login_failed", extra={"extra_fields": {"email": payload.email.lower()}})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # refresh_tokens is RLS-protected (tenant_isolation_refresh_tokens, FORCE
    # ROW LEVEL SECURITY) -- unlike authenticated routes, login has no prior
    # get_current_user call to set this, so the insert below would otherwise
    # violate the policy against a real Postgres database.
    apply_tenant_context(db, user.tenant_id)
    return _issue_token_pair(db, user)


@router.post("/refresh", response_model=TokenPair, dependencies=[Depends(_refresh_limit)])
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        claims = decode_token(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

    if claims.get("type") != "refresh" or not claims.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # users has no RLS policy, so this lookup is safe before tenant context
    # exists. It has to come before the refresh_tokens query below: that
    # table is RLS-protected, and without app.tenant_id set first, its
    # USING clause compares tenant_id to NULL and silently returns zero
    # rows -- every refresh would 401 as "Invalid refresh token" against a
    # real Postgres database, valid token or not.
    user = db.query(User).filter(User.id == claims["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    apply_tenant_context(db, user.tenant_id)

    token_hash = hash_token(payload.refresh_token)
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    now = datetime.now(timezone.utc)
    expires_at = _aware(record.expires_at) if record else None
    if not record or record.revoked_at is not None or expires_at < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # Rotate: the presented refresh token is single-use, closing the replay
    # window a static refresh token would otherwise leave open.
    record.revoked_at = now
    return _issue_token_pair(db, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshRequest, db: Session = Depends(get_db)):
    # refresh_tokens is RLS-protected; without tenant context set first, the
    # lookup below silently matches zero rows against a real Postgres
    # database -- logout would never actually revoke anything, and a token
    # presented as "logged out" would stay valid until natural expiry. Best
    # effort only: an undecodable or unknown-user token just skips this, the
    # same as it always has -- logout still always succeeds for the client.
    try:
        claims = decode_token(payload.refresh_token)
    except ValueError:
        claims = None
    if claims and claims.get("sub"):
        user = db.query(User).filter(User.id == claims["sub"]).first()
        if user:
            apply_tenant_context(db, user.tenant_id)

    token_hash = hash_token(payload.refresh_token)
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if record and record.revoked_at is None:
        record.revoked_at = datetime.now(timezone.utc)
        db.commit()
    # Always succeeds from the client's perspective -- an already-invalid or
    # unknown token still means "not logged in", which is the desired end state.
    return None


@router.post("/verify-email", response_model=UserRead)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    token_hash = hash_token(payload.token)
    user = db.query(User).filter(User.verification_token_hash == token_hash).first()
    expires_at = _aware(user.verification_expires_at) if user else None
    if not user or expires_at is None or expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token")

    user.email_verified = True
    user.verification_token_hash = None
    user.verification_expires_at = None
    db.commit()
    return user


@router.post("/resend-verification", response_model=DevOnlyTokenResponse)
def resend_verification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.email_verified:
        return DevOnlyTokenResponse(status="already_verified")

    raw = _issue_verification_token(current_user)
    db.commit()
    return DevOnlyTokenResponse(dev_token=raw if not settings.is_production else None)


@router.post("/forgot-password", response_model=DevOnlyTokenResponse, dependencies=[Depends(_forgot_password_limit)])
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    raw: str | None = None
    # Always returns the same shape whether or not the account exists or is
    # active -- matching login's own account-enumeration-safe precedent.
    if user and user.is_active:
        raw = _issue_reset_token(user)
        db.commit()
    return DevOnlyTokenResponse(dev_token=raw if (raw and not settings.is_production) else None)


@router.post("/reset-password", response_model=DevOnlyTokenResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hash_token(payload.token)
    user = db.query(User).filter(User.reset_token_hash == token_hash).first()
    expires_at = _aware(user.reset_expires_at) if user else None
    if not user or expires_at is None or expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    now = datetime.now(timezone.utc)
    user.password_hash = hash_password(payload.new_password)
    user.reset_token_hash = None
    user.reset_expires_at = None
    # A password reset is exactly the kind of security-sensitive event that
    # should force re-authentication everywhere, not just on this device.
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.revoked_at.is_(None),
    ).update({"revoked_at": now})
    db.commit()
    return DevOnlyTokenResponse(status="password_reset")


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(current_user, field, value)
    db.commit()
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete only: sets deleted_at/is_active per the SRS's 30-day
    retention rule (data model section 5). The actual purge after 30 days is
    a background job that doesn't exist yet (needs the still-open
    Celery/APScheduler decision) -- deliberately not built here."""
    now = datetime.now(timezone.utc)

    # Deactivating the tenant does not, on its own, stop Stripe from billing
    # it -- the two are independent systems. Cancel immediately (not
    # cancel_at_period_end, unlike the user-initiated /subscriptions/cancel
    # flow: there is no "rest of the paid period" to honor for an account
    # that no longer exists). Only ever reached for a tenant that actually
    # has a live subscription, so this never calls Stripe for the common
    # free-tier deletion path.
    subscription = db.query(Subscription).filter(Subscription.tenant_id == current_user.tenant_id).first()
    if subscription and subscription.stripe_subscription_id and subscription.status in ("trialing", "active"):
        stripe.Subscription.cancel(subscription.stripe_subscription_id)
        subscription.status = "canceled"
        subscription.canceled_at = now

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    tenant.deleted_at = now
    tenant.is_active = False
    current_user.is_active = False
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.revoked_at.is_(None),
    ).update({"revoked_at": now})
    db.commit()
    return None

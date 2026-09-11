from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import decode_token
from app.database import get_db
from app.entitlements import is_entitled
from app.models import Subscription, User
from app.tenant import apply_admin_bypass, apply_tenant_context

bearer_scheme = HTTPBearer(auto_error=False)
settings = get_settings()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = credentials.credentials
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    subject = payload.get("sub")
    if not subject or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.id == subject).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    apply_tenant_context(db, user.tenant_id)
    return user


def get_current_admin_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    # FastAPI caches Depends(get_db) per request, so this is the same
    # session get_current_user already pinned to current_user.tenant_id --
    # widening it here only affects requests that reach an admin-gated route.
    apply_admin_bypass(db)
    return current_user


def require_active_entitlement(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """FR-12.2/FR-12.9: gates subscription-only features (bank-linking,
    Gross Balance). Intentionally unattached to any router today -- no
    bank router exists yet in this codebase (Workstream F is blocked
    pending legal/provider approval). Built now so that router can add
    `Depends(require_active_entitlement)` with zero new design work."""
    subscription = db.query(Subscription).filter(Subscription.tenant_id == current_user.tenant_id).first()
    if not is_entitled(subscription):
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Active subscription or trial required")
    return current_user

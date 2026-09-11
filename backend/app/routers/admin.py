from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.masking import mask_email, mask_name
from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models import Account, AdminAccessLog, Category, Notification, RecurringBill, SavingsGoal, Transaction, User
from app.schemas import AdminTenantSearchResult, AdminTenantSummary

router = APIRouter(prefix="/admin", tags=["admin"])

REASON_MIN_LENGTH = 3
REASON_MAX_LENGTH = 500


def _log_access(
    db: Session,
    *,
    admin_user_id: str,
    action: str,
    reason: str,
    target_email: str | None = None,
    target_user_id: str | None = None,
    target_tenant_id: str | None = None,
) -> None:
    db.add(
        AdminAccessLog(
            admin_user_id=admin_user_id,
            action=action,
            reason=reason,
            target_email=target_email,
            target_user_id=target_user_id,
            target_tenant_id=target_tenant_id,
        )
    )
    db.commit()


@router.get("/tenant/search", response_model=AdminTenantSearchResult)
def search_tenant_by_email(
    email: str = Query(..., description="Search by exact email address"),
    reason: str = Query(..., min_length=REASON_MIN_LENGTH, max_length=REASON_MAX_LENGTH),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    user = db.query(User).filter(User.email == email.lower()).first()

    # Logged before the 404 branch -- a miss is still an access request
    # ("who looked up which email, and why") that the acceptance criterion
    # requires a record of, not just successful lookups.
    _log_access(
        db,
        admin_user_id=current_user.id,
        action="tenant_search",
        reason=reason,
        target_email=email.lower(),
        target_user_id=user.id if user else None,
        target_tenant_id=user.tenant_id if user else None,
    )

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "user_id": user.id,
        "email": mask_email(user.email),
        "full_name": mask_name(user.full_name),
        "tenant_id": user.tenant_id,
        "role": user.role,
        "email_verified": user.email_verified,
        "account_count": db.query(func.count(Account.id)).filter(Account.tenant_id == user.tenant_id).scalar() or 0,
        "category_count": db.query(func.count(Category.id)).filter(Category.tenant_id == user.tenant_id).scalar() or 0,
        "transaction_count": db.query(func.count(Transaction.id)).filter(Transaction.tenant_id == user.tenant_id).scalar() or 0,
        "recurring_bill_count": db.query(func.count(RecurringBill.id)).filter(RecurringBill.tenant_id == user.tenant_id).scalar() or 0,
        "savings_goal_count": db.query(func.count(SavingsGoal.id)).filter(SavingsGoal.tenant_id == user.tenant_id).scalar() or 0,
        "notification_count": db.query(func.count(Notification.id)).filter(Notification.tenant_id == user.tenant_id).scalar() or 0,
    }


@router.get("/tenant/{tenant_id}/summary", response_model=AdminTenantSummary)
def tenant_summary(
    tenant_id: str,
    reason: str = Query(..., min_length=REASON_MIN_LENGTH, max_length=REASON_MAX_LENGTH),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    user = db.query(User).filter(User.tenant_id == tenant_id).first()

    _log_access(
        db,
        admin_user_id=current_user.id,
        action="tenant_summary",
        reason=reason,
        target_tenant_id=tenant_id,
        target_user_id=user.id if user else None,
    )

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    return {
        "tenant_id": tenant_id,
        "user_count": db.query(func.count(User.id)).filter(User.tenant_id == tenant_id).scalar() or 0,
        "account_count": db.query(func.count(Account.id)).filter(Account.tenant_id == tenant_id).scalar() or 0,
        "category_count": db.query(func.count(Category.id)).filter(Category.tenant_id == tenant_id).scalar() or 0,
        "transaction_count": db.query(func.count(Transaction.id)).filter(Transaction.tenant_id == tenant_id).scalar() or 0,
        "notification_count": db.query(func.count(Notification.id)).filter(Notification.tenant_id == tenant_id).scalar() or 0,
    }

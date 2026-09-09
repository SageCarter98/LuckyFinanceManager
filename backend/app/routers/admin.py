from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin_user
from app.models import Account, Category, Notification, RecurringBill, SavingsGoal, Transaction, User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/tenant/search")
def search_tenant_by_email(
    email: str = Query(..., description="Search by exact email address"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    tenant_summary = {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
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
    return tenant_summary


@router.get("/tenant/{tenant_id}/summary")
def tenant_summary(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    user = db.query(User).filter(User.tenant_id == tenant_id).first()
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

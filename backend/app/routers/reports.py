from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Account, Category, Transaction, User
from app.schemas import IncomeExpenseSummary, NetWorthSummary, SpendingByCategoryItem

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/spending-by-category", response_model=list[SpendingByCategoryItem])
def spending_by_category(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Category.name.label("category"), func.sum(Transaction.amount).label("total"))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.tenant_id == current_user.tenant_id, Transaction.transaction_type == "expense")
    )
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    results = query.group_by(Category.name).all()
    return [SpendingByCategoryItem(category=row.category, total=row.total or Decimal("0.00")) for row in results]


@router.get("/income-vs-expense", response_model=IncomeExpenseSummary)
def income_vs_expense(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Transaction).filter(Transaction.tenant_id == current_user.tenant_id)
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)

    income = query.filter(Transaction.transaction_type == "income").with_entities(func.coalesce(func.sum(Transaction.amount), Decimal("0.00"))).scalar() or Decimal("0.00")
    expenses = query.filter(Transaction.transaction_type == "expense").with_entities(func.coalesce(func.sum(Transaction.amount), Decimal("0.00"))).scalar() or Decimal("0.00")
    return IncomeExpenseSummary(income=income, expenses=expenses, net=(income - expenses))


@router.get("/net-worth", response_model=NetWorthSummary)
def net_worth(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total = (
        db.query(func.coalesce(func.sum(Account.current_balance), Decimal("0.00")))
        .filter(Account.tenant_id == current_user.tenant_id)
        .scalar()
        or Decimal("0.00")
    )
    return NetWorthSummary(total=total)

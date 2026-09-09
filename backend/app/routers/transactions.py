from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Account, Category, Transaction, User
from app.schemas import (
    IncomeExpenseSummary,
    SpendingByCategoryItem,
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _apply_balance_delta(account: Account, transaction_type: str, amount: Decimal):
    if transaction_type == "expense":
        account.current_balance -= amount
    elif transaction_type == "income":
        account.current_balance += amount


def _valid_account(
    db: Session,
    current_user: User,
    account_id: str,
):
    account = (
        db.query(Account)
        .filter(Account.id == account_id, Account.tenant_id == current_user.tenant_id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


def _valid_category(
    db: Session,
    current_user: User,
    category_id: str | None,
):
    if category_id is None:
        return None
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.tenant_id == current_user.tenant_id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


@router.get("", response_model=list[TransactionRead])
def list_transactions(
    account_id: str | None = None,
    category_id: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Transaction).filter(Transaction.tenant_id == current_user.tenant_id)
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    return (
        query.order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = _valid_account(db, current_user, payload.account_id)
    _valid_category(db, current_user, payload.category_id)
    txn = Transaction(
        tenant_id=current_user.tenant_id,
        account_id=account.id,
        category_id=payload.category_id,
        transaction_type=payload.transaction_type,
        amount=payload.amount,
        currency=payload.currency,
        transaction_date=payload.transaction_date or date.today(),
        note=payload.note,
    )
    _apply_balance_delta(account, payload.transaction_type, payload.amount)
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


@router.get("/{transaction_id}", response_model=TransactionRead)
def get_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.tenant_id == current_user.tenant_id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return txn


@router.put("/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: str,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.tenant_id == current_user.tenant_id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    account = _valid_account(db, current_user, payload.account_id or txn.account_id)
    _valid_category(db, current_user, payload.category_id if payload.category_id is not None else txn.category_id)

    original_type = txn.transaction_type
    original_amount = txn.amount
    _apply_balance_delta(account, original_type, -original_amount)

    if payload.account_id is not None and payload.account_id != txn.account_id:
        old_account = _valid_account(db, current_user, txn.account_id)
        _apply_balance_delta(old_account, original_type, -original_amount)
        account = _valid_account(db, current_user, payload.account_id)
        txn.account_id = payload.account_id

    if payload.transaction_type is not None:
        txn.transaction_type = payload.transaction_type
    if payload.amount is not None:
        txn.amount = payload.amount
    if payload.currency is not None:
        txn.currency = payload.currency
    if payload.transaction_date is not None:
        txn.transaction_date = payload.transaction_date
    if payload.note is not None:
        txn.note = payload.note
    if payload.category_id is not None:
        txn.category_id = payload.category_id

    _apply_balance_delta(account, txn.transaction_type, txn.amount)

    db.commit()
    db.refresh(txn)
    return txn


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.tenant_id == current_user.tenant_id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    account = _valid_account(db, current_user, txn.account_id)
    _apply_balance_delta(account, txn.transaction_type, -txn.amount)
    db.delete(txn)
    db.commit()


@router.get("/reports/spending-by-category", response_model=list[SpendingByCategoryItem])
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


@router.get("/reports/income-vs-expense", response_model=IncomeExpenseSummary)
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


@router.get("/reports/net-worth", response_model=dict)
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
    return {"total": total}

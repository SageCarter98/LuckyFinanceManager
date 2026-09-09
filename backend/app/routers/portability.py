import csv
import io
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Account, Category, RecurringBill, SavingsGoal, Transaction, User

router = APIRouter(tags=["portability"])


@router.get("/me/export")
def export_tenant_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accounts = db.query(Account).filter(Account.tenant_id == current_user.tenant_id).all()
    categories = db.query(Category).filter(Category.tenant_id == current_user.tenant_id).all()
    transactions = db.query(Transaction).filter(Transaction.tenant_id == current_user.tenant_id).all()
    recurring_bills = db.query(RecurringBill).filter(RecurringBill.tenant_id == current_user.tenant_id).all()
    savings_goals = db.query(SavingsGoal).filter(SavingsGoal.tenant_id == current_user.tenant_id).all()

    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "tenant_id": current_user.tenant_id,
            "email_verified": current_user.email_verified,
        },
        "accounts": [
            {
                "id": row.id,
                "name": row.name,
                "account_type": row.account_type,
                "native_currency": row.native_currency,
                "current_balance": str(row.current_balance),
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
            for row in accounts
        ],
        "categories": [
            {
                "id": row.id,
                "name": row.name,
                "monthly_limit": str(row.monthly_limit) if row.monthly_limit is not None else None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
            for row in categories
        ],
        "transactions": [
            {
                "id": row.id,
                "account_id": row.account_id,
                "category_id": row.category_id,
                "transaction_type": row.transaction_type,
                "amount": str(row.amount),
                "currency": row.currency,
                "transaction_date": row.transaction_date.isoformat() if row.transaction_date else None,
                "note": row.note,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
            for row in transactions
        ],
        "recurring_bills": [
            {
                "id": row.id,
                "account_id": row.account_id,
                "category_id": row.category_id,
                "name": row.name,
                "amount": str(row.amount),
                "currency": row.currency,
                "frequency": row.frequency,
                "due_day": row.due_day,
                "is_active": row.is_active,
            }
            for row in recurring_bills
        ],
        "savings_goals": [
            {
                "id": row.id,
                "name": row.name,
                "target_amount": str(row.target_amount),
                "current_amount": str(row.current_amount),
                "target_date": row.target_date.isoformat() if row.target_date else None,
            }
            for row in savings_goals
        ],
    }


@router.post("/transactions/import")
def import_transactions(
    file: UploadFile | None = File(default=None),
    payload: Any = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records: list[dict[str, str]] = []

    if file is not None:
        content = file.file.read().decode("utf-8")
        reader = csv.DictReader(io.StringIO(content))
        records = list(reader)
    elif isinstance(payload, list):
        records = payload
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file or JSON payload required")

    imported = []
    for row in records:
        if not row:
            continue
        account_name = (row.get("account_name") or row.get("account") or row.get("account_id") or "").strip()
        category_name = (row.get("category_name") or row.get("category") or "").strip()
        amount_raw = row.get("amount")
        if not account_name or amount_raw is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Each row requires account_name and amount")

        account = db.query(Account).filter(Account.tenant_id == current_user.tenant_id, Account.name == account_name).first()
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Account not found: {account_name}")

        try:
            amount = Decimal(str(amount_raw))
        except InvalidOperation as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid amount: {amount_raw}") from exc

        category = None
        if category_name:
            category = db.query(Category).filter(Category.tenant_id == current_user.tenant_id, Category.name == category_name).first()
            if not category:
                category = Category(tenant_id=current_user.tenant_id, name=category_name, monthly_limit=None)
                db.add(category)
                db.flush()

        transaction_date_raw = (row.get("transaction_date") or "").strip()
        if transaction_date_raw:
            try:
                transaction_date = date.fromisoformat(transaction_date_raw)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid transaction_date (expected YYYY-MM-DD): {transaction_date_raw}",
                ) from exc
        else:
            transaction_date = date.today()

        transaction_type = (row.get("transaction_type") or "expense").strip().lower()
        tx = Transaction(
            tenant_id=current_user.tenant_id,
            account_id=account.id,
            category_id=category.id if category else None,
            transaction_type=transaction_type,
            amount=amount,
            currency=(row.get("currency") or account.native_currency).strip().upper(),
            transaction_date=transaction_date,
            note=row.get("note") or None,
        )
        if transaction_type == "income":
            account.current_balance += amount
        else:
            account.current_balance -= amount
        db.add(tx)
        imported.append(tx)

    db.commit()
    return {"imported": len(imported), "rows": imported and [item.id for item in imported] or []}

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Account, Category, Notification, RecurringBill, Transaction, User
from app.schemas import RecurringBillCreate, RecurringBillRead, RecurringBillUpdate

router = APIRouter(prefix="/recurring-bills", tags=["recurring-bills"])


def _is_due_for_date(bill: RecurringBill, as_of: date) -> bool:
    if bill.frequency == "monthly":
        return as_of.day == bill.due_day
    if bill.frequency == "weekly":
        return (as_of.weekday() + 1) % 7 == (bill.due_day - 1) % 7
    if bill.frequency == "yearly":
        return as_of.month == 1 and as_of.day == bill.due_day
    return False


@router.get("", response_model=list[RecurringBillRead])
def list_recurring_bills(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(RecurringBill)
        .filter(RecurringBill.tenant_id == current_user.tenant_id)
        .order_by(RecurringBill.created_at.desc())
        .all()
    )


@router.post("", response_model=RecurringBillRead, status_code=status.HTTP_201_CREATED)
def create_recurring_bill(
    payload: RecurringBillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = db.query(Account).filter(Account.id == payload.account_id, Account.tenant_id == current_user.tenant_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if payload.category_id:
        category = db.query(Category).filter(Category.id == payload.category_id, Category.tenant_id == current_user.tenant_id).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    bill = RecurringBill(
        tenant_id=current_user.tenant_id,
        account_id=payload.account_id,
        category_id=payload.category_id,
        name=payload.name,
        amount=payload.amount,
        currency=payload.currency,
        frequency=payload.frequency,
        due_day=payload.due_day,
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


@router.get("/{bill_id}", response_model=RecurringBillRead)
def get_recurring_bill(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bill = db.query(RecurringBill).filter(RecurringBill.id == bill_id, RecurringBill.tenant_id == current_user.tenant_id).first()
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring bill not found")
    return bill


@router.put("/{bill_id}", response_model=RecurringBillRead)
def update_recurring_bill(
    bill_id: str,
    payload: RecurringBillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bill = db.query(RecurringBill).filter(RecurringBill.id == bill_id, RecurringBill.tenant_id == current_user.tenant_id).first()
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring bill not found")
    if payload.account_id:
        account = db.query(Account).filter(Account.id == payload.account_id, Account.tenant_id == current_user.tenant_id).first()
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
        bill.account_id = payload.account_id
    if payload.category_id is not None:
        if payload.category_id:
            category = db.query(Category).filter(Category.id == payload.category_id, Category.tenant_id == current_user.tenant_id).first()
            if not category:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        bill.category_id = payload.category_id
    if payload.name is not None:
        bill.name = payload.name
    if payload.amount is not None:
        bill.amount = payload.amount
    if payload.currency is not None:
        bill.currency = payload.currency
    if payload.frequency is not None:
        bill.frequency = payload.frequency
    if payload.due_day is not None:
        bill.due_day = payload.due_day
    if payload.is_active is not None:
        bill.is_active = payload.is_active

    db.commit()
    db.refresh(bill)
    return bill


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_bill(
    bill_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bill = db.query(RecurringBill).filter(RecurringBill.id == bill_id, RecurringBill.tenant_id == current_user.tenant_id).first()
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring bill not found")
    db.delete(bill)
    db.commit()


@router.post("/generate-due")
def generate_due_recurring_bills(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    created: list[str] = []
    bills = (
        db.query(RecurringBill)
        .filter(RecurringBill.tenant_id == current_user.tenant_id, RecurringBill.is_active.is_(True))
        .all()
    )

    for bill in bills:
        if not _is_due_for_date(bill, today):
            continue

        account = db.query(Account).filter(Account.id == bill.account_id, Account.tenant_id == current_user.tenant_id).first()
        if not account:
            continue

        if bill.frequency == "monthly":
            period_start = date(today.year, today.month, 1)
        elif bill.frequency == "weekly":
            period_start = today - timedelta(days=today.weekday())
        else:
            period_start = date(today.year, 1, 1)

        existing = (
            db.query(Transaction)
            .filter(
                Transaction.tenant_id == current_user.tenant_id,
                Transaction.account_id == bill.account_id,
                Transaction.note == f"Recurring bill: {bill.name}",
                Transaction.transaction_date >= period_start,
            )
            .first()
        )
        if existing:
            continue

        transaction = Transaction(
            tenant_id=current_user.tenant_id,
            account_id=bill.account_id,
            category_id=bill.category_id,
            transaction_type="expense",
            amount=bill.amount,
            currency=bill.currency,
            transaction_date=today,
            note=f"Recurring bill: {bill.name}",
        )
        account.current_balance -= bill.amount
        db.add(transaction)
        db.flush()

        notification = Notification(
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            kind="bill_generated",
            title="Recurring bill generated",
            message=f"{bill.name} was generated for {bill.amount} {bill.currency}.",
        )
        db.add(notification)
        created.append(transaction.id)

    db.commit()
    return {"generated": len(created), "transaction_ids": created}

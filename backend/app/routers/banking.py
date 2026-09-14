from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core import bank_provider, fx_rates
from app.database import get_db
from app.dependencies import require_active_entitlement
from app.models import LinkedAccount, LinkedAccountTransaction, User
from app.schemas import (
    BankLinkRequest,
    GrossBalanceAccountLine,
    GrossBalanceRead,
    LinkedAccountDetailRead,
    LinkedAccountRead,
)

RECENT_TRANSACTIONS_LIMIT = 10

router = APIRouter(prefix="/banking", tags=["banking"])


def _get_linked_account(db: Session, current_user: User, linked_account_id: str) -> LinkedAccount:
    account = (
        db.query(LinkedAccount)
        .filter(LinkedAccount.id == linked_account_id, LinkedAccount.tenant_id == current_user.tenant_id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked account not found")
    return account


@router.get("/institutions", response_model=list[str])
def list_institutions(current_user: User = Depends(require_active_entitlement)):
    return bank_provider.list_institutions()


@router.get("/accounts", response_model=list[LinkedAccountRead])
def list_linked_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_entitlement),
):
    return (
        db.query(LinkedAccount)
        .filter(LinkedAccount.tenant_id == current_user.tenant_id)
        .order_by(LinkedAccount.institution_name, LinkedAccount.created_at)
        .all()
    )


@router.post("/accounts", response_model=LinkedAccountRead, status_code=status.HTTP_201_CREATED)
def link_account(
    payload: BankLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_entitlement),
):
    """FE-14.2/14.4: simulates completing the provider-hosted consent and
    linking handoff. Consent itself (the explicit, unchecked-by-default
    affirmation) is a client-side gate before this call is ever made --
    this endpoint is what runs after that screen, not instead of it."""
    try:
        stub = bank_provider.link_account(payload.institution_name, current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    account = LinkedAccount(
        tenant_id=current_user.tenant_id,
        provider=bank_provider.PROVIDER_NAME,
        external_account_ref=stub.external_account_ref,
        institution_name=stub.institution_name,
        account_type=stub.account_type,
        account_number_last4=stub.account_number_last4,
        native_currency=stub.native_currency,
        current_balance=Decimal(stub.current_balance),
        consent_status="active",
        last_synced_at=datetime.now(timezone.utc),
        last_sync_failed=False,
    )
    db.add(account)
    db.flush()

    for txn in stub.transactions:
        db.add(
            LinkedAccountTransaction(
                tenant_id=current_user.tenant_id,
                linked_account_id=account.id,
                description=txn.description,
                amount=Decimal(txn.amount),
                currency=txn.currency,
                transaction_date=txn.transaction_date,
            )
        )

    db.commit()
    return account


@router.get("/accounts/{linked_account_id}", response_model=LinkedAccountDetailRead)
def get_linked_account(
    linked_account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_entitlement),
):
    account = _get_linked_account(db, current_user, linked_account_id)
    recent = (
        db.query(LinkedAccountTransaction)
        .filter(LinkedAccountTransaction.linked_account_id == account.id)
        .order_by(LinkedAccountTransaction.transaction_date.desc(), LinkedAccountTransaction.created_at.desc())
        .limit(RECENT_TRANSACTIONS_LIMIT)
        .all()
    )
    base = LinkedAccountRead.model_validate(account, from_attributes=True).model_dump()
    return LinkedAccountDetailRead(**base, recent_transactions=recent)


@router.post("/accounts/{linked_account_id}/sync", response_model=LinkedAccountRead)
def sync_linked_account(
    linked_account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_entitlement),
):
    """FE-14.14: refresh balance/transactions and record sync outcome
    without implying the underlying bank balance changed on a failure."""
    account = _get_linked_account(db, current_user, linked_account_id)
    if account.consent_status == "lapsed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Consent has lapsed for this account; re-authorize before syncing.",
        )

    new_balance, new_transactions, sync_failed = bank_provider.sync_account(
        account.external_account_ref, str(account.current_balance)
    )
    account.last_sync_failed = sync_failed
    if not sync_failed:
        account.current_balance = Decimal(new_balance)
        account.last_synced_at = datetime.now(timezone.utc)
        for txn in new_transactions:
            db.add(
                LinkedAccountTransaction(
                    tenant_id=current_user.tenant_id,
                    linked_account_id=account.id,
                    description=txn.description,
                    amount=Decimal(txn.amount),
                    currency=txn.currency,
                    transaction_date=txn.transaction_date,
                )
            )

    db.commit()
    return account


@router.post("/accounts/{linked_account_id}/lapse-consent", response_model=LinkedAccountRead, include_in_schema=False)
def simulate_consent_lapse(
    linked_account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_entitlement),
):
    """Dev/demo-only: a real provider would notify this app of a lapsed
    consent via webhook. No such provider exists yet (stub adapter), so
    this lets FE-14.13's re-authorization path be exercised and tested at
    all. Hidden from the OpenAPI schema -- not a real product endpoint."""
    account = _get_linked_account(db, current_user, linked_account_id)
    account.consent_status = "lapsed"
    db.commit()
    return account


@router.post("/accounts/{linked_account_id}/reauthorize", response_model=LinkedAccountRead)
def reauthorize_linked_account(
    linked_account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_entitlement),
):
    """FE-14.13: completes re-authorization after a lapsed consent."""
    account = _get_linked_account(db, current_user, linked_account_id)
    account.consent_status = "active"
    account.last_sync_failed = False
    db.commit()
    return account


@router.delete("/accounts/{linked_account_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_account(
    linked_account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_entitlement),
):
    """FE-14.12: revokes access and purges cached transaction detail --
    the cascade delete on LinkedAccount.linked_transactions is what
    actually purges it, not just a client-side hide."""
    account = _get_linked_account(db, current_user, linked_account_id)
    db.delete(account)
    db.commit()


@router.get("/gross-balance", response_model=GrossBalanceRead)
def get_gross_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_entitlement),
):
    """FE-14.7/14.8: consolidated total in the user's display currency,
    each linked account's native balance alongside it, and the stub rate
    table's own vintage as the disclosed 'as of' timestamp."""
    accounts = (
        db.query(LinkedAccount)
        .filter(LinkedAccount.tenant_id == current_user.tenant_id, LinkedAccount.consent_status == "active")
        .all()
    )
    display_currency = current_user.preferred_currency

    lines: list[GrossBalanceAccountLine] = []
    total = Decimal("0")
    for account in accounts:
        try:
            converted = fx_rates.convert(account.current_balance, account.native_currency, display_currency)
            rate = fx_rates.rate_between(account.native_currency, display_currency)
        except fx_rates.UnknownCurrencyError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
        total += converted
        lines.append(
            GrossBalanceAccountLine(
                linked_account_id=account.id,
                institution_name=account.institution_name,
                native_balance=account.current_balance,
                native_currency=account.native_currency,
                converted_balance=converted,
                rate=rate,
            )
        )

    return GrossBalanceRead(
        display_currency=display_currency,
        total_converted=total,
        rate_basis="Stub rate table, not a live feed (app/core/fx_rates.py)",
        rates_as_of=fx_rates.RATES_AS_OF,
        accounts=lines,
    )

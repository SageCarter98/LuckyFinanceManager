from __future__ import annotations

from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated

from pydantic import AfterValidator, BaseModel, EmailStr, Field


def _quantize_money(value: Decimal) -> Decimal:
    """Every monetary column is NUMERIC(18, 2) -- Postgres/SQLite would
    normalize to 2 decimal places on any round-trip read. Removing the
    post-commit db.refresh() calls (they fought RLS's SET LOCAL tenant
    context, see app/database.py) means responses now return the exact
    Decimal a client sent -- e.g. "25.5" -- unless quantized here at
    input time. Applied only to Create/Update (user input) schemas;
    Read schemas just reflect whatever was already quantized going in."""
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


Money = Annotated[Decimal, AfterValidator(_quantize_money)]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class DevOnlyTokenResponse(BaseModel):
    """Returned instead of actually sending an email -- no email provider is
    chosen yet (open decision, see the unresolved-question log). `dev_token`
    is populated ONLY when the server is not running in production
    (Settings.is_production), so this can never leak a live token in prod."""

    status: str = "ok"
    dev_token: str | None = None


class UserRead(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    tenant_id: str
    role: str = "user"
    email_verified: bool = False
    timezone: str = "UTC"
    preferred_currency: str = "USD"
    notification_preferences: dict[str, bool] = Field(default_factory=dict)
    # Populated only by /auth/signup, only outside production (no email
    # provider exists yet -- see DevOnlyTokenResponse). Always None from
    # every other endpoint that returns UserRead.
    dev_verification_token: str | None = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Email is deliberately excluded: changing it without a re-verification
    flow (which doesn't exist yet -- see the FRS Implementation Plan's own
    disclosure) would let an account's identity change unconfirmed. Add it
    once /auth/verify-email exists, not before."""

    full_name: str | None = Field(default=None, min_length=1)
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    preferred_currency: str | None = Field(default=None, min_length=3, max_length=10)
    notification_preferences: dict[str, bool] | None = None


class AdminTenantSearchResult(BaseModel):
    user_id: str
    email: str
    full_name: str
    tenant_id: str
    role: str
    email_verified: bool
    account_count: int
    category_count: int
    transaction_count: int
    recurring_bill_count: int
    savings_goal_count: int
    notification_count: int


class AdminTenantSummary(BaseModel):
    tenant_id: str
    user_count: int
    account_count: int
    category_count: int
    transaction_count: int
    notification_count: int


class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1)
    account_type: str = Field(..., pattern="^(checking|savings|credit)$")
    native_currency: str = Field(default="USD", min_length=3, max_length=10)
    current_balance: Money = Decimal("0.00")


class AccountUpdate(BaseModel):
    name: str | None = None
    account_type: str | None = Field(default=None, pattern="^(checking|savings|credit)$")
    native_currency: str | None = Field(default=None, min_length=3, max_length=10)
    current_balance: Money | None = None


class AccountRead(BaseModel):
    id: str
    tenant_id: str
    name: str
    account_type: str
    native_currency: str
    current_balance: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1)
    monthly_limit: Money | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    monthly_limit: Money | None = None


class CategoryRead(BaseModel):
    id: str
    tenant_id: str
    name: str
    monthly_limit: Decimal | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransactionCreate(BaseModel):
    account_id: str
    category_id: str | None = None
    transaction_type: str = Field(..., pattern="^(income|expense)$")
    amount: Money = Field(..., gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=10)
    transaction_date: date | None = None
    note: str | None = None


class TransactionUpdate(BaseModel):
    account_id: str | None = None
    category_id: str | None = None
    transaction_type: str | None = Field(default=None, pattern="^(income|expense)$")
    amount: Money | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, min_length=3, max_length=10)
    transaction_date: date | None = None
    note: str | None = None


class TransactionRead(BaseModel):
    id: str
    tenant_id: str
    account_id: str
    category_id: str | None = None
    transaction_type: str
    amount: Decimal
    currency: str
    transaction_date: date
    note: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecurringBillCreate(BaseModel):
    name: str = Field(..., min_length=1)
    account_id: str
    category_id: str | None = None
    amount: Money = Field(..., gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=10)
    frequency: str = Field(..., pattern="^(weekly|monthly|yearly)$")
    due_day: int = Field(default=1, ge=1, le=31)


class RecurringBillUpdate(BaseModel):
    name: str | None = None
    account_id: str | None = None
    category_id: str | None = None
    amount: Money | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, min_length=3, max_length=10)
    frequency: str | None = Field(default=None, pattern="^(weekly|monthly|yearly)$")
    due_day: int | None = Field(default=None, ge=1, le=31)
    is_active: bool | None = None


class RecurringBillRead(BaseModel):
    id: str
    tenant_id: str
    account_id: str
    category_id: str | None = None
    name: str
    amount: Decimal
    currency: str
    frequency: str
    due_day: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SavingsGoalCreate(BaseModel):
    name: str = Field(..., min_length=1)
    target_amount: Money = Field(..., gt=0)
    current_amount: Money = Decimal("0.00")
    target_date: date | None = None


class SavingsGoalUpdate(BaseModel):
    name: str | None = None
    target_amount: Money | None = Field(default=None, gt=0)
    current_amount: Money | None = None
    target_date: date | None = None


class SavingsGoalRead(BaseModel):
    id: str
    tenant_id: str
    name: str
    target_amount: Decimal
    current_amount: Decimal
    target_date: date | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationCreate(BaseModel):
    kind: str = Field(default="info", min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1, max_length=1000)


class NotificationRead(BaseModel):
    id: str
    tenant_id: str
    user_id: str | None = None
    kind: str
    title: str
    message: str
    is_read: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SpendingByCategoryItem(BaseModel):
    category: str
    total: Decimal


class IncomeExpenseSummary(BaseModel):
    income: Decimal
    expenses: Decimal
    net: Decimal


class NetWorthSummary(BaseModel):
    total: Decimal


class SubscriptionStatusRead(BaseModel):
    status: str
    is_entitled: bool
    trial_end: datetime | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False
    grace_period_ends_at: datetime | None = None
    plan_amount_cents: int
    plan_currency: str

    model_config = {"from_attributes": True}


class CheckoutSessionRead(BaseModel):
    checkout_url: str


class BillingHistoryItem(BaseModel):
    id: str
    amount_due: int
    amount_paid: int
    currency: str
    status: str
    created_at: datetime
    hosted_invoice_url: str | None = None
    invoice_pdf_url: str | None = None


class BankLinkRequest(BaseModel):
    institution_name: str = Field(..., min_length=1)


class LinkedAccountTransactionRead(BaseModel):
    id: str
    description: str
    amount: Decimal
    currency: str
    transaction_date: date

    model_config = {"from_attributes": True}


class LinkedAccountRead(BaseModel):
    id: str
    tenant_id: str
    provider: str
    institution_name: str
    account_type: str
    account_number_last4: str
    native_currency: str
    current_balance: Decimal
    consent_status: str
    last_synced_at: datetime | None
    last_sync_failed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LinkedAccountDetailRead(LinkedAccountRead):
    recent_transactions: list[LinkedAccountTransactionRead] = []


class GrossBalanceAccountLine(BaseModel):
    linked_account_id: str
    institution_name: str
    native_balance: Decimal
    native_currency: str
    converted_balance: Decimal
    rate: Decimal


class GrossBalanceRead(BaseModel):
    display_currency: str
    total_converted: Decimal
    rate_basis: str
    rates_as_of: datetime
    accounts: list[GrossBalanceAccountLine]

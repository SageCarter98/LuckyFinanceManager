from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field


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


class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1)
    account_type: str = Field(..., pattern="^(checking|savings|credit)$")
    native_currency: str = Field(default="USD", min_length=3, max_length=10)
    current_balance: Decimal = Decimal("0.00")


class AccountUpdate(BaseModel):
    name: str | None = None
    account_type: str | None = Field(default=None, pattern="^(checking|savings|credit)$")
    native_currency: str | None = Field(default=None, min_length=3, max_length=10)
    current_balance: Decimal | None = None


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
    monthly_limit: Decimal | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    monthly_limit: Decimal | None = None


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
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=10)
    transaction_date: date | None = None
    note: str | None = None


class TransactionUpdate(BaseModel):
    account_id: str | None = None
    category_id: str | None = None
    transaction_type: str | None = Field(default=None, pattern="^(income|expense)$")
    amount: Decimal | None = Field(default=None, gt=0)
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
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=10)
    frequency: str = Field(..., pattern="^(weekly|monthly|yearly)$")
    due_day: int = Field(default=1, ge=1, le=31)


class RecurringBillUpdate(BaseModel):
    name: str | None = None
    account_id: str | None = None
    category_id: str | None = None
    amount: Decimal | None = Field(default=None, gt=0)
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
    target_amount: Decimal = Field(..., gt=0)
    current_amount: Decimal = Decimal("0.00")
    target_date: date | None = None


class SavingsGoalUpdate(BaseModel):
    name: str | None = None
    target_amount: Decimal | None = Field(default=None, gt=0)
    current_amount: Decimal | None = None
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

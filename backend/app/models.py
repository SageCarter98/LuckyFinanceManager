from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    users: Mapped[list["User"]] = relationship(back_populates="tenant")
    accounts: Mapped[list["Account"]] = relationship(back_populates="tenant")
    categories: Mapped[list["Category"]] = relationship(back_populates="tenant")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="tenant")
    recurring_bills: Mapped[list["RecurringBill"]] = relationship(back_populates="tenant")
    savings_goals: Mapped[list["SavingsGoal"]] = relationship(back_populates="tenant")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="tenant")
    subscription: Mapped["Subscription | None"] = relationship(back_populates="tenant", uselist=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", nullable=False)
    preferred_currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    notification_preferences: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    verification_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    verification_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reset_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reset_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="users")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)
    native_currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    current_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="accounts")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="account")
    recurring_bills: Mapped[list["RecurringBill"]] = relationship(back_populates="account")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    monthly_limit: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="categories")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="category")
    recurring_bills: Mapped[list["RecurringBill"]] = relationship(back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), index=True, nullable=False)
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id"), index=True, nullable=False)
    category_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("categories.id"), nullable=True)
    transaction_type: Mapped[str] = mapped_column(String(20), default="expense", nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="transactions")
    account: Mapped[Account] = relationship(back_populates="transactions")
    category: Mapped[Category | None] = relationship(back_populates="transactions")


class RecurringBill(Base):
    __tablename__ = "recurring_bills"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), index=True, nullable=False)
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id"), index=True, nullable=False)
    category_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("categories.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    frequency: Mapped[str] = mapped_column(String(20), nullable=False)
    due_day: Mapped[int] = mapped_column(default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="recurring_bills")
    account: Mapped[Account] = relationship(back_populates="recurring_bills")
    category: Mapped[Category | None] = relationship(back_populates="recurring_bills")


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    current_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal("0.00"), nullable=False)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="savings_goals")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), index=True, nullable=False)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    kind: Mapped[str] = mapped_column(String(50), default="info", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="notifications")
    user: Mapped[User | None] = relationship(back_populates="notifications")


class Subscription(Base):
    """One-to-one with Tenant, mirroring Stripe's own subscription status
    values (`status="none"` is a local sentinel meaning never checked out).
    No local invoice/ledger table exists -- billing history is always
    fetched live from Stripe (see app/routers/subscriptions.py), matching
    the FRS non-negotiable that entitlement/billing state is derived from
    live API state rather than a second, driftable source of truth."""

    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), unique=True, index=True, nullable=False)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="none", nullable=False)
    price_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    trial_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    grace_period_ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="subscription")

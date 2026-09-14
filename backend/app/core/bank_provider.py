"""Stub bank-data-aggregation provider adapter for FE-14.x / FR-14.x.

This is NOT a real bank-data provider integration. Choosing a real
aggregator (Plaid, TrueLayer, Yodlee, MX, Finicity, ...) is a business
decision -- provider risk assessment, a signed data-processing agreement
and a dedicated security review, per `Compensating_Assurance_Role_
Separation.md` and `Defect_Register.md` -- none of which this module
makes or assumes. This adapter exists so the rest of the feature (data
model, RLS, entitlement gating, consent UI, Gross Balance, sync/unlink
lifecycle) can be built and tested now, and swapped for a real provider
client later without redesigning anything above this module.

Every value below is fabricated locally. Nothing here ever calls out to
a real bank or aggregator, and `external_account_ref` is an opaque local
reference, never anything resembling a real access token or credential
(FE-14.10).
"""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import date, timedelta

PROVIDER_NAME = "stub-sandbox-connector"
PROVIDER_DISPLAY_NAME = "Stub Sandbox Connector (test data, not a real bank feed)"

_INSTITUTIONS = [
    "Northwind Community Bank",
    "Meridian Trust",
    "Harbor Savings & Loan",
]

_ACCOUNT_TYPES = ["checking", "savings", "credit"]

_MERCHANTS = ["Groceries Co-op", "City Transit", "Streamline Media", "Corner Cafe", "Utility Services"]


@dataclass
class StubTransaction:
    description: str
    amount: str
    currency: str
    transaction_date: date


@dataclass
class StubAccount:
    external_account_ref: str
    institution_name: str
    account_type: str
    account_number_last4: str
    native_currency: str
    current_balance: str
    transactions: list[StubTransaction] = field(default_factory=list)


def list_institutions() -> list[str]:
    """What a real provider's hosted Link flow would show as institution
    choices. Static and local -- never a network call."""
    return list(_INSTITUTIONS)


def link_account(institution_name: str, tenant_id: str) -> StubAccount:
    """Simulates a completed hosted-link handoff (FE-14.2) returning one
    new account. Deterministic per (tenant_id, institution_name) so the
    same tenant relinking the same institution sees stable demo data,
    without needing any persistence of its own."""
    if institution_name not in _INSTITUTIONS:
        raise ValueError(f"Unknown institution: {institution_name}")

    seed = int(hashlib.sha256(f"{tenant_id}:{institution_name}".encode()).hexdigest(), 16)
    rng = random.Random(seed)

    last4 = f"{rng.randint(0, 9999):04d}"
    account_type = rng.choice(_ACCOUNT_TYPES)
    balance = rng.uniform(150, 8500)
    today = date.today()
    transactions = [
        StubTransaction(
            description=rng.choice(_MERCHANTS),
            amount=f"-{rng.uniform(5, 200):.2f}",
            currency="USD",
            transaction_date=today - timedelta(days=i * rng.randint(1, 4)),
        )
        for i in range(1, 6)
    ]

    return StubAccount(
        external_account_ref=f"stub_{seed % 10_000_000}",
        institution_name=institution_name,
        account_type=account_type,
        account_number_last4=last4,
        native_currency="USD",
        current_balance=f"{balance:.2f}",
        transactions=transactions,
    )


def sync_account(external_account_ref: str, current_balance: str) -> tuple[str, list[StubTransaction], bool]:
    """Simulates a periodic balance/transaction refresh. Returns (new
    balance, new transactions since last sync, sync_failed). Occasionally
    simulates a failed sync (FE-14.14) so that path is real and testable,
    not just designed -- deterministic per ref so a given account doesn't
    flap between calls within the same process."""
    rng = random.Random(external_account_ref)
    if rng.random() < 0.1:
        return current_balance, [], True

    delta = rng.uniform(-50, 50)
    new_balance = max(0.0, float(current_balance) + delta)
    new_transactions = [
        StubTransaction(
            description=rng.choice(_MERCHANTS),
            amount=f"-{rng.uniform(5, 80):.2f}",
            currency="USD",
            transaction_date=date.today(),
        )
    ]
    return f"{new_balance:.2f}", new_transactions, False

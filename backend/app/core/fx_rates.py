"""Stub foreign-exchange rate table for FE-14.7/14.8's Gross Balance
consolidation.

This is a static, hardcoded rate table, not a live FX feed -- no such
integration exists in this codebase (reports.py deliberately discloses
mixed currencies instead of converting them, per its own FRS row). Gross
Balance is the one surface that must actually convert and label the
result approximate with a rate and an as-of timestamp (FE-14.8), so this
module exists to satisfy that requirement honestly: the rate is real
arithmetic against a disclosed static table, the "as of" timestamp is
this table's own fixed vintage, not live market data.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

# Fixed, disclosed-as-static rates to USD. Not sourced from a live feed --
# update this table (and its RATES_AS_OF) if it needs to reflect a later
# snapshot; do not present it as real-time.
_RATES_TO_USD: dict[str, Decimal] = {
    "USD": Decimal("1"),
    "EUR": Decimal("1.08"),
    "GBP": Decimal("1.27"),
    "CAD": Decimal("0.74"),
    "AUD": Decimal("0.66"),
    "JPY": Decimal("0.0067"),
    "NGN": Decimal("0.00065"),
}

RATES_AS_OF = datetime(2026, 9, 1, tzinfo=timezone.utc)


class UnknownCurrencyError(ValueError):
    pass


def convert(amount: Decimal, from_currency: str, to_currency: str) -> Decimal:
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()
    if from_currency not in _RATES_TO_USD:
        raise UnknownCurrencyError(f"No stub rate for {from_currency}")
    if to_currency not in _RATES_TO_USD:
        raise UnknownCurrencyError(f"No stub rate for {to_currency}")

    in_usd = amount * _RATES_TO_USD[from_currency]
    converted = in_usd / _RATES_TO_USD[to_currency]
    # Money is 2dp everywhere else in this codebase (NUMERIC(18,2) columns) --
    # a plain Decimal division here would otherwise return up to 28
    # significant digits, misrepresenting precision the app doesn't have.
    return converted.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def rate_between(from_currency: str, to_currency: str) -> Decimal:
    """The single multiplicative rate `1 from_currency -> ? to_currency`,
    for display alongside a converted total (FE-14.8). Deliberately NOT
    routed through convert()'s 2dp money-quantization -- a rate needs more
    precision than a currency amount does (JPY's ~0.0067 would otherwise
    round to 0.01, a >30% distortion of the disclosed rate itself)."""
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()
    if from_currency not in _RATES_TO_USD:
        raise UnknownCurrencyError(f"No stub rate for {from_currency}")
    if to_currency not in _RATES_TO_USD:
        raise UnknownCurrencyError(f"No stub rate for {to_currency}")

    rate = _RATES_TO_USD[from_currency] / _RATES_TO_USD[to_currency]
    return rate.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)

import { getUserLocale } from '../lib/locale'

interface MoneyProps {
  value: number
  currency: string
  signed?: boolean
  className?: string
  size?: 'display' | 'stat' | 'table'
}

const sizeClass: Record<NonNullable<MoneyProps['size']>, string> = {
  display: 'font-currency-display text-currency-display',
  stat: 'font-currency-stat text-currency-stat',
  table: 'font-currency-table text-currency-table',
}

function formatAmount(value: number, currency: string, signed: boolean): string {
  const signDisplay = signed ? 'exceptZero' : 'auto'
  try {
    // Throws RangeError for anything that isn't a real ISO 4217 code — callers
    // sometimes pass a non-code label like "(mixed)" when currencies were
    // combined without conversion, so fall back to a plain number in that case.
    return new Intl.NumberFormat(getUserLocale(), {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      signDisplay,
    }).format(value)
  } catch {
    return new Intl.NumberFormat(getUserLocale(), {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay,
    }).format(value)
  }
}

/**
 * Always renders the currency label alongside the formatted amount — the
 * backend never performs FX conversion, so a bare `$` would misrepresent
 * non-USD account/transaction currencies.
 */
export function Money({ value, currency, signed = false, className = '', size = 'table' }: MoneyProps) {
  const formatted = formatAmount(value, currency || 'USD', signed)
  const tone = signed ? (value > 0 ? 'text-growth-emerald-deep' : value < 0 ? 'text-expense-crimson' : '') : ''

  return (
    <span className={`tabular-figures ${sizeClass[size]} ${tone} ${className}`}>
      {formatted} <span className="text-body-sm font-body-sm text-on-surface-variant">{currency}</span>
    </span>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { inputClass } from '../components/forms'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { Banner } from '../components/Banner'
import { Money } from '../components/Money'
import { listAccounts } from '../lib/resources/accounts'
import { incomeVsExpense, spendingByCategory, netWorth as fetchNetWorth } from '../lib/resources/reports'
import { getErrorMessage } from '../lib/errors'
import type { IncomeExpenseSummary, NetWorthSummary, SpendingByCategoryItem } from '../lib/types'

export function ReportsPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [mixedCurrencies, setMixedCurrencies] = useState(false)
  const [reportCurrency, setReportCurrency] = useState('USD')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [spending, setSpending] = useState<SpendingByCategoryItem[]>([])
  const [incomeExpense, setIncomeExpense] = useState<IncomeExpenseSummary | null>(null)
  const [netWorth, setNetWorth] = useState<NetWorthSummary | null>(null)

  useEffect(() => {
    let active = true
    listAccounts()
      .then((accounts) => {
        if (!active) return
        const currencies = new Set(accounts.map((account) => account.native_currency))
        setMixedCurrencies(currencies.size > 1)
        setReportCurrency(accounts[0]?.native_currency ?? 'USD')
      })
      .catch(() => {
        // Non-fatal — the currency-mix disclosure just won't show if this fails.
      })
    fetchNetWorth()
      .then((result) => active && setNetWorth(result))
      .catch(() => {
        // Reported alongside the range-based figures below if that also fails.
      })
    return () => {
      active = false
    }
  }, [])

  function load() {
    setLoading(true)
    setError(null)
    const range = { start_date: startDate || undefined, end_date: endDate || undefined }
    Promise.all([spendingByCategory(range), incomeVsExpense(range)])
      .then(([spendingRes, incomeExpenseRes]) => {
        setSpending(spendingRes)
        setIncomeExpense(incomeExpenseRes)
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [startDate, endDate])

  const currencyLabel = mixedCurrencies ? '(mixed)' : reportCurrency

  const sortedSpending = useMemo(() => [...spending].sort((a, b) => b.total - a.total), [spending])
  const maxSpending = sortedSpending[0]?.total ?? 0

  const incomeExpenseMax = incomeExpense ? Math.max(incomeExpense.income, incomeExpense.expenses, 1) : 1

  return (
    <AppShell>
      <PageHeader
        eyebrow="Understand your habits"
        title="Reports"
        description="Spending by category, income vs. expense, and net worth — computed directly from your accounts and transactions."
      />

      <section className="flex flex-wrap items-end gap-space-sm rounded-lg border border-slate-border bg-surface-container-lowest p-space-md">
        <label className="flex flex-col gap-space-2xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Start date</span>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-space-2xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant">End date</span>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClass} />
        </label>
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setStartDate('')
              setEndDate('')
            }}
            className="font-label-md text-label-md text-info-sky hover:text-slate-navy-deep"
          >
            Clear range
          </button>
        )}
        <span className="font-body-sm text-body-sm text-on-surface-variant">Leave both blank for all-time totals.</span>
      </section>

      {mixedCurrencies && (
        <Banner tone="info" title="Your accounts use more than one currency">
          Totals below are not currency-converted (this app does not perform FX conversion). They
          combine raw amounts across currencies — treat mixed totals as directional only.
        </Banner>
      )}

      {loading ? (
        <LoadingState label="Loading reports…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="flex flex-col gap-space-lg">
          <div className="grid grid-cols-1 gap-space-md md:grid-cols-3">
            <article className="rounded-lg border border-slate-border bg-surface-container-lowest p-space-md shadow-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Net worth</span>
              <div className="mt-space-xs">
                {netWorth ? <Money value={netWorth.total} currency={currencyLabel} size="display" /> : <span className="text-on-surface-variant">—</span>}
              </div>
            </article>
            <article className="rounded-lg border border-slate-border bg-surface-container-lowest p-space-md shadow-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Income (range)</span>
              <div className="mt-space-xs">
                {incomeExpense && <Money value={incomeExpense.income} currency={currencyLabel} size="stat" className="text-growth-emerald-deep" />}
              </div>
            </article>
            <article className="rounded-lg border border-slate-border bg-surface-container-lowest p-space-md shadow-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Expenses (range)</span>
              <div className="mt-space-xs">
                {incomeExpense && <Money value={incomeExpense.expenses} currency={currencyLabel} size="stat" className="text-expense-crimson" />}
              </div>
            </article>
          </div>

          <section className="rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
            <h2 className="mb-space-md font-headline-sm text-headline-sm text-on-surface">Income vs. expense</h2>
            {incomeExpense ? (
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="w-20 font-label-sm text-label-sm text-on-surface-variant">Income</span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-growth-emerald-deep transition-all"
                      style={{ width: `${Math.min(100, (incomeExpense.income / incomeExpenseMax) * 100)}%` }}
                    />
                  </div>
                  <Money value={incomeExpense.income} currency={currencyLabel} size="table" />
                </div>
                <div className="flex items-center gap-space-sm">
                  <span className="w-20 font-label-sm text-label-sm text-on-surface-variant">Expenses</span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-expense-crimson transition-all"
                      style={{ width: `${Math.min(100, (incomeExpense.expenses / incomeExpenseMax) * 100)}%` }}
                    />
                  </div>
                  <Money value={incomeExpense.expenses} currency={currencyLabel} size="table" />
                </div>
                <div className="mt-space-xs border-t border-slate-border pt-space-xs">
                  <span className="font-label-md text-label-md text-on-surface-variant">Net: </span>
                  <Money value={incomeExpense.net} currency={currencyLabel} size="table" signed />
                </div>
              </div>
            ) : (
              <EmptyState icon="analytics" title="No data for this range" />
            )}
          </section>

          <section className="rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
            <h2 className="mb-space-md font-headline-sm text-headline-sm text-on-surface">Spending by category</h2>
            {sortedSpending.length === 0 ? (
              <EmptyState icon="pie_chart" title="No categorized spending in this range" description="Expense transactions with a category assigned will appear here." />
            ) : (
              <div className="flex flex-col gap-space-sm">
                {sortedSpending.map((item) => (
                  <div key={item.category} className="flex items-center gap-space-sm">
                    <span className="w-32 truncate font-body-md text-body-md text-on-surface" title={item.category}>
                      {item.category}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full bg-slate-navy-deep transition-all"
                        style={{ width: `${maxSpending > 0 ? Math.min(100, (item.total / maxSpending) * 100) : 0}%` }}
                      />
                    </div>
                    <Money value={item.total} currency={currencyLabel} size="table" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  )
}

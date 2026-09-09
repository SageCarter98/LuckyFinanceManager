import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { Money } from '../components/Money'
import { StatusChip } from '../components/StatusChip'
import { Banner } from '../components/Banner'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { Icon } from '../components/Icon'
import { useAuth } from '../lib/auth'
import { listAccounts } from '../lib/resources/accounts'
import { listTransactions } from '../lib/resources/transactions'
import { listRecurringBills } from '../lib/resources/recurringBills'
import { netWorth as fetchNetWorth, incomeVsExpense as fetchIncomeVsExpense } from '../lib/resources/reports'
import { getErrorMessage } from '../lib/errors'
import type {
  AccountRead,
  IncomeExpenseSummary,
  NetWorthSummary,
  RecurringBillRead,
  TransactionRead,
} from '../lib/types'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountRead[]>([])
  const [transactions, setTransactions] = useState<TransactionRead[]>([])
  const [bills, setBills] = useState<RecurringBillRead[]>([])
  const [netWorth, setNetWorth] = useState<NetWorthSummary | null>(null)
  const [incomeExpense, setIncomeExpense] = useState<IncomeExpenseSummary | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [accountsRes, transactionsRes, billsRes, netWorthRes, incomeExpenseRes] = await Promise.all([
          listAccounts(controller.signal),
          listTransactions({}, controller.signal),
          listRecurringBills(controller.signal),
          fetchNetWorth(controller.signal),
          fetchIncomeVsExpense({}, controller.signal),
        ])
        if (!active) return
        setAccounts(accountsRes)
        setTransactions(transactionsRes)
        setBills(billsRes)
        setNetWorth(netWorthRes)
        setIncomeExpense(incomeExpenseRes)
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'We could not load your dashboard.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  const currencies = useMemo(() => new Set(accounts.map((account) => account.native_currency)), [accounts])
  const mixedCurrencies = currencies.size > 1
  const primaryCurrency = accounts[0]?.native_currency ?? 'USD'
  const upcomingBills = useMemo(() => bills.filter((bill) => bill.is_active).slice(0, 4), [bills])
  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions])

  if (loading) {
    return (
      <AppShell>
        <LoadingState label="Loading your dashboard…" />
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        title={`Good to see you, ${user?.full_name ?? 'there'}`}
        actions={
          <Link
            to="/transactions"
            className="flex items-center gap-space-xs rounded-xl bg-slate-navy-deep px-space-md py-space-xs font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <Icon name="add_circle" className="text-[18px]" />
            Add transaction
          </Link>
        }
      />

      {mixedCurrencies && (
        <Banner tone="info" title="Your accounts use more than one currency">
          Totals below are not currency-converted (this app does not perform FX conversion). Figures
          combine raw balances across currencies — check each account and transaction's own
          currency for its true amount.
        </Banner>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          icon="account_balance"
          title="No accounts yet"
          description="Add your first account to start tracking balances, transactions and reports."
          action={
            <Link
              to="/accounts"
              className="rounded-lg bg-primary px-space-md py-space-xs font-label-md text-label-md text-on-primary hover:bg-slate-navy-deep"
            >
              Add an account
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Net worth"
            icon="trending_up"
            tone="positive"
            value={
              netWorth && (
                <Money value={netWorth.total} currency={mixedCurrencies ? '(mixed)' : primaryCurrency} size="display" />
              )
            }
            footer={<span className="font-body-sm text-body-sm text-on-surface-variant">{accounts.length} account{accounts.length === 1 ? '' : 's'}</span>}
          />
          <StatCard
            label="Income this period"
            icon="payments"
            tone="positive"
            value={
              incomeExpense && (
                <Money value={incomeExpense.income} currency={mixedCurrencies ? '(mixed)' : primaryCurrency} size="stat" />
              )
            }
          />
          <StatCard
            label="Expenses this period"
            icon="shopping_cart"
            tone="negative"
            value={
              incomeExpense && (
                <Money value={incomeExpense.expenses} currency={mixedCurrencies ? '(mixed)' : primaryCurrency} size="stat" />
              )
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-space-lg lg:grid-cols-12">
        <section className="rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg lg:col-span-7">
          <div className="mb-space-md flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Recent activity</h2>
            <Link to="/transactions" className="font-label-md text-label-md text-info-sky hover:text-slate-navy-deep">
              View all →
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <EmptyState icon="receipt_long" title="No transactions yet" description="Transactions you add will show up here." />
          ) : (
            <div className="flex flex-col divide-y divide-surface-container">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between gap-space-sm py-space-xs">
                  <div className="flex items-center gap-space-sm">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        transaction.transaction_type === 'income'
                          ? 'bg-growth-emerald-tint text-growth-emerald-deep'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <Icon name={transaction.transaction_type === 'income' ? 'arrow_downward' : 'arrow_upward'} className="text-[18px]" />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-body-md text-body-md font-medium text-on-surface">
                        {transaction.note || (transaction.transaction_type === 'income' ? 'Income' : 'Expense')}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{formatDate(transaction.transaction_date)}</span>
                    </div>
                  </div>
                  <Money
                    value={transaction.transaction_type === 'expense' ? -transaction.amount : transaction.amount}
                    currency={transaction.currency}
                    signed
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg lg:col-span-5">
          <div className="mb-space-md flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Recurring bills</h2>
            <Link to="/bills" className="font-label-md text-label-md text-info-sky hover:text-slate-navy-deep">
              Manage →
            </Link>
          </div>
          {upcomingBills.length === 0 ? (
            <EmptyState icon="calendar_clock" title="No recurring bills" description="Add a recurring bill to track upcoming commitments." />
          ) : (
            <div className="flex flex-col gap-space-xs">
              {upcomingBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between rounded-lg bg-slate-surface p-space-xs">
                  <div className="flex flex-col">
                    <span className="font-body-md text-body-md font-medium text-on-surface">{bill.name}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Due day {bill.due_day} · <StatusChip tone="info">{bill.frequency}</StatusChip>
                    </span>
                  </div>
                  <Money value={bill.amount} currency={bill.currency} size="table" />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}

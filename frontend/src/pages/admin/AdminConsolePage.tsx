import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { inputClass } from '../../components/forms'
import { Banner } from '../../components/Banner'
import { ErrorState, LoadingState } from '../../components/States'
import { useAdminAuth } from '../../lib/adminAuth'
import { getTenantSummary, searchTenantByEmail } from '../../lib/resources/admin'
import { getErrorMessage } from '../../lib/errors'
import type { AdminTenantSearchResult, AdminTenantSummary } from '../../lib/types'

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-space-3xs rounded-lg bg-slate-surface p-space-sm text-center">
      <span className="font-currency-stat text-currency-stat text-on-surface">{value}</span>
      <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
    </div>
  )
}

export function AdminConsolePage() {
  const { staff, logout } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AdminTenantSearchResult | null>(null)
  const [summary, setSummary] = useState<AdminTenantSummary | null>(null)

  function handleLogout() {
    logout()
    navigate('/admin/login', { replace: true })
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    setSummary(null)
    try {
      const found = await searchTenantByEmail(email.trim().toLowerCase())
      setResult(found)
      const tenantSummary = await getTenantSummary(found.tenant_id)
      setSummary(tenantSummary)
    } catch (err) {
      setError(getErrorMessage(err, 'No tenant matched that email address.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between bg-slate-navy-deep px-space-xl py-space-sm text-on-primary">
        <div className="flex items-center gap-space-xs">
          <Icon name="admin_panel_settings" className="text-[22px]" />
          <span className="font-headline-sm text-headline-sm">Staff console</span>
        </div>
        <div className="flex items-center gap-space-md">
          <span className="font-label-sm text-label-sm">{staff?.email}</span>
          <button type="button" onClick={handleLogout} className="flex items-center gap-space-2xs font-label-sm text-label-sm hover:underline">
            <Icon name="logout" className="text-[16px]" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-space-lg p-space-lg">
        <Banner tone="locked" title="Isolated session, same origin">
          This console uses its own in-memory session, separate from any consumer session in this
          browser. It is not yet deployed on a fully separate origin — that infrastructure change
          is still outstanding against FR-11.3.
        </Banner>

        <section className="rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
          <h2 className="mb-space-sm font-headline-sm text-headline-sm text-on-surface">Look up a tenant</h2>
          <form onSubmit={handleSearch} className="flex items-center gap-space-sm">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              className={`flex-1 ${inputClass}`}
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-space-2xs rounded-lg bg-slate-navy-deep px-space-md py-space-sm font-label-md text-label-md text-on-primary hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="search" className="text-[18px]" />
              Search
            </button>
          </form>
        </section>

        {loading && <LoadingState label="Looking up tenant…" />}
        {error && !loading && <ErrorState message={error} />}

        {result && !loading && (
          <section className="flex flex-col gap-space-md rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-title text-title text-on-surface">{result.full_name}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{result.email}</span>
              </div>
              <span className="rounded bg-surface-container px-space-xs py-space-3xs font-label-sm text-label-sm text-on-surface-variant">
                Role: {result.role}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Tenant ID: <span className="font-mono">{result.tenant_id}</span>
            </p>
            <div className="grid grid-cols-2 gap-space-sm sm:grid-cols-3">
              <StatBlock label="Accounts" value={result.account_count} />
              <StatBlock label="Categories" value={result.category_count} />
              <StatBlock label="Transactions" value={result.transaction_count} />
              <StatBlock label="Recurring bills" value={result.recurring_bill_count} />
              <StatBlock label="Savings goals" value={result.savings_goal_count} />
              <StatBlock label="Notifications" value={result.notification_count} />
            </div>
            {summary && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {summary.user_count} user{summary.user_count === 1 ? '' : 's'} on this tenant. This
                console shows counts only — no account balances, transaction amounts or notes are
                displayed here.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

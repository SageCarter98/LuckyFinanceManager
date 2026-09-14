import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { Banner } from '../components/Banner'
import { Money } from '../components/Money'
import { StatusChip } from '../components/StatusChip'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState, LoadingState } from '../components/States'
import { Icon } from '../components/Icon'
import { ApiError } from '../lib/api'
import {
  getGrossBalance,
  getLinkedAccount,
  listLinkedAccounts,
  reauthorizeLinkedAccount,
  syncLinkedAccount,
  unlinkAccount,
} from '../lib/resources/banking'
import { getErrorMessage } from '../lib/errors'
import { formatDate } from '../lib/locale'
import { useAuth } from '../lib/auth'
import type { GrossBalanceRead, LinkedAccountDetailRead, LinkedAccountRead } from '../lib/types'

function ReadOnlyBadge() {
  return (
    <StatusChip tone="neutral">
      <Icon name="visibility" className="text-[14px]" />
      Read-only
    </StatusChip>
  )
}

function groupByInstitution(accounts: LinkedAccountRead[]) {
  const groups = new Map<string, LinkedAccountRead[]>()
  for (const account of accounts) {
    const list = groups.get(account.institution_name) ?? []
    list.push(account)
    groups.set(account.institution_name, list)
  }
  return groups
}

export function BankingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [entitled, setEntitled] = useState(true)
  const [accounts, setAccounts] = useState<LinkedAccountRead[]>([])
  const [grossBalance, setGrossBalance] = useState<GrossBalanceRead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<LinkedAccountDetailRead | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [busyId, setBusyId] = useState<string | null>(null)
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedAccountRead | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    setEntitled(true)
    Promise.all([listLinkedAccounts(), getGrossBalance()])
      .then(([accountsResult, grossBalanceResult]) => {
        setAccounts(accountsResult)
        setGrossBalance(grossBalanceResult)
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 402) {
          setEntitled(false)
          return
        }
        setError(getErrorMessage(err))
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function toggleExpanded(account: LinkedAccountRead) {
    if (expandedId === account.id) {
      setExpandedId(null)
      setDetail(null)
      return
    }
    setExpandedId(account.id)
    setDetail(null)
    setDetailLoading(true)
    try {
      const result = await getLinkedAccount(account.id)
      setDetail(result)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load recent transactions.'))
    } finally {
      setDetailLoading(false)
    }
  }

  // Balance-affecting actions (sync changes it, reauthorize resumes an
  // account gross-balance excludes while lapsed, unlink removes one
  // entirely) all need this -- accounts state alone isn't enough, the
  // consolidated total is a separate query result that goes stale otherwise.
  function refreshGrossBalance() {
    getGrossBalance()
      .then(setGrossBalance)
      .catch((err) => setError(getErrorMessage(err, 'Could not refresh Gross Balance.')))
  }

  async function handleSync(account: LinkedAccountRead) {
    setBusyId(account.id)
    try {
      const updated = await syncLinkedAccount(account.id)
      setAccounts((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      refreshGrossBalance()
    } catch (err) {
      setError(getErrorMessage(err, 'Sync failed.'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleReauthorize(account: LinkedAccountRead) {
    setBusyId(account.id)
    try {
      const updated = await reauthorizeLinkedAccount(account.id)
      setAccounts((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      refreshGrossBalance()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not re-authorize this account.'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleUnlink() {
    if (!unlinkTarget) return
    setBusyId(unlinkTarget.id)
    try {
      await unlinkAccount(unlinkTarget.id)
      setAccounts((current) => current.filter((item) => item.id !== unlinkTarget.id))
      if (expandedId === unlinkTarget.id) {
        setExpandedId(null)
        setDetail(null)
      }
      setUnlinkTarget(null)
      refreshGrossBalance()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not unlink this account.'))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <LoadingState label="Loading linked accounts…" />
      </AppShell>
    )
  }

  if (!entitled) {
    return (
      <AppShell>
        <PageHeader eyebrow="Banking" title="Read-only bank linking" />
        <EmptyState
          icon="workspace_premium"
          title="A subscription unlocks bank linking"
          description="Manual accounts, transactions, budgets, bills, goals and reports stay free either way. Bank linking and Gross Balance are subscription-only features."
          action={
            <Link
              to="/subscription"
              className="rounded-lg bg-slate-navy-deep px-space-md py-space-sm font-label-md text-label-md text-on-primary hover:bg-primary-container"
            >
              View subscription options
            </Link>
          }
        />
      </AppShell>
    )
  }

  const groups = groupByInstitution(accounts)

  return (
    <AppShell>
      <div className="flex flex-col gap-space-lg">
        <PageHeader
          eyebrow="Banking"
          title="Linked accounts"
          description="Read-only. This platform never initiates payments or transfers, and never sees your bank credentials — linking hands off to a provider-hosted flow."
          actions={
            <button
              type="button"
              onClick={() => navigate('/banking/link')}
              className="flex items-center gap-space-xs rounded-lg bg-slate-navy-deep px-space-md py-space-sm font-label-md text-label-md text-on-primary hover:bg-primary-container"
            >
              <Icon name="add_link" className="text-[18px]" />
              Link an account
            </button>
          }
        />

        {error && (
          <Banner tone="error" title="Something went wrong">
            {error}
          </Banner>
        )}

        {accounts.length === 0 ? (
          <EmptyState
            icon="account_balance"
            title="No linked accounts yet"
            description="Link a bank account to see its balance here, read-only. Manual accounts are managed separately on the Accounts page."
            action={
              <button
                type="button"
                onClick={() => navigate('/banking/link')}
                className="rounded-lg bg-slate-navy-deep px-space-md py-space-sm font-label-md text-label-md text-on-primary hover:bg-primary-container"
              >
                Link an account
              </button>
            }
          />
        ) : (
          <>
            {grossBalance && (
              <section className="flex flex-col gap-space-sm rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
                <div className="flex items-center justify-between gap-space-sm">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Gross Balance</h2>
                  <ReadOnlyBadge />
                </div>
                <Money value={grossBalance.total_converted} currency={grossBalance.display_currency} size="display" />
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Approximate — converted using {grossBalance.rate_basis}, rates as of{' '}
                  {formatDate(grossBalance.rates_as_of, { dateStyle: 'medium' }, user?.timezone)}.
                </p>
                {grossBalance.accounts.some((line) => line.native_currency !== grossBalance.display_currency) && (
                  <ul className="flex flex-col gap-space-3xs font-body-sm text-body-sm text-on-surface-variant">
                    {grossBalance.accounts
                      .filter((line) => line.native_currency !== grossBalance.display_currency)
                      .map((line) => (
                        <li key={line.linked_account_id}>
                          1 {line.native_currency} = {line.rate.toFixed(6)} {grossBalance.display_currency} (
                          {line.institution_name})
                        </li>
                      ))}
                  </ul>
                )}
              </section>
            )}

            <div className="flex flex-col gap-space-md">
              {Array.from(groups.entries()).map(([institutionName, institutionAccounts]) => (
                <section
                  key={institutionName}
                  className="flex flex-col gap-space-sm rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg"
                >
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">{institutionName}</h3>
                  <div className="flex flex-col divide-y divide-surface-container">
                    {institutionAccounts.map((account) => (
                      <div key={account.id} className="flex flex-col gap-space-sm py-space-sm">
                        <div className="flex flex-wrap items-center justify-between gap-space-sm">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(account)}
                            className="flex items-center gap-space-sm text-left"
                          >
                            <Icon
                              name={expandedId === account.id ? 'expand_less' : 'expand_more'}
                              className="text-[18px] text-on-surface-variant"
                            />
                            <span className="flex flex-col">
                              <span className="font-body-md text-body-md font-medium text-on-surface">
                                {account.account_type} •••• {account.account_number_last4}
                              </span>
                              <span className="font-body-sm text-body-sm text-on-surface-variant">
                                {account.last_sync_failed
                                  ? 'Last sync failed — balance may be out of date'
                                  : account.last_synced_at
                                    ? `Synced ${formatDate(account.last_synced_at, { dateStyle: 'medium', timeStyle: 'short' }, user?.timezone)}`
                                    : 'Not synced yet'}
                              </span>
                            </span>
                          </button>
                          <div className="flex items-center gap-space-sm">
                            <ReadOnlyBadge />
                            {account.consent_status === 'lapsed' ? (
                              <StatusChip tone="warning">Re-authorization needed</StatusChip>
                            ) : (
                              <Money value={account.current_balance} currency={account.native_currency} />
                            )}
                          </div>
                        </div>

                        {account.consent_status === 'lapsed' ? (
                          <Banner tone="warning" title="Consent lapsed">
                            Syncing is suspended for this account. Last-known balance shown above as of{' '}
                            {account.last_synced_at
                              ? formatDate(account.last_synced_at, { dateStyle: 'medium' }, user?.timezone)
                              : 'last link'}
                            .
                            <div className="mt-space-xs">
                              <button
                                type="button"
                                disabled={busyId === account.id}
                                onClick={() => handleReauthorize(account)}
                                className="font-label-sm text-label-sm font-semibold text-info-sky hover:underline disabled:opacity-50"
                              >
                                Re-authorize
                              </button>
                            </div>
                          </Banner>
                        ) : (
                          <div className="flex items-center gap-space-md pl-space-lg">
                            <button
                              type="button"
                              disabled={busyId === account.id}
                              onClick={() => handleSync(account)}
                              className="flex items-center gap-space-3xs font-label-sm text-label-sm text-info-sky hover:underline disabled:opacity-50"
                            >
                              <Icon name="sync" className="text-[16px]" />
                              {busyId === account.id ? 'Syncing…' : 'Sync now'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setUnlinkTarget(account)}
                              className="flex items-center gap-space-3xs font-label-sm text-label-sm text-expense-crimson hover:underline"
                            >
                              <Icon name="link_off" className="text-[16px]" />
                              Unlink
                            </button>
                          </div>
                        )}

                        {expandedId === account.id && (
                          <div className="ml-space-lg rounded-lg bg-surface-container p-space-sm">
                            <p className="mb-space-2xs font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                              Recent transactions — linked, not manually entered
                            </p>
                            {detailLoading ? (
                              <LoadingState label="Loading transactions…" />
                            ) : detail && detail.id === account.id && detail.recent_transactions.length > 0 ? (
                              <div className="flex flex-col divide-y divide-surface-container-lowest">
                                {detail.recent_transactions.map((txn) => (
                                  <div key={txn.id} className="flex items-center justify-between gap-space-sm py-space-2xs">
                                    <span className="font-body-sm text-body-sm text-on-surface">
                                      {txn.description}
                                      <span className="ml-space-xs text-on-surface-variant">
                                        {formatDate(txn.transaction_date, { dateStyle: 'medium' }, user?.timezone)}
                                      </span>
                                    </span>
                                    <Money value={txn.amount} currency={txn.currency} signed size="table" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="font-body-sm text-body-sm text-on-surface-variant">
                                No recent transactions.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={unlinkTarget !== null}
        title="Unlink account"
        description={
          unlinkTarget
            ? `Access to ${unlinkTarget.institution_name} •••• ${unlinkTarget.account_number_last4} will be revoked and its cached transaction detail permanently deleted.`
            : ''
        }
        confirmLabel="Unlink account"
        destructive
        busy={busyId === unlinkTarget?.id}
        onConfirm={handleUnlink}
        onCancel={() => setUnlinkTarget(null)}
      />
    </AppShell>
  )
}

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { Field, inputClass } from '../components/forms'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Money } from '../components/Money'
import { Icon } from '../components/Icon'
import { createAccount, deleteAccount, listAccounts, updateAccount } from '../lib/resources/accounts'
import { getErrorMessage } from '../lib/errors'
import type { AccountRead, AccountType } from '../lib/types'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'JPY', 'CHF']

const TYPE_GROUPS: { type: AccountType; label: string; icon: string }[] = [
  { type: 'checking', label: 'Checking', icon: 'payments' },
  { type: 'savings', label: 'Savings', icon: 'savings' },
  { type: 'credit', label: 'Credit', icon: 'credit_card' },
]

interface FormState {
  name: string
  accountType: AccountType
  nativeCurrency: string
  currentBalance: string
}

const emptyForm: FormState = { name: '', accountType: 'checking', nativeCurrency: 'USD', currentBalance: '0' }

/** Groups accounts by type; within a group, sums balances only when every account shares one currency. */
function summarizeGroup(accounts: AccountRead[]): string {
  if (accounts.length === 0) return ''
  const currencies = new Set(accounts.map((account) => account.native_currency))
  if (currencies.size > 1) return 'Mixed currencies — see each account below'
  const total = accounts.reduce((sum, account) => sum + account.current_balance, 0)
  return `Subtotal: ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${accounts[0].native_currency}`
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [pendingDelete, setPendingDelete] = useState<AccountRead | null>(null)
  const [deleting, setDeleting] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    listAccounts()
      .then(setAccounts)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const grouped = useMemo(() => {
    return TYPE_GROUPS.map((group) => ({
      ...group,
      accounts: accounts.filter((account) => account.account_type === group.type),
    })).filter((group) => group.accounts.length > 0)
  }, [accounts])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setDrawerOpen(true)
  }

  function openEdit(account: AccountRead) {
    setEditingId(account.id)
    setForm({
      name: account.name,
      accountType: account.account_type,
      nativeCurrency: account.native_currency,
      currentBalance: String(account.current_balance),
    })
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        // Native currency is permanent after creation (SRS FR-4.4) — never sent on update.
        const updated = await updateAccount(editingId, {
          name: form.name.trim(),
          account_type: form.accountType,
          current_balance: Number(form.currentBalance) || 0,
        })
        setAccounts((current) => current.map((item) => (item.id === editingId ? updated : item)))
      } else {
        const created = await createAccount({
          name: form.name.trim(),
          account_type: form.accountType,
          native_currency: form.nativeCurrency,
          current_balance: Number(form.currentBalance) || 0,
        })
        setAccounts((current) => [created, ...current])
      }
      closeDrawer()
    } catch (err) {
      setFormError(getErrorMessage(err, 'We could not save this account.'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteAccount(pendingDelete.id)
      setAccounts((current) => current.filter((item) => item.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (err) {
      setError(getErrorMessage(err, 'We could not delete this account.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Your money"
        title="Accounts"
        description="Manual checking, savings and credit accounts. Balances update automatically from transactions you log."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-space-xs rounded-xl bg-primary px-space-md py-space-sm text-on-primary shadow-md transition-colors hover:bg-slate-navy-deep"
          >
            <Icon name="add_circle" className="text-[20px]" />
            <span className="font-label-md text-label-md">Add account</span>
          </button>
        }
      />

      {loading ? (
        <LoadingState label="Loading accounts…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon="account_balance"
          title="No accounts yet"
          description="Add your first checking, savings or credit account to start tracking balances."
        />
      ) : (
        <div className="flex flex-col gap-space-xl">
          {grouped.map((group) => (
            <div key={group.type} className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-space-sm py-space-xs">
                <div className="flex items-center gap-space-sm">
                  <Icon name={group.icon} className="text-[18px] text-on-surface-variant" />
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">{group.label}</h2>
                  <span className="rounded-full bg-surface-container px-space-xs py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                    {group.accounts.length} active
                  </span>
                </div>
                <span className="font-currency-table text-currency-table text-on-surface-variant">
                  {summarizeGroup(group.accounts)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-space-md lg:grid-cols-2">
                {group.accounts.map((account) => (
                  <article
                    key={account.id}
                    className="flex flex-col justify-between gap-space-md rounded-lg border border-slate-border bg-surface-container-lowest p-space-md shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-space-sm">
                      <div className="flex items-center gap-space-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-on-surface">
                          <Icon name={group.icon} className="text-[20px]" />
                        </div>
                        <h3 className="font-title text-title text-on-surface">{account.name}</h3>
                      </div>
                      <span className="rounded-md bg-surface-container-low px-space-xs py-space-3xs font-label-sm text-label-sm text-on-surface">
                        {group.label}
                      </span>
                    </div>

                    <div className="flex flex-col gap-space-3xs rounded-xl bg-surface-container-low p-space-sm">
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                        Current balance
                      </span>
                      <Money value={account.current_balance} currency={account.native_currency} size="stat" />
                    </div>

                    <div className="flex items-center justify-between border-t border-surface-container pt-space-xs">
                      <span className="flex items-center gap-space-2xs font-body-sm text-body-sm text-on-surface-variant">
                        <Icon name="lock" className="text-[14px] text-growth-emerald-deep" />
                        Native currency locked: {account.native_currency}
                      </span>
                      <div className="flex items-center gap-space-2xs">
                        <button
                          type="button"
                          onClick={() => openEdit(account)}
                          className="rounded-lg p-space-2xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                          title="Edit"
                        >
                          <Icon name="edit" className="text-[18px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(account)}
                          className="rounded-lg p-space-2xs text-on-surface-variant transition-colors hover:bg-expense-crimson-tint hover:text-expense-crimson"
                          title="Delete"
                        >
                          <Icon name="delete" className="text-[18px]" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-navy-deep/45 backdrop-blur-sm"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-surface-container-lowest shadow-2xl">
            <div className="flex items-center justify-between bg-surface-container-low p-space-lg">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                {editingId ? 'Edit account' : 'Create new account'}
              </h2>
              <button type="button" onClick={closeDrawer} className="rounded-lg p-space-2xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-space-lg overflow-y-auto p-space-lg">
              {formError && (
                <p className="font-body-sm text-body-sm text-expense-crimson" role="alert">
                  {formError}
                </p>
              )}
              <Field label="Account name" required htmlFor="acc-name">
                <input
                  id="acc-name"
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className={inputClass}
                  placeholder="Main checking"
                />
              </Field>
              <Field label="Account type" required htmlFor="acc-type">
                <select
                  id="acc-type"
                  value={form.accountType}
                  onChange={(event) => setForm((current) => ({ ...current, accountType: event.target.value as AccountType }))}
                  className={inputClass}
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="credit">Credit</option>
                </select>
              </Field>
              <Field
                label="Native currency"
                required
                htmlFor="acc-currency"
                hint={editingId ? "Locked — currency can't change after an account is created." : undefined}
              >
                <select
                  id="acc-currency"
                  value={form.nativeCurrency}
                  disabled={Boolean(editingId)}
                  onChange={(event) => setForm((current) => ({ ...current, nativeCurrency: event.target.value }))}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={editingId ? 'Current balance' : 'Opening balance'} htmlFor="acc-balance">
                <input
                  id="acc-balance"
                  type="number"
                  step="0.01"
                  value={form.currentBalance}
                  onChange={(event) => setForm((current) => ({ ...current, currentBalance: event.target.value }))}
                  className={inputClass}
                />
              </Field>

              <div className="mt-auto flex items-center gap-space-sm pt-space-lg">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="flex-1 rounded-xl bg-surface-container py-space-sm font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-primary-container py-space-sm font-label-md text-label-md text-on-primary shadow transition-colors hover:bg-slate-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create account'}
                </button>
              </div>
            </form>
          </aside>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete account"
        description={`"${pendingDelete?.name}" will be permanently deleted. This cannot be undone, and any transactions already logged against it are not moved automatically.`}
        confirmLabel="Delete account"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  )
}

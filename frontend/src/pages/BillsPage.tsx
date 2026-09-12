import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { Field, inputClass } from '../components/forms'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StatusChip } from '../components/StatusChip'
import { Money } from '../components/Money'
import { Icon } from '../components/Icon'
import { listAccounts } from '../lib/resources/accounts'
import { listCategories } from '../lib/resources/categories'
import {
  createRecurringBill,
  deleteRecurringBill,
  generateDueRecurringBills,
  listRecurringBills,
  updateRecurringBill,
} from '../lib/resources/recurringBills'
import { getErrorMessage } from '../lib/errors'
import type { AccountRead, BillFrequency, CategoryRead, RecurringBillRead } from '../lib/types'

interface FormState {
  name: string
  accountId: string
  categoryId: string
  amount: string
  currency: string
  frequency: BillFrequency
  dueDay: string
}

function emptyForm(defaultAccountId: string, defaultCurrency: string): FormState {
  return {
    name: '',
    accountId: defaultAccountId,
    categoryId: '',
    amount: '',
    currency: defaultCurrency,
    frequency: 'monthly',
    dueDay: '1',
  }
}

const dueDayHint: Record<BillFrequency, string> = {
  weekly: 'Day of week: 1 = Monday … 7 = Sunday',
  monthly: 'Day of month (1-31)',
  yearly: 'Day in January (the backend only checks January dates for yearly bills)',
}

export function BillsPage() {
  const [accounts, setAccounts] = useState<AccountRead[]>([])
  const [categories, setCategories] = useState<CategoryRead[]>([])
  const [bills, setBills] = useState<RecurringBillRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm('', 'USD'))
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [pendingDelete, setPendingDelete] = useState<RecurringBillRead | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([listAccounts(), listCategories(), listRecurringBills()])
      .then(([accountsRes, categoriesRes, billsRes]) => {
        setAccounts(accountsRes)
        setCategories(categoriesRes)
        setBills(billsRes)
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const accountName = useMemo(() => {
    const map = new Map(accounts.map((account) => [account.id, account.name]))
    return (id: string) => map.get(id) ?? 'Unknown account'
  }, [accounts])

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((category) => [category.id, category.name]))
    return (id: string | null) => (id ? map.get(id) ?? null : null)
  }, [categories])

  function openCreate() {
    const defaultAccount = accounts[0]
    setEditingId(null)
    setForm(emptyForm(defaultAccount?.id ?? '', defaultAccount?.native_currency ?? 'USD'))
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(bill: RecurringBillRead) {
    setEditingId(bill.id)
    setForm({
      name: bill.name,
      accountId: bill.account_id,
      categoryId: bill.category_id ?? '',
      amount: String(bill.amount),
      currency: bill.currency,
      frequency: bill.frequency,
      dueDay: String(bill.due_day),
    })
    setFormError(null)
    setShowForm(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.accountId || !form.amount) return
    setSaving(true)
    setFormError(null)
    const payload = {
      name: form.name.trim(),
      account_id: form.accountId,
      category_id: form.categoryId || null,
      amount: Number(form.amount),
      currency: form.currency,
      frequency: form.frequency,
      due_day: Number(form.dueDay) || 1,
    }
    try {
      if (editingId) {
        const updated = await updateRecurringBill(editingId, payload)
        setBills((current) => current.map((item) => (item.id === editingId ? updated : item)))
      } else {
        const created = await createRecurringBill(payload)
        setBills((current) => [created, ...current])
      }
      setShowForm(false)
    } catch (err) {
      setFormError(getErrorMessage(err, 'We could not save this recurring bill.'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(bill: RecurringBillRead) {
    try {
      const updated = await updateRecurringBill(bill.id, { is_active: !bill.is_active })
      setBills((current) => current.map((item) => (item.id === bill.id ? updated : item)))
    } catch (err) {
      setError(getErrorMessage(err, 'We could not update this bill.'))
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteRecurringBill(pendingDelete.id)
      setBills((current) => current.filter((item) => item.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (err) {
      setError(getErrorMessage(err, 'We could not delete this bill.'))
    } finally {
      setDeleting(false)
    }
  }

  async function handleGenerateDue() {
    setGenerating(true)
    setGenerateError(null)
    setGenerateResult(null)
    try {
      const result = await generateDueRecurringBills()
      setGenerateResult(
        result.generated > 0
          ? `Generated ${result.generated} transaction${result.generated === 1 ? '' : 's'} for bills due today. Check Transactions for the new entries.`
          : 'Nothing was due today — no transactions were generated.',
      )
    } catch (err) {
      setGenerateError(getErrorMessage(err, 'We could not run the due-bill check.'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Automated commitments"
        title="Recurring bills"
        description="Define a recurring amount, account and schedule. Generating due bills creates a real transaction and adjusts the account balance — it's safe to run more than once, it won't double-create for the same period."
        actions={
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              onClick={handleGenerateDue}
              disabled={generating}
              className="flex items-center gap-space-xs rounded-xl bg-surface-container-lowest px-space-md py-space-sm text-on-surface shadow-sm transition-colors hover:bg-slate-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="sync" className="text-[18px]" />
              <span className="font-label-md text-label-md">{generating ? 'Checking…' : 'Generate due bills now'}</span>
            </button>
            <button
              type="button"
              onClick={openCreate}
              disabled={loading}
              className="flex items-center gap-space-xs rounded-xl bg-primary px-space-md py-space-sm text-on-primary shadow-md transition-colors hover:bg-slate-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="add_circle" className="text-[20px]" />
              <span className="font-label-md text-label-md">New bill</span>
            </button>
          </div>
        }
      />

      {generateResult && (
        <div className="rounded-lg bg-growth-emerald-tint p-space-sm font-body-sm text-body-sm text-growth-emerald-deep">
          {generateResult}
        </div>
      )}
      {generateError && (
        <div className="rounded-lg bg-expense-crimson-tint p-space-sm font-body-sm text-body-sm text-expense-crimson" role="alert">
          {generateError}
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading recurring bills…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : bills.length === 0 ? (
        <EmptyState icon="calendar_clock" title="No recurring bills yet" description="Add a recurring bill to automate its transaction on schedule." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-border bg-surface-container-lowest">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-table-header-fill font-label-sm text-label-sm uppercase tracking-wider text-slate-navy-deep">
                <th className="px-table-cell-x py-table-cell-y">Name</th>
                <th className="px-table-cell-x py-table-cell-y">Account</th>
                <th className="px-table-cell-x py-table-cell-y">Category</th>
                <th className="px-table-cell-x py-table-cell-y">Schedule</th>
                <th className="px-table-cell-x py-table-cell-y text-right">Amount</th>
                <th className="px-table-cell-x py-table-cell-y text-center">Status</th>
                <th className="px-table-cell-x py-table-cell-y text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-surface-subtle font-body-md text-body-md">
              {bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-surface">
                  <td className="px-table-cell-x py-table-cell-y font-medium text-on-surface">{bill.name}</td>
                  <td className="whitespace-nowrap px-table-cell-x py-table-cell-y text-on-surface-variant">{accountName(bill.account_id)}</td>
                  <td className="whitespace-nowrap px-table-cell-x py-table-cell-y text-on-surface-variant">
                    {categoryName(bill.category_id) ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-table-cell-x py-table-cell-y text-on-surface-variant">
                    {bill.frequency} · day {bill.due_day}
                  </td>
                  <td className="px-table-cell-x py-table-cell-y text-right">
                    <Money value={bill.amount} currency={bill.currency} size="table" />
                  </td>
                  <td className="px-table-cell-x py-table-cell-y text-center">
                    <button type="button" onClick={() => toggleActive(bill)}>
                      <StatusChip tone={bill.is_active ? 'positive' : 'neutral'}>{bill.is_active ? 'Active' : 'Paused'}</StatusChip>
                    </button>
                  </td>
                  <td className="px-table-cell-x py-table-cell-y">
                    <div className="flex items-center justify-center gap-space-2xs">
                      <button type="button" onClick={() => openEdit(bill)} className="rounded-lg p-space-2xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface" title="Edit">
                        <Icon name="edit" className="text-[18px]" />
                      </button>
                      <button type="button" onClick={() => setPendingDelete(bill)} className="rounded-lg p-space-2xs text-on-surface-variant hover:bg-expense-crimson-tint hover:text-expense-crimson" title="Delete">
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-navy-deep/45 p-space-md backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-surface-container-lowest p-space-lg shadow-2xl">
            <div className="mb-space-md flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">{editingId ? 'Edit recurring bill' : 'New recurring bill'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
            {formError && (
              <p className="mb-space-sm font-body-sm text-body-sm text-expense-crimson" role="alert">
                {formError}
              </p>
            )}
            {accounts.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Add an account first — recurring bills need an account to draw from.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
                <Field label="Name" required htmlFor="bill-name">
                  <input
                    id="bill-name"
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className={inputClass}
                    placeholder="Rent"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-space-sm">
                  <Field label="Account" required htmlFor="bill-account">
                    <select
                      id="bill-account"
                      value={form.accountId}
                      onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
                      className={inputClass}
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Category" htmlFor="bill-category" hint="Optional">
                    <select
                      id="bill-category"
                      value={form.categoryId}
                      onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                      className={inputClass}
                    >
                      <option value="">No category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-space-sm">
                  <Field label="Amount" required htmlFor="bill-amount">
                    <input
                      id="bill-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={form.amount}
                      onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Currency" required htmlFor="bill-currency">
                    <input
                      id="bill-currency"
                      required
                      value={form.currency}
                      onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                      className={inputClass}
                      maxLength={10}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-space-sm">
                  <Field label="Frequency" required htmlFor="bill-frequency">
                    <select
                      id="bill-frequency"
                      value={form.frequency}
                      onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value as BillFrequency }))}
                      className={inputClass}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </Field>
                  <Field label="Due day" required htmlFor="bill-due-day" hint={dueDayHint[form.frequency]}>
                    <input
                      id="bill-due-day"
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={form.dueDay}
                      onChange={(event) => setForm((current) => ({ ...current, dueDay: event.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary py-space-sm font-label-md text-label-md text-on-primary transition-colors hover:bg-slate-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create bill'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete recurring bill"
        description={`"${pendingDelete?.name}" will be permanently removed. Transactions it already generated are not affected.`}
        confirmLabel="Delete bill"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  )
}

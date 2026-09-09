import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { Field, inputClass } from '../components/forms'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Money } from '../components/Money'
import { Icon } from '../components/Icon'
import { listAccounts } from '../lib/resources/accounts'
import { listCategories } from '../lib/resources/categories'
import {
  DEFAULT_TRANSACTION_PAGE_SIZE,
  createTransaction,
  deleteTransaction,
  importTransactionsCsv,
  listTransactions,
  updateTransaction,
} from '../lib/resources/transactions'
import { getErrorMessage } from '../lib/errors'
import { formatDate as formatLocaleDate, formatNumber } from '../lib/locale'
import type { AccountRead, CategoryRead, TransactionFilters, TransactionRead, TransactionType } from '../lib/types'

interface FormState {
  accountId: string
  categoryId: string
  transactionType: TransactionType
  amount: string
  currency: string
  transactionDate: string
  note: string
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm(defaultAccountId: string, defaultCurrency: string): FormState {
  return {
    accountId: defaultAccountId,
    categoryId: '',
    transactionType: 'expense',
    amount: '',
    currency: defaultCurrency,
    transactionDate: todayIso(),
    note: '',
  }
}

function formatDate(value: string) {
  // transaction_date is a plain calendar date with no time component --
  // always render in UTC so it can't shift a day earlier/later for users
  // west of UTC (new Date('2026-01-05') parses as UTC midnight).
  return formatLocaleDate(value, { month: 'short', day: 'numeric', year: 'numeric' }, 'UTC')
}

export function TransactionsPage() {
  const [accounts, setAccounts] = useState<AccountRead[]>([])
  const [categories, setCategories] = useState<CategoryRead[]>([])
  const [transactions, setTransactions] = useState<TransactionRead[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<TransactionFilters>({})

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm('', 'USD'))
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [pendingDelete, setPendingDelete] = useState<TransactionRead | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [importBusy, setImportBusy] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function loadReference() {
    return Promise.all([listAccounts(), listCategories()]).then(([accountsRes, categoriesRes]) => {
      setAccounts(accountsRes)
      setCategories(categoriesRes)
    })
  }

  function loadTransactions(activeFilters: TransactionFilters) {
    setLoading(true)
    setError(null)
    return listTransactions(activeFilters, { limit: DEFAULT_TRANSACTION_PAGE_SIZE, offset: 0 })
      .then((page) => {
        setTransactions(page)
        setHasMore(page.length === DEFAULT_TRANSACTION_PAGE_SIZE)
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  function loadMoreTransactions() {
    setLoadingMore(true)
    listTransactions(filters, { limit: DEFAULT_TRANSACTION_PAGE_SIZE, offset: transactions.length })
      .then((page) => {
        setTransactions((current) => [...current, ...page])
        setHasMore(page.length === DEFAULT_TRANSACTION_PAGE_SIZE)
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoadingMore(false))
  }

  useEffect(() => {
    loadReference().catch((err) => setError(getErrorMessage(err)))
    loadTransactions(filters)
    // Reference lists (accounts/categories) only need loading once; transactions reload on filter change below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadTransactions(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.account_id, filters.category_id, filters.start_date, filters.end_date])

  const accountName = useMemo(() => {
    const map = new Map(accounts.map((account) => [account.id, account.name]))
    return (id: string) => map.get(id) ?? 'Unknown account'
  }, [accounts])

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((category) => [category.id, category.name]))
    return (id: string | null) => (id ? map.get(id) ?? 'Unknown category' : null)
  }, [categories])

  function updateFilter(patch: Partial<TransactionFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
  }

  function openCreate() {
    const defaultAccount = accounts[0]
    setEditingId(null)
    setForm(emptyForm(defaultAccount?.id ?? '', defaultAccount?.native_currency ?? 'USD'))
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(transaction: TransactionRead) {
    setEditingId(transaction.id)
    setForm({
      accountId: transaction.account_id,
      categoryId: transaction.category_id ?? '',
      transactionType: transaction.transaction_type,
      amount: String(transaction.amount),
      currency: transaction.currency,
      transactionDate: transaction.transaction_date,
      note: transaction.note ?? '',
    })
    setFormError(null)
    setShowForm(true)
  }

  function handleAccountChange(accountId: string) {
    const account = accounts.find((item) => item.id === accountId)
    setForm((current) => ({
      ...current,
      accountId,
      // Default the transaction currency to the newly selected account's native currency,
      // but this stays editable — currency is explicit per transaction (SRS FR-6.1).
      currency: editingId ? current.currency : account?.native_currency ?? current.currency,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.accountId || !form.amount) return
    setSaving(true)
    setFormError(null)
    const payload = {
      account_id: form.accountId,
      category_id: form.categoryId || null,
      transaction_type: form.transactionType,
      amount: Number(form.amount),
      currency: form.currency,
      transaction_date: form.transactionDate || null,
      note: form.note.trim() || null,
    }
    try {
      if (editingId) {
        const updated = await updateTransaction(editingId, payload)
        setTransactions((current) => current.map((item) => (item.id === editingId ? updated : item)))
      } else {
        const created = await createTransaction(payload)
        setTransactions((current) => [created, ...current])
      }
      setShowForm(false)
    } catch (err) {
      setFormError(getErrorMessage(err, 'We could not save this transaction.'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteTransaction(pendingDelete.id)
      setTransactions((current) => current.filter((item) => item.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (err) {
      setError(getErrorMessage(err, 'We could not delete this transaction.'))
    } finally {
      setDeleting(false)
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setImportBusy(true)
    setImportError(null)
    setImportResult(null)
    try {
      const result = await importTransactionsCsv(file)
      setImportResult(`Imported ${result.imported} transaction${result.imported === 1 ? '' : 's'}.`)
      await loadTransactions(filters)
    } catch (err) {
      setImportError(getErrorMessage(err, 'We could not import that file.'))
    } finally {
      setImportBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Money movement"
        title="Transactions"
        description="Every transaction adjusts its account's balance automatically. Amounts keep their own currency — nothing here is converted."
        actions={
          <button
            type="button"
            onClick={openCreate}
            disabled={accounts.length === 0}
            className="flex items-center gap-space-xs rounded-xl bg-primary px-space-md py-space-sm text-on-primary shadow-md transition-colors hover:bg-slate-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="add_circle" className="text-[20px]" />
            <span className="font-label-md text-label-md">Add transaction</span>
          </button>
        }
      />

      {accounts.length === 0 && !loading && (
        <EmptyState icon="account_balance" title="Add an account first" description="Transactions must belong to an account — create one on the Accounts page." />
      )}

      <section className="flex flex-wrap items-end gap-space-sm rounded-lg border border-slate-border bg-surface-container-lowest p-space-md">
        <Field label="Account" htmlFor="filter-account">
          <select
            id="filter-account"
            value={filters.account_id ?? ''}
            onChange={(event) => updateFilter({ account_id: event.target.value || undefined })}
            className={inputClass}
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category" htmlFor="filter-category">
          <select
            id="filter-category"
            value={filters.category_id ?? ''}
            onChange={(event) => updateFilter({ category_id: event.target.value || undefined })}
            className={inputClass}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From" htmlFor="filter-start">
          <input
            id="filter-start"
            type="date"
            value={filters.start_date ?? ''}
            onChange={(event) => updateFilter({ start_date: event.target.value || undefined })}
            className={inputClass}
          />
        </Field>
        <Field label="To" htmlFor="filter-end">
          <input
            id="filter-end"
            type="date"
            value={filters.end_date ?? ''}
            onChange={(event) => updateFilter({ end_date: event.target.value || undefined })}
            className={inputClass}
          />
        </Field>
        {(filters.account_id || filters.category_id || filters.start_date || filters.end_date) && (
          <button
            type="button"
            onClick={() => setFilters({})}
            className="rounded-lg px-space-sm py-space-xs font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            Clear filters
          </button>
        )}
      </section>

      {loading ? (
        <LoadingState label="Loading transactions…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadTransactions(filters)} />
      ) : transactions.length === 0 ? (
        <EmptyState icon="receipt_long" title="No transactions found" description="Try clearing your filters, or add your first transaction." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-border bg-surface-container-lowest">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-table-header-fill font-label-sm text-label-sm uppercase tracking-wider text-on-surface">
                  <th className="px-table-cell-x py-table-cell-y">Date</th>
                  <th className="px-table-cell-x py-table-cell-y">Note</th>
                  <th className="px-table-cell-x py-table-cell-y">Category</th>
                  <th className="px-table-cell-x py-table-cell-y">Account</th>
                  <th className="px-table-cell-x py-table-cell-y text-right">Amount</th>
                  <th className="px-table-cell-x py-table-cell-y text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-body-md text-body-md">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="transition-colors hover:bg-slate-surface">
                    <td className="whitespace-nowrap px-table-cell-x py-table-cell-y text-on-surface-variant">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-table-cell-x py-table-cell-y text-on-surface">
                      {transaction.note || (transaction.transaction_type === 'income' ? 'Income' : 'Expense')}
                    </td>
                    <td className="whitespace-nowrap px-table-cell-x py-table-cell-y">
                      {categoryName(transaction.category_id) ?? (
                        <span className="text-on-surface-variant">Uncategorized</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-table-cell-x py-table-cell-y text-on-surface-variant">
                      {accountName(transaction.account_id)}
                    </td>
                    <td className="whitespace-nowrap px-table-cell-x py-table-cell-y text-right">
                      <Money
                        value={transaction.transaction_type === 'expense' ? -transaction.amount : transaction.amount}
                        currency={transaction.currency}
                        signed
                      />
                    </td>
                    <td className="whitespace-nowrap px-table-cell-x py-table-cell-y">
                      <div className="flex items-center justify-center gap-space-2xs">
                        <button
                          type="button"
                          onClick={() => openEdit(transaction)}
                          className="rounded-lg p-space-2xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                          title="Edit"
                        >
                          <Icon name="edit" className="text-[16px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(transaction)}
                          className="rounded-lg p-space-2xs text-on-surface-variant transition-colors hover:bg-expense-crimson-tint hover:text-expense-crimson"
                          title="Delete"
                        >
                          <Icon name="delete" className="text-[16px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="flex justify-center border-t border-slate-border p-space-sm">
              <button
                type="button"
                onClick={loadMoreTransactions}
                disabled={loadingMore}
                className="rounded-lg px-space-md py-space-xs font-label-sm text-label-sm text-info-sky transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      <section className="flex flex-col gap-space-sm rounded-lg border border-slate-border bg-surface-container-lowest p-space-md">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Import from CSV</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Columns: <code>account_name</code> (required, must match an existing account exactly),{' '}
          <code>amount</code> (required), <code>category_name</code>, <code>transaction_type</code> (
          <code>income</code> or <code>expense</code>, defaults to expense), <code>currency</code> (defaults to the
          account's native currency), <code>transaction_date</code>, <code>note</code> — all optional except the
          first two.
        </p>
        <div className="flex items-center gap-space-sm">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportFile}
            disabled={importBusy}
            className="font-body-sm text-body-sm text-on-surface-variant file:mr-space-sm file:rounded-lg file:border-0 file:bg-surface-container file:px-space-sm file:py-space-xs file:font-label-sm file:text-label-sm file:text-on-surface"
          />
          {importBusy && <span className="font-body-sm text-body-sm text-on-surface-variant">Importing…</span>}
        </div>
        {importResult && <p className="font-body-sm text-body-sm text-growth-emerald-deep">{importResult}</p>}
        {importError && (
          <p className="font-body-sm text-body-sm text-expense-crimson" role="alert">
            {importError}
          </p>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-navy-deep/45 p-space-md backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-surface-container-lowest p-space-lg shadow-2xl">
            <div className="mb-space-md flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">
                {editingId ? 'Edit transaction' : 'Add transaction'}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface">
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
            {formError && (
              <p className="mb-space-sm font-body-sm text-body-sm text-expense-crimson" role="alert">
                {formError}
              </p>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
              <div className="grid grid-cols-2 gap-space-sm">
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, transactionType: 'expense' }))}
                  className={`rounded-lg border py-space-sm font-label-md text-label-md transition-colors ${
                    form.transactionType === 'expense'
                      ? 'border-expense-crimson bg-expense-crimson-tint text-expense-crimson'
                      : 'border-slate-border text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, transactionType: 'income' }))}
                  className={`rounded-lg border py-space-sm font-label-md text-label-md transition-colors ${
                    form.transactionType === 'income'
                      ? 'border-growth-emerald-deep bg-growth-emerald-tint text-growth-emerald-deep'
                      : 'border-slate-border text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  Income
                </button>
              </div>

              <Field label="Account" required htmlFor="txn-account">
                <select
                  id="txn-account"
                  required
                  value={form.accountId}
                  onChange={(event) => handleAccountChange(event.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select an account
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.native_currency})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Category" hint="Optional" htmlFor="txn-category">
                <select
                  id="txn-category"
                  value={form.categoryId}
                  onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                  className={inputClass}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-space-sm">
                <Field label="Amount" required htmlFor="txn-amount">
                  <input
                    id="txn-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Currency" required htmlFor="txn-currency">
                  <input
                    id="txn-currency"
                    required
                    value={form.currency}
                    onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                    maxLength={10}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Date" htmlFor="txn-date">
                <input
                  id="txn-date"
                  type="date"
                  value={form.transactionDate}
                  onChange={(event) => setForm((current) => ({ ...current, transactionDate: event.target.value }))}
                  className={inputClass}
                />
              </Field>

              <Field label="Note" hint="Optional" htmlFor="txn-note">
                <input
                  id="txn-note"
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  className={inputClass}
                  placeholder="What was this for?"
                />
              </Field>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary py-space-sm font-label-md text-label-md text-on-primary transition-colors hover:bg-slate-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add transaction'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete transaction"
        description={
          pendingDelete
            ? `This will delete "${pendingDelete.note || (pendingDelete.transaction_type === 'income' ? 'Income' : 'Expense')}" for ${formatNumber(pendingDelete.amount, { minimumFractionDigits: 2 })} ${pendingDelete.currency} and reverse its effect on the account balance.`
            : ''
        }
        confirmLabel="Delete transaction"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  )
}

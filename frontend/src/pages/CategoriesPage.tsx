import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { Field, inputClass } from '../components/forms'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Icon } from '../components/Icon'
import { createCategory, deleteCategory, listCategories, updateCategory } from '../lib/resources/categories'
import { getErrorMessage } from '../lib/errors'
import { formatNumber } from '../lib/locale'
import type { CategoryRead } from '../lib/types'

interface FormState {
  name: string
  monthlyLimit: string
}

const emptyForm: FormState = { name: '', monthlyLimit: '' }

export function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<CategoryRead | null>(null)
  const [deleting, setDeleting] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    listCategories()
      .then(setCategories)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function startEdit(category: CategoryRead) {
    setEditingId(category.id)
    setForm({ name: category.name, monthlyLimit: category.monthly_limit != null ? String(category.monthly_limit) : '' })
    setFormError(null)
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setFormError(null)
    const payload = {
      name: form.name.trim(),
      monthly_limit: form.monthlyLimit.trim() ? Number(form.monthlyLimit) : null,
    }
    try {
      if (editingId) {
        const updated = await updateCategory(editingId, payload)
        setCategories((current) => current.map((item) => (item.id === editingId ? updated : item)))
      } else {
        const created = await createCategory(payload)
        setCategories((current) => [created, ...current])
      }
      resetForm()
    } catch (err) {
      setFormError(getErrorMessage(err, 'We could not save this category.'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteCategory(pendingDelete.id)
      setCategories((current) => current.filter((item) => item.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (err) {
      setError(getErrorMessage(err, 'We could not delete this category.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Budgeting"
        title="Categories"
        description="Group transactions and set optional monthly limits. Limits have no currency of their own and don't block spending — compare them against transactions in the currency you have in mind."
      />

      <div className="grid grid-cols-1 gap-space-lg lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
          {loading ? (
            <LoadingState label="Loading categories…" />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : categories.length === 0 ? (
            <EmptyState icon="pie_chart" title="No categories yet" description="Create your first category to start organizing transactions." />
          ) : (
            <div className="flex flex-col divide-y divide-surface-container">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between gap-space-sm py-space-sm">
                  <div className="flex flex-col">
                    <span className="font-body-md text-body-md font-medium text-on-surface">{category.name}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {category.monthly_limit != null
                        ? `Limit: ${formatNumber(category.monthly_limit, { minimumFractionDigits: 2 })} / month`
                        : 'No monthly limit'}
                    </span>
                  </div>
                  <div className="flex items-center gap-space-2xs">
                    <button
                      type="button"
                      onClick={() => startEdit(category)}
                      className="rounded-lg p-space-2xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                      title="Edit"
                    >
                      <Icon name="edit" className="text-[18px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(category)}
                      className="rounded-lg p-space-2xs text-on-surface-variant transition-colors hover:bg-expense-crimson-tint hover:text-expense-crimson"
                      title="Delete"
                    >
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
          <h2 className="mb-space-md font-headline-sm text-headline-sm text-on-surface">
            {editingId ? 'Edit category' : 'Add category'}
          </h2>
          {formError && (
            <p className="mb-space-sm font-body-sm text-body-sm text-expense-crimson" role="alert">
              {formError}
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
            <Field label="Name" required htmlFor="category-name">
              <input
                id="category-name"
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className={inputClass}
                placeholder="Groceries"
              />
            </Field>
            <Field label="Monthly limit" hint="Optional" htmlFor="category-limit">
              <input
                id="category-limit"
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyLimit}
                onChange={(event) => setForm((current) => ({ ...current, monthlyLimit: event.target.value }))}
                className={inputClass}
                placeholder="e.g. 400"
              />
            </Field>
            <div className="flex items-center gap-space-sm">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-primary py-space-sm font-label-md text-label-md text-on-primary transition-colors hover:bg-slate-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add category'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg px-space-md py-space-sm font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete category"
        description={`"${pendingDelete?.name}" will be removed. Transactions already assigned to it keep their history but lose the category link.`}
        confirmLabel="Delete category"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  )
}

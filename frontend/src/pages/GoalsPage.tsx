import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { Field, inputClass } from '../components/forms'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Icon } from '../components/Icon'
import { createSavingsGoal, deleteSavingsGoal, listSavingsGoals, updateSavingsGoal } from '../lib/resources/savingsGoals'
import { getErrorMessage } from '../lib/errors'
import type { SavingsGoalRead } from '../lib/types'

interface FormState {
  name: string
  targetAmount: string
  currentAmount: string
  targetDate: string
}

const emptyForm: FormState = { name: '', targetAmount: '', currentAmount: '0', targetDate: '' }

export function GoalsPage() {
  const [goals, setGoals] = useState<SavingsGoalRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<SavingsGoalRead | null>(null)
  const [deleting, setDeleting] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    listSavingsGoals()
      .then(setGoals)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(goal: SavingsGoalRead) {
    setEditingId(goal.id)
    setForm({
      name: goal.name,
      targetAmount: String(goal.target_amount),
      currentAmount: String(goal.current_amount),
      targetDate: goal.target_date ?? '',
    })
    setFormError(null)
    setShowForm(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.targetAmount) return
    setSaving(true)
    setFormError(null)
    const payload = {
      name: form.name.trim(),
      target_amount: Number(form.targetAmount),
      current_amount: Number(form.currentAmount || 0),
      target_date: form.targetDate || null,
    }
    try {
      if (editingId) {
        const updated = await updateSavingsGoal(editingId, payload)
        setGoals((current) => current.map((item) => (item.id === editingId ? updated : item)))
      } else {
        const created = await createSavingsGoal(payload)
        setGoals((current) => [created, ...current])
      }
      setShowForm(false)
    } catch (err) {
      setFormError(getErrorMessage(err, 'We could not save this goal.'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteSavingsGoal(pendingDelete.id)
      setGoals((current) => current.filter((item) => item.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (err) {
      setError(getErrorMessage(err, 'We could not delete this goal.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Savings"
        title="Goals"
        description="Track progress toward a target amount. Progress is whatever you record here manually — it isn't derived automatically from a linked account yet."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-space-xs rounded-xl bg-primary px-space-md py-space-sm text-on-primary shadow-md transition-colors hover:bg-slate-navy-deep"
          >
            <Icon name="add_circle" className="text-[20px]" />
            <span className="font-label-md text-label-md">New goal</span>
          </button>
        }
      />

      {loading ? (
        <LoadingState label="Loading goals…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : goals.length === 0 ? (
        <EmptyState icon="flag" title="No savings goals yet" description="Create a goal to start tracking progress toward a target amount." />
      ) : (
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const pct = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0
            return (
              <article key={goal.id} className="flex flex-col justify-between gap-space-sm rounded-lg border border-slate-border bg-surface-container-lowest p-space-md shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <h3 className="font-title text-title text-on-surface">{goal.name}</h3>
                    {goal.target_date && (
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Target date: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-space-2xs">
                    <button type="button" onClick={() => openEdit(goal)} className="rounded-lg p-space-2xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface" title="Edit">
                      <Icon name="edit" className="text-[16px]" />
                    </button>
                    <button type="button" onClick={() => setPendingDelete(goal)} className="rounded-lg p-space-2xs text-on-surface-variant hover:bg-expense-crimson-tint hover:text-expense-crimson" title="Delete">
                      <Icon name="delete" className="text-[16px]" />
                    </button>
                  </div>
                </div>
                <div className="flex items-baseline justify-between font-currency-stat text-currency-stat text-on-surface">
                  <span>{goal.current_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">
                    of {goal.target_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <div className="h-full rounded-full bg-growth-emerald-deep transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{pct}% of target</span>
              </article>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-navy-deep/45 p-space-md backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-surface-container-lowest p-space-lg shadow-2xl">
            <div className="mb-space-md flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">{editingId ? 'Edit goal' : 'New savings goal'}</h2>
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
              <Field label="Goal name" required htmlFor="goal-name">
                <input
                  id="goal-name"
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className={inputClass}
                  placeholder="Emergency fund"
                />
              </Field>
              <div className="grid grid-cols-2 gap-space-sm">
                <Field label="Target amount" required htmlFor="goal-target">
                  <input
                    id="goal-target"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.targetAmount}
                    onChange={(event) => setForm((current) => ({ ...current, targetAmount: event.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Current amount" htmlFor="goal-current">
                  <input
                    id="goal-current"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.currentAmount}
                    onChange={(event) => setForm((current) => ({ ...current, currentAmount: event.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Target date" hint="Optional" htmlFor="goal-date">
                <input
                  id="goal-date"
                  type="date"
                  value={form.targetDate}
                  onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))}
                  className={inputClass}
                />
              </Field>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary py-space-sm font-label-md text-label-md text-on-primary transition-colors hover:bg-slate-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create goal'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete goal"
        description={`"${pendingDelete?.name}" will be permanently removed.`}
        confirmLabel="Delete goal"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  )
}

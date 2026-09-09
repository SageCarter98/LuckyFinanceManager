import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { inputClass } from '../../components/forms'
import { useAuth } from '../../lib/auth'
import { createCategory } from '../../lib/resources/categories'
import { getErrorMessage } from '../../lib/errors'

interface StarterCategory {
  name: string
  icon: string
  enabled: boolean
  monthlyLimit: string
}

const DEFAULT_CATEGORIES: StarterCategory[] = [
  { name: 'Essentials', icon: 'shopping_cart', enabled: true, monthlyLimit: '' },
  { name: 'Housing & Rent', icon: 'home', enabled: true, monthlyLimit: '' },
  { name: 'Bills & Utilities', icon: 'bolt', enabled: true, monthlyLimit: '' },
  { name: 'Transport', icon: 'directions_car', enabled: false, monthlyLimit: '' },
  { name: 'Lifestyle', icon: 'local_activity', enabled: false, monthlyLimit: '' },
  { name: 'Income', icon: 'payments', enabled: true, monthlyLimit: '' },
]

export function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function toggle(index: number) {
    setCategories((current) => current.map((item, i) => (i === index ? { ...item, enabled: !item.enabled } : item)))
  }

  function setLimit(index: number, value: string) {
    setCategories((current) => current.map((item, i) => (i === index ? { ...item, monthlyLimit: value } : item)))
  }

  async function finishSetup() {
    setError(null)
    setBusy(true)
    try {
      const selected = categories.filter((item) => item.enabled)
      for (const item of selected) {
        const limit = item.monthlyLimit.trim()
        await createCategory({
          name: item.name,
          monthly_limit: limit ? Number(limit) : null,
        })
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'We could not save your starter categories.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-space-lg">
      <div className="w-full max-w-2xl rounded-xl bg-surface-container-lowest p-space-lg shadow-xl sm:p-space-xl">
        <div className="mb-space-lg flex flex-col gap-1">
          <p className="font-label-sm text-label-sm uppercase tracking-wider text-info-sky">Welcome{user ? `, ${user.full_name}` : ''}</p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Set up your starter categories</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Pick the categories you want to track from day one — you can add, edit or remove
            categories any time from Categories. Monthly limits are optional.
          </p>
        </div>

        {error && (
          <div className="mb-space-md flex items-start gap-space-sm rounded-lg bg-expense-crimson-tint p-space-sm" role="alert">
            <Icon name="error" className="mt-0.5 shrink-0 text-[20px] text-expense-crimson" />
            <p className="font-body-sm text-body-sm text-on-surface-variant">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-space-sm">
          {categories.map((item, index) => (
            <div
              key={item.name}
              className={`flex flex-col gap-space-sm rounded-lg border p-space-sm transition-colors sm:flex-row sm:items-center sm:justify-between ${
                item.enabled ? 'border-info-sky/30 bg-info-sky-tint/40' : 'border-slate-border bg-surface-container-low'
              }`}
            >
              <label className="flex flex-1 cursor-pointer items-center gap-space-sm">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={() => toggle(index)}
                  className="h-5 w-5 rounded border-slate-border"
                />
                <Icon name={item.icon} className="text-[20px] text-on-surface-variant" />
                <span className="font-body-md text-body-md font-medium text-on-surface">{item.name}</span>
              </label>
              {item.enabled && (
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Monthly limit</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.monthlyLimit}
                    onChange={(event) => setLimit(index, event.target.value)}
                    placeholder="Optional"
                    className={`w-32 ${inputClass}`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-space-lg flex items-center justify-end gap-space-sm">
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="rounded px-space-md py-space-sm font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            Skip for now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={finishSetup}
            className="rounded-lg bg-primary px-space-lg py-space-sm font-label-md text-label-md text-on-primary shadow-md transition-all hover:bg-slate-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Finish setup'}
          </button>
        </div>
      </div>
    </main>
  )
}

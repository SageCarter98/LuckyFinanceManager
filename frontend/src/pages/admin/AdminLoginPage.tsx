import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { inputClass } from '../../components/forms'
import { useAdminAuth } from '../../lib/adminAuth'
import { getErrorMessage } from '../../lib/errors'

export function AdminLoginPage() {
  const { login } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login({ email, password })
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Sign-in failed, or this account does not have staff access.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-navy-deep p-space-lg">
      <div className="w-full max-w-md rounded-xl bg-surface-container-lowest p-space-xl shadow-2xl">
        <div className="mb-space-lg flex flex-col items-center gap-space-xs text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-navy-deep text-on-primary">
            <Icon name="admin_panel_settings" className="text-[26px]" />
          </span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Staff console</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Isolated sign-in for support staff — this session never shares tokens with the
            consumer app.
          </p>
        </div>

        {error && (
          <div className="mb-space-md flex items-start gap-space-sm rounded-lg bg-expense-crimson-tint p-space-sm" role="alert">
            <Icon name="error" className="mt-0.5 shrink-0 text-[20px] text-expense-crimson" />
            <p className="font-body-sm text-body-sm text-on-surface-variant">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          <div className="flex flex-col gap-space-2xs">
            <label htmlFor="admin-email" className="font-label-md text-label-md text-on-surface">
              Staff email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-space-2xs">
            <label htmlFor="admin-password" className="font-label-md text-label-md text-on-surface">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-space-xs h-11 rounded-lg bg-slate-navy-deep font-label-md text-label-md text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}

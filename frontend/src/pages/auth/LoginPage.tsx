import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { inputClass } from '../../components/forms'
import { useAuth } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login({ email, password })
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-space-lg">
      <div className="w-full max-w-xl">
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-info-sky to-growth-emerald-deep" />
          <div className="flex flex-col gap-space-lg p-space-lg sm:p-space-xl">
            <div className="flex items-center gap-space-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
                <Icon name="account_balance" className="text-[18px]" />
              </div>
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface">Lucky Finance</span>
            </div>

            <div className="flex flex-col gap-1">
              <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">Welcome back</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Sign in to your accounts, transactions and reports.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-space-sm rounded-lg bg-expense-crimson-tint p-space-sm" role="alert">
                <Icon name="error" className="mt-0.5 shrink-0 text-[20px] text-expense-crimson" />
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-expense-crimson">Sign-in failed</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-space-md" noValidate>
              <div className="flex flex-col gap-space-2xs">
                <label htmlFor="email" className="font-label-md text-label-md text-on-surface">
                  Email
                </label>
                <div className="relative flex items-center">
                  <Icon name="mail" className="pointer-events-none absolute left-3 text-[18px] text-on-surface-variant" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={`w-full pl-10 ${inputClass}`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-space-2xs">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="font-label-md text-label-md text-on-surface">
                    Password
                  </label>
                  <Link to="/forgot-password" className="font-body-sm text-body-sm text-info-sky hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative flex items-center">
                  <Icon name="lock" className="pointer-events-none absolute left-3 text-[18px] text-on-surface-variant" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 ${inputClass}`}
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 text-on-surface-variant hover:text-on-surface"
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[18px]" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-space-xs flex h-11 w-full items-center justify-center gap-space-xs rounded-lg bg-primary font-label-md text-label-md text-on-primary shadow-md transition-all hover:bg-slate-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />}
                <Icon name="verified_user" className="text-[18px]" />
                Sign in
              </button>
            </form>

            <div className="flex items-start gap-space-xs rounded-lg bg-info-sky-tint p-space-sm">
              <Icon name="shield" className="mt-0.5 shrink-0 text-[18px] text-info-sky" />
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm font-semibold text-info-sky">In-memory session only</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Your access token is held in memory for this tab and is never written to
                  localStorage, cookies, or logs.
                </span>
              </div>
            </div>

            <div className="pt-space-xs text-center">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Don't have an account?{' '}
                <Link to="/signup" className="font-label-md text-label-md text-on-surface underline hover:text-info-sky">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

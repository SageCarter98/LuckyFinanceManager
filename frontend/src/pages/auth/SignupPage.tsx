import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { inputClass } from '../../components/forms'
import { useAuth } from '../../lib/auth'
import { getErrorMessage } from '../../lib/errors'

const MIN_PASSWORD_LENGTH = 8

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const passwordOk = password.length >= MIN_PASSWORD_LENGTH
  const canSubmit = fullName.trim().length > 0 && email.includes('@') && passwordOk

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    setError(null)
    setBusy(true)
    try {
      await signup({ email, password, full_name: fullName.trim() })
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'We could not create your account.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-space-lg">
      <div className="w-full max-w-xl">
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-xl sm:p-space-xl">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-navy-deep via-info-sky to-growth-emerald-deep" />

          <div className="mb-space-lg flex flex-col gap-1">
            <h1 className="font-headline-lg text-headline-lg text-slate-navy-deep">Create your account</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Start tracking accounts, transactions and goals — manual finance is always free.
            </p>
          </div>

          {error && (
            <div className="mb-space-md flex items-start gap-space-sm rounded-lg bg-expense-crimson-tint p-space-sm" role="alert">
              <Icon name="error" className="mt-0.5 shrink-0 text-[20px] text-expense-crimson" />
              <p className="font-body-sm text-body-sm text-on-surface-variant">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-space-md" noValidate>
            <div className="flex flex-col gap-space-2xs">
              <label htmlFor="full-name" className="font-label-md text-label-md text-slate-navy-deep">
                Full name <span className="text-expense-crimson">*</span>
              </label>
              <input
                id="full-name"
                required
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Alex Morgan"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-space-2xs">
              <label htmlFor="signup-email" className="font-label-md text-label-md text-slate-navy-deep">
                Email <span className="text-expense-crimson">*</span>
              </label>
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-space-2xs">
              <label htmlFor="signup-password" className="font-label-md text-label-md text-slate-navy-deep">
                Password <span className="text-expense-crimson">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className={`w-full pr-10 ${inputClass}`}
                />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 text-on-surface-variant hover:text-slate-navy-deep"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[18px]" />
                </button>
              </div>
              <div
                className={`flex items-center gap-1 font-body-sm text-body-sm ${
                  passwordOk ? 'text-growth-emerald-deep' : 'text-on-surface-variant'
                }`}
                aria-live="polite"
              >
                <Icon name={passwordOk ? 'check_circle' : 'radio_button_unchecked'} className="text-[16px]" filled={passwordOk} />
                At least {MIN_PASSWORD_LENGTH} characters
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="mt-space-xs flex h-11 items-center justify-center gap-space-xs rounded-lg bg-primary font-headline-sm text-headline-sm text-on-primary shadow-md transition-all hover:bg-slate-navy-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Creating account…' : 'Create account'}
              {!busy && <Icon name="arrow_forward" className="text-[18px]" />}
            </button>
          </form>

          <div className="mt-space-lg rounded-lg bg-slate-surface-subtle py-2.5 text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-slate-navy-deep underline hover:text-info-sky">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

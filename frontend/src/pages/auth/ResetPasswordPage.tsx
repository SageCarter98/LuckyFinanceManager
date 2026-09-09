import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { inputClass } from '../../components/forms'
import { resetPassword } from '../../lib/resources/auth'
import { getErrorMessage } from '../../lib/errors'

const MIN_PASSWORD_LENGTH = 8

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const passwordOk = password.length >= MIN_PASSWORD_LENGTH

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !passwordOk) return
    setBusy(true)
    setError(null)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(getErrorMessage(err, 'This reset link is invalid or has expired.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-space-lg">
      <div className="w-full max-w-md rounded-xl bg-surface-container-lowest p-space-lg shadow-xl sm:p-space-xl">
        {!token ? (
          <>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Missing reset token</h1>
            <p className="mt-space-2xs font-body-md text-body-md text-on-surface-variant">
              This link is missing its reset token. Request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="mt-space-md inline-block rounded-lg bg-primary px-space-md py-space-sm font-label-md text-label-md text-on-primary hover:bg-slate-navy-deep"
            >
              Request new link
            </Link>
          </>
        ) : done ? (
          <>
            <Icon name="check_circle" filled className="mb-space-sm text-[32px] text-growth-emerald-deep" />
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Password updated</h1>
            <p className="mt-space-2xs font-body-md text-body-md text-on-surface-variant">
              Every device you were signed in on has been signed out. Sign in again with your new
              password.
            </p>
            <Link
              to="/login"
              className="mt-space-md inline-block rounded-lg bg-primary px-space-md py-space-sm font-label-md text-label-md text-on-primary hover:bg-slate-navy-deep"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Choose a new password</h1>
            <form onSubmit={handleSubmit} className="mt-space-lg flex flex-col gap-space-md" noValidate>
              {error && (
                <p className="font-body-sm text-body-sm text-expense-crimson" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-col gap-space-2xs">
                <label htmlFor="new-password" className="font-label-md text-label-md text-on-surface">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={busy || !passwordOk}
                className="flex h-11 items-center justify-center gap-space-xs rounded-lg bg-primary font-label-md text-label-md text-on-primary shadow-md hover:bg-slate-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}

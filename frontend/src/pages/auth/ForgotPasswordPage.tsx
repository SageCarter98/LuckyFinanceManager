import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Banner } from '../../components/Banner'
import { inputClass } from '../../components/forms'
import { forgotPassword } from '../../lib/resources/auth'
import { getErrorMessage } from '../../lib/errors'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devToken, setDevToken] = useState<string | null | undefined>(undefined)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await forgotPassword(email)
      // Same response shape whether or not the account exists -- this page
      // never learns which case it was, by design (account-enumeration safety).
      setDevToken(result.dev_token)
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-space-lg">
      <div className="w-full max-w-md rounded-xl bg-surface-container-lowest p-space-lg shadow-xl sm:p-space-xl">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Reset your password</h1>
        <p className="mt-space-2xs font-body-md text-body-md text-on-surface-variant">
          Enter your account email and we'll get you a reset link.
        </p>

        {devToken === undefined && (
          <form onSubmit={handleSubmit} className="mt-space-lg flex flex-col gap-space-md" noValidate>
            {error && (
              <p className="font-body-sm text-body-sm text-expense-crimson" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-space-2xs">
              <label htmlFor="forgot-email" className="font-label-md text-label-md text-on-surface">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={busy || !email.includes('@')}
              className="flex h-11 items-center justify-center gap-space-xs rounded-lg bg-primary font-label-md text-label-md text-on-primary shadow-md hover:bg-slate-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send reset link'}
              {!busy && <Icon name="arrow_forward" className="text-[18px]" />}
            </button>
          </form>
        )}

        {devToken !== undefined && (
          <div className="mt-space-lg flex flex-col gap-space-md">
            <Banner tone="info" title="If that email exists, a reset link was created">
              We never confirm whether an email is registered, to protect your account's privacy.
            </Banner>
            {devToken && (
              <Banner tone="warning" title="Development mode — no email was sent">
                No email provider is connected yet. Use this link directly:{' '}
                <Link to={`/reset-password?token=${encodeURIComponent(devToken)}`} className="font-semibold underline">
                  Reset password
                </Link>
                .
              </Banner>
            )}
          </div>
        )}

        <div className="mt-space-lg text-center">
          <Link to="/login" className="font-body-sm text-body-sm text-on-surface-variant underline hover:text-info-sky">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  )
}

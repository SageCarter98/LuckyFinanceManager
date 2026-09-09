import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { verifyEmail } from '../../lib/resources/auth'
import { getErrorMessage } from '../../lib/errors'
import { useAuth } from '../../lib/auth'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { user, setUser, dismissPendingVerificationToken } = useAuth()
  const [status, setStatus] = useState<'checking' | 'done' | 'error'>('checking')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('This link is missing its verification token.')
      return
    }
    verifyEmail(token)
      .then((updated) => {
        if (user) setUser(updated)
        dismissPendingVerificationToken()
        setStatus('done')
      })
      .catch((err) => {
        setStatus('error')
        setError(getErrorMessage(err, 'This verification link is invalid or has expired.'))
      })
    // Only run once per mounted token -- re-running on every user/setUser
    // identity change would re-POST the (now already-consumed) token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-space-lg">
      <div className="w-full max-w-md rounded-xl bg-surface-container-lowest p-space-lg text-center shadow-xl">
        {status === 'checking' && (
          <>
            <div className="mx-auto mb-space-sm h-8 w-8 animate-spin rounded-full border-2 border-info-sky border-t-transparent" />
            <p className="font-body-md text-body-md text-on-surface-variant">Verifying your email…</p>
          </>
        )}
        {status === 'done' && (
          <>
            <Icon name="check_circle" filled className="mx-auto mb-space-sm text-[40px] text-growth-emerald-deep" />
            <h1 className="font-headline-sm text-headline-sm text-on-surface">Email verified</h1>
            <p className="mt-space-2xs font-body-sm text-body-sm text-on-surface-variant">
              Your email address is confirmed.
            </p>
            <Link
              to={user ? '/' : '/login'}
              className="mt-space-md inline-block rounded-lg bg-primary px-space-md py-space-sm font-label-md text-label-md text-on-primary hover:bg-slate-navy-deep"
            >
              {user ? 'Go to dashboard' : 'Sign in'}
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <Icon name="error" filled className="mx-auto mb-space-sm text-[40px] text-expense-crimson" />
            <h1 className="font-headline-sm text-headline-sm text-on-surface">Verification failed</h1>
            <p className="mt-space-2xs font-body-sm text-body-sm text-on-surface-variant">{error}</p>
          </>
        )}
      </div>
    </main>
  )
}

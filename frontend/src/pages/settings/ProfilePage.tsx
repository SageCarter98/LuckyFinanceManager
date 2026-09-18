import { useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { SettingsLayout } from '../../components/SettingsLayout'
import { StatusChip } from '../../components/StatusChip'
import { Banner } from '../../components/Banner'
import { Field, inputClass } from '../../components/forms'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { updateMe, resendVerification } from '../../lib/resources/auth'
import { getErrorMessage } from '../../lib/errors'

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [timezone, setTimezone] = useState(user?.timezone ?? 'UTC')
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferred_currency ?? 'USD')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [resending, setResending] = useState(false)
  const [resendToken, setResendToken] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  async function handleResend() {
    setResending(true)
    setResendError(null)
    setResendToken(null)
    try {
      const result = await resendVerification()
      setResendToken(result.dev_token)
    } catch (err) {
      setResendError(getErrorMessage(err, 'Could not resend the verification email.'))
    } finally {
      setResending(false)
    }
  }

  const dirty =
    fullName !== (user?.full_name ?? '') ||
    timezone !== (user?.timezone ?? 'UTC') ||
    preferredCurrency !== (user?.preferred_currency ?? 'USD')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await updateMe({ full_name: fullName, timezone, preferred_currency: preferredCurrency })
      setUser(updated)
      setSaved(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <SettingsLayout>
        <section className="flex flex-col gap-space-md rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Profile</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
            <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
              <Field label="Full name" required htmlFor="profile-full-name">
                <input
                  id="profile-full-name"
                  className={inputClass}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  minLength={1}
                />
              </Field>
              <dl className="flex flex-col gap-space-3xs">
                <dt className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Email</dt>
                <dd className="font-body-md text-body-md text-on-surface">{user?.email}</dd>
              </dl>
              <Field label="Timezone" required htmlFor="profile-timezone" hint="IANA timezone name, e.g. America/New_York">
                <input
                  id="profile-timezone"
                  className={inputClass}
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  required
                />
              </Field>
              <Field label="Preferred currency" required htmlFor="profile-currency" hint="3-letter ISO currency code">
                <input
                  id="profile-currency"
                  className={inputClass}
                  value={preferredCurrency}
                  onChange={(event) => setPreferredCurrency(event.target.value.toUpperCase())}
                  required
                  minLength={3}
                  maxLength={10}
                />
              </Field>
              <dl className="flex flex-col gap-space-3xs">
                <dt className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Email verification</dt>
                <dd className="flex items-center gap-space-sm">
                  <StatusChip tone={user?.email_verified ? 'positive' : 'neutral'}>
                    {user?.email_verified ? 'Verified' : 'Not verified'}
                  </StatusChip>
                  {!user?.email_verified && (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="font-label-sm text-label-sm text-info-sky hover:underline disabled:opacity-50"
                    >
                      {resending ? 'Sending…' : 'Resend'}
                    </button>
                  )}
                </dd>
              </dl>
              <dl className="flex flex-col gap-space-3xs">
                <dt className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Tenant ID</dt>
                <dd className="font-body-sm text-body-sm text-on-surface-variant">{user?.tenant_id}</dd>
              </dl>
            </div>

            {error && (
              <Banner tone="error" title="Couldn't save your profile">
                {error}
              </Banner>
            )}
            {saved && !error && (
              <Banner tone="success" title="Profile updated">
                Your changes were saved.
              </Banner>
            )}

            <div>
              <button
                type="submit"
                disabled={!dirty || saving}
                className="rounded-lg bg-primary px-space-md py-space-2xs font-label-md text-label-md font-semibold text-on-primary disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>

          {resendError && (
            <Banner tone="error" title="Couldn't resend verification">
              {resendError}
            </Banner>
          )}
          {resendToken && (
            <Banner tone="warning" title="Development mode — no email was sent">
              No email provider is connected yet. Use this link directly:{' '}
              <Link to={`/verify-email?token=${encodeURIComponent(resendToken)}`} className="font-semibold underline">
                Verify email
              </Link>
              .
            </Banner>
          )}

          <Banner tone="info" title="Email changes aren't available yet">
            Your email address itself can't be changed here — changing it would need its own
            re-verification step, which doesn't exist yet. This will be enabled once that flow is built.
          </Banner>
        </section>
      </SettingsLayout>
    </AppShell>
  )
}

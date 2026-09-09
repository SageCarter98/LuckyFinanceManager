import { useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { SettingsLayout } from '../../components/SettingsLayout'
import { StatusChip } from '../../components/StatusChip'
import { Banner } from '../../components/Banner'
import { Field, inputClass } from '../../components/forms'
import { useAuth } from '../../lib/auth'
import { updateMe } from '../../lib/resources/auth'
import { getErrorMessage } from '../../lib/errors'

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [timezone, setTimezone] = useState(user?.timezone ?? 'UTC')
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferred_currency ?? 'USD')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

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
              <div className="flex flex-col gap-space-3xs">
                <dt className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Email</dt>
                <dd className="font-body-md text-body-md text-on-surface">{user?.email}</dd>
              </div>
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
              <div className="flex flex-col gap-space-3xs">
                <dt className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Email verification</dt>
                <dd>
                  <StatusChip tone={user?.email_verified ? 'positive' : 'neutral'}>
                    {user?.email_verified ? 'Verified' : 'Not verified'}
                  </StatusChip>
                </dd>
              </div>
              <div className="flex flex-col gap-space-3xs">
                <dt className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Tenant ID</dt>
                <dd className="font-body-sm text-body-sm text-on-surface-variant">{user?.tenant_id}</dd>
              </div>
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

          <Banner tone="info" title="Email changes aren't available yet">
            Your email can't be changed here because the API has no re-verification flow yet — changing an
            unconfirmed email would be a real security gap, not a missing convenience. This will be enabled
            once email verification exists.
          </Banner>
        </section>
      </SettingsLayout>
    </AppShell>
  )
}

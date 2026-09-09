import { AppShell } from '../../components/AppShell'
import { SettingsLayout } from '../../components/SettingsLayout'
import { StatusChip } from '../../components/StatusChip'
import { Banner } from '../../components/Banner'
import { useAuth } from '../../lib/auth'

export function ProfilePage() {
  const { user } = useAuth()

  return (
    <AppShell>
      <SettingsLayout>
        <section className="flex flex-col gap-space-md rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Profile</h2>
          <dl className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
            <div className="flex flex-col gap-space-3xs">
              <dt className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Full name</dt>
              <dd className="font-body-md text-body-md text-on-surface">{user?.full_name}</dd>
            </div>
            <div className="flex flex-col gap-space-3xs">
              <dt className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Email</dt>
              <dd className="font-body-md text-body-md text-on-surface">{user?.email}</dd>
            </div>
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
          </dl>
          <Banner tone="info" title="Editing isn't available yet">
            The API doesn't support updating your name, email or notification preferences yet — this
            page shows your real account data, but changes have to go through support for now.
          </Banner>
        </section>
      </SettingsLayout>
    </AppShell>
  )
}

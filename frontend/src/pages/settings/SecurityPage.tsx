import { AppShell } from '../../components/AppShell'
import { SettingsLayout } from '../../components/SettingsLayout'
import { Banner } from '../../components/Banner'
import { Icon } from '../../components/Icon'

export function SecurityPage() {
  return (
    <AppShell>
      <SettingsLayout>
        <section className="flex flex-col gap-space-md rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Security</h2>

          <div className="flex items-start gap-space-sm rounded-lg border border-slate-border p-space-md">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container text-slate-navy-deep">
              <Icon name="lock" className="text-[18px]" />
            </span>
            <div className="flex flex-col gap-space-3xs">
              <p className="font-body-md text-body-md font-semibold text-on-surface">
                Two-factor authentication and single sign-on
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                TOTP-based multi-factor authentication and optional SSO (FRS FE-2.9, FE-2.10 — SRS
                FR-2.6) are approved Phase 2 scope, not yet built. Your account is protected today
                by a bcrypt-hashed password, in-memory-only session tokens, and rate-limiting on
                login and password-reset attempts.
              </p>
            </div>
          </div>

          <Banner tone="locked" title="Not available yet">
            This section will let you enroll an authenticator app and manage trusted sign-in
            methods once Phase 2 ships. There is nothing to configure here today.
          </Banner>
        </section>
      </SettingsLayout>
    </AppShell>
  )
}

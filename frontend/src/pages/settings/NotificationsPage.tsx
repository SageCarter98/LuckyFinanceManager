import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { SettingsLayout } from '../../components/SettingsLayout'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { Icon } from '../../components/Icon'
import { listNotifications, markNotificationRead } from '../../lib/resources/notifications'
import { updateMe } from '../../lib/resources/auth'
import { getErrorMessage } from '../../lib/errors'
import { useAuth } from '../../lib/auth'
import { formatDate } from '../../lib/locale'
import type { NotificationRead } from '../../lib/types'

const KNOWN_NOTIFICATION_KINDS: { kind: string; label: string; description: string }[] = [
  { kind: 'bill_generated', label: 'Recurring bill generated', description: 'When a scheduled bill creates its transaction automatically.' },
]

function NotificationPreferences() {
  const { user, setUser } = useAuth()
  const [savingKind, setSavingKind] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggle(kind: string, enabled: boolean) {
    if (!user) return
    setSavingKind(kind)
    setError(null)
    try {
      const updated = await updateMe({
        notification_preferences: { ...user.notification_preferences, [kind]: enabled },
      })
      setUser(updated)
    } catch (err) {
      setError(getErrorMessage(err, 'We could not save that preference.'))
    } finally {
      setSavingKind(null)
    }
  }

  return (
    <section className="rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
      <h2 className="mb-space-sm font-headline-sm text-headline-sm text-on-surface">Preferences</h2>
      {error && (
        <p className="mb-space-sm font-body-sm text-body-sm text-expense-crimson" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col divide-y divide-surface-container">
        {KNOWN_NOTIFICATION_KINDS.map(({ kind, label, description }) => {
          const enabled = user?.notification_preferences[kind] ?? true
          return (
            <label key={kind} className="flex items-center justify-between gap-space-md py-space-sm">
              <span className="flex flex-col">
                <span className="font-body-md text-body-md text-on-surface">{label}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{description}</span>
              </span>
              <input
                type="checkbox"
                checked={enabled}
                disabled={savingKind === kind}
                onChange={(event) => toggle(kind, event.target.checked)}
                className="h-5 w-5 shrink-0 accent-info-sky"
                aria-label={label}
              />
            </label>
          )
        })}
      </div>
    </section>
  )
}

function formatDateTime(value: string, timezone?: string) {
  // created_at is a real timestamp (unlike a plain calendar date) -- render
  // it in the user's chosen timezone, not the browser's.
  return formatDate(value, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }, timezone)
}

export function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    listNotifications()
      .then(setNotifications)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleMarkRead(id: string) {
    try {
      const updated = await markNotificationRead(id)
      setNotifications((current) => current.map((item) => (item.id === id ? updated : item)))
    } catch {
      // Leave the item as-is; the user can retry the click.
    }
  }

  return (
    <AppShell>
      <SettingsLayout>
        <div className="flex flex-col gap-space-lg">
        <NotificationPreferences />
        <section className="rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
          <h2 className="mb-space-md font-headline-sm text-headline-sm text-on-surface">Notifications</h2>
          {loading ? (
            <LoadingState label="Loading notifications…" />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : notifications.length === 0 ? (
            <EmptyState icon="notifications" title="No notifications yet" description="Bill and account activity will appear here." />
          ) : (
            <div className="flex flex-col divide-y divide-surface-container">
              {notifications.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-space-sm py-space-sm">
                  <div className="flex items-start gap-space-sm">
                    <span
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${
                        item.is_read ? 'bg-surface-container text-on-surface-variant' : 'bg-info-sky-tint text-info-sky'
                      }`}
                    >
                      <Icon name="notifications" className="text-[16px]" />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-body-md text-body-md font-medium text-on-surface">{item.title}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{item.message}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{formatDateTime(item.created_at, user?.timezone)}</span>
                    </div>
                  </div>
                  {!item.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(item.id)}
                      className="shrink-0 font-label-sm text-label-sm text-info-sky hover:text-slate-navy-deep"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        </div>
      </SettingsLayout>
    </AppShell>
  )
}

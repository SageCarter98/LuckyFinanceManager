import { useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { SettingsLayout } from '../../components/SettingsLayout'
import { Banner } from '../../components/Banner'
import { Icon } from '../../components/Icon'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { exportTenantData } from '../../lib/resources/portability'
import { deleteMe } from '../../lib/resources/auth'
import { getErrorMessage } from '../../lib/errors'
import { useAuth } from '../../lib/auth'

export function DataPage() {
  const { user, logout } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportedAt, setExportedAt] = useState<string | null>(null)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteMe()
      logout()
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'We could not delete your account.'))
      setDeleting(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      const data = await exportTenantData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `lucky-finance-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setExportedAt(new Date().toLocaleString())
    } catch (err) {
      setError(getErrorMessage(err, 'We could not generate your export.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <AppShell>
      <SettingsLayout>
        <div className="flex flex-col gap-space-lg">
          <section className="flex flex-col gap-space-sm rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Export your data</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Download every account, category, transaction, recurring bill and savings goal tied
              to your tenant as a single JSON file.
            </p>
            {error && (
              <p className="font-body-sm text-body-sm text-expense-crimson" role="alert">
                {error}
              </p>
            )}
            {exportedAt && (
              <p className="font-body-sm text-body-sm text-growth-emerald-deep">Export downloaded at {exportedAt}.</p>
            )}
            <button
              type="button"
              disabled={exporting}
              onClick={handleExport}
              className="flex w-fit items-center gap-space-xs rounded-lg bg-slate-navy-deep px-space-md py-space-sm font-label-md text-label-md text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="download" className="text-[18px]" />
              {exporting ? 'Preparing export…' : 'Export data (JSON)'}
            </button>
          </section>

          <section className="flex flex-col gap-space-sm rounded-lg border border-expense-crimson/20 bg-surface-container-lowest p-space-lg">
            <h2 className="font-headline-sm text-headline-sm text-expense-crimson">Delete account</h2>
            <Banner tone="warning" title="This deactivates your account immediately">
              Your account and data are deactivated right away and kept for 30 days before permanent
              removal, per our retention policy — during that window, contact support if you want to
              cancel the deletion. There is no active subscription to worry about (billing doesn't
              exist yet on this platform). This cannot be undone from this screen.
            </Banner>
            {deleteError && (
              <p className="font-body-sm text-body-sm text-expense-crimson" role="alert">
                {deleteError}
              </p>
            )}
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex w-fit items-center gap-space-xs rounded-lg border border-expense-crimson px-space-md py-space-sm font-label-md text-label-md text-expense-crimson transition-colors hover:bg-expense-crimson-tint"
            >
              <Icon name="delete_forever" className="text-[18px]" />
              Delete my account
            </button>
          </section>
        </div>
      </SettingsLayout>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete your account"
        description={`This will deactivate the account for ${user?.email ?? 'this account'} and everything in it -- accounts, transactions, bills, goals and reports -- effective immediately. Data is retained for 30 days before permanent purge.`}
        confirmLabel="Delete my account"
        destructive
        requirePhrase={user?.email ?? ''}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </AppShell>
  )
}

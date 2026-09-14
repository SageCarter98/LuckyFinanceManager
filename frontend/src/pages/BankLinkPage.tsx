import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { Banner } from '../components/Banner'
import { LoadingState } from '../components/States'
import { Icon } from '../components/Icon'
import { linkAccount, listInstitutions } from '../lib/resources/banking'
import { getErrorMessage } from '../lib/errors'

const PROVIDER_DISPLAY_NAME = 'Stub Sandbox Connector'

export function BankLinkPage() {
  const navigate = useNavigate()
  const [institutions, setInstitutions] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [consented, setConsented] = useState(false)
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listInstitutions()
      .then(setInstitutions)
      .catch((err) => setError(getErrorMessage(err, 'Could not load institutions.')))
      .finally(() => setLoading(false))
  }, [])

  async function handleLink() {
    if (!selected || !consented) return
    setLinking(true)
    setError(null)
    try {
      await linkAccount(selected)
      navigate('/banking')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not link this account.'))
      setLinking(false)
    }
  }

  return (
    <AppShell>
      <div className="flex max-w-2xl flex-col gap-space-lg">
        <PageHeader eyebrow="Banking" title="Link an account" />

        <Banner tone="locked" title={`Test data only — ${PROVIDER_DISPLAY_NAME}`}>
          This environment uses a disclosed test connector, not a real bank-data provider. No real
          bank credentials are requested, stored, or usable here. This is not a real financial
          institution's sign-in page — you are staying inside this app.
        </Banner>

        {error && (
          <Banner tone="error" title="Something went wrong">
            {error}
          </Banner>
        )}

        {loading ? (
          <LoadingState label="Loading institutions…" />
        ) : (
          <>
            <section className="flex flex-col gap-space-sm rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">1. Choose an institution</h2>
              <div className="flex flex-col gap-space-2xs">
                {institutions.map((institution) => (
                  <label
                    key={institution}
                    className={`flex cursor-pointer items-center gap-space-sm rounded-lg border p-space-sm transition-colors ${
                      selected === institution
                        ? 'border-slate-navy-deep bg-surface-container'
                        : 'border-slate-border hover:bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name="institution"
                      value={institution}
                      checked={selected === institution}
                      onChange={() => setSelected(institution)}
                      className="h-4 w-4 accent-slate-navy-deep"
                    />
                    <Icon name="account_balance" className="text-[18px] text-on-surface-variant" />
                    <span className="font-body-md text-body-md text-on-surface">{institution}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-space-sm rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">2. Consent</h2>
              <label className="flex items-start gap-space-sm">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={(event) => setConsented(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-slate-navy-deep"
                />
                <span className="font-body-sm text-body-sm text-on-surface">
                  I consent to <strong>{PROVIDER_DISPLAY_NAME}</strong> accessing read-only balance and
                  transaction data from {selected ?? 'the selected institution'} on my behalf. I understand
                  this connection is read-only — this app cannot move money into or out of my account, and
                  I can revoke access at any time from the Banking page.
                </span>
              </label>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                This consent is separate from, and not bundled with, the Terms of Service.
              </p>
            </section>

            <div className="flex justify-end gap-space-sm">
              <button
                type="button"
                onClick={() => navigate('/banking')}
                className="rounded-lg border border-slate-border px-space-md py-space-sm font-label-md text-label-md text-on-surface hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selected || !consented || linking}
                onClick={handleLink}
                className="rounded-lg bg-slate-navy-deep px-space-md py-space-sm font-label-md text-label-md text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {linking ? 'Linking…' : 'Link account'}
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { Banner } from '../components/Banner'
import { Money } from '../components/Money'
import { StatusChip } from '../components/StatusChip'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { Icon } from '../components/Icon'
import {
  cancelSubscription,
  createCheckoutSession,
  getBillingHistory,
  getSubscriptionStatus,
} from '../lib/resources/subscription'
import { getErrorMessage } from '../lib/errors'
import { formatDate } from '../lib/locale'
import { useAuth } from '../lib/auth'
import type { BillingHistoryItem, SubscriptionStatusRead, SubscriptionStatusValue } from '../lib/types'

const STATUS_TONE: Record<SubscriptionStatusValue, 'positive' | 'warning' | 'negative' | 'neutral'> = {
  trialing: 'positive',
  active: 'positive',
  past_due: 'warning',
  canceled: 'neutral',
  none: 'neutral',
  incomplete: 'warning',
  incomplete_expired: 'negative',
  unpaid: 'negative',
}

const STATUS_LABEL: Record<SubscriptionStatusValue, string> = {
  trialing: 'Free trial',
  active: 'Active',
  past_due: 'Payment failed',
  canceled: 'Canceled',
  none: 'No subscription',
  incomplete: 'Incomplete',
  incomplete_expired: 'Incomplete',
  unpaid: 'Unpaid',
}

function formatDay(value: string | null, timezone?: string): string {
  if (!value) return 'unknown date'
  return formatDate(value, { dateStyle: 'medium' }, timezone)
}

export function SubscriptionPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const checkoutParam = searchParams.get('checkout')

  const [status, setStatus] = useState<SubscriptionStatusRead | null>(null)
  const [history, setHistory] = useState<BillingHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startingCheckout, setStartingCheckout] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [canceling, setCanceling] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([getSubscriptionStatus(), getBillingHistory()])
      .then(([statusResult, historyResult]) => {
        setStatus(statusResult)
        setHistory(historyResult)
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // Strip the ?checkout= param after reading it once, so a page refresh
  // doesn't keep re-showing the success/cancelled banner.
  useEffect(() => {
    if (!checkoutParam) return
    navigate('/subscription', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutParam])

  async function handleStartCheckout() {
    setStartingCheckout(true)
    setError(null)
    try {
      const { checkout_url: checkoutUrl } = await createCheckoutSession()
      window.location.href = checkoutUrl
    } catch (err) {
      setError(getErrorMessage(err, 'We could not start checkout.'))
      setStartingCheckout(false)
    }
  }

  async function handleCancel() {
    setCanceling(true)
    try {
      const updated = await cancelSubscription()
      setStatus(updated)
      setConfirmingCancel(false)
    } catch (err) {
      setError(getErrorMessage(err, 'We could not cancel your subscription.'))
    } finally {
      setCanceling(false)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-space-lg">
        <PageHeader
          eyebrow="Subscription"
          title="Billing & subscription"
          description="Manual finance — accounts, categories, transactions, recurring bills, savings goals and reports — is always free. A subscription is only ever required for bank linking and Gross Balance."
        />

        {checkoutParam === 'success' && (
          <Banner tone="success" title="Checkout complete">
            Your subscription is being activated — this can take a few seconds to confirm. Refresh
            if the status below doesn't update shortly.
          </Banner>
        )}
        {checkoutParam === 'cancelled' && (
          <Banner tone="info" title="Checkout cancelled">
            No changes were made to your subscription.
          </Banner>
        )}

        {loading ? (
          <LoadingState label="Loading subscription…" />
        ) : error && !status ? (
          <ErrorState message={error} onRetry={load} />
        ) : status ? (
          <>
            {status.status === 'trialing' && (
              <Banner tone="info" title="Free trial active">
                Your trial ends {formatDay(status.trial_end, user?.timezone)}.
              </Banner>
            )}
            {status.status === 'past_due' && (
              <Banner tone="warning" title="Payment failed">
                We'll retry automatically. Update your payment method with your card issuer before{' '}
                {formatDay(status.grace_period_ends_at, user?.timezone)} to avoid losing access.
              </Banner>
            )}
            {status.cancel_at_period_end && status.status !== 'canceled' && (
              <Banner tone="warning" title="Cancellation scheduled">
                Your subscription will end on {formatDay(status.current_period_end, user?.timezone)}. You
                keep access until then.
              </Banner>
            )}
            {status.status === 'canceled' && (
              <Banner tone="locked" title="Subscription ended">
                You're back on the free plan. Manual finance features remain fully available.
              </Banner>
            )}
            {error && (
              <p className="font-body-sm text-body-sm text-expense-crimson" role="alert">
                {error}
              </p>
            )}

            <section className="flex flex-col gap-space-md rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
              <div className="flex flex-wrap items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <StatusChip tone={STATUS_TONE[status.status]}>{STATUS_LABEL[status.status]}</StatusChip>
                  <Money value={status.plan_amount_cents / 100} currency={status.plan_currency.toUpperCase()} size="stat" />
                  <span className="font-body-sm text-body-sm text-on-surface-variant">/ month</span>
                </div>
                {(status.status === 'none' || status.status === 'canceled') && (
                  <button
                    type="button"
                    disabled={startingCheckout}
                    onClick={handleStartCheckout}
                    className="flex items-center gap-space-xs rounded-lg bg-slate-navy-deep px-space-md py-space-sm font-label-md text-label-md text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="workspace_premium" className="text-[18px]" />
                    {startingCheckout ? 'Starting checkout…' : 'Start free trial'}
                  </button>
                )}
                {(status.status === 'trialing' || status.status === 'active') && !status.cancel_at_period_end && (
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(true)}
                    className="flex items-center gap-space-xs rounded-lg border border-expense-crimson px-space-md py-space-sm font-label-md text-label-md text-expense-crimson transition-colors hover:bg-expense-crimson-tint"
                  >
                    <Icon name="cancel" className="text-[18px]" />
                    Cancel subscription
                  </button>
                )}
              </div>
              {status.current_period_end && status.status !== 'canceled' && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Next billing date: {formatDay(status.current_period_end, user?.timezone)}
                </p>
              )}
            </section>

            {status.status !== 'none' && (
              <section className="flex flex-col gap-space-md rounded-lg border border-slate-border bg-surface-container-lowest p-space-lg">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Billing history</h2>
                {history.length === 0 ? (
                  <EmptyState icon="receipt_long" title="No invoices yet" description="Receipts appear here after your first billing cycle." />
                ) : (
                  <div className="flex flex-col divide-y divide-surface-container">
                    {history.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-space-sm py-space-sm">
                        <div className="flex items-center gap-space-sm">
                          <StatusChip tone={item.status === 'paid' ? 'positive' : 'warning'}>{item.status}</StatusChip>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            {formatDay(item.created_at, user?.timezone)}
                          </span>
                        </div>
                        <div className="flex items-center gap-space-sm">
                          <Money value={item.amount_paid} currency={item.currency.toUpperCase()} size="table" />
                          {item.hosted_invoice_url && (
                            <a
                              href={item.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-label-sm text-label-sm text-info-sky hover:text-slate-navy-deep"
                            >
                              View receipt
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmingCancel}
        title="Cancel subscription"
        description="You'll keep access until the end of your current billing period, then bank linking and Gross Balance will be turned off. Manual finance features are never affected."
        confirmLabel="Cancel subscription"
        destructive
        busy={canceling}
        onConfirm={handleCancel}
        onCancel={() => setConfirmingCancel(false)}
      />
    </AppShell>
  )
}

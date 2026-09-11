import { apiRequest } from '../api'
import type { BillingHistoryItem, CheckoutSessionRead, SubscriptionStatusRead } from '../types'

type BillingHistoryWire = Omit<BillingHistoryItem, 'amount_due' | 'amount_paid'> & {
  amount_due: number
  amount_paid: number
}

// Stripe amounts are integer cents; the rest of the app (Money, etc.)
// works in major currency units, same convention as parseDecimal elsewhere.
function normalizeInvoice(wire: BillingHistoryWire): BillingHistoryItem {
  return { ...wire, amount_due: wire.amount_due / 100, amount_paid: wire.amount_paid / 100 }
}

export function getSubscriptionStatus(signal?: AbortSignal) {
  return apiRequest<SubscriptionStatusRead>('/subscriptions/status', {}, signal)
}

export function createCheckoutSession(signal?: AbortSignal) {
  return apiRequest<CheckoutSessionRead>('/subscriptions/checkout-session', { method: 'POST' }, signal)
}

export function cancelSubscription(signal?: AbortSignal) {
  return apiRequest<SubscriptionStatusRead>('/subscriptions/cancel', { method: 'POST' }, signal)
}

export async function getBillingHistory(signal?: AbortSignal) {
  const wire = await apiRequest<BillingHistoryWire[]>('/subscriptions/billing-history', {}, signal)
  return wire.map(normalizeInvoice)
}

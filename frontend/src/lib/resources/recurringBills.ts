import { apiRequest } from '../api'
import { parseDecimal } from '../decimal'
import type { RecurringBillInput, RecurringBillRead } from '../types'

type RecurringBillWire = Omit<RecurringBillRead, 'amount'> & { amount: string | number }

function normalize(wire: RecurringBillWire): RecurringBillRead {
  return { ...wire, amount: parseDecimal(wire.amount) }
}

export async function listRecurringBills(signal?: AbortSignal) {
  const wire = await apiRequest<RecurringBillWire[]>('/recurring-bills', {}, signal)
  return wire.map(normalize)
}

export async function createRecurringBill(payload: RecurringBillInput, signal?: AbortSignal) {
  const wire = await apiRequest<RecurringBillWire>('/recurring-bills', { method: 'POST', body: JSON.stringify(payload) }, signal)
  return normalize(wire)
}

export async function updateRecurringBill(
  id: string,
  payload: Partial<RecurringBillInput & { is_active: boolean }>,
  signal?: AbortSignal,
) {
  const wire = await apiRequest<RecurringBillWire>(`/recurring-bills/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, signal)
  return normalize(wire)
}

export function deleteRecurringBill(id: string, signal?: AbortSignal) {
  return apiRequest<void>(`/recurring-bills/${id}`, { method: 'DELETE' }, signal)
}

export function generateDueRecurringBills(signal?: AbortSignal) {
  return apiRequest<{ generated: number; transaction_ids: string[] }>(
    '/recurring-bills/generate-due',
    { method: 'POST' },
    signal,
  )
}

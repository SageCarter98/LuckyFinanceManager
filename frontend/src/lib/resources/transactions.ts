import { apiRequest } from '../api'
import { parseDecimal } from '../decimal'
import type { TransactionFilters, TransactionInput, TransactionRead } from '../types'

type TransactionWire = Omit<TransactionRead, 'amount'> & { amount: string | number }

function normalize(wire: TransactionWire): TransactionRead {
  return { ...wire, amount: parseDecimal(wire.amount) }
}

function buildQuery(filters: TransactionFilters, page: TransactionPage): string {
  const params = new URLSearchParams()
  if (filters.account_id) params.set('account_id', filters.account_id)
  if (filters.category_id) params.set('category_id', filters.category_id)
  if (filters.start_date) params.set('start_date', filters.start_date)
  if (filters.end_date) params.set('end_date', filters.end_date)
  params.set('limit', String(page.limit))
  params.set('offset', String(page.offset))
  return `?${params.toString()}`
}

export interface TransactionPage {
  limit: number
  offset: number
}

export const DEFAULT_TRANSACTION_PAGE_SIZE = 50

export async function listTransactions(
  filters: TransactionFilters = {},
  page: TransactionPage = { limit: DEFAULT_TRANSACTION_PAGE_SIZE, offset: 0 },
  signal?: AbortSignal,
) {
  const wire = await apiRequest<TransactionWire[]>(`/transactions${buildQuery(filters, page)}`, {}, signal)
  return wire.map(normalize)
}

export async function createTransaction(payload: TransactionInput, signal?: AbortSignal) {
  const wire = await apiRequest<TransactionWire>('/transactions', { method: 'POST', body: JSON.stringify(payload) }, signal)
  return normalize(wire)
}

export async function updateTransaction(id: string, payload: Partial<TransactionInput>, signal?: AbortSignal) {
  const wire = await apiRequest<TransactionWire>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, signal)
  return normalize(wire)
}

export function deleteTransaction(id: string, signal?: AbortSignal) {
  return apiRequest<void>(`/transactions/${id}`, { method: 'DELETE' }, signal)
}

export function importTransactionsCsv(file: File, signal?: AbortSignal) {
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest<{ imported: number; rows: string[] }>(
    '/transactions/import',
    { method: 'POST', body: formData },
    signal,
  )
}

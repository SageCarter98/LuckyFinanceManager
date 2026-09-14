import { apiRequest } from '../api'
import { parseDecimal } from '../decimal'
import type {
  GrossBalanceRead,
  LinkedAccountDetailRead,
  LinkedAccountRead,
  LinkedAccountTransactionRead,
} from '../types'

type Wire<T> = { [K in keyof T]: T[K] extends number ? string | number : T[K] }

function normalizeTransaction(wire: Wire<LinkedAccountTransactionRead>): LinkedAccountTransactionRead {
  return { ...wire, amount: parseDecimal(wire.amount) }
}

function normalizeAccount(wire: Wire<LinkedAccountRead>): LinkedAccountRead {
  return { ...wire, current_balance: parseDecimal(wire.current_balance) }
}

function normalizeDetail(wire: Wire<LinkedAccountDetailRead>): LinkedAccountDetailRead {
  return {
    ...normalizeAccount(wire),
    recent_transactions: (wire.recent_transactions as unknown as Wire<LinkedAccountTransactionRead>[]).map(
      normalizeTransaction,
    ),
  }
}

function normalizeGrossBalance(wire: Wire<GrossBalanceRead>): GrossBalanceRead {
  return {
    ...wire,
    total_converted: parseDecimal(wire.total_converted),
    accounts: (wire.accounts as unknown as Wire<GrossBalanceRead['accounts'][number]>[]).map((line) => ({
      ...line,
      native_balance: parseDecimal(line.native_balance),
      converted_balance: parseDecimal(line.converted_balance),
      rate: parseDecimal(line.rate),
    })),
  }
}

export async function listInstitutions(signal?: AbortSignal) {
  return apiRequest<string[]>('/banking/institutions', {}, signal)
}

export async function listLinkedAccounts(signal?: AbortSignal) {
  const wire = await apiRequest<Wire<LinkedAccountRead>[]>('/banking/accounts', {}, signal)
  return wire.map(normalizeAccount)
}

export async function linkAccount(institutionName: string, signal?: AbortSignal) {
  const wire = await apiRequest<Wire<LinkedAccountRead>>(
    '/banking/accounts',
    { method: 'POST', body: JSON.stringify({ institution_name: institutionName }) },
    signal,
  )
  return normalizeAccount(wire)
}

export async function getLinkedAccount(id: string, signal?: AbortSignal) {
  const wire = await apiRequest<Wire<LinkedAccountDetailRead>>(`/banking/accounts/${id}`, {}, signal)
  return normalizeDetail(wire)
}

export async function syncLinkedAccount(id: string, signal?: AbortSignal) {
  const wire = await apiRequest<Wire<LinkedAccountRead>>(`/banking/accounts/${id}/sync`, { method: 'POST' }, signal)
  return normalizeAccount(wire)
}

export async function reauthorizeLinkedAccount(id: string, signal?: AbortSignal) {
  const wire = await apiRequest<Wire<LinkedAccountRead>>(
    `/banking/accounts/${id}/reauthorize`,
    { method: 'POST' },
    signal,
  )
  return normalizeAccount(wire)
}

export function unlinkAccount(id: string, signal?: AbortSignal) {
  return apiRequest<void>(`/banking/accounts/${id}`, { method: 'DELETE' }, signal)
}

export async function getGrossBalance(signal?: AbortSignal) {
  const wire = await apiRequest<Wire<GrossBalanceRead>>('/banking/gross-balance', {}, signal)
  return normalizeGrossBalance(wire)
}

import { apiRequest } from '../api'
import { parseDecimal } from '../decimal'
import type { AccountInput, AccountRead } from '../types'

type AccountWire = Omit<AccountRead, 'current_balance'> & { current_balance: string | number }

function normalize(wire: AccountWire): AccountRead {
  return { ...wire, current_balance: parseDecimal(wire.current_balance) }
}

export async function listAccounts(signal?: AbortSignal) {
  const wire = await apiRequest<AccountWire[]>('/accounts', {}, signal)
  return wire.map(normalize)
}

export async function createAccount(payload: AccountInput, signal?: AbortSignal) {
  const wire = await apiRequest<AccountWire>('/accounts', { method: 'POST', body: JSON.stringify(payload) }, signal)
  return normalize(wire)
}

export async function updateAccount(id: string, payload: Partial<AccountInput>, signal?: AbortSignal) {
  const wire = await apiRequest<AccountWire>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, signal)
  return normalize(wire)
}

export function deleteAccount(id: string, signal?: AbortSignal) {
  return apiRequest<void>(`/accounts/${id}`, { method: 'DELETE' }, signal)
}

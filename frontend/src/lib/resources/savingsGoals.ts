import { apiRequest } from '../api'
import { parseDecimal } from '../decimal'
import type { SavingsGoalInput, SavingsGoalRead } from '../types'

type SavingsGoalWire = Omit<SavingsGoalRead, 'target_amount' | 'current_amount'> & {
  target_amount: string | number
  current_amount: string | number
}

function normalize(wire: SavingsGoalWire): SavingsGoalRead {
  return { ...wire, target_amount: parseDecimal(wire.target_amount), current_amount: parseDecimal(wire.current_amount) }
}

export async function listSavingsGoals(signal?: AbortSignal) {
  const wire = await apiRequest<SavingsGoalWire[]>('/savings-goals', {}, signal)
  return wire.map(normalize)
}

export async function createSavingsGoal(payload: SavingsGoalInput, signal?: AbortSignal) {
  const wire = await apiRequest<SavingsGoalWire>('/savings-goals', { method: 'POST', body: JSON.stringify(payload) }, signal)
  return normalize(wire)
}

export async function updateSavingsGoal(id: string, payload: Partial<SavingsGoalInput>, signal?: AbortSignal) {
  const wire = await apiRequest<SavingsGoalWire>(`/savings-goals/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, signal)
  return normalize(wire)
}

export function deleteSavingsGoal(id: string, signal?: AbortSignal) {
  return apiRequest<void>(`/savings-goals/${id}`, { method: 'DELETE' }, signal)
}

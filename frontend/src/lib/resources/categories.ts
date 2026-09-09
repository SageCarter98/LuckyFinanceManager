import { apiRequest } from '../api'
import { parseNullableDecimal } from '../decimal'
import type { CategoryInput, CategoryRead } from '../types'

type CategoryWire = Omit<CategoryRead, 'monthly_limit'> & { monthly_limit: string | number | null }

function normalize(wire: CategoryWire): CategoryRead {
  return { ...wire, monthly_limit: parseNullableDecimal(wire.monthly_limit) }
}

export async function listCategories(signal?: AbortSignal) {
  const wire = await apiRequest<CategoryWire[]>('/categories', {}, signal)
  return wire.map(normalize)
}

export async function createCategory(payload: CategoryInput, signal?: AbortSignal) {
  const wire = await apiRequest<CategoryWire>('/categories', { method: 'POST', body: JSON.stringify(payload) }, signal)
  return normalize(wire)
}

export async function updateCategory(id: string, payload: Partial<CategoryInput>, signal?: AbortSignal) {
  const wire = await apiRequest<CategoryWire>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, signal)
  return normalize(wire)
}

export function deleteCategory(id: string, signal?: AbortSignal) {
  return apiRequest<void>(`/categories/${id}`, { method: 'DELETE' }, signal)
}

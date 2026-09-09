import { adminApiRequest } from '../api'
import type { AdminTenantSearchResult, AdminTenantSummary } from '../types'

export function searchTenantByEmail(email: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ email })
  return adminApiRequest<AdminTenantSearchResult>(`/admin/tenant/search?${params.toString()}`, {}, signal)
}

export function getTenantSummary(tenantId: string, signal?: AbortSignal) {
  return adminApiRequest<AdminTenantSummary>(`/admin/tenant/${tenantId}/summary`, {}, signal)
}

import { adminApiRequest } from '../api'
import type { AdminTenantSearchResult, AdminTenantSummary } from '../types'

// `reason` is required by the backend (Workstream G: "reason-captured,
// time-boxed read-only tenant lookup") -- every call here is audited
// server-side against it, so there is no optional/default form of these.
export function searchTenantByEmail(email: string, reason: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ email, reason })
  return adminApiRequest<AdminTenantSearchResult>(`/admin/tenant/search?${params.toString()}`, {}, signal)
}

export function getTenantSummary(tenantId: string, reason: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ reason })
  return adminApiRequest<AdminTenantSummary>(`/admin/tenant/${tenantId}/summary?${params.toString()}`, {}, signal)
}

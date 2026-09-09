import { apiRequest } from '../api'
import type { ExportPayload } from '../types'

export function exportTenantData(signal?: AbortSignal) {
  return apiRequest<ExportPayload>('/me/export', {}, signal)
}

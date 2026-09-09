import { apiRequest } from '../api'
import type { NotificationRead } from '../types'

export function listNotifications(signal?: AbortSignal) {
  return apiRequest<NotificationRead[]>('/notifications', {}, signal)
}

export function markNotificationRead(id: string, signal?: AbortSignal) {
  return apiRequest<NotificationRead>(`/notifications/${id}/read`, { method: 'PATCH' }, signal)
}

import { adminApiRequest } from '../api'
import type { LoginInput } from './auth'
import type { TokenPair, UserRead } from '../types'

// The backend exposes a single /auth/login and /auth/me pair for every role —
// there is no dedicated admin auth endpoint. These wrappers call the same
// paths but go through the isolated `adminApiRequest` client (separate
// in-memory token store from the consumer session) so a staff session can
// never be confused with, or leak into, a consumer session.

export function adminLogin(payload: LoginInput, signal?: AbortSignal) {
  return adminApiRequest<TokenPair>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }, signal)
}

export function adminMe(signal?: AbortSignal) {
  return adminApiRequest<UserRead>('/auth/me', {}, signal)
}

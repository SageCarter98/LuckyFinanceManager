import { apiRequest } from '../api'
import type { TokenPair, UserRead, UserUpdateInput } from '../types'

export interface SignupInput {
  email: string
  password: string
  full_name: string
}

export interface LoginInput {
  email: string
  password: string
}

export function signup(payload: SignupInput, signal?: AbortSignal) {
  return apiRequest<UserRead>('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }, signal)
}

export function login(payload: LoginInput, signal?: AbortSignal) {
  return apiRequest<TokenPair>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }, signal)
}

export function me(signal?: AbortSignal) {
  // `/me` also exists unprefixed directly on the FastAPI app (main.py), but this
  // client talks to everything under the versioned `/api` base, so it uses the
  // equivalent route mounted from auth.py (`/api/auth/me`).
  return apiRequest<UserRead>('/auth/me', {}, signal)
}

export function updateMe(payload: UserUpdateInput, signal?: AbortSignal) {
  return apiRequest<UserRead>('/auth/me', { method: 'PUT', body: JSON.stringify(payload) }, signal)
}

export function deleteMe(signal?: AbortSignal) {
  return apiRequest<void>('/auth/me', { method: 'DELETE' }, signal)
}

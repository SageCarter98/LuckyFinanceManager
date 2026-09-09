import { apiRequest } from '../api'
import type { TokenPair, UserRead, UserUpdateInput } from '../types'

export interface DevOnlyTokenResponse {
  status: string
  dev_token: string | null
}

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

export function verifyEmail(token: string, signal?: AbortSignal) {
  return apiRequest<UserRead>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }, signal)
}

export function resendVerification(signal?: AbortSignal) {
  return apiRequest<DevOnlyTokenResponse>('/auth/resend-verification', { method: 'POST' }, signal)
}

export function forgotPassword(email: string, signal?: AbortSignal) {
  return apiRequest<DevOnlyTokenResponse>(
    '/auth/forgot-password',
    { method: 'POST', body: JSON.stringify({ email }) },
    signal,
  )
}

export function resetPassword(token: string, newPassword: string, signal?: AbortSignal) {
  return apiRequest<DevOnlyTokenResponse>(
    '/auth/reset-password',
    { method: 'POST', body: JSON.stringify({ token, new_password: newPassword }) },
    signal,
  )
}

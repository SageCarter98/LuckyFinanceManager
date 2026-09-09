import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authSession, logoutRequest } from './api'
import { login as loginRequest, me as meRequest, signup as signupRequest } from './resources/auth'
import type { LoginInput, SignupInput } from './resources/auth'
import type { UserRead } from './types'

interface AuthContextValue {
  user: UserRead | null
  status: 'unauthenticated' | 'authenticated'
  login(input: LoginInput): Promise<void>
  signup(input: SignupInput): Promise<void>
  logout(): void
  /** Update local state after a profile mutation, without a network round-trip. */
  setUser(user: UserRead): void
  /** Set only by signup(), only outside production -- no email provider is
   * wired in yet, so this is the only way to actually verify an email today. */
  pendingVerificationToken: string | null
  dismissPendingVerificationToken(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null)
  const [pendingVerificationToken, setPendingVerificationToken] = useState<string | null>(null)

  // If a request 401s and the silent refresh also fails (expired, revoked,
  // or already-rotated refresh token), authSession clears itself. Mirror
  // that into React state so RequireAuth redirects to /login instead of
  // leaving the user on a page where every fetch silently fails.
  useEffect(() => authSession.subscribe(() => setUser(null)), [])

  const login = useCallback(async (input: LoginInput) => {
    const tokens = await loginRequest(input)
    authSession.set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token })
    try {
      const profile = await meRequest()
      setUser(profile)
    } catch (error) {
      authSession.clear()
      throw error
    }
  }, [])

  const signup = useCallback(
    async (input: SignupInput) => {
      const created = await signupRequest(input)
      setPendingVerificationToken(created.dev_verification_token)
      await login({ email: input.email, password: input.password })
    },
    [login],
  )

  const logout = useCallback(() => {
    void logoutRequest()
    setUser(null)
    setPendingVerificationToken(null)
  }, [])

  const dismissPendingVerificationToken = useCallback(() => setPendingVerificationToken(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status: user ? 'authenticated' : 'unauthenticated',
      login,
      signup,
      logout,
      setUser,
      pendingVerificationToken,
      dismissPendingVerificationToken,
    }),
    [user, login, signup, logout, pendingVerificationToken, dismissPendingVerificationToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

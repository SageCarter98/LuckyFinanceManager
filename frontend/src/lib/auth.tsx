import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authSession } from './api'
import { login as loginRequest, me as meRequest, signup as signupRequest } from './resources/auth'
import type { LoginInput, SignupInput } from './resources/auth'
import type { UserRead } from './types'

interface AuthContextValue {
  user: UserRead | null
  status: 'unauthenticated' | 'authenticated'
  login(input: LoginInput): Promise<void>
  signup(input: SignupInput): Promise<void>
  logout(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null)

  // If a request 401s and the silent refresh also fails (expired/invalid
  // refresh token — there's no /auth/refresh support server-side today, so
  // this fires on the very first 401 in practice), authSession clears itself.
  // Mirror that into React state so RequireAuth redirects to /login instead
  // of leaving the user on a page where every fetch silently fails.
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
      await signupRequest(input)
      await login({ email: input.email, password: input.password })
    },
    [login],
  )

  const logout = useCallback(() => {
    authSession.clear()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status: user ? 'authenticated' : 'unauthenticated', login, signup, logout }),
    [user, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

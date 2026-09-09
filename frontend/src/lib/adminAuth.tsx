import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { adminLogoutRequest, adminSession } from './api'
import { adminLogin, adminMe } from './resources/adminAuth'
import type { LoginInput } from './resources/auth'
import type { UserRead } from './types'

interface AdminAuthContextValue {
  staff: UserRead | null
  status: 'unauthenticated' | 'authenticated'
  login(input: LoginInput): Promise<void>
  logout(): void
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<UserRead | null>(null)

  useEffect(() => adminSession.subscribe(() => setStaff(null)), [])

  const login = useCallback(async (input: LoginInput) => {
    const tokens = await adminLogin(input)
    adminSession.set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token })
    try {
      const profile = await adminMe()
      if (profile.role !== 'admin') {
        adminSession.clear()
        throw new Error('This account does not have staff console access.')
      }
      setStaff(profile)
    } catch (error) {
      adminSession.clear()
      throw error
    }
  }, [])

  const logout = useCallback(() => {
    void adminLogoutRequest()
    setStaff(null)
  }, [])

  const value = useMemo<AdminAuthContextValue>(
    () => ({ staff, status: staff ? 'authenticated' : 'unauthenticated', login, logout }),
    [staff, login, logout],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  return context
}

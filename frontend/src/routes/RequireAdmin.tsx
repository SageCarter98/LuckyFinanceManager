import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../lib/adminAuth'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status } = useAdminAuth()

  if (status !== 'authenticated') {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}

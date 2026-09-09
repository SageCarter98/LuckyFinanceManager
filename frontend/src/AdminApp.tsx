import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminAuthProvider } from './lib/adminAuth'
import { RequireAdmin } from './routes/RequireAdmin'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminConsolePage } from './pages/admin/AdminConsolePage'

/**
 * Deliberately its own React tree, entry point and build output (see
 * admin-main.tsx / admin.html / vite.config.ts) -- not a route inside the
 * consumer App. The consumer bundle never imports AdminAuthProvider or
 * either admin page, and this bundle never imports the consumer's
 * AuthProvider/session -- satisfying FR-11.3's origin-separation intent at
 * the build level, not just via routing. Deploying the two outputs to
 * separate origins/subdomains is a hosting decision, still open.
 */
export function AdminApp() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminConsolePage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  )
}

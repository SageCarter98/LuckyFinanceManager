import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { AdminAuthProvider } from './lib/adminAuth'
import { RequireAuth } from './routes/RequireAuth'
import { RequireAdmin } from './routes/RequireAdmin'
import { LoginPage } from './pages/auth/LoginPage'
import { SignupPage } from './pages/auth/SignupPage'
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { OnboardingPage } from './pages/onboarding/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { AccountsPage } from './pages/AccountsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { BillsPage } from './pages/BillsPage'
import { GoalsPage } from './pages/GoalsPage'
import { ReportsPage } from './pages/ReportsPage'
import { BankingPage } from './pages/BankingPage'
import { SubscriptionPage } from './pages/SubscriptionPage'
import { ProfilePage } from './pages/settings/ProfilePage'
import { NotificationsPage } from './pages/settings/NotificationsPage'
import { DataPage } from './pages/settings/DataPage'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminConsolePage } from './pages/admin/AdminConsolePage'
import { NotFoundPage } from './pages/NotFoundPage'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/onboarding"
              element={
                <RequireAuth>
                  <OnboardingPage />
                </RequireAuth>
              }
            />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/accounts"
              element={
                <RequireAuth>
                  <AccountsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/categories"
              element={
                <RequireAuth>
                  <CategoriesPage />
                </RequireAuth>
              }
            />
            <Route
              path="/transactions"
              element={
                <RequireAuth>
                  <TransactionsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/bills"
              element={
                <RequireAuth>
                  <BillsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/goals"
              element={
                <RequireAuth>
                  <GoalsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/reports"
              element={
                <RequireAuth>
                  <ReportsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/banking"
              element={
                <RequireAuth>
                  <BankingPage />
                </RequireAuth>
              }
            />
            <Route
              path="/subscription"
              element={
                <RequireAuth>
                  <SubscriptionPage />
                </RequireAuth>
              }
            />
            <Route
              path="/settings/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/settings/notifications"
              element={
                <RequireAuth>
                  <NotificationsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/settings/data"
              element={
                <RequireAuth>
                  <DataPage />
                </RequireAuth>
              }
            />

            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminConsolePage />
                </RequireAdmin>
              }
            />

            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

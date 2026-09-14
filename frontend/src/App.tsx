import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { RequireAuth } from './routes/RequireAuth'
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
import { BankLinkPage } from './pages/BankLinkPage'
import { SubscriptionPage } from './pages/SubscriptionPage'
import { ProfilePage } from './pages/settings/ProfilePage'
import { NotificationsPage } from './pages/settings/NotificationsPage'
import { DataPage } from './pages/settings/DataPage'
import { NotFoundPage } from './pages/NotFoundPage'

/**
 * The staff support console is a separate app entirely -- see AdminApp.tsx,
 * admin-main.tsx and admin.html. This consumer bundle imports no admin
 * code at all (not AdminAuthProvider, not either admin page), which is
 * exactly the isolation FR-11.3 asks for, enforced at build time rather
 * than only by routing.
 */
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            path="/banking/link"
            element={
              <RequireAuth>
                <BankLinkPage />
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

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

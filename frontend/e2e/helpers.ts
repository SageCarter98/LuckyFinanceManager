import type { Page } from '@playwright/test'

export interface TestUser {
  fullName: string
  email: string
  password: string
}

let counter = 0

/** A fresh, guaranteed-unique identity per call -- E2E specs share one real
 * backend and database (see playwright.config.ts), so tests must never
 * collide on email. */
export function uniqueUser(label: string): TestUser {
  counter += 1
  const stamp = `${Date.now()}-${counter}`
  return {
    fullName: `${label} Tester`,
    email: `e2e-${label.toLowerCase().replace(/\s+/g, '-')}-${stamp}@example.com`,
    password: 'StrongPass123!',
  }
}

/** Signs up a brand-new user against the real backend and lands on
 * /onboarding, exactly like a real user would. */
export async function signup(page: Page, user: TestUser): Promise<void> {
  await page.goto('/signup')
  await page.getByLabel(/full name/i).fill(user.fullName)
  await page.getByLabel(/^email/i).fill(user.email)
  await page.getByLabel(/^password/i).fill(user.password)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL('**/onboarding')
}

export async function skipOnboarding(page: Page): Promise<void> {
  await page.getByRole('button', { name: /skip for now/i }).click()
  await page.waitForURL((url) => url.pathname === '/')
}

/** Signs up and skips onboarding in one call -- the common starting point
 * for specs whose subject is not the onboarding flow itself. */
export async function signupAndSkipOnboarding(page: Page, label: string): Promise<TestUser> {
  const user = uniqueUser(label)
  await signup(page, user)
  await skipOnboarding(page)
  return user
}

const NAV_LABELS = [
  'Dashboard',
  'Transactions',
  'Accounts',
  'Categories',
  'Recurring Bills',
  'Goals',
  'Reports',
  'Banking',
  'Subscription',
  'Settings',
] as const

/** Navigates via the sidebar link, like a real user would -- never
 * `page.goto()` once a test is authenticated. Access/refresh tokens live in
 * memory only (a deliberate security choice: never in localStorage,
 * cookies, or anywhere a hard reload could resurrect them -- see
 * lib/api.ts's SessionHandle), so `page.goto()` is a full page load that
 * silently logs the session out and every following assertion fails against
 * the login page instead. Client-side navigation (a click) never reloads
 * the page, so the in-memory session survives, exactly as it does for a
 * real user clicking around the app. */
export async function goToNav(page: Page, label: (typeof NAV_LABELS)[number]): Promise<void> {
  await page.getByRole('navigation', { name: /main navigation/i }).getByRole('link', { name: label }).click()
}

/** "Data & privacy" is reachable only from the avatar dropdown menu, not
 * the main sidebar. */
export async function goToDataSettings(page: Page): Promise<void> {
  await page.locator('header button[aria-haspopup="true"]').click()
  await page.getByRole('link', { name: /data & privacy/i }).click()
}

// Matches playwright.config.ts's BACKEND_PORT / frontend/.env.development's
// VITE_API_BASE_URL -- not proxied through the frontend dev server, so
// page.request (which defaults to the frontend baseURL) needs the full
// backend origin to reach these.
const BACKEND_API_BASE = 'http://127.0.0.1:8000/api'

async function backendAccessToken(page: Page, user: TestUser): Promise<string> {
  const login = await page.request.post(`${BACKEND_API_BASE}/auth/login`, {
    data: { email: user.email, password: user.password },
  })
  const body = await login.json()
  return body.access_token
}

/** Activates a trial entitlement via a dev-only backend endpoint, bypassing
 * real Stripe checkout -- no Stripe test-mode account is configured for
 * this project yet, so there is no UI path to an active subscription in
 * E2E. Only used to unlock subscription-gated features (Banking) under
 * test; never itself the thing being tested. A fresh API-level login, not
 * the page's own in-memory session -- keeps this setup step independent of
 * whatever UI state the test is in. */
export async function grantTrialEntitlement(page: Page, user: TestUser): Promise<void> {
  const token = await backendAccessToken(page, user)
  const grant = await page.request.post(`${BACKEND_API_BASE}/subscriptions/dev-grant-trial`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!grant.ok()) throw new Error(`dev-grant-trial failed: ${grant.status()} ${await grant.text()}`)
}

/** Reads back the tenant's linked accounts via the real API (not the UI) --
 * used only to find an id `lapseConsent` needs after linking through the
 * UI, never to assert on the feature under test itself. */
export async function listLinkedAccountIds(page: Page, user: TestUser): Promise<string[]> {
  const token = await backendAccessToken(page, user)
  const list = await page.request.get(`${BACKEND_API_BASE}/banking/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const accounts: { id: string }[] = await list.json()
  return accounts.map((account) => account.id)
}

/** Puts a linked account's consent into the lapsed state via banking's own
 * dev-only endpoint (`POST /banking/accounts/{id}/lapse-consent`) -- a
 * real provider would notify this app of a lapse via webhook, and no such
 * provider exists yet (stub adapter), so this is the only way to reach
 * that state at all. Mirrors backend/tests/test_banking.py's own use of
 * the same endpoint. */
export async function lapseConsent(page: Page, user: TestUser, linkedAccountId: string): Promise<void> {
  const token = await backendAccessToken(page, user)
  const lapse = await page.request.post(`${BACKEND_API_BASE}/banking/accounts/${linkedAccountId}/lapse-consent`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!lapse.ok()) throw new Error(`lapse-consent failed: ${lapse.status()} ${await lapse.text()}`)
}

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

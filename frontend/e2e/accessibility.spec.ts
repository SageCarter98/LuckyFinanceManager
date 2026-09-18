import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { goToNav, grantTrialEntitlement, signupAndSkipOnboarding } from './helpers'

/**
 * SDLC tracker #131: automated WCAG 2.1 A/AA scanning via axe-core, run
 * against every real route in App.tsx -- not a manual spot-check.
 *
 * Scope and its limits, disclosed rather than implied: axe-core catches
 * ~30-50% of real WCAG issues (encoding, contrast, labeling, landmarks,
 * ARIA misuse) -- it cannot verify actual keyboard-only operability, screen
 * reader announcement quality, or focus-order correctness. This is
 * real automated coverage layered on top of nothing, not a claim that
 * accessibility testing is now complete.
 *
 * Verification status as of 2026-09-18, disclosed honestly rather than
 * assumed clean: this dev machine hit severe memory pressure while this
 * spec was being written (free memory measured as low as ~35MB of 3.5GB
 * total mid-session) -- three of the four test groups below have NOT
 * completed a full live run end to end; they kept timing out on server/
 * browser startup and page navigation, not on axe findings. The one group
 * that did complete (`group 3`) found 5 real color-contrast violations,
 * which were fixed in `src/styles/theme.css` (darkened
 * --color-growth-emerald-deep/--color-expense-crimson/--color-warning-amber/
 * --color-info-sky) and independently re-verified two ways that don't need
 * a full app+browser stack: a live axe-core scan of the real /login page
 * (0 violations after the fix), and a live axe-core scan of a static HTML
 * fixture using the exact four fixed colors against their exact real
 * backgrounds (0 violations). A code audit (grep across src for every
 * consumer of these four tokens, StatusChip.tsx/Banner.tsx included)
 * found no other token combination in use. That is real, but it is not
 * the same as this spec passing end to end on every route -- re-run the
 * full suite once this machine has headroom and update this note.
 */

interface PageViolation {
  route: string
  violations: string[]
}

async function scan(page: Page, route: string, results: PageViolation[]): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  if (violations.length > 0) {
    results.push({
      route,
      violations: violations.map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s)) -- ${v.helpUrl}`),
    })
  }
}

function assertClean(results: PageViolation[]): void {
  if (results.length === 0) return
  const report = results.map((r) => `${r.route}:\n  ${r.violations.join('\n  ')}`).join('\n\n')
  expect(results, `axe-core found violations:\n\n${report}`).toEqual([])
}

// This dev machine is slow (4GB RAM, playwright.config.ts's own comments
// document repeated timeout/OOM issues) -- axe-core's injected script plus
// a real page render, repeated per route, comfortably exceeds the global
// 60s default across a group of pages. 3 minutes per test, small route
// groups per test, so one slow group's timeout doesn't discard scan
// results already collected for the routes checked before it.
test.describe('accessibility (axe-core, WCAG 2.1 A/AA)', () => {
  test.describe.configure({ timeout: 180_000 })

  test('public/unauthenticated pages', async ({ page }) => {
    const results: PageViolation[] = []

    await page.goto('/login')
    await scan(page, '/login', results)

    await page.goto('/signup')
    await scan(page, '/signup', results)

    await page.goto('/forgot-password')
    await scan(page, '/forgot-password', results)

    assertClean(results)
  })

  test('authenticated pages, group 1: dashboard and manual-finance CRUD screens', async ({ page }) => {
    const results: PageViolation[] = []
    await signupAndSkipOnboarding(page, 'A11y Group1')

    // Dashboard is already the landing page post-onboarding.
    await scan(page, '/ (dashboard)', results)

    await goToNav(page, 'Accounts')
    await scan(page, '/accounts', results)

    await goToNav(page, 'Categories')
    await scan(page, '/categories', results)

    await goToNav(page, 'Transactions')
    await scan(page, '/transactions', results)

    assertClean(results)
  })

  test('authenticated pages, group 2: bills, goals, reports, banking', async ({ page }) => {
    const results: PageViolation[] = []
    const user = await signupAndSkipOnboarding(page, 'A11y Group2')
    await grantTrialEntitlement(page, user)

    await goToNav(page, 'Recurring Bills')
    await scan(page, '/bills', results)

    await goToNav(page, 'Goals')
    await scan(page, '/goals', results)

    await goToNav(page, 'Reports')
    await scan(page, '/reports', results)

    await goToNav(page, 'Banking')
    await scan(page, '/banking', results)

    await page.getByRole('button', { name: 'Link an account', exact: true }).first().click()
    await expect(page).toHaveURL(/\/banking\/link$/)
    await scan(page, '/banking/link', results)

    assertClean(results)
  })

  test('authenticated pages, group 3: subscription and settings', async ({ page }) => {
    const results: PageViolation[] = []
    await signupAndSkipOnboarding(page, 'A11y Group3')

    await goToNav(page, 'Subscription')
    await scan(page, '/subscription', results)

    await goToNav(page, 'Settings')
    await scan(page, '/settings/profile', results)

    await page.getByRole('link', { name: 'Notifications' }).click()
    await scan(page, '/settings/notifications', results)

    await page.getByRole('link', { name: 'Data & privacy' }).click()
    await scan(page, '/settings/data', results)

    await page.getByRole('link', { name: 'Security' }).click()
    await scan(page, '/settings/security', results)

    assertClean(results)
  })
})

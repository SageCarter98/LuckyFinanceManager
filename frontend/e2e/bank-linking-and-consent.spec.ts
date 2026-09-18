import { expect, test } from '@playwright/test'
import { goToNav, grantTrialEntitlement, lapseConsent, listLinkedAccountIds, signupAndSkipOnboarding } from './helpers'

test.describe('bank linking and consent', () => {
  test('link, sync, view and unlink a bank account through the real consent flow', async ({ page }) => {
    const user = await signupAndSkipOnboarding(page, 'Bank Linking')

    // No UI path to an active subscription in E2E (no Stripe test-mode
    // account configured) -- see helpers.ts's grantTrialEntitlement.
    await grantTrialEntitlement(page, user)

    await goToNav(page, 'Banking')
    await expect(page.getByText('No linked accounts yet')).toBeVisible()

    // Both the page header and the empty-state action are labeled "Link an
    // account" (the header one's icon is aria-hidden, so its accessible
    // name matches too) -- `.first()` picks the header's, which does the
    // same navigate('/banking/link') either way.
    await page.getByRole('button', { name: 'Link an account', exact: true }).first().click()
    await expect(page).toHaveURL(/\/banking\/link$/)
    await expect(page.getByText(/Test data only — Stub Sandbox Connector/)).toBeVisible()

    const linkButton = page.getByRole('button', { name: /^link account$/i })
    await expect(linkButton).toBeDisabled()

    const firstInstitution = page.getByRole('radio').first()
    await firstInstitution.check()
    await expect(linkButton).toBeDisabled() // consent not yet given

    await page.getByRole('checkbox').check()
    await expect(linkButton).toBeEnabled()
    await linkButton.click()

    await expect(page).toHaveURL(/\/banking$/)
    await expect(page.getByRole('heading', { name: 'Gross Balance' })).toBeVisible()
    // Account row: "<type> •••• <last4>", masked, never the full number.
    await expect(page.getByText(/•{4}\s*\d{4}/)).toBeVisible()
    await expect(page.getByText(/^Synced /)).toBeVisible()
    await expect(page.getByText('Read-only').first()).toBeVisible()

    // Expand the account row to load its recent transactions detail.
    await page.getByText(/•{4}\s*\d{4}/).click()
    await expect(page.getByText('Recent transactions — linked, not manually entered')).toBeVisible()
    await expect(page.getByText('No recent transactions.')).not.toBeVisible()

    // Sync is deterministic per account (app/core/bank_provider.py seeds
    // its RNG on external_account_ref), but which of the two documented
    // outcomes (FE-14.14) a given account lands on isn't predictable from
    // here -- accept either rather than asserting one specific outcome.
    await page.getByRole('button', { name: /sync now/i }).click()
    await expect(page.getByRole('button', { name: /syncing…/i })).not.toBeVisible()
    await expect(page.getByText(/^Synced /).or(page.getByText('Last sync failed — balance may be out of date'))).toBeVisible()

    await page.getByRole('button', { name: /^unlink$/i }).click()
    await expect(page.getByRole('heading', { name: 'Unlink account' })).toBeVisible()
    await page.getByRole('button', { name: /^unlink account$/i }).click()

    await expect(page.getByText('No linked accounts yet')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Gross Balance' })).not.toBeVisible()
  })

  test('a lapsed consent blocks sync until re-authorized', async ({ page }) => {
    const user = await signupAndSkipOnboarding(page, 'Bank Reauth')
    await grantTrialEntitlement(page, user)

    await goToNav(page, 'Banking')
    // Both the page header and the empty-state action are labeled "Link an
    // account" (the header one's icon is aria-hidden, so its accessible
    // name matches too) -- `.first()` picks the header's, which does the
    // same navigate('/banking/link') either way.
    await page.getByRole('button', { name: 'Link an account', exact: true }).first().click()
    await page.getByRole('radio').first().check()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /^link account$/i }).click()
    await expect(page).toHaveURL(/\/banking$/)

    // No real provider webhook exists to trigger a lapse (FE-14.13's own
    // docstring) -- banking's dev-only lapse-consent endpoint is the only
    // way to reach this state at all; mirrors what
    // backend/tests/test_banking.py does at the API layer.
    const [linkedAccountId] = await listLinkedAccountIds(page, user)
    await lapseConsent(page, user, linkedAccountId)

    await goToNav(page, 'Dashboard')
    await goToNav(page, 'Banking')

    await expect(page.getByText('Re-authorization needed')).toBeVisible()
    await expect(page.getByText('Consent lapsed')).toBeVisible()
    await expect(page.getByRole('button', { name: /sync now/i })).not.toBeVisible()

    await page.getByRole('button', { name: /^re-authorize$/i }).click()
    await expect(page.getByText('Consent lapsed')).not.toBeVisible()
    await expect(page.getByRole('button', { name: /sync now/i })).toBeVisible()
  })
})

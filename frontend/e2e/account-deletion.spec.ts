import { expect, test } from '@playwright/test'
import { goToDataSettings, goToNav, signupAndSkipOnboarding } from './helpers'

test.describe('account deletion', () => {
  test('typed-confirmation deletion logs the user out and the account can no longer sign in', async ({ page }) => {
    const user = await signupAndSkipOnboarding(page, 'Account Deletion')

    await goToDataSettings(page)
    await page.getByRole('button', { name: /delete my account/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText(user.email)
    const confirmButton = dialog.getByRole('button', { name: 'Delete my account' })
    await expect(confirmButton).toBeDisabled()

    // Wrong phrase stays locked.
    await dialog.getByLabel(/type/i).fill('not my email')
    await expect(confirmButton).toBeDisabled()

    await dialog.getByLabel(/type/i).fill(user.email)
    await expect(confirmButton).toBeEnabled()
    await confirmButton.click()

    await page.waitForURL('**/login')

    // The account is deactivated, not just logged out -- logging back in
    // with correct credentials must fail (auth.py: is_active is checked).
    await page.getByLabel(/email/i).fill(user.email)
    await page.getByLabel(/^password/i).fill(user.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByRole('alert')).toContainText(/invalid/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('canceling the confirmation dialog deletes nothing', async ({ page }) => {
    const user = await signupAndSkipOnboarding(page, 'Cancel Deletion')

    await goToDataSettings(page)
    await page.getByRole('button', { name: /delete my account/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).not.toBeVisible()

    // Session still works right where we are (no page.reload() here --
    // that would drop the in-memory-only session by itself and prove
    // nothing about whether *cancel* deleted anything; see helpers.ts).
    await expect(page.getByRole('button', { name: /delete my account/i })).toBeVisible()
    await goToNav(page, 'Dashboard')
    await expect(page.getByRole('heading', { name: /good to see you/i })).toBeVisible()

    // Sign out and back in with the original credentials -- the strongest
    // proof the account itself still exists and wasn't touched.
    await page.getByRole('button', { name: /sign out/i }).click()
    await page.waitForURL('**/login')
    await page.getByLabel(/email/i).fill(user.email)
    await page.getByLabel(/^password/i).fill(user.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByRole('heading', { name: /good to see you/i })).toBeVisible()
  })
})

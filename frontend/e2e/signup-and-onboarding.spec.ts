import { expect, test } from '@playwright/test'
import { goToNav, skipOnboarding, uniqueUser, signup } from './helpers'

test.describe('signup and onboarding', () => {
  test('creates a real account, reaches onboarding, and skipping lands on an empty dashboard', async ({ page }) => {
    const user = uniqueUser('Skip Onboarding')
    await signup(page, user)

    await expect(page.getByRole('heading', { name: /set up your starter categories/i })).toBeVisible()
    await expect(page.getByText(new RegExp(`welcome.*${user.fullName}`, 'i'))).toBeVisible()

    await skipOnboarding(page)

    await expect(page.getByRole('heading', { name: /good to see you/i })).toBeVisible()
    await expect(page.getByText('No accounts yet')).toBeVisible()

    // Skipping onboarding must not have created any categories.
    await goToNav(page, 'Categories')
    await expect(page.getByText('No categories yet')).toBeVisible()
  })

  test('finishing onboarding creates exactly the selected starter categories, not the defaults', async ({ page }) => {
    const user = uniqueUser('Finish Onboarding')
    await signup(page, user)

    // Defaults: Essentials, Housing & Rent, Bills & Utilities and Income are
    // enabled; Transport and Lifestyle are not. Deselect one default-on
    // category and add one default-off category, to prove the selection
    // (not just "the defaults") drives what gets created.
    const housingRow = page.locator('label', { hasText: 'Housing & Rent' })
    await housingRow.getByRole('checkbox').uncheck()
    const transportRow = page.locator('label', { hasText: 'Transport' })
    await transportRow.getByRole('checkbox').check()

    await page.getByRole('button', { name: /finish setup/i }).click()
    await page.waitForURL((url) => url.pathname === '/')

    await goToNav(page, 'Categories')
    await expect(page.getByText('Essentials')).toBeVisible()
    await expect(page.getByText('Bills & Utilities')).toBeVisible()
    await expect(page.getByText('Income')).toBeVisible()
    await expect(page.getByText('Transport')).toBeVisible()
    await expect(page.getByText('Housing & Rent')).not.toBeVisible()
    await expect(page.getByText('Lifestyle')).not.toBeVisible()
  })

  test('rejects a weak password before ever contacting the server', async ({ page }) => {
    const user = uniqueUser('Weak Password')
    await page.goto('/signup')
    await page.getByLabel(/full name/i).fill(user.fullName)
    await page.getByLabel(/^email/i).fill(user.email)
    await page.getByLabel(/^password/i).fill('short')

    await expect(page.getByRole('button', { name: /create account/i })).toBeDisabled()
  })

  test('an unverified account can still sign in and log out (no unverified-lockout regression)', async ({ page }) => {
    const user = uniqueUser('Login Logout')
    await signup(page, user)
    await skipOnboarding(page)

    await page.getByRole('button', { name: /sign out/i }).click()
    await page.waitForURL('**/login')

    await page.getByLabel(/email/i).fill(user.email)
    await page.getByLabel(/^password/i).fill(user.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByRole('heading', { name: /good to see you/i })).toBeVisible()
  })
})

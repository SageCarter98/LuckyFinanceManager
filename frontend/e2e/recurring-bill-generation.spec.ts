import { expect, test } from '@playwright/test'
import { goToNav, signupAndSkipOnboarding } from './helpers'

test.describe('recurring bills', () => {
  test('generating due bills creates a real transaction exactly once per period', async ({ page }) => {
    await signupAndSkipOnboarding(page, 'Recurring Bill')

    await goToNav(page, 'Accounts')
    await page.getByRole('button', { name: /add account/i }).click()
    await page.getByLabel(/account name/i).fill('Bills Checking')
    await page.getByLabel(/opening balance/i).fill('1000')
    await page.getByRole('button', { name: /^create account$/i }).click()
    await expect(page.getByText('Bills Checking')).toBeVisible()

    // Monthly bills are due when today's day-of-month matches due_day --
    // computed at run time so this test is due "today" on any real date,
    // not tied to when it happens to be written or run (see
    // backend/app/routers/recurring_bills.py's _is_due_for_date).
    const todayDay = String(new Date().getDate())

    await goToNav(page, 'Recurring Bills')
    await page.getByRole('button', { name: /^new bill$/i }).click()
    await page.getByLabel(/^name/i).fill('Rent')
    await page.getByLabel(/amount/i).fill('1200')
    const dueDayInput = page.getByLabel(/due day/i)
    await dueDayInput.fill(todayDay)
    await page.getByRole('button', { name: /^create bill$/i }).click()
    await expect(page.getByText('Rent')).toBeVisible()

    await page.getByRole('button', { name: /generate due bills now/i }).click()
    await expect(page.getByText(/Generated 1 transaction/)).toBeVisible()

    await goToNav(page, 'Transactions')
    await expect(page.getByText('Recurring bill: Rent')).toBeVisible()
    const row = page.locator('tr', { hasText: 'Recurring bill: Rent' })
    await expect(row).toContainText('1,200.00')

    // Running it again the same day/period must not double-create.
    await goToNav(page, 'Recurring Bills')
    await page.getByRole('button', { name: /generate due bills now/i }).click()
    await expect(page.getByText(/Nothing was due today/)).toBeVisible()

    await goToNav(page, 'Transactions')
    await expect(page.getByText('Recurring bill: Rent')).toHaveCount(1)
  })

  test('a paused bill is not generated', async ({ page }) => {
    await signupAndSkipOnboarding(page, 'Paused Bill')

    await goToNav(page, 'Accounts')
    await page.getByRole('button', { name: /add account/i }).click()
    await page.getByLabel(/account name/i).fill('Paused Bill Checking')
    await page.getByRole('button', { name: /^create account$/i }).click()
    await expect(page.getByText('Paused Bill Checking')).toBeVisible()

    const todayDay = String(new Date().getDate())
    await goToNav(page, 'Recurring Bills')
    await page.getByRole('button', { name: /^new bill$/i }).click()
    await page.getByLabel(/^name/i).fill('Gym membership')
    await page.getByLabel(/amount/i).fill('40')
    const dueDayInput = page.getByLabel(/due day/i)
    await dueDayInput.fill(todayDay)
    await page.getByRole('button', { name: /^create bill$/i }).click()
    await expect(page.getByText('Gym membership')).toBeVisible()

    // Toggle the status chip from Active to Paused before generating.
    // getByRole's `name` does substring matching by default (not exact),
    // so an unqualified {name: 'Paused'} ALSO matches the avatar menu
    // button -- its accessible name includes the user's own full name
    // ("Paused Bill Tester", from uniqueUser()) -- and that button is
    // always visible regardless of the bill's actual state. Without
    // `exact: true` this assertion can pass on the wrong element before
    // the toggle's PUT has actually round-tripped, letting the next step
    // (Generate) race ahead of the real state change.
    await page.getByRole('button', { name: /active/i }).click()
    await expect(page.getByRole('button', { name: 'Paused', exact: true })).toBeVisible()

    await page.getByRole('button', { name: /generate due bills now/i }).click()
    await expect(page.getByText(/Nothing was due today/)).toBeVisible()

    await goToNav(page, 'Transactions')
    await expect(page.getByText('No transactions found')).toBeVisible()
  })
})

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { goToNav, signupAndSkipOnboarding } from './helpers'

async function createAccount(
  page: Page,
  { name, type, currency, balance }: { name: string; type: 'checking' | 'savings'; currency: string; balance: string },
) {
  // goToNav, not page.goto -- see helpers.ts: a full navigation drops the
  // in-memory-only session and every following step silently ends up on
  // the login page instead.
  await goToNav(page, 'Accounts')
  await page.getByRole('button', { name: /add account/i }).click()
  await page.getByLabel(/account name/i).fill(name)
  await page.getByLabel(/account type/i).selectOption(type)
  await page.getByLabel(/native currency/i).selectOption(currency)
  await page.getByLabel(/opening balance/i).fill(balance)
  await page.getByRole('button', { name: /^create account$/i }).click()
  await expect(page.getByText(name)).toBeVisible()
}

test.describe('manual finance: multi-currency accounts and transactions', () => {
  test('dashboard discloses mixed currencies instead of summing them, and transactions keep each currency distinct', async ({
    page,
  }) => {
    await signupAndSkipOnboarding(page, 'Currency Mismatch')

    await createAccount(page, { name: 'Main Checking USD', type: 'checking', currency: 'USD', balance: '500' })
    await createAccount(page, { name: 'Reise Konto EUR', type: 'savings', currency: 'EUR', balance: '300' })

    await goToNav(page, 'Dashboard')
    await expect(page.getByText('Your accounts use more than one currency')).toBeVisible()

    // Add one transaction per account, in that account's own currency. The
    // filter bar above the table also has an "Account" field, so every
    // selector here is scoped to the drawer's <form> to avoid ambiguity.
    await goToNav(page, 'Transactions')
    // The only <form> on this page is the drawer's -- the filter bar above
    // the table uses plain <select> elements outside any <form>, so scoping
    // to `form` here is enough to avoid colliding with its "Account" filter.
    const form = page.locator('form')
    await page.getByRole('button', { name: /add transaction/i }).click()
    await form.getByLabel(/^account/i).selectOption({ label: 'Main Checking USD (USD)' })
    await form.getByLabel(/amount/i).fill('42.50')
    await form.getByLabel(/note/i).fill('Groceries run')
    await form.getByRole('button', { name: /^add transaction$/i }).click()
    await expect(page.getByText('Groceries run')).toBeVisible()

    await page.getByRole('button', { name: /add transaction/i }).click()
    await form.getByRole('button', { name: 'Income' }).click()
    await form.getByLabel(/^account/i).selectOption({ label: 'Reise Konto EUR (EUR)' })
    await form.getByLabel(/amount/i).fill('100')
    await form.getByLabel(/note/i).fill('Freelance gig')
    await form.getByRole('button', { name: /^add transaction$/i }).click()
    await expect(page.getByText('Freelance gig')).toBeVisible()

    // Each row shows its own real currency -- never converted, never a bare "$".
    const usdRow = page.locator('tr', { hasText: 'Groceries run' })
    await expect(usdRow).toContainText('USD')
    const eurRow = page.locator('tr', { hasText: 'Freelance gig' })
    await expect(eurRow).toContainText('EUR')
  })

  test('imports transactions from a CSV file against a real account', async ({ page }) => {
    await signupAndSkipOnboarding(page, 'CSV Import')
    await createAccount(page, { name: 'Import Checking', type: 'checking', currency: 'USD', balance: '0' })

    await goToNav(page, 'Transactions')

    const csv = 'account_name,amount,transaction_type,note\nImport Checking,957.50,income,Initial deposit\n'
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'transactions.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })

    await expect(page.getByText('Imported 1 transaction.')).toBeVisible()
    await expect(page.getByText('Initial deposit')).toBeVisible()

    // The account balance actually moved -- CSV import is real, not a
    // client-side-only preview (this exact scenario, 0.00 -> 957.50 for a
    // single-row CSV, is the regression this test guards: see the FRS plan's
    // Increment 3 notes for the Decimal/date bugs this import path caught).
    await goToNav(page, 'Accounts')
    // Matches the account's own balance display ("$957.50 USD"), not the
    // group-subtotal line ("Subtotal: 957.50 USD") -- both contain the
    // number, only the balance display has the currency symbol.
    await expect(page.getByText('$957.50')).toBeVisible()
  })

  test('rejects a CSV row referencing an account that does not exist, without creating a partial import', async ({
    page,
  }) => {
    await signupAndSkipOnboarding(page, 'CSV Bad Account')
    await goToNav(page, 'Transactions')

    const csv = 'account_name,amount\nNonexistent Account,10.00\n'
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByText('No transactions found')).toBeVisible()
  })
})

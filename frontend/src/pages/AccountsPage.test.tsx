import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../test/msw/server'
import { AccountsPage } from './AccountsPage'

const BASE = 'http://localhost:3000/api'

// AppShell (which AccountsPage renders inside) calls useAuth() and fetches
// /notifications on mount. Mocking the auth module lets this file test
// AccountsPage's own CRUD/state behavior directly, without going through a
// real login flow (LoginPage.test.tsx already covers that path).
vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', full_name: 'Jane Doe', email: 'jane@example.com', email_verified: true },
    logout: vi.fn(),
    pendingVerificationToken: null,
    dismissPendingVerificationToken: vi.fn(),
  }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <AccountsPage />
    </MemoryRouter>,
  )
}

function checkingAccount(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'acc-1',
    tenant_id: 'tenant-1',
    name: 'Main checking',
    account_type: 'checking',
    native_currency: 'USD',
    current_balance: '949.75', // wire shape: Decimal serialized as a string
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('AccountsPage', () => {
  afterEach(() => vi.clearAllMocks())

  it('shows a loading state, then the populated list grouped by account type', async () => {
    server.use(
      http.get(`${BASE}/notifications`, () => HttpResponse.json([])),
      http.get(`${BASE}/accounts`, () =>
        HttpResponse.json([
          checkingAccount(),
          checkingAccount({ id: 'acc-2', name: 'Joint checking', current_balance: '100.00' }),
          checkingAccount({ id: 'acc-3', name: 'Emergency fund', account_type: 'savings', current_balance: '5000.00' }),
        ]),
      ),
    )

    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()

    expect(await screen.findByText('Main checking')).toBeInTheDocument()
    expect(screen.getByText('Joint checking')).toBeInTheDocument()
    expect(screen.getByText('Emergency fund')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Checking' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Savings' })).toBeInTheDocument()

    // Same-currency group gets a summed subtotal (949.75 + 100.00).
    expect(screen.getByText(/Subtotal: 1,049\.75 USD/)).toBeInTheDocument()
  })

  it('shows a mixed-currency disclosure instead of silently summing across currencies', async () => {
    server.use(
      http.get(`${BASE}/notifications`, () => HttpResponse.json([])),
      http.get(`${BASE}/accounts`, () =>
        HttpResponse.json([
          checkingAccount(),
          checkingAccount({ id: 'acc-2', name: 'Euro checking', native_currency: 'EUR', current_balance: '200.00' }),
        ]),
      ),
    )

    renderPage()
    expect(await screen.findByText('Main checking')).toBeInTheDocument()
    expect(screen.getByText('Mixed currencies — see each account below')).toBeInTheDocument()
  })

  it('shows an empty state with no accounts', async () => {
    server.use(
      http.get(`${BASE}/notifications`, () => HttpResponse.json([])),
      http.get(`${BASE}/accounts`, () => HttpResponse.json([])),
    )

    renderPage()
    expect(await screen.findByText('No accounts yet')).toBeInTheDocument()
  })

  it('shows an error state with a working retry', async () => {
    let calls = 0
    server.use(
      http.get(`${BASE}/notifications`, () => HttpResponse.json([])),
      http.get(`${BASE}/accounts`, () => {
        calls += 1
        if (calls === 1) return HttpResponse.json({ detail: 'Server error' }, { status: 500 })
        return HttpResponse.json([checkingAccount()])
      }),
    )

    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Server error')
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByText('Main checking')).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('creates a new account and shows it in the list without a page reload', async () => {
    server.use(
      http.get(`${BASE}/notifications`, () => HttpResponse.json([])),
      http.get(`${BASE}/accounts`, () => HttpResponse.json([])),
      http.post(`${BASE}/accounts`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toEqual({
          name: 'Vacation fund',
          account_type: 'savings',
          native_currency: 'EUR',
          current_balance: 250,
        })
        return HttpResponse.json(
          checkingAccount({
            id: 'acc-new',
            name: 'Vacation fund',
            account_type: 'savings',
            native_currency: 'EUR',
            current_balance: '250.00',
          }),
        )
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('No accounts yet')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add account/i }))
    await user.type(screen.getByLabelText(/account name/i), 'Vacation fund')
    await user.selectOptions(screen.getByLabelText(/account type/i), 'savings')
    await user.selectOptions(screen.getByLabelText(/native currency/i), 'EUR')
    await user.clear(screen.getByLabelText(/opening balance/i))
    await user.type(screen.getByLabelText(/opening balance/i), '250')
    await user.click(screen.getByRole('button', { name: /^create account$/i }))

    expect(await screen.findByText('Vacation fund')).toBeInTheDocument()
  })

  it('locks native currency on edit and never sends it in the update payload', async () => {
    server.use(
      http.get(`${BASE}/notifications`, () => HttpResponse.json([])),
      http.get(`${BASE}/accounts`, () => HttpResponse.json([checkingAccount()])),
      http.put(`${BASE}/accounts/acc-1`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).not.toHaveProperty('native_currency')
        expect(body).toEqual({ name: 'Main checking (renamed)', account_type: 'checking', current_balance: 949.75 })
        return HttpResponse.json(checkingAccount({ name: 'Main checking (renamed)' }))
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('Main checking')).toBeInTheDocument()

    await user.click(screen.getByTitle('Edit'))
    const currencySelect = screen.getByLabelText(/native currency/i)
    expect(currencySelect).toBeDisabled()
    expect(screen.getByText("Locked — currency can't change after an account is created.")).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/account name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Main checking (renamed)')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Main checking (renamed)')).toBeInTheDocument()
  })

  it('deletes an account only after explicit confirmation', async () => {
    let deleteCalled = false
    server.use(
      http.get(`${BASE}/notifications`, () => HttpResponse.json([])),
      http.get(`${BASE}/accounts`, () => HttpResponse.json([checkingAccount()])),
      http.delete(`${BASE}/accounts/acc-1`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('Main checking')).toBeInTheDocument()

    await user.click(screen.getByTitle('Delete'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Main checking/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(deleteCalled).toBe(false)
    expect(screen.getByText('Main checking')).toBeInTheDocument()

    await user.click(screen.getByTitle('Delete'))
    await user.click(screen.getByRole('button', { name: 'Delete account' }))

    expect(deleteCalled).toBe(true)
    expect(await screen.findByText('No accounts yet')).toBeInTheDocument()
  })
})

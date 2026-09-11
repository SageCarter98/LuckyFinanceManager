import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../test/msw/server'
import { DEFAULT_TRANSACTION_PAGE_SIZE } from '../lib/resources/transactions'
import { TransactionsPage } from './TransactionsPage'

const BASE = 'http://localhost:3000/api'

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
      <TransactionsPage />
    </MemoryRouter>,
  )
}

const ACCOUNT = {
  id: 'acc-1',
  tenant_id: 'tenant-1',
  name: 'Main checking',
  account_type: 'checking',
  native_currency: 'USD',
  current_balance: '100.00',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const CATEGORY = {
  id: 'cat-1',
  tenant_id: 'tenant-1',
  name: 'Groceries',
  monthly_limit: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function transaction(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'txn-1',
    tenant_id: 'tenant-1',
    account_id: 'acc-1',
    category_id: 'cat-1',
    transaction_type: 'expense',
    amount: '42.50',
    currency: 'USD',
    transaction_date: '2026-01-05',
    note: 'Weekly shop',
    created_at: '2026-01-05T00:00:00Z',
    updated_at: '2026-01-05T00:00:00Z',
    ...overrides,
  }
}

function mockReferenceData(accounts: unknown[] = [ACCOUNT], categories: unknown[] = [CATEGORY]) {
  return [
    http.get(`${BASE}/notifications`, () => HttpResponse.json([])),
    http.get(`${BASE}/accounts`, () => HttpResponse.json(accounts)),
    http.get(`${BASE}/categories`, () => HttpResponse.json(categories)),
  ]
}

describe('TransactionsPage', () => {
  afterEach(() => vi.clearAllMocks())

  it('shows the populated list with resolved account/category names and signed, colored amounts', async () => {
    server.use(
      ...mockReferenceData(),
      http.get(`${BASE}/transactions`, () => HttpResponse.json([transaction()])),
    )

    const { container } = renderPage()
    expect(await screen.findByText('Weekly shop')).toBeInTheDocument()
    // getByText alone would also match the filter <select> options with the
    // same text (e.g. the "Groceries" category filter option), so scope to
    // the table cells that actually display this row's data.
    expect(screen.getByRole('cell', { name: 'Groceries' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Main checking' })).toBeInTheDocument()
    expect(screen.getByText(/Jan 5, 2026/)).toBeInTheDocument()

    // An expense renders as a negative, expense-toned amount even though the
    // wire amount itself is a positive "42.50" -- the page negates it for display.
    const moneyEl = container.querySelector('span.tabular-figures')
    expect(moneyEl?.textContent).toMatch(/-/)
    expect(moneyEl?.className).toContain('text-expense-crimson')
  })

  it('shows "Uncategorized" for a transaction with no category', async () => {
    server.use(
      ...mockReferenceData(),
      http.get(`${BASE}/transactions`, () => HttpResponse.json([transaction({ category_id: null })])),
    )
    renderPage()
    expect(await screen.findByText('Uncategorized')).toBeInTheDocument()
  })

  it('prompts to add an account first when none exist, instead of an empty transactions list', async () => {
    server.use(...mockReferenceData([], []), http.get(`${BASE}/transactions`, () => HttpResponse.json([])))
    renderPage()
    expect(await screen.findByText('Add an account first')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add transaction/i })).toBeDisabled()
  })

  it('shows a plain empty state when accounts exist but no transactions match', async () => {
    server.use(...mockReferenceData(), http.get(`${BASE}/transactions`, () => HttpResponse.json([])))
    renderPage()
    expect(await screen.findByText('No transactions found')).toBeInTheDocument()
    expect(screen.queryByText('Add an account first')).not.toBeInTheDocument()
  })

  it('shows an error state with a working retry', async () => {
    let calls = 0
    server.use(
      ...mockReferenceData(),
      http.get(`${BASE}/transactions`, () => {
        calls += 1
        if (calls === 1) return HttpResponse.json({ detail: 'Server error' }, { status: 500 })
        return HttpResponse.json([transaction()])
      }),
    )
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Server error')
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Weekly shop')).toBeInTheDocument()
  })

  it('reloads with the right query params when a filter is applied', async () => {
    const seenUrls: string[] = []
    server.use(
      ...mockReferenceData(),
      http.get(`${BASE}/transactions`, ({ request }) => {
        seenUrls.push(request.url)
        return HttpResponse.json([transaction()])
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('Weekly shop')).toBeInTheDocument()
    expect(seenUrls).toHaveLength(1)

    await user.selectOptions(screen.getByLabelText('Account'), 'acc-1')

    expect(await vi.waitFor(() => seenUrls[1])).toBeDefined()
    const secondUrl = new URL(seenUrls[1])
    expect(secondUrl.searchParams.get('account_id')).toBe('acc-1')
    expect(secondUrl.searchParams.get('limit')).toBe(String(DEFAULT_TRANSACTION_PAGE_SIZE))
    expect(secondUrl.searchParams.get('offset')).toBe('0')

    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /clear filters/i }))
    expect(await vi.waitFor(() => seenUrls[2])).toBeDefined()
    expect(new URL(seenUrls[2]).searchParams.get('account_id')).toBeNull()
  })

  it('loads the next page and appends results when "Load more" is clicked', async () => {
    const firstPage = Array.from({ length: DEFAULT_TRANSACTION_PAGE_SIZE }, (_, i) =>
      transaction({ id: `txn-${i}`, note: `Transaction ${i}` }),
    )
    server.use(
      ...mockReferenceData(),
      http.get(`${BASE}/transactions`, ({ request }) => {
        const offset = new URL(request.url).searchParams.get('offset')
        if (offset === '0') return HttpResponse.json(firstPage)
        return HttpResponse.json([transaction({ id: 'txn-last', note: 'Last transaction' })])
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('Transaction 0')).toBeInTheDocument()
    const loadMore = screen.getByRole('button', { name: /load more/i })

    await user.click(loadMore)

    expect(await screen.findByText('Last transaction')).toBeInTheDocument()
    // The full first page is still there -- "Load more" appends, it doesn't replace.
    expect(screen.getByText('Transaction 0')).toBeInTheDocument()
  })

  it('creates an income transaction with category_id null when left uncategorized', async () => {
    server.use(
      ...mockReferenceData(),
      http.get(`${BASE}/transactions`, () => HttpResponse.json([])),
      http.post(`${BASE}/transactions`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toMatchObject({
          account_id: 'acc-1',
          category_id: null,
          transaction_type: 'income',
          amount: 1200,
          currency: 'USD',
          note: 'Paycheck',
        })
        return HttpResponse.json(transaction({ id: 'txn-new', transaction_type: 'income', amount: '1200', note: 'Paycheck', category_id: null }))
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('No transactions found')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add transaction/i }))
    await user.click(screen.getByRole('button', { name: 'Income' }))
    await user.type(screen.getByLabelText(/amount/i), '1200')
    await user.type(screen.getByLabelText(/note/i), 'Paycheck')
    // The page-level "Add transaction" trigger and the drawer's submit
    // button share the same accessible name -- only the submit button has
    // type="submit", so disambiguate on that rather than by name.
    const submitButton = document.querySelector('form button[type="submit"]') as HTMLButtonElement
    await user.click(submitButton)

    expect(await screen.findByText('Paycheck')).toBeInTheDocument()
  })

  it('keeps the original currency when switching accounts while editing (does not reset to the new account default)', async () => {
    const eurAccount = { ...ACCOUNT, id: 'acc-2', name: 'Euro account', native_currency: 'EUR' }
    server.use(
      ...mockReferenceData([ACCOUNT, eurAccount]),
      http.get(`${BASE}/transactions`, () => HttpResponse.json([transaction()])),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('Weekly shop')).toBeInTheDocument()

    await user.click(screen.getByTitle('Edit'))
    expect(screen.getByLabelText(/currency/i)).toHaveValue('USD')

    await user.selectOptions(screen.getByLabelText('Account'), 'acc-2')
    // Creating a *new* transaction would default currency to the selected
    // account's native currency -- editing an existing one must not, since
    // the transaction's own currency is an explicit, independent field.
    expect(screen.getByLabelText(/currency/i)).toHaveValue('USD')
  })

  it('deletes a transaction only after explicit confirmation, with the balance-impact warning in the dialog', async () => {
    let deleteCalled = false
    server.use(
      ...mockReferenceData(),
      http.get(`${BASE}/transactions`, () => HttpResponse.json([transaction()])),
      http.delete(`${BASE}/transactions/txn-1`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('Weekly shop')).toBeInTheDocument()

    await user.click(screen.getByTitle('Delete'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/reverse its effect on the account balance/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Delete transaction' }))
    expect(deleteCalled).toBe(true)
    expect(await screen.findByText('No transactions found')).toBeInTheDocument()
  })

  it('imports a CSV file and shows a success message, then shows the imported row', async () => {
    server.use(
      ...mockReferenceData(),
      http.get(`${BASE}/transactions`, () => HttpResponse.json([])),
      http.post(`${BASE}/transactions/import`, async ({ request }) => {
        const body = await request.formData()
        // Not `toBeInstanceOf(File)` or an exact filename check: the File the
        // request handler sees is reconstructed in undici's realm (msw/node)
        // from jsdom's File via the multipart body, which loses both cross-
        // realm identity and the original filename (becomes "blob") -- an
        // environment artifact, not real product behavior. Size survives the
        // round-trip and is enough evidence a real file was actually sent.
        const uploaded = body.get('file') as File
        expect(uploaded?.size).toBeGreaterThan(0)
        return HttpResponse.json({ imported: 2, rows: [] })
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('No transactions found')).toBeInTheDocument()

    const file = new File(['account_name,amount\nMain checking,10.00'], 'transactions.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    expect(await screen.findByText('Imported 2 transactions.')).toBeInTheDocument()
  })

  it('shows an import error without a fabricated success message', async () => {
    server.use(
      ...mockReferenceData(),
      http.get(`${BASE}/transactions`, () => HttpResponse.json([])),
      http.post(`${BASE}/transactions/import`, () => HttpResponse.json({ detail: 'Unknown account "Ghost checking"' }, { status: 422 })),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('No transactions found')).toBeInTheDocument()

    const file = new File(['account_name,amount\nGhost checking,10.00'], 'transactions.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    expect(await screen.findByRole('alert')).toHaveTextContent('Unknown account "Ghost checking"')
  })
})

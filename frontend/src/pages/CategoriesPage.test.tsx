import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../test/msw/server'
import { CategoriesPage } from './CategoriesPage'

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
      <CategoriesPage />
    </MemoryRouter>,
  )
}

function category(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'cat-1',
    tenant_id: 'tenant-1',
    name: 'Groceries',
    monthly_limit: '400.00',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mockNotifications() {
  return http.get(`${BASE}/notifications`, () => HttpResponse.json([]))
}

describe('CategoriesPage', () => {
  afterEach(() => vi.clearAllMocks())

  it('shows loading, then the populated list with formatted monthly limits', async () => {
    server.use(
      mockNotifications(),
      http.get(`${BASE}/categories`, () =>
        HttpResponse.json([category(), category({ id: 'cat-2', name: 'Rent', monthly_limit: null })]),
      ),
    )

    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()

    expect(await screen.findByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('Limit: 400.00 / month')).toBeInTheDocument()
    expect(screen.getByText('Rent')).toBeInTheDocument()
    expect(screen.getByText('No monthly limit')).toBeInTheDocument()
  })

  it('shows an empty state with no categories', async () => {
    server.use(mockNotifications(), http.get(`${BASE}/categories`, () => HttpResponse.json([])))
    renderPage()
    expect(await screen.findByText('No categories yet')).toBeInTheDocument()
  })

  it('shows an error state with a working retry', async () => {
    let calls = 0
    server.use(
      mockNotifications(),
      http.get(`${BASE}/categories`, () => {
        calls += 1
        if (calls === 1) return HttpResponse.json({ detail: 'Server error' }, { status: 500 })
        return HttpResponse.json([category()])
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Server error')
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Groceries')).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('creates a category with a monthly limit converted to a number', async () => {
    server.use(
      mockNotifications(),
      http.get(`${BASE}/categories`, () => HttpResponse.json([])),
      http.post(`${BASE}/categories`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toEqual({ name: 'Utilities', monthly_limit: 150 })
        return HttpResponse.json(category({ id: 'cat-new', name: 'Utilities', monthly_limit: '150.00' }))
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('No categories yet')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/name/i), 'Utilities')
    await user.type(screen.getByLabelText(/monthly limit/i), '150')
    await user.click(screen.getByRole('button', { name: /add category/i }))

    expect(await screen.findByText('Utilities')).toBeInTheDocument()
  })

  it('creates a category with no limit as null, not an empty string or zero', async () => {
    server.use(
      mockNotifications(),
      http.get(`${BASE}/categories`, () => HttpResponse.json([])),
      http.post(`${BASE}/categories`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toEqual({ name: 'Misc', monthly_limit: null })
        return HttpResponse.json(category({ id: 'cat-new', name: 'Misc', monthly_limit: null }))
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('No categories yet')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/name/i), 'Misc')
    await user.click(screen.getByRole('button', { name: /add category/i }))

    expect(await screen.findByText('Misc')).toBeInTheDocument()
  })

  it('edits a category and returns the form to its add state afterward', async () => {
    server.use(
      mockNotifications(),
      http.get(`${BASE}/categories`, () => HttpResponse.json([category()])),
      http.put(`${BASE}/categories/cat-1`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toEqual({ name: 'Groceries (renamed)', monthly_limit: 500 })
        return HttpResponse.json(category({ name: 'Groceries (renamed)', monthly_limit: '500.00' }))
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('Groceries')).toBeInTheDocument()

    await user.click(screen.getByTitle('Edit'))
    expect(screen.getByRole('heading', { name: 'Edit category' })).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Groceries (renamed)')
    const limitInput = screen.getByLabelText(/monthly limit/i)
    await user.clear(limitInput)
    await user.type(limitInput, '500')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Groceries (renamed)')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add category' })).toBeInTheDocument()
  })

  it('cancels an in-progress edit without saving', async () => {
    server.use(mockNotifications(), http.get(`${BASE}/categories`, () => HttpResponse.json([category()])))

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('Groceries')).toBeInTheDocument()

    await user.click(screen.getByTitle('Edit'))
    const nameInput = screen.getByLabelText(/name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Something else')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('heading', { name: 'Add category' })).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toHaveValue('')
    // The original, unedited category is still shown -- the cancel discarded the draft.
    expect(screen.getByText('Groceries')).toBeInTheDocument()
  })

  it('deletes a category only after explicit confirmation', async () => {
    let deleteCalled = false
    server.use(
      mockNotifications(),
      http.get(`${BASE}/categories`, () => HttpResponse.json([category()])),
      http.delete(`${BASE}/categories/cat-1`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('Groceries')).toBeInTheDocument()

    await user.click(screen.getByTitle('Delete'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Groceries/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(deleteCalled).toBe(false)

    await user.click(screen.getByTitle('Delete'))
    await user.click(screen.getByRole('button', { name: 'Delete category' }))

    expect(deleteCalled).toBe(true)
    expect(await screen.findByText('No categories yet')).toBeInTheDocument()
  })
})

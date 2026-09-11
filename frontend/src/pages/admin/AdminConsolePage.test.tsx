import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '../../test/msw/server'
import { AdminConsolePage } from './AdminConsolePage'

const BASE = 'http://localhost:3000/api'

const logout = vi.fn()

vi.mock('../../lib/adminAuth', () => ({
  useAdminAuth: () => ({
    staff: { email: 'staff@example.com', full_name: 'Support Staff' },
    logout,
    status: 'authenticated',
  }),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminConsolePage />} />
        <Route path="/admin/login" element={<div>Admin login</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function search(user: ReturnType<typeof userEvent.setup>, email = 'jane@example.com', reason = 'investigating support ticket #4821') {
  await user.type(screen.getByLabelText(/email/i), email)
  await user.type(screen.getByLabelText(/reason for this lookup/i), reason)
  await user.click(screen.getByRole('button', { name: /search/i }))
}

describe('AdminConsolePage', () => {
  afterEach(() => vi.clearAllMocks())

  it('sends the same staff-entered reason on both the search and summary requests', async () => {
    const seenReasons: (string | null)[] = []
    server.use(
      http.get(`${BASE}/admin/tenant/search`, ({ request }) => {
        seenReasons.push(new URL(request.url).searchParams.get('reason'))
        return HttpResponse.json({
          user_id: 'user-1',
          email: 'j***@example.com',
          full_name: 'J*** D***',
          tenant_id: 'tenant-1',
          role: 'owner',
          email_verified: true,
          account_count: 2,
          category_count: 3,
          transaction_count: 40,
          recurring_bill_count: 1,
          savings_goal_count: 1,
          notification_count: 5,
        })
      }),
      http.get(`${BASE}/admin/tenant/tenant-1/summary`, ({ request }) => {
        seenReasons.push(new URL(request.url).searchParams.get('reason'))
        return HttpResponse.json({
          tenant_id: 'tenant-1',
          user_count: 1,
          account_count: 2,
          category_count: 3,
          transaction_count: 40,
          notification_count: 5,
        })
      }),
    )

    const user = userEvent.setup()
    renderPage()
    await search(user)

    expect(await screen.findByText('J*** D***')).toBeInTheDocument()
    expect(screen.getByText('j***@example.com')).toBeInTheDocument()
    expect(screen.getByText(/1 user on this tenant/)).toBeInTheDocument()
    expect(seenReasons).toEqual(['investigating support ticket #4821', 'investigating support ticket #4821'])
  })

  it('does not submit without a reason (backend requires one, so the client must too)', async () => {
    let searchCalled = false
    server.use(
      http.get(`${BASE}/admin/tenant/search`, () => {
        searchCalled = true
        return HttpResponse.json({ detail: 'should not be reached' }, { status: 422 })
      }),
    )

    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(searchCalled).toBe(false)
    expect(screen.getByLabelText(/reason for this lookup/i)).toBeInvalid()
  })

  it('shows an error state when no tenant matches, without fabricating a result', async () => {
    server.use(
      http.get(`${BASE}/admin/tenant/search`, () => HttpResponse.json({ detail: 'User not found' }, { status: 404 })),
    )

    const user = userEvent.setup()
    renderPage()
    await search(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('User not found')
    expect(screen.queryByText(/user on this tenant/)).not.toBeInTheDocument()
  })

  it('logs out and returns to the admin login screen', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /sign out/i }))

    expect(logout).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Admin login')).toBeInTheDocument()
  })
})

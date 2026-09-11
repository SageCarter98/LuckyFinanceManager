import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '../../test/msw/server'
import { authSession } from '../../lib/api'
import { AuthProvider } from '../../lib/auth'
import { LoginPage } from './LoginPage'

const BASE = 'http://localhost:3000/api'

const USER = {
  id: 'user-1',
  email: 'jane@example.com',
  full_name: 'Jane Doe',
  tenant_id: 'tenant-1',
  role: 'owner',
  email_verified: true,
  timezone: 'UTC',
  preferred_currency: 'USD',
  notification_preferences: {},
  dev_verification_token: null,
}

function renderLoginPage(initialEntries = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Dashboard home</div>} />
          <Route path="/accounts" element={<div>Accounts page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, email = 'jane@example.com', password = 'hunter2') {
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('LoginPage', () => {
  afterEach(() => authSession.clear())

  it('logs in and navigates to the return route on success', async () => {
    server.use(
      http.post(`${BASE}/auth/login`, async ({ request }) => {
        const body = (await request.json()) as { email: string; password: string }
        expect(body).toEqual({ email: 'jane@example.com', password: 'hunter2' })
        return HttpResponse.json({ access_token: 'access-1', refresh_token: 'refresh-1', token_type: 'bearer' })
      }),
      http.get(`${BASE}/auth/me`, () => HttpResponse.json(USER)),
    )

    const user = userEvent.setup()
    renderLoginPage()
    await fillAndSubmit(user)

    expect(await screen.findByText('Dashboard home')).toBeInTheDocument()
    expect(authSession.accessToken).toBe('access-1')
  })

  it('shows an account-enumeration-safe error and does not navigate on invalid credentials', async () => {
    server.use(http.post(`${BASE}/auth/login`, () => HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 })))

    const user = userEvent.setup()
    renderLoginPage()
    await fillAndSubmit(user, 'jane@example.com', 'wrong-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
    expect(screen.queryByText('Dashboard home')).not.toBeInTheDocument()
    expect(authSession.accessToken).toBeNull()
  })

  it('disables the submit button while the request is in flight', async () => {
    server.use(
      http.post(`${BASE}/auth/login`, async () => {
        await delay(50)
        return HttpResponse.json({ access_token: 'access-1', refresh_token: 'refresh-1', token_type: 'bearer' })
      }),
      http.get(`${BASE}/auth/me`, () => HttpResponse.json(USER)),
    )

    const user = userEvent.setup()
    renderLoginPage()
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'hunter2')

    const button = screen.getByRole('button', { name: /sign in/i })
    await user.click(button)

    expect(button).toBeDisabled()
    expect(await screen.findByText('Dashboard home')).toBeInTheDocument()
  })

  it('clears the session and does not navigate when login succeeds but the profile fetch fails', async () => {
    // auth.tsx's login() explicitly clears the freshly-set session if the
    // follow-up /auth/me call fails, rather than leaving a half-authenticated
    // client holding tokens for a user it never confirmed.
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ access_token: 'access-1', refresh_token: 'refresh-1', token_type: 'bearer' }),
      ),
      http.get(`${BASE}/auth/me`, () => HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })),
      // The failed /auth/me 401 triggers apiRequest's own refresh-and-retry
      // path first; it must also fail here so the original error surfaces.
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ detail: 'Invalid refresh token' }, { status: 401 })),
    )

    const user = userEvent.setup()
    renderLoginPage()
    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard home')).not.toBeInTheDocument()
    expect(authSession.accessToken).toBeNull()
  })
})

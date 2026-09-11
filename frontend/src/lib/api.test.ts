import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/msw/server'
import { adminApiRequest, adminSession, apiRequest, authSession, ApiError } from './api'

const BASE = 'http://localhost:3000/api'

describe('apiRequest error envelope parsing', () => {
  afterEach(() => authSession.clear())

  it('surfaces a plain string `detail` (HTTPException) as ApiError.message', async () => {
    server.use(http.get(`${BASE}/accounts`, () => HttpResponse.json({ detail: 'Not found.' }, { status: 404 })))

    await expect(apiRequest('/accounts')).rejects.toMatchObject({
      status: 404,
      body: { code: 'HTTP_ERROR', message: 'Not found.' },
    })
  })

  it('maps a Pydantic validation array `detail` into field_errors keyed by field path', async () => {
    server.use(
      http.post(`${BASE}/accounts`, () =>
        HttpResponse.json(
          {
            detail: [
              { loc: ['body', 'name'], msg: 'field required', type: 'missing' },
              { loc: ['body', 'native_currency'], msg: 'invalid currency code', type: 'value_error' },
            ],
          },
          { status: 422 },
        ),
      ),
    )

    let caught: unknown
    try {
      await apiRequest('/accounts', { method: 'POST', body: '{}' })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(ApiError)
    const error = caught as ApiError
    expect(error.status).toBe(422)
    expect(error.body.code).toBe('VALIDATION_ERROR')
    // "body." is stripped from each loc path so field_errors keys match form field names directly.
    expect(error.body.field_errors).toEqual({
      name: 'field required',
      native_currency: 'invalid currency code',
    })
  })

  it('falls back to a generic message when the response body is not JSON at all', async () => {
    server.use(
      http.get(`${BASE}/accounts`, () => new HttpResponse('<html>502</html>', { status: 502 })),
    )

    await expect(apiRequest('/accounts')).rejects.toMatchObject({
      status: 502,
      body: { code: 'HTTP_ERROR', message: 'The request could not be completed. Please try again.' },
    })
  })

  it('passes through an already-shaped {code, message} envelope unchanged', async () => {
    server.use(
      http.get(`${BASE}/accounts`, () =>
        HttpResponse.json({ code: 'RATE_LIMITED', message: 'Too many requests.' }, { status: 429 }),
      ),
    )

    await expect(apiRequest('/accounts')).rejects.toMatchObject({
      status: 429,
      body: { code: 'RATE_LIMITED', message: 'Too many requests.' },
    })
  })
})

describe('apiRequest 401 refresh-and-retry', () => {
  afterEach(() => authSession.clear())

  it('retries once with a refreshed token after a 401, and succeeds', async () => {
    let accountsCalls = 0
    authSession.set({ accessToken: 'expired-token', refreshToken: 'refresh-token' })

    server.use(
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ access_token: 'new-token', refresh_token: 'new-refresh-token' }),
      ),
      http.get(`${BASE}/accounts`, ({ request }) => {
        accountsCalls += 1
        const auth = request.headers.get('Authorization')
        if (accountsCalls === 1) {
          expect(auth).toBe('Bearer expired-token')
          return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
        }
        expect(auth).toBe('Bearer new-token')
        return HttpResponse.json([])
      }),
    )

    const result = await apiRequest('/accounts')

    expect(result).toEqual([])
    expect(accountsCalls).toBe(2)
    expect(authSession.accessToken).toBe('new-token')
  })

  it('clears the session and surfaces the original 401 when the refresh call itself fails', async () => {
    authSession.set({ accessToken: 'expired-token', refreshToken: 'dead-refresh-token' })

    server.use(
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ detail: 'Invalid refresh token' }, { status: 401 })),
      http.get(`${BASE}/accounts`, () => HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })),
    )

    await expect(apiRequest('/accounts')).rejects.toMatchObject({ status: 401 })
    expect(authSession.accessToken).toBeNull()
  })

  it('never calls the refresh endpoint when there is no refresh token to use', async () => {
    // No authSession.set(...) — an unauthenticated request that 401s.
    let refreshCalled = false
    server.use(
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCalled = true
        return HttpResponse.json({ access_token: 'x', refresh_token: 'y' })
      }),
      http.get(`${BASE}/accounts`, () => HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })),
    )

    await expect(apiRequest('/accounts')).rejects.toMatchObject({ status: 401 })
    expect(refreshCalled).toBe(false)
  })
})

describe('consumer/admin session isolation', () => {
  afterEach(() => {
    authSession.clear()
    adminSession.clear()
  })

  it('keeps the consumer and admin bearer tokens independent', async () => {
    authSession.set({ accessToken: 'consumer-token', refreshToken: 'consumer-refresh' })
    adminSession.set({ accessToken: 'admin-token', refreshToken: 'admin-refresh' })

    server.use(
      http.get(`${BASE}/accounts`, ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer consumer-token')
        return HttpResponse.json([])
      }),
      http.get(`${BASE}/admin/tenant/search`, ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer admin-token')
        return HttpResponse.json([])
      }),
    )

    await apiRequest('/accounts')
    await adminApiRequest('/admin/tenant/search')

    expect(authSession.accessToken).toBe('consumer-token')
    expect(adminSession.accessToken).toBe('admin-token')
  })

  it('clearing the admin session does not affect the consumer session', () => {
    authSession.set({ accessToken: 'consumer-token', refreshToken: 'consumer-refresh' })
    adminSession.set({ accessToken: 'admin-token', refreshToken: 'admin-refresh' })

    adminSession.clear()

    expect(adminSession.accessToken).toBeNull()
    expect(authSession.accessToken).toBe('consumer-token')
  })
})

describe('HTTPS fail-closed behavior', () => {
  beforeEach(() => vi.stubEnv('PROD', true))
  afterEach(() => vi.unstubAllEnvs())

  it('refuses to send a request in production against a non-HTTPS API base URL', async () => {
    // apiBaseUrl defaults to '/api' (a relative path, not HTTPS) in this test
    // environment, matching the real failure mode assertSecureTransport
    // guards against — a production build accidentally pointed at plain HTTP.
    await expect(apiRequest('/accounts')).rejects.toThrow('The API must use HTTPS in production.')
  })
})

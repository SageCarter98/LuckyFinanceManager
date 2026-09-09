export interface ApiErrorBody {
  code: string
  message: string
  field_errors?: Record<string, string>
  request_id?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorBody

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

interface SessionTokens {
  accessToken: string
  refreshToken: string
}

export interface SessionHandle {
  readonly accessToken: string | null
  set(tokens: SessionTokens): void
  clear(): void
  /** Notified whenever the session is cleared (logout, or a failed silent refresh). */
  subscribe(listener: () => void): () => void
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

function assertSecureTransport(): void {
  if (import.meta.env.PROD && !apiBaseUrl.startsWith('https://')) {
    throw new Error('The API must use HTTPS in production.')
  }
}

interface FastApiValidationDetail {
  loc: (string | number)[]
  msg: string
  type: string
}

/**
 * The backend is plain FastAPI, not the `{code, message, field_errors}`
 * envelope the SRS documents as a future target — `HTTPException` responses
 * are `{"detail": "some message"}`, and Pydantic validation failures are
 * `{"detail": [{"loc": [...], "msg": "...", "type": "..."}, ...]}`. Parse the
 * real shape so callers see the server's actual message instead of a generic
 * fallback for every error.
 */
async function parseError(response: Response): Promise<ApiError> {
  const fallback: ApiErrorBody = {
    code: 'HTTP_ERROR',
    message: 'The request could not be completed. Please try again.',
  }

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    return new ApiError(response.status, fallback)
  }

  if (raw && typeof raw === 'object') {
    const body = raw as Partial<ApiErrorBody> & { detail?: unknown }

    // Already-shaped error envelope (if the backend ever adopts one).
    if (typeof body.code === 'string' && typeof body.message === 'string') {
      return new ApiError(response.status, body as ApiErrorBody)
    }

    if (typeof body.detail === 'string') {
      return new ApiError(response.status, { code: 'HTTP_ERROR', message: body.detail })
    }

    if (Array.isArray(body.detail)) {
      const details = body.detail as FastApiValidationDetail[]
      const fieldErrors: Record<string, string> = {}
      for (const item of details) {
        const field = item.loc.filter((part) => part !== 'body').join('.') || 'value'
        fieldErrors[field] = item.msg
      }
      const summary = details.map((item) => item.msg).join(' ') || fallback.message
      return new ApiError(response.status, { code: 'VALIDATION_ERROR', message: summary, field_errors: fieldErrors })
    }
  }

  return new ApiError(response.status, fallback)
}

/**
 * Builds an isolated in-memory session + request function. Used to keep the
 * consumer app and the staff admin console from ever sharing a bearer token
 * (FR-11.2/FR-11.3 session-isolation intent), even though both currently run
 * from the same origin/bundle.
 */
function createSessionClient() {
  const state: { tokens: SessionTokens | null } = { tokens: null }
  const listeners = new Set<() => void>()

  const session: SessionHandle = {
    get accessToken(): string | null {
      return state.tokens?.accessToken ?? null
    },
    set(tokens: SessionTokens): void {
      state.tokens = tokens
    },
    clear(): void {
      if (state.tokens === null) return
      state.tokens = null
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  async function refreshAccessToken(): Promise<boolean> {
    const refreshToken = state.tokens?.refreshToken
    if (!refreshToken) return false

    const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!response.ok) {
      session.clear()
      return false
    }

    // The backend returns the same snake_case TokenPair shape as /auth/login
    // ({access_token, refresh_token}), not the camelCase SessionTokens shape
    // used internally -- map it explicitly rather than assuming a shape match.
    const next = (await response.json()) as { access_token: string; refresh_token: string }
    session.set({ accessToken: next.access_token, refreshToken: next.refresh_token })
    return true
  }

  async function logout(): Promise<void> {
    const refreshToken = state.tokens?.refreshToken
    session.clear()
    if (!refreshToken) return
    try {
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      // Best-effort server-side revocation -- the client session is already
      // cleared above regardless of whether this call succeeds.
    }
  }

  async function request<T>(path: string, options: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    assertSecureTransport()
    const headers = new Headers(options.headers)
    headers.set('Accept', 'application/json')
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (session.accessToken) {
      headers.set('Authorization', `Bearer ${session.accessToken}`)
    }

    const send = async (): Promise<Response> => fetch(`${apiBaseUrl}${path}`, { ...options, headers, signal })
    let response = await send()

    if (response.status === 401 && (await refreshAccessToken())) {
      headers.set('Authorization', `Bearer ${session.accessToken}`)
      response = await send()
    }
    if (!response.ok) throw await parseError(response)
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  return { session, request, logout }
}

const consumerClient = createSessionClient()
export const authSession = consumerClient.session
export const apiRequest = consumerClient.request
export const logoutRequest = consumerClient.logout

const adminClient = createSessionClient()
export const adminSession = adminClient.session
export const adminApiRequest = adminClient.request
export const adminLogoutRequest = adminClient.logout

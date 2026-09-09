# Lucky Finance frontend

React + TypeScript + Vite, styled with Tailwind v4 using the Stitch design
system (`frontend/src/styles/theme.css`, tokens transcribed from
`_stitch_extracted/.../modern_financial_trust/DESIGN.md`). Routing is
`react-router-dom`. The API client is intentionally stateless: access and
refresh tokens exist only in memory (`src/lib/api.ts`) and are never written
to browser storage, logs or analytics.

## Run

```sh
npm install
npm run dev
```

Set `VITE_API_BASE_URL` to the API origin (see `.env.development` for the
local backend default: `http://127.0.0.1:8000/api`). Production builds fail
closed if the configured API URL is not HTTPS.

## Structure

- `src/lib/api.ts` — two isolated in-memory session/request clients: the
  consumer app's (`authSession`/`apiRequest`) and the staff console's
  (`adminSession`/`adminApiRequest`). They never share a token.
- `src/lib/resources/*` — one module per backend router, normalizing the
  API's `Decimal`-as-JSON-string fields (e.g. `"949.75"`) into real numbers.
- `src/lib/auth.tsx` / `src/lib/adminAuth.tsx` — the two auth contexts.
- `src/components/` — shared primitives (`AppShell`, `Money`, `StatusChip`,
  `StatCard`, `Banner`, `ConfirmDialog`, loading/empty/error states).
- `src/pages/` — one file per route, matching the FRS route inventory.

## What's real vs. honestly gated

Every screen calls the real backend wherever it has support. Where the
backend has no implementation yet, the screen says so plainly instead of
faking success:

- **Subscription billing and bank linking** have no backend model at all —
  their routes render a locked/"not available yet" state, not a fake
  checkout or linking flow.
- **Account deletion** has no backend endpoint — `/settings/data` discloses
  this instead of showing a working-looking confirmation flow.
- **Profile editing** (name/email/notification prefs) has no `PUT` endpoint —
  `/settings/profile` is read-only display of real `/auth/me` data.
- **The staff console** (`/admin`) uses an isolated session so it never
  shares a token with the consumer app, but it still runs from the same
  origin/bundle — true origin separation (FR-11.3) is an infra change, not a
  frontend one, and is called out as an open gap in the console itself.

## Notes

- API error handling (`parseError` in `src/lib/api.ts`) parses the backend's
  actual FastAPI error shapes — `{"detail": "message"}` for `HTTPException`
  and `{"detail": [{"loc", "msg", "type"}, ...]}` for Pydantic validation
  failures — into a stable `{code, message, field_errors?}` shape for the UI.
  It also still recognizes an already-shaped `{code, message}` envelope, in
  case the backend adopts the documented SRS error contract later.
- No FX conversion happens anywhere in this app — every amount is shown with
  its real ISO currency, and screens that aggregate across accounts disclose
  when a total mixes currencies without converting them.
- Two real backend bugs were found and fixed while wiring this up (both in
  `backend/app/routers/portability.py`'s CSV import): mixing `Decimal` and
  `float` in the balance update, and passing a raw string where a `date` was
  required. Covered by a live import smoke test; `pytest tests/test_api.py`
  still passes.

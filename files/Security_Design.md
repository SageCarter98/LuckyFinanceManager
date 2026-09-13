# Security Design — Finance Management Platform

Prepared 13 September 2026. Closes tracker item #110's remaining gap: "JWT/
bcrypt auth and Postgres RLS tenant isolation exist in code; no separate
written security-design document" (item #110's own 2026-09-09 note). This
document describes what the code actually does, verified against the code
and tests, not the intended design.

## 1. Authentication

- **Password storage:** bcrypt via `passlib[bcrypt]` (`backend/app/core/security.py`).
  No plaintext or reversibly-encrypted password ever exists at rest.
- **Session tokens:** JWT access tokens (60 min default,
  `ACCESS_TOKEN_EXPIRE_MINUTES`) and opaque-hashed refresh tokens (7 days
  default, `RefreshToken` table stores only `hash_token(refresh_token)`,
  never the raw token). Algorithm: `HS256` (symmetric HMAC) --
  `settings.secret_key` is the sole signing secret; there is no
  asymmetric/rotatable-key scheme.
- **Refresh flow:** rotates on every use (old token revoked, new pair
  issued); a reused/revoked/expired/wrong-type token is rejected. Verified
  by 3 backend tests (`test_refresh_rotates_token_and_old_one_is_rejected`,
  `test_access_token_cannot_be_used_as_refresh_token_and_vice_versa`,
  `test_logout_revokes_refresh_token`) plus 3 frontend tests covering the
  401-retry client behavior -- all re-run 2026-09-13, passing.
- **Client-side token storage:** in-memory only, never `localStorage`/
  `sessionStorage` (ADR-005, verified by source scan) -- eliminates
  XSS-driven token theft via storage APIs, at the cost of losing the
  session on a hard page reload (an accepted, disclosed tradeoff, not an
  oversight).
- **Password reset / email verification:** token-based, hashed at rest,
  time-limited (24h verification / 1h reset), single-use (cleared after
  use). A password reset revokes every existing refresh token for that
  user (`auth.py::reset_password`) -- correctly treats a reset as a
  security event, not just a convenience action.
- **Gap, not fixed here:** **no rate-limiting or brute-force protection**
  exists on `/auth/login`, `/auth/forgot-password`, or `/auth/refresh`.
  Confirmed by absence -- no rate-limiting library or middleware anywhere
  in `backend/app`. This is a real, open finding (Privacy_Impact_Assessment
  §5, P3), not addressed in this pass because it needs a design decision
  (per-IP? per-account? which store -- Redis doesn't exist in this stack
  yet) rather than a one-line fix.

## 2. Authorization

- **Tenant isolation, two independent layers:**
  1. **Application layer:** every query filters by `tenant_id`, set via
     `apply_tenant_context()` (`app/tenant.py`) at the start of each
     authenticated request.
  2. **Database layer:** Postgres row-level security policies
     (`tenant_isolation_<table>`, `alembic/versions/20260907_postgres_rls.py`)
     independently reject cross-tenant rows even if the application layer
     had a bug. This is real, not aspirational: a critical bug in the
     `SET LOCAL` bind-parameter usage was found and fixed 2026-09-11
     (`app/tenant.py`, switched to `set_config()`), meaning this second
     layer could not have actually functioned against real Postgres before
     that fix -- disclosed in `G2_Design_Readiness.md` §3 and tracker item
     #110's own history, not hidden here.
- **Role-based access:** a single `role` column (`"user"` / `"admin"`) on
  `User`. `get_current_admin_user` (`dependencies.py`) enforces
  `role == "admin"` before granting the scoped RLS bypass
  (`apply_admin_bypass`) the support console needs to search across
  tenants. That bypass is proven, not just designed, to stay read-only:
  `test_rls_bypass_flag_does_not_relax_write_check` and
  `...does_not_permit_deleting_another_tenants_row` assert it cannot become
  a write/delete escape hatch.
- **Entitlement gating:** `require_active_entitlement` exists and is
  tested (`test_entitlement_guard_matrix`) but is intentionally unattached
  to any router today, since the only feature it would gate (bank-linking)
  doesn't exist yet -- built ahead of need deliberately, not a dead-code
  oversight (`dependencies.py`'s own docstring).

## 3. Secrets

- **Current state:** `SECRET_KEY` (JWT signing) and Stripe keys are read
  from environment variables (`.env`, gitignored) with obvious placeholder
  defaults (`"dev-secret-key-change-me"`) that must be overridden in any
  real deployment. `python-dotenv` loads `.env` in development.
- **No secret-management product exists** (no Vault, no cloud secrets
  manager) -- appropriate at current scale (no deployment target existed
  until today's hosting decision), but a real pre-production requirement:
  Render's own environment-variable groups (referenced in
  `Hosting_Decision_Finance_Management_Platform.md`) are the intended next
  step, not a dedicated secrets vault, since this project's budget and
  scale don't justify one yet.
- **Verified, not assumed clean:** `git log -p` and the CI secret-scan job
  (gitleaks, `.github/workflows/ci.yml`) have not found a committed real
  secret. `.env` is gitignored; only `.env.example`/`.env.development`
  (placeholder-only) are committed.

## 4. Encryption

- **In transit:** the application assumes TLS termination at the hosting
  layer (Render terminates TLS automatically for both custom domains and
  `*.onrender.com`, per `Hosting_Decision_Finance_Management_Platform.md`).
  No TLS is configured in application code itself, which is correct for
  this hosting shape -- it would be a gap only if self-hosting on a raw VM.
- **At rest:** relies entirely on the hosting provider's disk-level
  encryption (Render's managed Postgres); no column-level or
  application-level encryption exists for financial data, which matches
  this project's threat model (financial *records*, not the higher bar
  bank-linking's NFR-13 envelope-encryption-via-KMS requirement will need
  once that feature exists -- correctly scoped to only apply when built).
- **Password/token hashing** (not encryption, but the relevant control for
  those specific fields): bcrypt for passwords, SHA-based hashing
  (`hash_token`) for refresh/verification/reset tokens -- one-way, not
  reversible, appropriate since the raw value is never needed again.

## 5. Logging

- **Security-relevant audit logging exists and is real:** `AdminAccessLog`
  records every staff lookup of tenant/user data -- who, what action, a
  required reason (422 without one), and the target -- on both hit and
  miss. This is the one place this codebase does deliberate,
  compliance-shaped audit logging.
- **General application logging: does not exist.** Confirmed by absence --
  no `logging` configuration, no structured-log library, no request/error
  logging middleware anywhere in `backend/app`. Uvicorn's own default
  access log is the only thing that would appear in a deployed
  environment's stdout, unconfigured and unstructured. This is a real gap,
  carried into `files/G2_Design_Readiness.md`'s observability section
  (item #111) rather than duplicated here.

## 6. Recovery controls

Covered in full in the operations plan (`G2_Design_Readiness.md` §4,
updated 2026-09-13) rather than restated here -- summary: no backup
target existed until today's hosting decision; Render's managed Postgres
gives continuous point-in-time recovery on paid plans once actually
provisioned, but nothing is deployed yet, so this remains a plan, not an
operating control.

## 7. Summary against this item's own checklist

Authentication, authorization, secrets, encryption and logging are all now
described against real, verified code -- some controls genuinely strong
(defense-in-depth tenant isolation, in-memory token storage, audited admin
access), others genuinely absent and disclosed as such (rate-limiting,
general application logging, a real secrets vault). Recovery controls are
a plan pending actual deployment. This item is judged **In progress, not
Complete**: the document itself now exists (closing the item's own stated
gap), but real open findings (P3 in the PIA, no application logging) remain
unresolved, and marking Complete would misstate that.

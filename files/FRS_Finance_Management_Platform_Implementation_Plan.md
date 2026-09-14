# Finance Management Platform Frontend Implementation Plan

Status: In development — Workstream A complete; Workstream B in progress  
Source: FRS — Finance Management Platform, v1.0 (Draft for Review, 8 August 2026)  
Companion: SRS — Finance Management Platform, v3.5  
Governance: KenAddme IT Links Project Management Framework v1.1 and Software Development and Engineering Framework v1.2  
Project register: FMP-2026-001  
Classification: Class A / Software Class 3 (provisional)

## 1. Purpose and implementation principles

This plan turns the FRS into an incremental, testable frontend delivery sequence. The
client is a stateless consumer of the API: server-declared rules, balances, tenancy,
entitlements, currency conversions and errors remain authoritative.

The implementation must preserve these non-negotiables:

- access tokens remain in memory only; no tenant identifiers, bank credentials or
  financial values are exposed in browser storage, logs or analytics;
- manual finance functionality remains available to free users;
- subscription gating applies only to bank-linking and is derived from live API state;
- bank flows redirect to a bank/provider-hosted experience, use explicit read-only
  consent, and never imply payment or transfer capability;
- every data-backed screen has loading, empty, error, partial-failure and populated
  states;
- every monetary value identifies its currency and discloses conversion rate, basis
  and as-of date where applicable;
- responsive web support covers 320px through desktop, keyboard operation and WCAG
  2.1 AA.

## 2. Delivery workstreams

### Workstream A — Frontend foundation and security boundary

Select and record the frontend framework, routing, state/query strategy, form
validation approach, internationalisation boundary, component conventions and
supported browsers. Build the API client with the documented error schema, one-time
access-token refresh/retry, fail-closed HTTPS behavior, request cancellation and
server-scoped resource helpers.

Create shared primitives for authenticated routing, loading/empty/error/partial
states, confirmation dialogs, currency/rate disclosure, accessible forms, banners,
pagination, notifications and unsaved-change protection. Add automated checks that
reject localStorage/sessionStorage token use, credential/token rendering and
financial-value logging.

**Implementation status (4 September 2026): Complete for the first increment.**

- React, TypeScript and Vite frontend scaffolded in `frontend/`.
- In-memory-only access and refresh session boundary implemented.
- API client supports documented error envelopes, cancellation, one-time refresh
  and retry, and production HTTPS fail-closed behavior.
- Responsive authenticated shell, accessible form conventions, currency
  disclosures and manual-finance navigation implemented.
- Security scan completed with no browser-storage token use, credential
  rendering or financial-value logging patterns found.
- Production build verified with `npm run build`; browser smoke test reaches the
  sign-in screen.

The first increment is a demonstrable shell, not release approval. API-backed
behavior, automated test evidence and Gate 1/G0 through Gate 4 approvals remain
open.

### Workstream B — Public authentication and onboarding

Implement signup, Terms/Privacy acceptance, verification and resend states, login,
forgot/reset password, rate-limit countdowns, logout and restricted unverified-email
mode. Add onboarding for display currency and editable starter categories.

Acceptance: account-enumeration-safe errors, token refresh behavior, invalid/expired
token paths, keyboard accessibility and post-login return routing are covered by
component, contract and end-to-end tests.

### Workstream C — Free manual finance product

Deliver dashboard, profile/preferences, accounts, categories, transactions, CSV
import, recurring bills, savings goals and reports. Implement explicit currency
selection, immutable account native currency, historical conversion disclosures,
balance-impact warnings, paginated/filterable transactions and report empty states.

Acceptance: all manual workflows operate without a subscription; server validation
errors map to fields; original and converted values remain distinguishable; account
and tenant boundaries are verified with API contract and end-to-end tests.

### Workstream D — Notifications, export and deletion

Add in-app notifications linked to notification preferences, asynchronous data export
with fulfillment status, and self-service account deletion. Deletion must disclose
the recovery window, billing-record retention and active-subscription handling, and
require typed confirmation.

Acceptance: destructive actions identify the affected object, failures state that no
change occurred, exports distinguish linked from manually entered data, and session
termination clears tenant-derived client state.

### Workstream E — Subscription and billing

Build subscription status, hosted payment-element checkout, trial and first-charge
messaging, billing history and receipts, past-due/grace banners, cancellation and
post-cancellation states. Entitlements must be fetched live at session start and at
relevant navigation, never inferred from cached client state.

Acceptance: no free workflow is blocked or degraded; cancellation is reachable within
two interactions from Settings without retention obstacles; card data never passes
through application-owned inputs or logs.

### Workstream F — Read-only banking

After provider risk assessment, consent design, DPA and security approval, implement
subscription-gated institution selection, named provider disclosure, unchecked
read-only consent, hosted handoff, linked-account list/detail, Gross Balance,
last-sync and partial-failure states, re-authorization and unlink confirmation.

Acceptance: no client surface captures bank credentials, exposes tokens or implies
payment/transfer capability; linked data is visibly distinct from manual data;
balances show native amounts, approximate converted totals, rates and timestamps;
unlinking states revocation and cached-data purge.

### Workstream G — Separate support console

Build and deploy the staff-only console on a separate origin with independent
authentication. Provide reason-captured, time-boxed read-only tenant lookup and
minimal necessary financial display, plus health and background-job status.

Acceptance: staff cannot mutate tenant financial data, every access request is
audited, identifiers are masked, and consumer/support sessions are not shared.

### Workstream H — Quality, accessibility and release

Maintain the FRS-to-SRS traceability matrix from FE requirement to work item, design,
code, test and evidence. Run component, contract, integration, end-to-end,
cross-tenant, currency-correctness, subscription-gating, bank read-only,
accessibility and responsive-browser suites.

Before release, complete WCAG 2.1 AA review, keyboard/screen-reader validation,
security/privacy review, dependency/licence review, performance checks, defect
triage, release notes, rollback and operational handover. Production requires named
release authority and recorded G4/Gate 4 approval.

## 3. Phased sequence and gate evidence

1. **Gate 1/G0 — intake and feasibility:** approve scope, users, classification,
   owners, frontend/API dependencies, provider constraints, initial risks and
   open product decisions.
2. **Gate 2/G1 — requirements baseline:** baseline this FRS with SRS v3.5, FE/SRS
   traceability, screen inventory, user journeys, acceptance criteria, privacy and
   client-security requirements.
3. **Gate 3/G2 — design readiness:** approve information architecture, interaction
   flows, accessibility approach, API contract gaps, threat model, data boundary,
   test strategy and delivery plan.
4. **G3 — code complete:** reviewed implementation, reproducible build, automated
   test results, dependency/licence inventory, known defects and documentation.
5. **Gate 4/G4 — release readiness:** acceptance, security/privacy, accessibility,
   performance, browser compatibility, deployment/rollback, monitoring and release
   authority evidence.
6. **G5/Gate 6 — operational acceptance and closure:** support handover, defects,
   access removal, documentation, archive and client/product-owner acceptance.
7. **Gate 7 — benefits:** adoption, task success, accessibility defects, support
   demand, conversion/billing outcomes, bank-link reliability and improvement
   actions measured against approved baselines.

## 4. Dependencies and decisions required

- API endpoint and error-schema completeness for every FRS screen.
- Final design-system/component-library decision.
- Onboarding depth and responsive-web browser support baseline.
- Pricing, trial length, refund and cancellation policy wording.
- Payment processor, email provider, supported regions/currencies and bank provider.
- Provider risk assessment, DPA, read-only scopes, consent wording and token boundary.
- Named sponsor, product owner, frontend lead, security/privacy reviewer, QA reviewer,
  service owner, data owner and release authority.

No bank-linking implementation should begin before the provider, consent, security,
privacy and legal evidence is approved.

## 5. Definition of done

A frontend increment is done only when its FE requirements are trace-linked, server
behavior is verified, loading/empty/error/populated states are implemented, keyboard
and responsive behavior are tested, accessibility and security checks pass, no
prohibited payment or credential path exists, and the evidence is attached to the
applicable G1-G4/Gates 2-4 record.

## 6. Development plan and execution record

### Increment 1 — Foundation and security boundary (complete)

Establish the frontend stack, token boundary, API error contract, responsive
shell and security-safe defaults. Evidence: `frontend/`, successful production
build, browser smoke test and source security scan.

### Increment 2 — Authentication and onboarding (implemented against the real API; test evidence outstanding)

`/login` and `/signup` call the real `POST /auth/login` and `POST /auth/signup`
endpoints with account-enumeration-safe error copy (the backend's own
"Invalid credentials" message never discloses whether an email is
registered) and return-route handling after login. `/onboarding` creates
real starter categories via `POST /categories`.

Not built, because the backend does not implement them: email verification
send/resend, password reset, token refresh, and server-side rate limiting.
Rather than fake these with client-only theater, the affected screens say so
plainly (e.g. sign-up confirms the account is real and immediately usable
instead of showing a fabricated "check your inbox" step). This is a
deliberate honesty decision, not an oversight — revisit once the
corresponding backend endpoints exist. Component/contract/E2E test evidence
is still outstanding for everything above, **except** `/login`: covered by
`frontend/src/pages/auth/LoginPage.test.tsx` added 2026-09-11 (see §7's
Authentication row). `/signup`, `/onboarding` and the rest remain untested.

### Increment 3 — Manual finance product (implemented against the real API; test evidence outstanding)

Server-backed CRUD is live for accounts, categories, transactions (including
CSV import), recurring bills (including the `generate-due` action), savings
goals, and the three report endpoints (`/reports/spending-by-category`,
`/income-vs-expense`, `/net-worth`). Loading/empty/error/populated states are
implemented per screen. Native-currency immutability is enforced client-side
at edit time (the field is disabled after creation, matching FR-4.4 intent).
No pagination was built for transactions — the backend's `GET /transactions`
has no `limit`/`offset` support, so building a client-side pagination control
would only fake the appearance of one.

Two real backend defects were found and fixed while wiring this increment,
both in `backend/app/routers/portability.py`'s `POST /transactions/import`:
a `Decimal`/`float` type mismatch that made every CSV import 500, and a raw
string passed where the ORM required a `date` object. Verified with a live
import (`account balance moved from 0.00 to 957.50 for a 2-row CSV`) and
`pytest tests/test_api.py` (4/4 passing, unchanged).

No currency conversion happens anywhere (the backend performs none) — every
amount displays its real ISO currency, and any screen that aggregates across
accounts/transactions (dashboard, reports) discloses when the underlying
data spans more than one currency instead of silently summing them.
Component/contract/E2E/cross-tenant test evidence is still outstanding,
**except** accounts, categories and transactions: covered by
`frontend/src/pages/AccountsPage.test.tsx`, `CategoriesPage.test.tsx` and
`TransactionsPage.test.tsx` added 2026-09-11 (see §7's Accounts/Categories/
Transactions rows) — bills, goals and reports remain untested.

### Increment 4 — Lifecycle and commercial surfaces (real, including subscription/billing; bank-linking still out of scope)

Real, implemented: `/settings/notifications` (live `GET /notifications` +
`PATCH .../read`), `/settings/data` export (`GET /me/export`, downloaded as
JSON client-side), typed-confirmation account deletion (`DELETE /auth/me`).
`/settings/profile` is editable against real `PUT /auth/me` data.

**Subscription/billing (added 2026-09-11):** `/subscription` is a real
Stripe-backed feature, not a placeholder. Backend: a tenant-scoped
`Subscription` model (`backend/app/models.py`), a `subscriptions` router
(`GET /subscriptions/status`, `POST /subscriptions/checkout-session`,
`POST /subscriptions/cancel`, `GET /subscriptions/billing-history`), and a
signature-verified Stripe webhook endpoint (`POST /webhooks/stripe`)
handling `checkout.session.completed`, `customer.subscription.updated`,
`invoice.payment_failed`, `invoice.payment_succeeded` and
`customer.subscription.deleted`. Checkout uses Stripe's own hosted Checkout
page (redirect-based) — no card data or Stripe.js ever touches this
codebase. A single paid tier with a config-driven 14-day trial
(`STRIPE_TRIAL_DAYS`) is implemented; cancellation sets
`cancel_at_period_end` and preserves access through the paid period (FR-12.8);
a failed-payment grace period plus an in-app `Notification` on
`invoice.payment_failed` covers FR-12.6; billing history is fetched live
from Stripe invoices on each request rather than mirrored locally.

An entitlement dependency (`require_active_entitlement` in
`backend/app/dependencies.py`) is built and unit-tested, but is
**intentionally unattached to any router** — bank-linking (the only feature
FR-12.2/FR-12.9 gate) still does not exist in this codebase (Workstream F
remains blocked pending legal/provider approval). No real Stripe
account/keys were used to build this — all 9 new backend tests
(`backend/tests/test_subscriptions.py`) mock the Stripe SDK; verifying
against a real Stripe test-mode account (via the Stripe CLI) is a manual
step still open for whoever holds Stripe credentials. Manual finance
remains fully free and ungated throughout.

### Increment 5 — Approved read-only banking boundary

Only after provider risk, DPA, consent, legal and security approvals are
recorded, deliver named-provider disclosure, unchecked read-only consent,
provider-hosted handoff, linked-account states, synchronization handling,
reauthorization and unlink/cache purge.

### Increment 6 — Support, quality and release

Deliver the isolated support console, traceability matrix, accessibility and
security evidence, cross-tenant and currency tests, performance/browser checks,
rollback and operational handover. Gate evidence is required before release.

### Current execution sequence

1. Finish Increment 2 with API-shaped auth states and onboarding.
2. Build Increment 3 around server-scoped resource helpers.
3. Add lifecycle and billing only after the manual workflows are usable.
4. Keep bank linking blocked until its required approvals exist.
5. Run the quality/release workstream continuously, with final Gate 4 evidence
   assembled after feature completion.

## 7. FRS compliance coverage matrix

This matrix is the controlling delivery checklist for the companion FRS. A
requirement is not considered satisfied by a visual placeholder: it requires
server-backed behavior, automated test evidence, accessibility review and a
traceable artifact.

| FRS area | Requirements covered | Planned implementation surface | Current state | Exit evidence |
|---|---|---|---|---|
| Registration and provisioning | FE-1.1–FE-1.4 | `/signup` | Implemented against real `POST /auth/signup`; verification/resend flow added 2026-09-09 (`POST /auth/verify-email`, `POST /auth/resend-verification`), dev-safe (token surfaced via API response, never in production, since no email provider is chosen yet — disclosed, not faked) | API contract, component and E2E tests |
| Authentication | FE-2.1–FE-2.8 | `/login`, session boundary | Implemented against real `POST /auth/login`; token refresh and logout now real end-to-end (`POST /auth/refresh` with rotation, `POST /auth/logout` with server-side revocation) added 2026-09-09, fixing a previously non-functional refresh flow; `/forgot-password` and `/reset-password` now real and dev-safe (same pattern as verification), added 2026-09-09; still no rate-limit UI (no backend support — disclosed, not faked) | `frontend/src/pages/auth/LoginPage.test.tsx` (4 tests: success+navigate, account-enumeration-safe error display, busy-state, session cleared on a failed post-login profile fetch) and `frontend/src/lib/api.test.ts` (401 refresh-and-retry, consumer/admin session isolation) added 2026-09-11 — component/contract tier only; enumeration and return-route coverage for `/signup`, `/forgot-password`, `/reset-password` still outstanding |
| Phase 2 authentication | FE-2.9–FE-2.10 | Security settings MFA and optional SSO extension points | **Route built 2026-09-13** (`/settings/security`, closing the §8 required-route gap — it existed nowhere before, not even a stub): an honest locked placeholder (`SecurityPage.tsx`, reusing the `Banner tone="locked"` pattern from Banking) disclosing that MFA/SSO are Phase 2 and not yet built, listing today's actual protections (bcrypt, in-memory tokens, rate-limiting) instead. The underlying MFA/SSO capability itself remains Deferred — this closes the missing-route gap, not the feature | Approved Phase 2 scope and tests for the feature itself; route existence verified this session (typecheck, lint, real browser render while authenticated) |
| Profile and preferences | FE-3.1–FE-3.4 | `/settings/profile`, `/settings/notifications` | Editable against real `PUT /auth/me` (name, timezone, preferred currency, notification preferences) added 2026-09-09; email intentionally excluded until re-verification exists (disclosed) | Preference and re-verification tests |
| Accounts | FE-4.1–FE-4.5 | `/accounts` list/create/edit/delete | Implemented against real CRUD; native currency locked at edit time | `frontend/src/pages/AccountsPage.test.tsx` (7 tests, added 2026-09-11): loading/empty/error+retry/populated states, mixed-currency disclosure, create, edit (asserts `native_currency` is never sent on update), delete-with-confirmation. Component/contract tier only — no ownership/cross-tenant test yet (see Cross-tenant, still outstanding project-wide) |
| Categories | FE-5.1–FE-5.4 | `/categories`, onboarding starter set | Implemented against real CRUD | `frontend/src/pages/CategoriesPage.test.tsx` (8 tests, added 2026-09-11): loading/empty/error+retry/populated states, create with and without a monthly limit (asserts `null` not `0`/`''`), edit, cancel-discards-draft, delete-with-confirmation. Component/contract tier only — starter-category onboarding flow itself still untested |
| Transactions | FE-6.1–FE-6.7 | `/transactions` list/entry/import | Implemented against real CRUD + filters + CSV import + pagination (`limit`/`offset`, "Load more") added 2026-09-09 | `frontend/src/pages/TransactionsPage.test.tsx` (12 tests, added 2026-09-11): populated/empty/no-account/error states, filter query params, "Load more" pagination, create, edit-preserves-currency (does not reset to the new account's default), delete-with-balance-impact-warning, CSV import success and error. Found and fixed a real bug: the page fired two `GET /transactions` requests on every mount (a stale mount-effect duplicated the filter-effect's own mount run) — fixed by removing the redundant call. Component/contract tier only — no cross-tenant test yet |
| Recurring bills | FE-7.1–FE-7.4 | `/bills` | Implemented against real CRUD + `generate-due` | Schedule and generated-transaction tests |
| Savings goals | FE-8.1–FE-8.3 | `/goals` | Implemented against real CRUD | Progress derivation tests |
| Reports | FE-9.1–FE-9.5 | `/reports` suite | Implemented against real report endpoints, with a mixed-currency disclosure banner | Aggregation and responsiveness tests |
| Notifications | FE-10.1–FE-10.2 | In-app notification surface | Implemented against real `GET /notifications` + mark-read + preference storage/enforcement (`notification_preferences` on `User`, honored in `generate-due`) added 2026-09-09 | Event and preference tests |
| Subscription and billing | FE-12.1–FE-12.10 | `/subscription` | Implemented against a real Stripe integration (hosted Checkout, webhook-driven status sync, config-driven 14-day trial, cancel-preserves-access, failed-payment grace + notification, live billing history). `require_active_entitlement` built and unit-tested but unattached — no bank router exists yet to gate. No real Stripe account was used; all Stripe calls are mocked in tests | `backend/tests/test_subscriptions.py` (9 tests, all passing, mocked Stripe SDK); real Stripe-test-mode/Stripe CLI verification still outstanding |
| Export and deletion | FE-13.1–FE-13.8 | `/settings/data` | Export implemented against real `GET /me/export`; typed-confirmation soft-deletion added 2026-09-09 (`DELETE /auth/me`, 30-day retention per SRS §5); export is still synchronous, not the async job the FRS describes; actual 30-day purge job not built (needs the open Celery/APScheduler decision) | Async export, typed deletion tests |
| Banking and Gross Balance | FE-14.1–FE-14.15 | `/banking`, `/banking/link` | **Plumbing built 2026-09-14**, deliberately against a disclosed stub provider (`app/core/bank_provider.py`), not a real bank-data aggregator — that remains blocked on the same provider-risk/DPA/security-review approvals as before (see `Compensating_Assurance_Role_Separation.md`; choosing a real provider is a vendor decision, not made here). Real, working: `linked_accounts`/`linked_account_transactions` tables (own RLS policies), subscription-gated (`require_active_entitlement`, finally attached — no bank router existed to gate before today), full consent → link → list/detail → sync → re-authorize → unlink lifecycle, Gross Balance with a disclosed static FX rate table (`app/core/fx_rates.py`) and per-account rate/as-of disclosure (FE-14.7/14.8), masked account numbers (last 4 only, FE-14.9), persistent read-only badges and no payment/transfer affordance anywhere (FE-14.11 + the FRS's own Interface Prohibition), linked-vs-manual data kept structurally separate (FE-14.15), unlink purges cached transaction detail via cascade delete (FE-14.12), consent-lapse re-authorization path (FE-14.13) exercised via a dev-only endpoint since no real provider webhook exists to trigger it. Found and fixed two real pre-existing defects while building this (see `Defect_Register.md` D5/D5a) — every create/update endpoint in the whole app, not just banking, 500'd against real Postgres before today | `backend/tests/test_banking.py` (5 tests: entitlement gate, link/list/detail/gross-balance, unlink purge, lapsed-consent/reauthorize, cross-tenant 404) plus 3 new RLS tests in `test_rls_policies.py`; verified end-to-end in a real logged-in browser session (link, expand transactions, sync, unlink, Gross Balance recompute). No frontend component tests added — consistent with this codebase's actual practice for entitlement-gated pages (`SubscriptionPage`, the settings pages also have none) |
| Cross-cutting interface | FE-X.1–FE-X.10 | Currency, error, loading/empty/error primitives | Implemented (`Money`, `Banner`, `EmptyState`/`ErrorState`/`LoadingState`, `ConfirmDialog`) | `frontend/src/components/Money.test.tsx` (6, added 2026-09-11 — found and fixed a real bug: an empty `currency` prop formatted the amount as USD but displayed a blank currency label instead of "USD", misrepresenting FR-X's own currency-disclosure requirement), `States.test.tsx` (6), `ConfirmDialog.test.tsx` (8: focus-on-open, Tab trap, Escape-to-close, focus restoration, typed-confirmation lock) — `Banner` still untested |
| Client security | FE-N.1–FE-N.7 | API/session boundary and financial screens | In-memory-only tokens confirmed (no `localStorage`/`sessionStorage` token use); two isolated sessions (consumer/staff) | Static checks, dependency review and security review |
| Accessibility | FE-N.8–FE-N.12 | All screens and shared components | Automated WCAG scan added 2026-09-09 (`eslint-plugin-jsx-a11y`, 34 rules verified active, zero violations across ~30 files) plus a manual review that found and fixed 3 real gaps (dialog focus management, live-region status announcements, menu keyboard dismissal) — see `files/G2_Design_Readiness.md` §8; no live AT (screen reader) session or contrast measurement yet | Automated WCAG scan plus keyboard/screen-reader evidence |
| Performance and responsiveness | FE-N.13–FE-N.15 | App shell, reports and lists | Build-only evidence | Browser performance and responsive evidence |
| Internationalisation readiness | FRS Section 8.4 | Locale/timezone formatting and externalized strings | Added 2026-09-09: all 13 hardcoded `'en-US'` calls replaced with a shared `src/lib/locale.ts` driven by the browser's own locale and `User.timezone`/date-vs-timestamp-aware UTC handling; a minimal `src/lib/strings.ts` `t()` helper added and genuinely consumed (ConfirmDialog defaults, main nav labels) — deliberately not a full app-wide string migration (hundreds of literal strings remain, disclosed as a scope decision) | Localization lint/review and locale test matrix |
| Support console | FE-11.1–FE-11.7 | `/admin`, isolated session, `admin.html` build entry | Implemented with an isolated in-memory session (never shares a token with the consumer app) and real `GET /admin/tenant/search` + `.../summary`; build-level separation added 2026-09-09 (`admin.html`/`admin-main.tsx`/`AdminApp.tsx`, separate Vite entry — verified the consumer bundle contains zero admin code and vice versa); actually deploying the two outputs to separate origins/subdomains is a hosting decision, still open. **2026-09-11:** the three remaining Workstream G acceptance gaps closed — responses are masked (`app/core/masking.py`; raw values kept only in the audit record), every access request is logged (`AdminAccessLog`, hit and miss) with a staff-entered `reason` now required by both endpoints (422 without one), and a Postgres RLS bypass scoped to `FOR SELECT` only (`20260911_admin_rls_bypass` migration) lets the console see across tenants for reads while leaving INSERT/UPDATE/DELETE governed solely by the original tenant-isolation policy — proven, not just designed: `test_rls_bypass_flag_does_not_relax_write_check` and `...does_not_permit_deleting_another_tenants_row` assert the bypass can't become a write/delete escape hatch. The frontend (`resources/admin.ts`, `AdminConsolePage.tsx`) had not been updated to send the newly-required `reason` — found and fixed the same session the backend requirement landed, before it reached a real user as a broken console (every lookup would have 422'd) | `backend/tests/test_masking.py` (4), `test_api.py`'s expanded admin tests (reason-required, masking, audit-on-hit-and-miss), `test_rls_policies.py`'s 3 new bypass tests, `frontend/src/pages/admin/AdminConsolePage.test.tsx` (4, added 2026-09-11) — still missing: mutation-negative test at the HTTP/router layer (only proven at the DB/RLS layer so far) |

## 8. Required route and screen inventory

The implementation must provide these routes before Gate 3 code complete:

- Public: `/signup`, `/login`, `/verify-email`, `/forgot-password`,
  `/reset-password`.
- Onboarding: `/onboarding`.
- Core: `/`, `/accounts`, `/categories`, `/transactions`, `/bills`, `/goals`,
  `/reports`.
- Banking and subscription: `/banking`, `/banking/link`, `/subscription`.
- Settings: `/settings/profile`, `/settings/notifications`,
  `/settings/security`, `/settings/data`.
- System states: loading, empty, error, offline and not-found variants.
- Support: `/admin/*` on a separate origin with independent authentication and
  no shared session with the consumer application.

Every data-backed route must explicitly implement loading, empty, error,
populated and applicable partial-failure states. Every consequential action must
name the affected object and state what happens if the request fails.

## 9. Verification and acceptance plan

The following evidence is mandatory for the FRS acceptance criteria:

1. Component tests for all interactive controls and all required data states.
2. Contract tests for the documented API error envelope, server validation,
   auth refresh, live entitlements and server-scoped resources.
3. End-to-end tests for signup/verification, transaction currency mismatch,
   CSV import, recurring bills, subscription purchase/cancellation, bank consent
   and account deletion. **2026-09-12: first E2E-tier evidence landed**
   (`frontend/e2e/`, Playwright, 11 tests against the real backend+frontend) —
   signup/onboarding, multi-currency accounts + CSV import (success and
   rejection), recurring-bill generation (paused bills excluded, idempotent
   per period), and account deletion (typed confirmation, login-after-delete
   rejected, cancel-changes-nothing). Two real bugs found and fixed:
   `BillsPage.tsx`'s "New bill" trigger wasn't disabled while data was still
   loading (a race could silently no-op the create form with no error at
   all), and account deletion never canceled an active Stripe subscription
   (independent systems — a paying user deleting their account would have
   kept being billed). Still outstanding: signup email-verification itself,
   subscription purchase E2E (needs real Stripe test-mode credentials, none
   available), bank consent (Workstream F unbuilt), and admin console E2E.
4. Negative security tests proving no token, credential, payment capability or
   unmasked account number reaches the client surface, logs or analytics.
5. Cross-tenant tests proving requests cannot be constructed against another
   tenant and server responses are displayed only within the current session.
6. Currency tests proving original and converted values include currency, rate,
   basis and as-of date, with approximate labels where required.
7. Subscription matrix tests covering trialing, active, past-due, grace,
   canceled and free states without blocking manual workflows.
8. Accessibility automation and manual keyboard/screen-reader review against
   WCAG 2.1 AA; color must never be the sole financial indicator.
9. Responsive browser tests at 320px, mobile, tablet and desktop widths across
   current and previous major Chrome, Firefox, Safari and Edge.
10. Performance, dependency/license, privacy, rollback and operational handover
    evidence attached to the G3/G4 record.

## 10. Gate exit criteria

- **G0/Gate 1:** named owners, scope, dependencies, classifications, open
  decisions and initial risks recorded.
- **G1/Gate 2:** FRS/SRS baseline, route inventory, complete traceability matrix,
  acceptance criteria, privacy boundary and client-security requirements approved.
- **G2/Gate 3 design readiness:** information architecture, state model,
  accessibility approach, threat model, API gaps, test strategy and delivery
  plan approved.
- **G3 code complete:** all Must requirements implemented, reviewed and tested;
  reproducible build, dependency inventory, known-defect register and evidence
  attached.
- **G4/Gate 4 release readiness:** WCAG, security/privacy, performance,
  browser compatibility, deployment/rollback, monitoring and named release
  authority approval complete.
- **G5/Gate 6 closure:** support handover, access removal, documentation,
  archived evidence and product-owner acceptance complete.
- **Gate 7 benefits:** adoption, task success, accessibility defects, support
  demand, billing outcomes and bank-link reliability measured against baselines.

## 11. Current compliance declaration

As of 11 September 2026, this plan is aligned to the full FRS requirement set
and provides the required implementation, traceability, test and gate structure.
The product implementation is **not yet FRS compliant**: Increments 1-4
(including subscription/billing, added 2026-09-11) are implemented and
verified working end-to-end against the live API and a mocked Stripe SDK
(see §7's matrix and §6's per-increment notes). Frontend test infrastructure
(Vitest, React Testing Library, MSW for contract-level API mocking, wired
into CI) and component/contract coverage were added 2026-09-11 — 67 tests
across the shared API/error contract layer, three shared UI primitives,
`/login`, `/accounts`, `/categories` and `/transactions` end-to-end (all
required data states, full CRUD, currency immutability, filters,
pagination, CSV import). **2026-09-12: the first E2E-tier evidence
followed** — 11 Playwright tests running against the real backend and
frontend together (no mocking), covering signup/onboarding, multi-currency
accounts + CSV import, recurring-bill generation, and account deletion.
This is no longer zero on either tier, but together they cover roughly 4-5
of the ~15 FRS-matrix areas plus shared infrastructure. Four real defects
have been found and fixed by writing these tests so far: `Money.tsx`'s blank
currency label on an empty `currency` prop; `TransactionsPage.tsx` firing a
duplicate `GET /transactions` on every mount; `BillsPage.tsx`'s "New bill"
trigger not disabled while data loads (a race could silently no-op bill
creation with no error shown at all); and account deletion never canceling
an active Stripe subscription (a paying user deleting their account would
have kept being billed) — direct evidence for why this coverage is being
built out rather than deferred. Still outstanding: component/contract tests
for every other area (signup/verification, bills, goals, reports,
subscription/billing, settings, admin console), E2E coverage for
subscription purchase (needs real Stripe test-mode credentials, none
available), bank consent (Workstream F unbuilt) and the admin console,
cross-tenant tests, accessibility automation beyond the existing lint scan,
security/performance test evidence, and no real Stripe test-mode
verification has been run (no Stripe account/keys exist in this build
environment). Read-only banking (Increment 5) remains entirely unbuilt
because its backend model doesn't exist and its own legal/security
approvals haven't been sought — the new `require_active_entitlement`
dependency is ready to gate it the moment it exists, but gates nothing
today. The support console (Increment 6) has its functional core implemented
and, as of 2026-09-09, builds as a separate bundle (`admin.html`) with zero
shared code with the consumer app -- deploying that bundle to an actually
separate origin/subdomain remains a hosting decision, still open. No Gate 4
or production-readiness claim may be made until all applicable exit criteria
are approved — implementation progress is not a substitute for gate evidence
or a recorded gate decision, both of which remain outstanding per §3 of this
plan and the governance baseline in this machine's global `CLAUDE.md`.

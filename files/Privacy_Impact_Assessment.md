# Privacy Impact Assessment — Finance Management Platform

Prepared 13 September 2026. Closes tracker item #109's remaining half (a
first-pass threat model already existed, `files/G2_Design_Readiness.md`
§3; the full PIA it flagged as outstanding is this document). Triggered per
the SDLC Framework's own rule for high-risk processing: this platform
handles Restricted-classified personal financial data
(`G1_Requirements_Baseline_Supplement.md` §2) for the general public.

## 1. What personal data is actually processed

Enumerated directly from `backend/app/models.py`, not from the SRS's
description of intended scope:

| Data | Table.column | Sensitivity |
|---|---|---|
| Email, full name | `users.email`, `users.full_name` | Direct identifiers |
| Password hash (bcrypt) | `users.password_hash` | Credential -- never plaintext, never exported |
| Timezone, preferred currency, notification preferences | `users.*` | Low-sensitivity preference data |
| Email verification / password-reset tokens | `users.verification_token_hash`, `users.reset_token_hash` | Hashed, time-limited (24h / 1h), single-use |
| Refresh tokens (hashed) | `refresh_tokens.token_hash` | Session credential, hashed at rest, revocable |
| Account names, balances, currency | `accounts.*` | Financial data |
| Transaction amount, date, note, type | `transactions.*` | Financial data -- `note` is free text a user could put anything in, including data they don't realize is sensitive |
| Recurring bill and savings goal details | `recurring_bills.*`, `savings_goals.*` | Financial data |
| Stripe customer/subscription IDs, plan/status | `subscriptions.*` | Billing metadata -- **no card number, CVV, or full payment instrument is ever stored here**; Stripe holds that (see §3) |
| Admin access log: which staff member looked up which tenant/email, when, why | `admin_access_logs.*` | Staff activity audit trail, not itself tenant data (deliberately outside RLS, `models.py` docstring) |

**Not collected, confirmed by absence:** no government ID, no biometric
data, no precise geolocation, no bank account/routing numbers (Workstream
F/bank-linking is unbuilt and blocked), no children's data (no age-gating
exists, but the product's own scope and marketing target adults; this is a
disclosed gap, not a control).

## 2. Purpose and legal basis

- **Purpose:** provide manual personal-finance tracking (free tier) and a
  subscription-gated read-only bank-linking tier (unbuilt). No secondary
  use (advertising, data resale, profiling) exists in the codebase.
- **Legal basis:** performance of a contract with the data subject (the
  user signs up for and uses the service) for account/transaction data;
  legitimate interest for the admin audit log (fraud/support investigation,
  itself access-controlled and reason-required per Workstream G). No
  consent-based processing exists yet requiring a consent-management
  mechanism, because no marketing or non-essential tracking exists in the
  code.

## 3. Third-party data sharing

**Stripe** (`backend/app/routers/subscriptions.py`, `stripe_webhook.py`) is
the only third party in the current codebase. Email and a Stripe-generated
customer ID are shared to create a Stripe Customer; Stripe independently
holds the actual payment instrument -- this application never touches raw
card data, which is the correct pattern for PCI-DSS scope reduction (SAQ A
territory, not full PCI compliance), but **no Stripe Data Processing
Agreement has been reviewed or referenced anywhere in this project's
documents** -- a real, open gap, not assumed-fine.

No other third party exists in the code: no analytics SDK, no error-tracking
SaaS, no email/SMS provider (email verification and password reset are
still dev-only token echoes, `auth.py`'s `DevOnlyTokenResponse` -- a real,
disclosed functional gap, and also means no user data has actually left
this system via an email provider yet).

## 4. Data subject rights -- checked against actual endpoints, not assumed

| Right | Supported? | Evidence |
|---|---|---|
| Access / portability | **Yes** | `GET /me/export` (`portability.py`) returns the user's own account, category, transaction, recurring-bill and savings-goal data as structured JSON |
| Erasure | **Partially** | `DELETE /me` soft-deletes (sets `deleted_at`/`is_active=False`, cancels any live Stripe subscription) per a 30-day retention policy (SRS data model §5). **The actual purge job after 30 days does not exist** (`auth.py`'s own docstring on `delete_me` discloses this -- blocked on a still-open job-scheduler decision, `G1_Requirements_Baseline_Supplement.md` §4) -- so "erasure" today means deactivation, not deletion, past 30 days |
| Rectification | **Yes** | `PUT /me` (profile fields), and normal CRUD on accounts/transactions/etc. |
| Object / restrict processing | **No dedicated mechanism** | Deletion is the only lever; no partial opt-out (e.g. "stop using my data for X but keep my account") exists, appropriate given the product has no secondary-use processing to opt out of |

## 5. Risks identified and their actual status

| # | Risk | Status | Basis |
|---|---|---|---|
| P1 | Health-check endpoint leaking live database credentials | **Fixed 2026-09-13** | `backend/app/main.py` `/health` no longer echoes `settings.database_url` (found and fixed while writing this assessment, not a pre-existing control) |
| P2 | Overly permissive CORS with credentials enabled | **Fixed 2026-09-13** | `ALLOWED_ORIGINS` now fails closed in production instead of defaulting to `*` (same fix pass) |
| P3 | No brute-force/rate-limiting on `/auth/login` or password-reset | **Open** | Confirmed by absence: no rate-limiting library, middleware, or per-IP/per-account throttling exists anywhere in `backend/app` |
| P4 | Erasure is soft-delete only; no actual purge job exists past 30 days | **Open, disclosed** | See §4 above; blocked on the job-scheduler decision |
| P5 | No Stripe DPA reviewed | **Open** | No such document exists in this project |
| P6 | Email verification/reset tokens have no real delivery channel (dev-only echo) | **Open, but fail-closed** | `DevOnlyTokenResponse` never populates the token outside `is_production == False` (`config.py`) -- means the feature is genuinely unusable in production today rather than insecure, since no email path exists to leak the token over |
| P7 | Free-text `transaction.note` field could capture sensitive data the user doesn't expect to be "financial data" (e.g. a note mentioning a medical expense, a person's name) | **Open, accepted as inherent to the feature** | No structured way to flag/redact this; same exposure as any free-text field in any finance app, disclosed rather than silently ignored |

## 6. Conclusion

This assessment finds no undisclosed high-severity gap beyond the two
fixed during its own preparation (P1/P2). The remaining open items (P3-P7)
are real and should be prioritized before a production launch, in
particular P3 (brute-force protection) and P5 (Stripe DPA review), which
are both cheap to close relative to their risk. This PIA does not replace
the independent security review this project cannot currently obtain
without the compensating-assurance arrangement now in place
(`files/Compensating_Assurance_Role_Separation.md`) -- Milton's scoped
review explicitly includes authentication and data-handling changes.

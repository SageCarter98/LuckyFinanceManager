# Software Requirements Specification
# Finance Management Platform

| Field | Value |
|---|---|
| Document version | 1.1 |
| Status | Baselined — approved by sponsor Freston Kenny Adedeme, 9 September 2026, as the SDLC G1 requirements baseline (FMP-2026-001) |
| Date | 2026-09-05 (baselined 2026-09-09) |
| Classification | Internal - Confidential |
| Owner | Engineering / Product |
| Authority | Platform SRS v3.5, reconciled with the API SRS v1.0 |

## 0. Verified implementation status

The current build has verified backend functionality for the foundational tenant-aware finance API, including:

- FastAPI application skeleton and dependency manifest
- Tenant model and user lifecycle model
- Bcrypt password hashing and JWT access/refresh tokens
- Signup/login/profile auth flow
- Tenant-scoped account, category, transaction, recurring bill, savings goal, and report endpoints
- Proof of cross-tenant isolation through tenant-scoped queries for a second user
- Environment-driven configuration with production guard rails preventing accidental SQLite deployment in production
- Automated pytest validation for auth, profile, tenant-isolation, and recurring-bill automation flows
- Tenant-scoped notification records plus automatic recurring bill generation and alert creation
- Internal admin support console for tenant lookup and tenant-summary inspection with admin-only enforcement
- PostgreSQL-ready tenant context and RLS policy scaffolding for database-layer tenant isolation

Evidence captured during validation:

- `GET /health` returned `{"status":"ok"}`
- `POST /auth/signup` returned HTTP 201 for two different users
- `POST /auth/login` returned access and refresh tokens
- `GET /me` returned tenant-scoped profile data for the authenticated user
- `GET /accounts` for a second user returned an empty list while the first user's account remained visible to the first tenant
- `GET /reports/income-vs-expense` returned expected income and expense totals for the authenticated tenant
- `python -m pytest tests/test_api.py -q` passed with 2/2 test cases green

This section is intended to remain current with implementation evidence, not just the original design baseline.

## 1. Purpose and scope

This document defines the implementation baseline for the public Finance Management
Platform. It expands the API-only specification into a complete multi-tenant SaaS
platform requirement set for backend, frontend, operations, security, privacy, billing,
and read-only bank monitoring.

The platform enables a person to manage accounts, categories, transactions, recurring
bills, savings goals, and reports. Each registered user is an isolated tenant. Manual
finance management is free. Bank linking and Gross Balance monitoring are subscription
features.

The platform is a monitoring-only consumer of external bank data. Payment initiation,
funds transfer, account modification, and collection of online-banking credentials are
permanently out of scope.

## 2. Product and architecture

### 2.1 User classes

| User class | Access |
|---|---|
| Anonymous visitor | Signup, login, public API documentation |
| Registered user / tenant | Own profile and financial data |
| Support agent | Explicit, time-boxed, read-only access to a requested tenant |
| System administrator | Infrastructure and operational access; no implicit tenant-data access |

### 2.2 Target architecture

```text
Web/mobile client
  -> HTTPS/load balancer
  -> FastAPI API (Gunicorn/Uvicorn)
  -> PostgreSQL (primary store and RLS)
  -> Redis (rate limits, token revocation, job broker)
  -> Celery worker (scheduled and asynchronous jobs)
  -> Email, payment, bank-connection, FX, and monitoring providers
```

Configuration is environment-driven. Production traffic uses TLS 1.2 or later.
The API is stateless apart from database records and Redis-backed token/job state.

### 2.3 Tenancy model

Each user account is one tenant for the initial release. Every tenant-scoped table
must contain a non-null, indexed `tenant_id`.

Tenant isolation is enforced at three layers:

1. Shared application query dependencies inject the authenticated `tenant_id`.
2. PostgreSQL Row-Level Security policies filter rows using a transaction-local tenant
   context.
3. Automated tests verify that Tenant A cannot read, write, or enumerate Tenant B data.

A nullable `household_id` may be reserved for future household or organization
tenancy, but multi-user tenants are not part of the initial release.

## 3. Functional requirements

### 3.1 Tenant and account provisioning

| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | Signup creates the user and tenant atomically. | Must |
| FR-1.2 | Server assigns `tenant_id`; clients cannot supply or override it. | Must |
| FR-1.3 | Users can request soft deletion and permanent deletion after a 30-day recovery window. | Must |
| FR-1.4 | The tenant model may reserve nullable `household_id` for Phase 2. | Could |

### 3.2 Authentication and authorization

| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | Signup accepts email and password; passwords are bcrypt-hashed. | Must |
| FR-2.2 | Login issues a short-lived JWT access token and a longer-lived revocable refresh token. | Must |
| FR-2.3 | Email verification is required before full access. | Must |
| FR-2.4 | Password reset uses time-limited, single-use email tokens. | Must |
| FR-2.5 | Signup, login, refresh, and reset endpoints are rate-limited by IP and account. | Must |
| FR-2.6 | Optional TOTP MFA is reserved for Phase 2. | Should |
| FR-2.7 | Google/Apple SSO is reserved for Phase 2. | Could |

### 3.3 Profile and preferences

| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | Users can update name, email, timezone, and preferred currency. | Must |
| FR-3.2 | Users can configure email notification preferences by notification type. | Should |
| FR-3.3 | Profile and preferences are included in data export. | Must |

### 3.4 Financial accounts

| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | Users can create checking, savings, and credit accounts. | Must |
| FR-4.2 | Account CRUD is restricted to the owning tenant. | Must |
| FR-4.3 | Account balances update automatically from transaction activity. | Must |
| FR-4.4 | Each account has a native currency, defaulted from but independent of the user preference. | Must |

### 3.5 Categories

| ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | Users can create categories with optional monthly limits. | Must |
| FR-5.2 | Category CRUD is restricted to the owning tenant. | Must |
| FR-5.3 | Signup creates editable starter categories. | Should |

### 3.6 Transactions

| ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | Users can log amount, currency, type, category, account, date, and note. Currency is explicit and never silently inferred. | Must |
| FR-6.2 | Create, update, and delete atomically adjust the account balance. Different currencies use a historical FX rate for the transaction date. | Must |
| FR-6.3 | Transactions support pagination and date, category, and account filters. | Must |
| FR-6.4 | CSV transaction import is validated and tenant-scoped. | Should |
| FR-6.5 | Original amount/currency and converted balance amount are both retained and displayed. | Must |

### 3.7 Recurring bills

| ID | Requirement | Priority |
|---|---|---|
| FR-7.1 | Users can define amount, category, account, frequency, and due day. | Must |
| FR-7.2 | A retry-safe, idempotent background job generates the due transaction. | Must |
| FR-7.3 | Users are notified when a bill is generated or overdue. | Should |

### 3.8 Savings goals

| ID | Requirement | Priority |
|---|---|---|
| FR-8.1 | Users can create a target amount and optional target date. | Must |
| FR-8.2 | Progress is calculated from linked account and transaction activity. | Must |

### 3.9 Reports

| ID | Requirement | Priority |
|---|---|---|
| FR-9.1 | Spending-by-category reports support a specified date range. | Must |
| FR-9.2 | Income-versus-expense summaries are available. | Must |
| FR-9.3 | Net worth is calculated across the tenant's accounts. | Must |
| FR-9.4 | Report queries are tenant-scoped and covered by isolation tests. | Must |

### 3.10 Notifications

| ID | Requirement | Priority |
|---|---|---|
| FR-10.1 | The system sends verification, password-reset, and bill notifications. | Must |
| FR-10.2 | Outbound notification attempts record delivery status. | Should |

### 3.11 Admin and support

| ID | Requirement | Priority |
|---|---|---|
| FR-11.1 | Support staff can look up a tenant by email through a separate internal console. | Must |
| FR-11.2 | Every support access records staff identity, timestamp, tenant, and reason. | Must |
| FR-11.3 | Support access requires explicit, time-boxed elevation. | Should |
| FR-11.4 | Operations staff can view health, error-rate, and job-queue status. | Should |

### 3.12 Billing and subscriptions

| ID | Requirement | Priority |
|---|---|---|
| FR-12.1 | Manual accounts, categories, transactions, bills, goals, and reports are free. | Must |
| FR-12.2 | Active subscription or trial access is required only for bank linking and Gross Balance. | Must |
| FR-12.3 | A PCI-compliant processor handles all card data. | Must |
| FR-12.4 | Subscriptions bill monthly and provide invoices or receipts. | Must |
| FR-12.5 | A configurable free trial is supported; 14 days is the default assumption. | Should |
| FR-12.6 | Failed payments follow processor retries, user notification, and a grace period. | Must |
| FR-12.7 | Users can view subscription status, next billing date, and billing history. | Must |
| FR-12.8 | Cancellation preserves access through the paid period, then returns the user to free access. | Must |
| FR-12.9 | Bank endpoints enforce live subscription state; manual endpoints are never gated. | Must |

### 3.13 Export and deletion

| ID | Requirement | Priority |
|---|---|---|
| FR-13.1 | Users can export tenant data as machine-readable JSON or CSV. | Must |
| FR-13.2 | Export requests are fulfilled within 30 days. | Must |
| FR-13.3 | Users can request full account deletion. | Must |

### 3.14 Read-only bank monitoring

| ID | Requirement | Priority |
|---|---|---|
| FR-14.1 | Users can link accounts across institutions for read-only balance and transaction monitoring. | Must |
| FR-14.2 | The platform never receives, stores, or requests online-banking credentials. | Must |
| FR-14.3 | Connections use balance/transaction read scopes only; payment and transfer scopes are prohibited. | Must |
| FR-14.4 | Gross Balance aggregates linked accounts in the user's preferred currency. | Must |
| FR-14.5 | Scheduled synchronization or provider webhooks update a read-only aggregated view. | Must |
| FR-14.6 | Linked-account views show institution, type, masked account number, balance, and recent transactions. | Must |
| FR-14.7 | Unlinking revokes provider access and purges cached transaction detail. | Must |
| FR-14.8 | Consent is re-requested when required; lapsed consent suspends synchronization. | Must |
| FR-14.9 | Linked data is clearly labeled monitoring-only. | Should |
| FR-14.10 | Direct regulated bank APIs are preferred; certified aggregators are fallback and disclosed. | Must |
| FR-14.11 | Bank data is not sold, licensed, shared, or used for unrelated purposes. | Must |
| FR-14.12 | Aggregators require a signed DPA prohibiting resale, secondary use, and indefinite retention. | Must |
| FR-14.13 | Account balances are converted using a reliable rate source refreshed at least daily. | Must |
| FR-14.14 | Views show native amounts, converted total, rate, and as-of timestamp. | Must |
| FR-14.15 | Converted totals are informational and not suitable for accounting or tax use. | Must |

## 4. API surface

The public API is versioned and should initially be exposed under `/api/v1`.

| Router | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `/login`, `/refresh`, `/verify-email`, `/forgot-password`, `/reset-password` |
| Profile | `GET/PUT /me`, `GET /me/export`, `DELETE /me` |
| Accounts | `GET/POST /accounts`, `GET/PUT/DELETE /accounts/{id}` |
| Categories | `GET/POST /categories`, `GET/PUT/DELETE /categories/{id}` |
| Transactions | `GET/POST /transactions`, `GET/PUT/DELETE /transactions/{id}`, `POST /transactions/import` |
| Bills | `GET/POST /recurring-bills`, `GET/PUT/DELETE /recurring-bills/{id}` |
| Goals | `GET/POST /savings-goals`, `GET/PUT/DELETE /savings-goals/{id}` |
| Reports | `GET /reports/spending-by-category`, `/income-vs-expense`, `/net-worth` |
| Subscription | `GET /subscription`, `POST /subscription/start`, `/cancel` |
| Bank links | `POST/GET /bank-links`, `GET /bank-links/gross-balance`, `DELETE /bank-links/{id}` |
| Internal webhooks | `POST /webhooks/payment-processor`, `POST /webhooks/aggregator` |
| Admin | `GET /admin/tenants/{email}`, `POST /admin/support-access-grant` |

All endpoints return a documented error envelope containing `code`, `message`,
optional `field_errors`, and optional `request_id`.

## 5. Data model and retention

Core entities are `Tenant`, `User`, `Account`, `Category`, `Transaction`,
`RecurringBill`, `SavingsGoal`, `RefreshToken`, `AuditLog`, `Notification`,
`Subscription`, `BillingRecord`, `BankLink`, `BankAccountSnapshot`, and
`EncryptedTokenVault`.

Requirements:

- Decimal database types are used for all money.
- Every tenant-scoped table has `tenant_id`, indexes, foreign keys, and RLS.
- Audit records never contain raw balances, transaction amounts, passwords, or tokens.
- Soft-deleted tenant data is retained for 30 days, then purged.
- Backups are encrypted and restoration is tested quarterly.
- Audit records are retained for at least one year.
- Billing records are retained independently according to applicable financial
  record-keeping requirements.
- Bank-link transaction detail is retained only while the link is active plus the
  applicable retention window; unlinking triggers purge.

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | Standard CRUD p95 latency is below 300 ms under nominal load. |
| NFR-2 | Reports respond within 1.5 seconds for five years of tenant history. |
| NFR-3 | Tenant-scoped indexes use `tenant_id` as a leading column. |
| NFR-4 | The API scales horizontally as stateless Gunicorn/Uvicorn workers. |
| NFR-5 | The system supports at least 50,000 tenants without architectural redesign. |
| NFR-6 | Passwords use bcrypt; JWT keys rotate; refresh tokens are revocable and hashed. |
| NFR-7 | Dependencies are vulnerability-scanned on every build. |
| NFR-8 | Target availability is 99.5%; daily backups provide RPO <= 24 hours and RTO <= 4 hours. |
| NFR-9 | All schema changes use reviewed Alembic migrations. |
| NFR-10 | Errors use a consistent documented schema and OpenAPI remains current. |
| NFR-11 | Logs are structured and tenant-tagged without sensitive financial values. |
| NFR-12 | Metrics expose latency, errors, queue depth, and database-pool health. |
| NFR-13 | Aggregator tokens use envelope encryption backed by managed KMS. |
| NFR-14 | Tokens are server-only and never returned to any client. |
| NFR-15 | Bank scopes exclude payment initiation, account opening, and unrelated identity scopes. |
| NFR-16 | Bank linking receives a dedicated security review and penetration test. |
| NFR-17 | FX providers receive only generic currency-pair and date queries. |
| NFR-18 | Cached FX rates refresh at least every 24 hours and expose their as-of timestamp. |

## 7. Testing and acceptance

The automated test suite must include:

- Unit tests for balance mutations, FX conversion, reports, goal progress, and bill
  scheduling.
- Integration tests for every endpoint, authentication failure, validation failure,
  and authorization path.
- Cross-tenant isolation tests for every tenant-scoped endpoint and report.
- Idempotency and concurrency tests for balance updates and recurring jobs.
- Subscription lifecycle tests covering trial, renewal, failure, grace, cancellation,
  and bank-endpoint gating.
- Bank-security tests proving read-only scopes, token confidentiality, consent,
  unlinking, purge, and tenant isolation.
- Load tests for NFR-1, NFR-2, and NFR-5.
- Dependency scanning and security testing in CI.

Launch acceptance requires:

1. All Must requirements are implemented and tested.
2. No known cross-tenant isolation defects exist.
3. Performance targets are verified in production-like staging.
4. No code path can initiate payment or funds transfer through bank integrations.
5. Legal, privacy, provider-risk, DPA, backup, rollback, and operational evidence is
   approved.

## 8. Release phases

1. Foundation, migrations, tenant context, and RLS.
2. Authentication, profile, deletion, export, and audit controls.
3. Free manual-finance workflows and reports.
4. Redis, worker jobs, notifications, observability, and backups.
5. Subscription billing and bank-endpoint entitlement checks.
6. Approved read-only bank monitoring and FX aggregation.
7. Support console, security assurance, performance testing, and production release.

Bank-linking implementation is blocked until provider risk assessment, read-only scope
approval, consent wording, DPA, privacy review, and dedicated security approval are
complete.

## 9. Launch blockers and open decisions

Launch is blocked by any isolation defect, plaintext bank token, missing legal terms,
unclear bank consent, unverified recovery process, critical vulnerability, or
payment-initiation capability.

The following decisions must be recorded before implementation commitment:

- Celery versus APScheduler.
- Email, payment, FX, and bank providers.
- Pricing, trial length, grace period, refund policy, and supported regions.
- Hosting, KMS, secrets manager, and observability stack.
- Named sponsor, product owner, security reviewer, QA reviewer, data owner, service
  owner, and release authority.

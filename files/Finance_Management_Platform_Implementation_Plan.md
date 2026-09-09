# Finance Management Platform - Implementation Plan

Status: Backend foundation implemented and smoke-validated; Gate 1/G0 intake remains open for release readiness  
Source: SRS Finance Management Platform v1.1 (implementation status update)  
Governance: KenAddme IT Links Project Management Framework v1.1 and Software Development and Engineering Framework v1.2

## Verified implementation evidence

The backend workstream has now been verified in local development:

- FastAPI app boots and responds on `http://localhost:8000`
- `GET /health` returns `{"status":"ok"}`
- `POST /auth/signup` creates a tenant plus user record
- `POST /auth/login` returns access and refresh tokens
- `GET /me` returns the authenticated user's profile
- Account, category, transaction, recurring bill, savings goal, and reports endpoints are live and tenant-scoped
- Cross-tenant isolation was smoke-tested and succeeded for a second tenant user
- Environment-based configuration has been hardened so the app refuses SQLite in `production` mode and requires an explicit database target
- Automated API validation passes for signup/login/profile, tenant-isolation, and recurring bill generation checks
- Recurring bill automation now creates due expense transactions and records tenant-scoped notifications for each generated bill
- Admin support access is implemented for tenant lookup by email and tenant summary inspection, with strict admin-only authorization
- Database-layer tenant isolation is prepared for PostgreSQL via tenant context binding and RLS policies for tenant-scoped tables

This implementation status reflects the verified build and should be treated as the current execution baseline until the next release gate is approved.

## Initial classification

- Project class: Class A - Strategic / High Risk (provisional)
- Software class: Class 3 - High (provisional)
- Rationale: public multi-tenant financial data, internet exposure, authentication,
  subscription billing, external bank-data connectivity, privacy obligations, and
  material reputational impact.
- Classifications remain provisional until the authorised Gate 1/G0 decision.

## Delivery sequence

### 1. Intake and foundation

Confirm the sponsor, delivery lead, technical owner, product owner, acceptance
authority, service owner, data owner, scope, exclusions, business case, legal
baseline, risk register, and measurable benefits. Resolve pricing, trial duration,
supported regions, currencies, email provider, payment processor, and bank-provider
decisions before implementation commitment.

### 2. Secure multi-tenant core

Create the Tenant model and add indexed `tenant_id` to every tenant-scoped table.
Implement application query scoping, PostgreSQL Row-Level Security, authenticated
request context, audit logging, and automated cross-tenant isolation tests.

Implement signup, email verification, bcrypt password hashing, JWT access tokens,
hashed revocable refresh tokens, password reset, rate limiting, profile, preferences,
soft deletion, and scheduled hard deletion.

### 3. Free manual finance product

Implement accounts, native currencies, categories, transactions, fixed-precision
amounts, balance reconciliation, historical exchange rates, recurring bills,
savings goals, reports, CSV import, and user data export.

Every endpoint must be tenant-scoped and every balance mutation must be covered by
unit, integration, and concurrency tests.

### 4. Jobs, notifications, and operations

Add Redis and a worker process. Implement idempotent recurring-bill generation,
notification delivery, export jobs, retries, dead-letter handling, structured logs,
health checks, metrics, error monitoring, and operational runbooks.

### 5. Subscription billing

Integrate a PCI-compliant payment processor. Implement trial, active, past-due,
grace-period, cancelled, renewal, invoice, webhook-signature, and billing-history
flows. Gate only bank-linking endpoints; manual tracking remains free.

### 6. Read-only bank monitoring

Treat bank connectivity as a separate high-risk workstream. Select direct regulated
bank APIs where available and certified aggregation only as fallback. Implement
explicit per-institution consent, read-only scopes, encrypted tenant-scoped token
storage, synchronization, unlink/revocation, re-consent, data minimisation, Gross
Balance conversion, audit records, provider risk assessment, and a signed DPA.

Payment initiation, transfers, and credential capture are permanently out of scope.

### 7. Verification and release

Complete requirements traceability, code review, CI checks, security and dependency
scans, performance testing, accessibility review, backup restoration testing,
penetration testing, rollback rehearsal, privacy/legal review, and staging acceptance.
Production requires recorded G4/Project Gate 4 approval and named release authority.

### 8. Benefits and improvement

After closure, track delivery flow, defect escape, availability, vulnerability age,
gate compliance, adoption, support demand, and financial sustainability. Complete the
Project Gate 7 benefits review and maintain the improvement backlog.

## Gate exit evidence

- Gate 1/G0: approved intake, sponsor, scope, classification, feasibility screen,
  initial risks, and decision record.
- Gate 2/G1: charter, requirements baseline, acceptance criteria, data classification,
  traceability, and authorisation.
- Gate 3/G2: architecture, threat/privacy assessment, delivery plan, test strategy,
  migration/rollback approach, and funded assurance effort.
- G3: reviewed code, reproducible build, automated test results, dependency inventory,
  known-defect list, and code-complete decision.
- Gate 4/G4: acceptance, security/privacy evidence, release package, deployment,
  rollback, backup/recovery, operational readiness, and release authorisation.
- G5/Gate 6: stable service, support handover, closure, data disposition, archive,
  lessons, and ownership transfer.
- Gate 7: measured outcomes, benefits evidence, remaining actions, and register update.

## Launch blockers

1. Any cross-tenant isolation defect.
2. Missing Terms of Service or Privacy Policy.
3. Unapproved bank-data processing, unclear consent, plaintext tokens, or payment scope.
4. Missing security review or bank-integration penetration test.
5. Unverified backups, rollback, recovery objectives, or production ownership.
6. Unresolved critical defects, vulnerabilities, or unlawful processing risk.

## Local development note

The configured XAMPP MySQL tracker database is for local governance tracking. The
production architecture specified by the SRS remains PostgreSQL with Row-Level
Security, Alembic migrations, Redis, managed secrets, and controlled deployment.

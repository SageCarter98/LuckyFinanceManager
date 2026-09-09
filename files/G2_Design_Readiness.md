# SDLC G2 — Design Readiness

Prepared 9 September 2026. Closes the remaining G2 evidence items not already
partially covered (items #104, #106, #108, #110, #113 already "In progress" from the
9 September backfill — this document extends, not replaces, that evidence).

## 1. Architecture description (item #106)

**Context view:** A single-origin React/TypeScript SPA (`frontend/`) talks to a
FastAPI backend (`backend/`) over HTTPS/JSON. The backend is the sole source of truth;
the frontend holds no durable state. A second, isolated in-memory session exists for
the staff support console (`adminSession`, `frontend/src/lib/adminAuth.tsx`), sharing
the same origin and codebase but never sharing a token with the consumer session.

**Component view:**
- Backend: FastAPI app (`backend/app/main.py`) → per-resource routers
  (`app/routers/{auth,accounts,categories,transactions,recurring_bills,savings_goals,
  reports,notifications,admin,portability}.py`) → SQLAlchemy models (`app/models.py`)
  → PostgreSQL, with Alembic-managed schema (`alembic/versions/`).
- Frontend: route-level pages (`src/pages/`) → shared primitives (`src/components/`)
  → per-resource API client modules (`src/lib/resources/*`) → two isolated
  request/session clients (`src/lib/api.ts`).

**Deployment view:** No deployment target exists yet — no Dockerfile, no CI/CD config,
no hosting decision recorded (still an open question, `G1_Requirements_Baseline_Supplement.md`
§4, item 4). This view is honestly incomplete, not fabricated.

**Data-flow view:** Client → HTTPS → FastAPI router → SQLAlchemy session (tenant-scoped
by `tenant_id` in application code) → PostgreSQL, with Postgres row-level security as a
second, independent enforcement layer (`alembic/versions/20260907_postgres_rls.py`).
Every tenant-scoped table carries `tenant_id`; RLS policies (`tenant_isolation_<table>`)
reject cross-tenant rows at the database layer even if application code had a bug.

This closes item #106 to Complete — all four required views now exist, three of them
(context, component, data-flow) grounded in real code, the fourth (deployment)
honestly marked as not yet decided rather than invented.

## 2. Architecture Decision Records (item #107)

Recorded retroactively — these decisions were already made in code before this
governance process existed; recording them now is honest documentation of what
happened, not a claim that a formal ADR process was followed at the time.

| ADR | Decision | Rejected/considered alternatives | Rationale |
|---|---|---|---|
| ADR-001 | FastAPI + PostgreSQL backend | Django, Node/Express | Async-friendly, strong typing via Pydantic, mature SQLAlchemy/Alembic ecosystem |
| ADR-002 | Tenant isolation via `tenant_id` column + Postgres RLS (defense in depth) | Schema-per-tenant, database-per-tenant | RLS gives a second, independent enforcement layer without the operational cost of per-tenant schemas/databases at current scale (NFR-5 targets 50,000 tenants on one schema) |
| ADR-003 | JWT access + refresh tokens, bcrypt password hashing | Session cookies with server-side session store | Stateless horizontal scaling (NFR-4); **however, see the threat-model finding below — the refresh-token half of this decision is currently unimplemented server-side, a real gap, not a rejected alternative** |
| ADR-004 | React + TypeScript + Vite frontend, Tailwind v4 with the "Stitch" design token system | Plain CSS, a different component library | Type safety, fast dev iteration; design tokens sourced from `_stitch_extracted/.../modern_financial_trust/DESIGN.md` |
| ADR-005 | In-memory-only token storage on the client, two isolated sessions (consumer/staff) | localStorage/sessionStorage tokens, shared session | Eliminates XSS-driven token theft via storage APIs; keeps staff and consumer privilege boundaries structurally separate |
| ADR-006 | No CI/CD, no version control at this stage | — | Not a considered decision, an acknowledged gap (risk R1/R2, `Gate1_G0_Intake_Record.md` §14) — listed here for completeness, not endorsed |

## 3. Threat model and privacy assessment (item #109)

**Assets:** tenant financial data (accounts, transactions, balances), user credentials
(password hashes, JWTs), and — once built — bank-aggregator tokens and payment data.

**Trust boundaries:** browser ↔ backend (HTTPS); backend ↔ database (network-internal,
assumed trusted); consumer session ↔ staff session (structurally separate, no shared
token — verified in code).

**Top threats and current mitigation status:**

| Threat | Mitigated? | Evidence |
|---|---|---|
| Cross-tenant data access via application bug | Mitigated (defense in depth) | Postgres RLS policies independently enforce tenant scoping even if app-layer scoping fails; cross-tenant isolation is one of the 4 automated backend tests (verified passing) |
| Credential theft via password storage | Mitigated | bcrypt hashing (`security.py`) |
| Token theft via browser storage (XSS) | Mitigated | In-memory-only tokens, confirmed via source scan (no `localStorage`/`sessionStorage` token use found) |
| **Session cannot actually refresh** | **Not mitigated — new finding, 9 Sep 2026** | `POST /auth/login` issues a refresh token (`security.py::create_refresh_token`); the frontend (`src/lib/api.ts`) attempts to redeem it against a refresh endpoint on 401; **no such backend endpoint exists** (confirmed: no `refresh` route in any router). Effect: every user is silently logged out on access-token expiry instead of refreshing, and a refresh token is issued and held in memory for a function that cannot work. This is a real functional and minor security gap (an unusable, non-revocable credential is issued unnecessarily) that predates this document and was not previously disclosed anywhere. |
| Refresh-token revocation | Not mitigated | No `RefreshToken` table exists (SRS §5 lists it as required, not built) — moot until the endpoint above exists, but recorded now so both are fixed together |
| Dependency vulnerabilities | Not mitigated | No dependency scanning exists (no CI at all — item #105/#111) |
| Secrets exposure | Partially mitigated | Only `.env.example` placeholders found in the repo; no real secret has been found committed, but there is also no secret-store/vault integration for when real secrets are introduced (risk R7) |
| Bank-token compromise (future) | N/A yet | Bank linking is unbuilt; NFR-13 (envelope encryption via KMS) is specified but not implementable until the feature exists |

**Privacy assessment:** personal financial data is Restricted per the data
classification in `G1_Requirements_Baseline_Supplement.md` §2. No systematic
monitoring, children's data, or automated decision-making occurs. A full privacy
impact assessment (per the SDLC Framework's own trigger for "high-risk processing")
has not been performed — recommended before Gate 4, and mandatory before any
bank-linking work per the FRS Implementation Plan's own blocking rule.

This is a genuine, if first-pass, threat model — not exhaustive, and explicitly not a
substitute for the independent security review this project cannot currently obtain
(role-separation gap, `Gate1_G0_Intake_Record.md` §10).

## 4. Test strategy, environment plan, migration approach, observability, support model, backup/rollback (item #111)

- **Test strategy:** per SRS §7 — unit, integration, cross-tenant, idempotency/concurrency,
  subscription-lifecycle, bank-security, and load-test categories are specified. Currently
  implemented: 4 backend integration/unit-style tests (signup/login, cross-tenant isolation,
  recurring-bill generation, admin lookup) — independently re-verified passing this session.
  Not implemented: everything else in the list, and zero frontend tests.
- **Environment plan:** not decided — no staging/production environment exists (open
  decision, `G1_Requirements_Baseline_Supplement.md` §4).
- **Migration approach:** real and working — Alembic-managed schema migrations exist
  (4 migration files), including a reviewed RLS migration.
- **Observability:** not implemented — NFR-11/NFR-12 (structured logs, latency/error
  metrics) are specified, nothing built.
- **Support model:** not established — no on-call, no incident process.
- **Backup/rollback:** NFR-8 specifies daily backups (RPO ≤24h, RTO ≤4h); none of this
  is implemented (no environment exists to back up).

This item stays **In progress**, not Complete — the parts that are real (test strategy
definition, migration approach) are genuinely solid; most of the rest is honestly absent.

## 5. Risky assumptions validated with controlled prototypes or spikes (item #112)

Two real, already-executed spikes qualify, both documented in
`files/FRS_Finance_Management_Platform_Implementation_Plan.md` §6:

1. **Tenant isolation under RLS** — validated by the cross-tenant isolation test
   (independently re-run this session, passing), confirming the risky assumption that
   RLS + application-layer scoping would correctly prevent cross-tenant access.
2. **CSV import correctness** — the implementation plan documents two real defects
   found and fixed during Increment 3 wiring (`Decimal`/`float` mismatch, raw-string
   date mismatch in `portability.py`), verified with a live import moving an account
   balance from 0.00 to 957.50. This is a genuine spike that surfaced and resolved a
   risky assumption about CSV parsing correctness, not a hypothetical.

No dedicated bank-linking spike exists yet — appropriate, since that work is blocked
pending provider/legal/security approval.

## 6. Assurance effort as a distinct delivery-plan line item (item #105)

**Not started.** No delivery-plan budget exists at all yet (Gate 2 condition, item #17,
due 2026-10-09) — an assurance-effort line item cannot be carved out of a budget that
doesn't exist. This item is blocked by the same open Gate 2 condition, not a new gap.

## 7. G2 decision (item #114)

To be recorded via `tracker_cli.py gate` once this document and the corresponding PM
Gate 3 delivery-plan document are reviewed — not asserted here in advance.

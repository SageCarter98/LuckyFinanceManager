# Gate 1 (PM) / G0 (SDLC) Intake Record — Finance Management Platform

Project register: FMP-2026-001
Prepared: 9 September 2026
Prepared by: Claude Code, at the direction of Freston Kenny Adedeme (Sponsor / Project Manager / Technical Lead / Service Owner / Release Authority)
Governance: KenAddme IT Links Project Management Framework v1.1 (PM Gate 1) and Software Development and Engineering Framework v1.2 (SDLC G0)

This record exists to close the outstanding Gate 1/G0 evidence items so a real Gate 1/G0
decision can be recorded, rather than recording a decision against an empty checklist.
Facts below are drawn from `files/Project_Summary_Finance_Management_Platform.md`,
`files/SRS_Finance_Management_Platform.md`, `files/FRS_Finance_Management_Platform_Implementation_Plan.md`,
`.kenaddme/project.json`, this session's tracker registration, and direct inspection of
`backend/` and `frontend/`. Sections marked **[SPONSOR TO CONFIRM]** need your input —
they are not filled with invented detail.

## 1. Project idea / intake record (PM Gate 1.01, SDLC G0.01)

**Problem or opportunity:** Individuals need a way to track income and expenses, set
category budgets, manage recurring bills, and work toward savings goals, with an
optional (subscription-gated) read-only connection to their real bank accounts for a
consolidated balance view.

**Proposed outcome:** A public, multi-tenant personal finance web platform where every
user's data is strictly isolated (tenant-scoped in application code and enforced again
at the database layer via Postgres row-level security), covering manual finance
tracking for free, with subscription-gated bank-linking as a paid tier.

**Beneficiaries:** Individual consumer users managing personal finances; the product
owner/sponsor as the commercial beneficiary of the subscription tier.

**Owner:** Freston Kenny Adedeme (sole sponsor, project manager, technical lead, service
owner and release authority — see Section 6 for the role-separation gap this creates).

**Urgency:** Not time-boxed by an external deadline. The project has already progressed
past ideation into substantial implementation (backend API with real persistence and
tenant isolation; a working React/TypeScript frontend against that API) — see Section 5
for the resulting process-sequencing gap this creates.

**Known constraints:**
- Solo/two-role effort: one person holds every named governance role.
- No formal budget baseline, procurement, or vendor relationships yet (no payment
  processor, bank-data aggregator, or email provider has been selected — see
  `files/FRS_Finance_Management_Platform_Implementation_Plan.md` Section 4).
- No version control system exists anywhere in the project (confirmed: no `.git` in
  the project root, `backend/`, or `frontend/`) — a real constraint on change history,
  peer review and rollback that predates and is independent of this intake record.
- Handles sensitive personal financial data and, in a planned future increment, live
  bank-account connections — carrying real legal/regulatory exposure (data protection,
  open-banking/PSD2-style consent rules) that is not yet a completed compliance review.

## 2. Current situation and evidence a problem/opportunity exists (PM Gate 1.02)

The product has moved from a single-user backend prototype (FastAPI + PostgreSQL) to a
redesigned public multi-tenant product, per `files/Project_Summary_Finance_Management_Platform.md`.
Concrete evidence the underlying need is real and being acted on:
- A working, tenant-isolated backend API exists with 8 real data models (Tenant, User,
  Account, Category, Transaction, RecurringBill, SavingsGoal, Notification) and 4
  Alembic migrations, including a dedicated Postgres row-level-security migration
  (`backend/alembic/versions/20260907_postgres_rls.py`).
- A working frontend exists against that real API (not a mockup) for manual finance
  workflows: accounts, categories, transactions with CSV import, recurring bills,
  savings goals, and reports — see the FRS Implementation Plan's Section 7 coverage
  matrix for the full, honest state of what's real versus not yet built.
- 4 automated backend tests exist and pass (`backend/tests/test_api.py`, independently
  re-run this session: 4 passed).

## 3. Affected users, clients, services and institutional goals (PM Gate 1.03)

Per `files/SRS_Finance_Management_Platform.md` Section 2.1 (User classes): individual
consumer end users (free-tier and subscribed), and platform staff via a separate support
console (implemented but not yet on an isolated origin — a disclosed FRS gap, tracked as
FR-11.3 in the implementation plan). No institutional/enterprise user class is in scope.

**Confirmed by sponsor (9 September 2026):** no stakeholders beyond the sponsor exist at
this time.

## 4. Expected outcome stated without assuming a solution too early (PM Gate 1.04)

Outcome: users can reliably track and understand their personal finances in one place,
with an optional, clearly-disclosed, subscription-gated bank read-only view layered on
top of a fully-functional free manual-tracking product. The specific technology choices
already made (FastAPI/PostgreSQL backend, React/TypeScript frontend, row-level-security
tenancy) are implementation decisions made during Increments 1-3, not premises of the
original opportunity statement — noted honestly rather than reframed as if they were
predetermined from intake.

## 5. Urgency, scale and project-vs-operations judgement (PM Gate 1.05, SDLC G0.06)

Not urgent against an external deadline. Scale: currently a solo effort, Class A/3
because of the sensitivity of the data and planned financial functionality, not because
of team size or budget. This is ongoing project work (active feature development), not
operations of an already-released service — no production release has occurred yet.

**Process-sequencing note (see item #91):** implementation work (backend and frontend
code) already substantially exists despite no Gate 1/G0 decision having been recorded
until this record. That is a real deviation from the framework's intended sequencing,
disclosed here and left recorded as "Not started" on item #91 rather than retroactively
marked compliant — the control it describes (no coding before the intake decision) was
not, in fact, observed.

## 6. Initial screening — legal, ethical, security, privacy, safety, financial, reputational (PM Gate 1.06)

Per `files/Project_Summary_Finance_Management_Platform.md` ("Security & Privacy Posture",
"Compliance & Legal Considerations") and `files/SRS_Finance_Management_Platform.md`
Section 6 (NFR-6, NFR-7, NFR-13–NFR-17):
- **Legal/regulatory:** handles personal financial data; data-protection law exposure
  (e.g. GDPR/CCPA-style obligations) and, once bank-linking ships, open-banking/PSD2-style
  consent and scope rules apply. No formal legal review has been performed yet — the FRS
  Implementation Plan explicitly blocks any bank-linking implementation until "provider
  risk, consent, security, privacy and legal evidence is approved."
- **Security:** bcrypt password hashing, JWT auth, and Postgres row-level security are
  implemented and verified in code. No independent security review or penetration test
  has been performed (NFR-16 requires one specifically for bank-linking, not yet done
  because bank-linking isn't built).
- **Ethical/safety:** no safety-critical function; financial-advice-style features are
  out of scope per the SRS.
- **Financial:** no committed spend, procurement or vendor contracts yet.
- **Reputational:** a data breach or incorrect balance/transaction display would carry
  real reputational risk given the finance domain — this is the primary driver of the
  Class A/3 classification (Section 8 below), not team size or budget.
- **Governance/role-separation:** disclosed in full in Section 8 — this is itself a
  screened concern, not an oversight.

## 7. Comparison against active commitments and resource capacity (PM Gate 1.07)

**[Observed, not asserted by the sponsor]**: the sponsor is concurrently active on at
least one other Class A initiative (a separate premium school management system
project) at the time of this record. This is a genuine capacity constraint for a
single-person governance structure and is recorded honestly rather than omitted —
it does not by itself block proceeding, but it is relevant context for how much
process ceremony is realistic to sustain versus how much is being deferred.

**Confirmed by sponsor (9 September 2026):** current capacity, split against the other
concurrent Class A initiative, is **not** confirmed adequate to sustain full Class A
cadence (weekly delivery review, status at least every two weeks). This is carried
forward as an explicit **condition** on the Gate 1 decision (Section 15/16), not treated
as resolved by this record.

## 8. Initial classification with reasons (PM Gate 1.08, SDLC G0 classification)

**PM Class A — Strategic / High Risk.** Per the PM Framework's own classification table
(Section 2): Class A characteristics include "sensitive or personal data" and "major
cybersecurity, legal ... or reputational risk." This project stores personal financial
transaction data for many tenants and plans a read-only bank-account integration —
squarely matching that description independent of team size, which is the framework's
stated basis for moving to a higher class ("A project moves to the higher class whenever
uncertainty exists or when one high-impact condition is present").

**SDLC Class 3 — High.** Per the SDLC Framework's classification table: Class 3 is
explicitly defined as "Public service, education, finance, identity, payments or
sensitive-data system" with "personal/sensitive data, internet exposure, significant
financial or reputational impact" — an exact match to this project's domain.

This matches the classification already recorded in `.kenaddme/project.json` on
4 September 2026 and carried into the tracker registration on 9 September 2026; this
record supplies the reasoning that file's own "provisional" note said was still missing.

## 9. Portfolio recommendation (PM Gate 1.09)

**Recommended: proceed to feasibility / delivery**, on the basis that substantial,
working, tested implementation already exists (Increments 1-3 per the FRS Implementation
Plan) and no disqualifying condition was found during screening (Section 6). This
recommendation does not by itself resolve the outstanding evidence items for Gates 2
onward, or the role-separation gap in Section 10 below.

**Confirmed by sponsor (9 September 2026):** recommendation accepted — proceed to
feasibility/delivery.

## 10. Role-separation gap — disclosed, not resolved (PM Framework §3.3; SDLC Framework role-separation clause)

The PM Framework requires that for Class A projects "the sponsor and final acceptance
authority must be different people," with Class A compensating arrangements requiring
Executive Authority approval (§3.3). The SDLC Framework similarly requires that "no
individual should be the sole author, reviewer, tester and release approver for a
Class 3 or Class 4 production release," with the same compensating-review requirement.

On this project, every named role (sponsor, project manager, technical lead, service
owner, release authority) is held by Freston Kenny Adedeme. Per the PM Framework §3.4,
Freston Kenny Adedeme is also the Executive Authority who would ordinarily approve the
compensating arrangement for this exact gap — so no independent party currently exists
to approve it.

This record does **not** resolve that gap. It is disclosed here as an open governance
condition of proceeding at Class A/3 as a solo effort, to be revisited explicitly before
Gate 3/G2 design readiness and, at the latest, before any Gate 4/G4 release decision —
not silently carried forward as if compliant.

## 11. Preliminary business case / feasibility note (SDLC G0.02)

- **Technical feasibility:** demonstrated — a working multi-tenant API and frontend
  already exist and pass their available automated tests.
- **Economic feasibility:** no cost baseline exists yet; no payment processor is
  selected; no pricing has been finalized (open decision per the FRS Implementation
  Plan Section 4). **Not assessed** beyond that.
- **Operational feasibility:** no production deployment, hosting, or on-call
  arrangement exists yet.
- **Schedule feasibility:** no target date is committed.
- **Legal/data/security feasibility:** see Section 6 — screened, not yet formally
  reviewed.
- **Resource feasibility:** see Section 7 — solo effort, competing commitment noted.

This is an honest, lightweight feasibility note, not a full business case — a full
business case is not evidenced anywhere in the project and this record does not invent
one.

## 12. Alternatives considered (SDLC G0.03)

**Sponsor's account (9 September 2026), recorded verbatim rather than reconstructed:**
no formal alternatives comparison was performed. The project began as a minor personal
tool the sponsor built for their own use, and was subsequently widened into a
general-use, public multi-tenant product. No off-the-shelf or white-label alternative
was evaluated against custom development at any point.

## 13. Discovery effort and authority to proceed (SDLC G0.04)

**Confirmed by sponsor (9 September 2026):** effort has been informal — no tracked
estimate exists. Authority to proceed is obtained explicitly via this record and the
sponsor's direction to record the Gate 1/G0 decision.

## 14. Initial scope, stakeholder list, risk class and risk register (PM Gate 1 / SDLC G0.87)

**Scope (initial):** free manual personal-finance tracking (accounts, categories,
transactions, recurring bills, savings goals, reports) plus a subscription-gated,
read-only bank-linking tier — per `files/SRS_Finance_Management_Platform.md` Section 3.

**Stakeholder list:** Freston Kenny Adedeme (all governance roles). See Section 3 for
the confirmation request on any others.

**Risk class:** SDLC Class 3 / PM Class A (Section 8).

**Initial risk register** (drawn from directly observed facts this session, not
speculation):

| # | Risk | Evidence | Impact if realized |
|---|---|---|---|
| R1 | No version control anywhere in the project | Confirmed: no `.git` in root, `backend/`, or `frontend/` | No change history, no reviewable diffs, no rollback path, no branch-based review |
| R2 | No CI/automated build pipeline | No `.github/workflows` or equivalent found | Regressions can reach the working tree undetected between manual test runs |
| R3 | No frontend test coverage | `frontend/package.json` has no test script; zero `*.test.*`/`*.spec.*` files under `frontend/src` | Frontend regressions have no automated safety net |
| R4 | Single point of failure (bus factor of 1) | All governance roles held by one person; confirmed concurrent commitment to another Class A project | Any unavailability stalls the project entirely; no independent reviewer exists today |
| R5 | Role-separation / self-approval structural gap | Section 10 above | Gate approvals at Class A cannot currently meet the framework's own independence requirement without a compensating-review mechanism this project doesn't yet have |
| R6 | Regulatory/compliance exposure not yet reviewed | No legal/security review evidenced; bank-linking explicitly blocked pending it (FRS Implementation Plan §4) | Non-compliant launch of bank-linking, or of the platform generally, if shipped before review |
| R7 | No secrets-management tooling | Only `.env.example` placeholder files found; no vault/KMS integration | Real secrets, once introduced, have no approved storage mechanism yet |
| R8 | Bank-linking consent/authorization flow not yet designed | Sponsor (9 Sep 2026): the intended model is that the **user authorizes the connection directly with the bank itself**, with the bank performing its own identity verification and approval, and the platform only ever receiving a read-only reference — not app-mediated credential capture | If implemented incorrectly (e.g. app-mediated credentials instead of bank-hosted consent), this would breach NFR-14/NFR-15/NFR-16 and the FRS's own read-only-banking non-negotiables; this is exactly why Increment 5 is already blocked pending provider/legal/security approval |
| R9 | Capacity split against a second concurrent Class A initiative | Sponsor (9 Sep 2026), Section 7 | Sustained Class A cadence (weekly review, biweekly status) may not be realistic without an explicit, approved adjustment |

## 16. Gate 1 / G0 decision

Recorded via `tracker_cli.py gate` immediately after this record was finalized. See the
tracker's own gate-decision record (PM Gate 1, SDLC G0) for the authoritative
decision, date, authority and conditions text — not duplicated here to avoid the two
copies drifting apart.

## 15. G0 decision record placeholder (SDLC G0.90) and Gate 1 decision record (PM Gate 1.10)

To be completed by the actual `tracker_cli.py gate` command once this record is
reviewed and the sponsor decides how to proceed (Approve / Approve with conditions /
Hold) — not asserted here in advance of that decision.

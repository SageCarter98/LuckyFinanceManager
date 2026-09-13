# Business Case — Finance Management Platform

Prepared 13 September 2026, at the direction of and authorised by Freston Kenny
Adedeme (Sponsor / Project Manager / Technical Lead / Service Owner / Release
Authority — the sole role-holder for this project; see
`Gate1_G0_Intake_Record.md` §10 for the disclosed role-separation gap this
creates, unchanged by this document).

This supersedes the interim status recorded in `Gate1_G0_Intake_Record.md`
§11 ("This is an honest, lightweight feasibility note, not a full business
case") now that the cost/schedule inputs blocking a full case (tracker item
#17) have been produced — see §4 below. It does not re-litigate feasibility,
alternatives, scope or risk, which are unchanged since Gate 1/Gate 2 and are
referenced, not restated.

## 1. Problem / opportunity

Unchanged from `Gate1_G0_Intake_Record.md` §1 and
`Project_Charter_Finance_Management_Platform.md`: individuals need a way to
track income and expenses, manage recurring bills and savings goals, and
optionally connect real bank accounts (read-only) for a consolidated view —
with strict per-tenant data isolation. The project began as a personal tool
the sponsor built for their own use and was subsequently widened into a
general-use, public, multi-tenant product (`Gate1_G0_Intake_Record.md` §12).

## 2. Options considered

Reusing `Gate1_G0_Intake_Record.md` §12 rather than restating it: the
sponsor's own account is that no formal alternatives comparison was
performed at intake. For this business case, the three realistic options as
of 13 September 2026 are:

| Option | Assessment |
|---|---|
| **Do nothing** (stop development) | Discards ~5 calendar days of solo implementation work already delivered (backend API, frontend, RLS security layer, Stripe billing, admin console, CI, test suites — see §4). No cost, no benefit. Rejected: the sponsor is actively continuing development (21 commits through today), making this option moot rather than live. |
| **Buy / adopt an off-the-shelf personal finance platform (white-label or API-first) instead of continuing custom build** | Not evaluated in depth — no vendor comparison exists in any project document. Qualitatively: off-the-shelf platforms rarely expose the specific combination this project targets (free manual tracking + subscription-gated *read-only* bank linking with no payment-initiation capability, a deliberate scope exclusion per the Charter). Custom build is also already ~80% through Increments 1-4 of 6 (see FRS Implementation Plan §6), so switching now would strand that investment. |
| **Build (continue custom development)** — **recommended** | Continue the current path: finish Increment 6 hardening, keep Increment 5 (bank linking) gated behind its legal/provider approvals. Lowest incremental cost (sunk technical investment already exists, tooling is largely free/self-hosted), and the only option consistent with work already in progress. |

No partner/white-label integration option was identified as realistic given
the read-only-only bank-linking constraint (Charter, Scope and exclusions
row) — most banking-data partners are structured around broader
data-sharing or payment-initiation scopes than this project intends to use.

**Recommendation: Build (continue).**

## 3. Benefits

- **Direct/commercial:** subscription revenue at the price point already
  configured in code (`backend/.env.example`: `STRIPE_PLAN_AMOUNT_CENTS=999`,
  i.e. **$9.99/month**, with a 14-day trial, `STRIPE_TRIAL_DAYS=14`). No
  revenue has been realised yet — Stripe is wired in test mode only, no live
  key is configured (`STRIPE_SECRET_KEY` empty in `.env.example`).
- **Product/personal:** working, self-controlled personal finance tooling for
  the sponsor's own use, which was the project's original motivation
  (`Gate1_G0_Intake_Record.md` §12).
- **Non-financial:** a live, tested, multi-tenant SaaS build (RLS-verified
  tenant isolation, CI-gated test suite, admin support tooling) with
  reusable evidentiary value regardless of commercial outcome.

No adoption, conversion, or reliability targets are recorded anywhere in the
project as of this writing, and none are invented here — this remains a real
gap (tracker item #22) distinct from the cost/schedule figures this document
closes, and is not resolved by this business case.

## 4. Cost, duration and resource estimate (closes tracker item #17)

No cost-tracking or timesheet exists for this project (solo effort, no
payroll). The ranges below are derived from observable project facts, not
invented, and are explicitly ranges rather than point estimates per PM
Framework §166 guidance for high-uncertainty items. **Authorised as the
project's baseline by the Sponsor/Project Authority (Freston Kenny Adedeme)
on 13 September 2026, directing this document's production.**

### 4.1 Effort and duration to date

- **Observed:** 21 commits across 5 calendar days (9-13 September 2026),
  single contributor, spanning backend API, database/RLS security layer,
  frontend (consumer + isolated admin build), Stripe subscription/billing,
  CI pipeline (test + RLS-verification + dependency/secret scanning jobs),
  a 71-case frontend test suite, a 4-spec Playwright E2E suite, WCAG 2.1 AA
  accessibility pass, internationalisation readiness, and this session's
  governance documentation.
- **Estimated effort:** approximately **25-45 person-hours** invested to
  date. This is inferred from commit density and delivered scope, not
  measured — no time-tracking tool is in use, so this range should be read
  as a planning estimate, not a verified figure.

### 4.2 Remaining duration and effort estimate

- **Increment 6 hardening** (formal regression suite, performance/browser
  checks, dependency CVE remediation already identified — starlette/fastapi
  and pytest major-version bumps, `ecdsa` residual risk — production hosting
  decision and deployment, rollback/operational handover, G4 evidence
  assembly): estimated **2-4 additional calendar weeks** at the observed
  solo pace, roughly **15-30 further person-hours**.
- **Increment 5 (read-only bank linking):** **not estimated** — explicitly
  blocked on provider selection, DPA, consent design and legal/security
  approval that do not yet exist (FRS Implementation Plan §2, Workstream F).
  Duration is dependent on an external provider's onboarding process and
  legal review, which realistically could range from several weeks to
  several months once started. Flagged as **genuinely unknown**, not
  estimated with a false range, consistent with this governance process's
  standing rule against invented figures.

### 4.3 Cost estimate

- **To date:** **$0** direct third-party spend. Development has used
  self-hosted local infrastructure (local Postgres, local MySQL for
  governance tracking) and Stripe in test mode only (no live transactions,
  no live key configured).
- **Ongoing, once launched (planning assumption, not a quote):**
  - *Hosting:* no hosting provider or architecture has been selected yet
    (open decision, tracker item #113 / Charter "Software framework
    alignment" row). A typical managed Postgres + application hosting setup
    for a low-traffic multi-tenant SaaS of this shape commonly runs
    **$20-150/month**. This is an industry-typical planning range, not a
    vendor quote, and must be revisited once the hosting decision is made.
  - *Payment processing:* Stripe's standard published rate, **2.9% + $0.30
    per successful transaction** — a public, non-negotiated industry rate,
    not project-specific — applies once the $9.99/month subscription goes
    live.
  - No other paid third-party service is wired into the codebase today (no
    email/SMS provider, cloud storage, or monitoring SaaS), so no further
    recurring cost line exists to estimate.
- **Sponsor's own time:** not monetised in this document. No hourly rate or
  opportunity-cost basis is recorded anywhere in the project; converting the
  person-hour ranges above into a dollar figure would require the sponsor to
  supply that rate, which this document does not invent.

## 5. Recommendation

Continue the build (Option: Build, §2). Baseline the ranges in §4 as this
project's Gate 2/Gate 3 cost-duration-resource evidence. Treat §4.2's
Increment 5 uncertainty as a standing planning risk (already reflected in
the risk register, `Gate1_G0_Intake_Record.md` §14) rather than a blocker to
proceeding with Increment 6 work in the meantime.

## Approval

Authorised by Freston Kenny Adedeme, acting as Sponsor and Project Authority
(Class A), 13 September 2026 — see the tracker's own Gate 2/Gate 3 decision
records for the formal gate decisions this business case feeds, which remain
separate actions from this document.

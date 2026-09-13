# Appendix F — Release-Readiness Checklist

Finance Management Platform (PM Class A / SDLC Class 3). Prepared
2026-09-13, mapping each row of `KenAddme_SDLC_Framework_v1.2.md`
Appendix F to this project's SDLC G4 / PM Gate 4 tracker evidence
(items #40-51, #128-148), to advance tracker item #145. This is the
**"prep" phase of G4 readiness**, not an authorisation to deploy — see
§2 for what is explicitly not ready and why.

## 1. Readiness by area

| Area | Readiness test | Evidence owner | Status |
| --- | --- | --- | --- |
| Scope | Release contents match authorised work items and release notes | Product owner (Freston) | **Ready** — `files/Release_Package_Notes.md` |
| Requirements | Acceptance criteria and traceability are complete | Product owner / QA | **Ready** — `files/FRS_Finance_Management_Platform_Implementation_Plan.md` §7 (item #99) |
| Code | Protected merge, peer review and build identification are complete | Technical lead (Freston) | **Partial** — branch protection + CI in place (#117/#120), real peer review now exercised (PR #1, #2 merged, Milton's review verified `APPROVED`), but the release build's own defect fix (PR #4) isn't merged yet, and #117's `enforce_admins=false` gap (Defect Register G7) is still open |
| Tests | Required tests pass; defects are within approved release criteria | QA lead (Freston) | **Partial** — `files/Release_Readiness_Test_Plan.md`: backend/frontend/RLS suites all green this session; E2E not re-run (disclosed reason); one Critical(S1) defect (D4) fixed but unmerged |
| Security/privacy | Required scans/reviews pass; residual risks are accepted | Security/privacy reviewer (Milton, per compensating assurance) | **Partial** — `Security_Design.md`/`Privacy_Impact_Assessment.md` current as of this session, but **not yet reviewed by Milton** (his scope names exactly these files) — no critical-scope PR through him has landed yet except the pending auth fix |
| Dependencies | Components, licences, vulnerabilities and supplier status are acceptable | Technical lead | **Ready, standing check** — CI `pip-audit`/`pip-licenses`/`npm audit` (item #122); no known unresolved CVE this session |
| Data | Migration, validation, backup and rollback are tested | Data/service owner (Freston) | **Partial** — rollback mechanic verified end-to-end against real Postgres (`Transition_Support_Rollback_Closure.md` §4); backup is a **defined plan, not an operating control** (Render PITR requires a paid plan not yet provisioned) — correct for this planning stage, not sufficient for an actual go-live |
| Operations | Monitoring, alerting, capacity, support and runbooks are ready | Service owner (Freston) | **Not ready** — support model and runbook are documented (`Transition_Support_Rollback_Closure.md`), but no monitoring/alerting service is chosen or configured; nothing exists to monitor since nothing is deployed |
| Deployment | Implementation, verification, communication and rollback plans are approved | Release authority (Milton, delegated 2026-09-13 — `Compensating_Assurance_Role_Separation.md` §6) | **Not ready** — plans exist in draft (`Hosting_Decision...md`, `Transition_Support...md`) but are **not yet formally approved by anyone**. Release authority is now named (#146), closing that specific role-separation gap, but his actual approval of these plans hasn't happened — naming who decides isn't the same as the decision |
| Approval | G4 release authorisation is recorded | Authorised approvers | **Not started** — #148 is a gate decision; cannot be recorded by this document or its author |

## 2. What is explicitly blocking an actual deployment right now

These are not paperwork gaps — each needs a decision or resource only
Freston can provide, consistent with this project's own rule that a
gate decision is never something an agent records on anyone's behalf:

1. ~~Release authority (#146)~~ **Resolved 2026-09-13**: Freston (Executive
   Sponsor) formally delegated Release Authority to Milton
   (`Compensating_Assurance_Role_Separation.md` §6). Milton's actual
   acknowledgment is still pending — evidenced by his review on the PR
   carrying that document, not assumed from the appointment alone.
2. **PR #4 must merge** (fixes D4, the critical auth defect) before
   #135 ("no open S1 defect") is genuinely satisfied.
3. **Real infrastructure decisions**, none of which this document can
   make: a funded Render account (Postgres PITR needs a paid plan), a
   domain, a monitoring/alerting service, and the FR-11.3 two-origin
   split for the staff console (Defect Register G6) actually being
   wired up in hosting.
4. **Live Stripe keys**, or an explicit decision to launch without
   payment processing enabled and add it later — `STRIPE_SECRET_KEY`
   etc. are blank in `.env.example` today.
5. **The Stripe DPA review** (Defect Register G2) — a legal review, not
   a code or infrastructure task, and the one disclosed gap that should
   specifically block accepting real payments even if everything else
   is ready.
6. **G4 and Gate 4 decisions themselves (#51, #148)** — named-authority
   sign-off, the same boundary as every other gate decision this
   project has hit.

## 3. What this document does and does not close

- Advances #145 (this checklist exists and is honest about gaps) and
  the underlying #128-140ish it summarizes, per each area's own status
  above.
- Does **not** close #146, #147, #148, or #51 — those need Freston's
  (and likely Milton's) direct decisions, not more documentation.
- Does **not** constitute deployment authorisation. Nothing in this
  package should be read as "ready to deploy" — it is "ready to have
  the deployment conversation," which is what was actually asked for
  this round.

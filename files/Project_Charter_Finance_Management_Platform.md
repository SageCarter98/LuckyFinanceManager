# Project Charter — Finance Management Platform

Following PM Framework v1.1 Appendix B exactly. Prepared 9 September 2026, building on
`files/Gate1_G0_Intake_Record.md` (Gate 1, approved with conditions 9 Sep 2026) rather
than restating it — cross-referenced where content is identical. **Amended 13 September
2026** at the Sponsor/Project Authority's direction to close the two rows previously
marked `[SPONSOR TO CONFIRM]` (schedule/budget; item #17) once
`Business_Case_Finance_Management_Platform.md` produced the ranges backing them; the
remaining `[SPONSOR TO CONFIRM]` (benefits measures) is unchanged — no basis exists yet
for adoption/conversion/reliability targets and none is invented here.

| Charter field | Content |
|---|---|
| **Project title and ID** | Finance Management Platform — FMP-2026-001 |
| **Sponsor and project manager** | Freston Kenny Adedeme holds both roles (and technical lead, service owner, release authority) — role-separation gap disclosed in full in `Gate1_G0_Intake_Record.md` §10 and not resolved by this charter |
| **Problem / opportunity** | See `Gate1_G0_Intake_Record.md` §1-2 |
| **Purpose and objectives** | A public, multi-tenant personal finance platform: free manual finance tracking for all users, with a subscription-gated, read-only bank-linking tier. Tenant data isolation enforced in application code and again at the database layer (Postgres RLS). |
| **Scope and exclusions** | **In scope**: accounts, categories, transactions (incl. CSV import), recurring bills, savings goals, reports, notifications, data export, a staff support console, subscription/billing, read-only bank linking. **Explicitly excluded**: any payment-initiation or funds-transfer capability through bank integrations (SRS §7, launch-acceptance criterion 4); financial-advice features (SRS §1). |
| **Key deliverables** | Working backend API + frontend for all FRS-in-scope surfaces (FRS Implementation Plan §7 coverage matrix is the controlling list); component/contract/E2E/security/accessibility test evidence; an isolated support console on its own origin; approved read-only banking integration. |
| **Success and acceptance criteria** | Per SRS §7 "Testing and acceptance": all Must requirements implemented and tested; no known cross-tenant isolation defects; performance targets verified in staging; no payment/transfer code path exists; legal/privacy/provider-risk/DPA/backup/rollback/operational evidence approved before launch. |
| **Stakeholders and users** | Individual consumer end users (free and subscribed); platform staff (support console); sponsor as sole named stakeholder role-holder (`Gate1_G0_Intake_Record.md` §3, confirmed no others exist) |
| **High-level schedule and budget** | **Baselined 13 September 2026** (Sponsor/Project Authority direction; see `Business_Case_Finance_Management_Platform.md` §4 for full derivation, not restated here): to-date effort ~25-45 person-hours over 5 calendar days (21 commits, solo); remaining Increment 6 hardening estimated at 2-4 further calendar weeks (~15-30 person-hours); Increment 5 (bank linking) explicitly **not estimated** pending legal/provider approvals — a genuine unknown, not a guessed range. Cost to date $0 direct spend; ongoing cost once launched is planning-level only (hosting $20-150/month typical range, pending an unmade hosting decision; Stripe's standard 2.9%+$0.30/transaction once live) — see Business Case §4.3. |
| **Software framework alignment** | SDLC Class 3 — High (rationale: `Gate1_G0_Intake_Record.md` §8). Aligned G0-G6 checkpoints per Appendix I: G0 (done, approved with conditions), G1 in progress (this record), G2 design readiness, G3 code complete, G4 release readiness, G5 operational acceptance, G6 retirement. **Hosting decision (2026-09-13):** Render recommended -- see `Hosting_Decision_Finance_Management_Platform.md` -- ~$13/month, satisfies the FR-11.3 two-origin split at no extra cost. Recommendation only: no account created, nothing deployed yet. |
| **Risks, assumptions, constraints** | Risk register R1-R9 in `Gate1_G0_Intake_Record.md` §14, carried forward unchanged (version control, CI, test coverage, bus factor, role separation, regulatory exposure, secrets management, bank-consent design, dual-project capacity). Assumption: the project continues as a solo effort unless the capacity condition from the Gate 1 decision changes that. |
| **Governance and tolerances** | Class A defaults per PM Framework §2: cost/schedule tolerance ±5% of any approved baseline (none exists yet, so this is not yet an operative control); zero tolerance for reduced acceptance criteria, unapproved material scope change, unresolved critical defects, unlawful processing, or unaccepted critical risk. **Role separation**: not met (§3.3) — disclosed as an open condition, not resolved by this charter. **Change authority**: sponsor, pending the role-separation question. **Reporting/escalation**: not yet formally established — carried as part of the Gate 1 capacity condition (due 2026-10-09). |
| **Benefits ownership and funding** | Operational owner: Freston Kenny Adedeme. Measures: **defined and mostly targeted, 2026-09-13** — see `Benefits_Register.md`. Adoption: Sponsor-set target of 100-1,000 registered accounts within 12 months of production launch, reflecting organic growth with no paid-acquisition budget. Activation and free-to-paid conversion carry defensible suggested defaults (a 40% habitual-use bar; the sourced 2-5% freemium-conversion floor), open to override. Reliability: a conventional 99% monthly floor, open to override. Retention is the one measure deliberately left open — the sourced industry benchmark range (5-25% D30 depending on definition) was too wide to responsibly default, and no Sponsor figure has been set. Default Gate 7 date per PM Framework Class A table: 6 months after Gate 6 (interim review at 3 months), once Gate 6 is reached — not yet applicable. Protected review effort: 2 person-days plus measurement cost, per the same table, now included in the Business Case's assurance-effort line (item #105). |
| **Approval** | Not recorded by this document — see the tracker's own Gate 2 decision record once made. |

### Charter Approval Statement

Per the framework's own required text: *"By approving this charter, the sponsor
authorises detailed planning within the stated boundaries. Approval does not authorise
uncontrolled changes, commitments beyond delegated limits, release without required
evidence, or bypass of security, privacy, quality, financial and contractual controls."*

## Feasibility, alternatives, cost/duration/resource estimates (items #14, #15, #17)

**Feasibility** and **alternatives** are not restated here — see
`Gate1_G0_Intake_Record.md` §11-12, which already cover these at Gate 1 depth. Gate 2
does not require a second, independent feasibility pass when nothing material has
changed since Gate 1 was approved (9 September 2026, same day as this charter).

**Cost, duration, resource demand and expected benefits (item #17)**: resolved
13 September 2026 — see `Business_Case_Finance_Management_Platform.md` §4 for the
full derivation (effort-to-date and remaining-effort ranges, cost ranges, and the
explicit, deliberate non-estimate for Increment 5/bank-linking). Summary only, not
restated in full: ~25-45 person-hours invested to date; ~15-30 further person-hours
(2-4 calendar weeks) estimated for remaining Increment 6 hardening; Increment 5
duration is genuinely unknown pending external legal/provider approvals, not guessed.
$0 direct spend to date; ongoing cost is planning-level pending the still-open hosting
decision (Charter "Software framework alignment" row; tracker item #113).

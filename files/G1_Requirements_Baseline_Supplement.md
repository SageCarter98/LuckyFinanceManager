# SDLC G1 — Requirements Baseline Supplement

Companion to `files/SRS_Finance_Management_Platform.md` v1.1. Closes the G1 evidence
items not already satisfied by the SRS/FRS/FRS-Implementation-Plan documents
(items #92-94, #96, #98, #99, already Complete). Prepared 9 September 2026.

## 1. User journeys / use cases (item #95)

Derived directly from the SRS Section 3 functional requirements and the FRS
Implementation Plan's Section 8 route inventory — not new requirements, a
journey-level restatement of what's already specified there.

| Journey | Steps | SRS/FRS reference |
|---|---|---|
| New user onboarding | Sign up → verify email (blocked: no backend support yet) → choose display currency → create starter categories → land on dashboard | SRS 3.1, 3.3; FRS FE-1, FE-3 |
| Returning user login | Log in → session restored in memory only → return-route to last screen | SRS 3.2; FRS FE-2 |
| Manual transaction entry | Select account → enter transaction → category assigned → balance updates → confirmation | SRS 3.6; FRS FE-6 |
| Bulk transaction import | Upload CSV → server validates rows → import result (success/partial-failure) → balances update | SRS 3.6; FRS FE-6; implementation-plan Increment 3 |
| Recurring bill lifecycle | Create bill schedule → `generate-due` runs → transaction + notification created | SRS 3.7, 3.10; FRS FE-7, FE-10 |
| Savings goal tracking | Create goal → contributions tracked via transactions → progress derived and displayed | SRS 3.8; FRS FE-8 |
| Spending review | Open reports → select report type → view spending-by-category / income-vs-expense / net-worth, with mixed-currency disclosure where applicable | SRS 3.9; FRS FE-9 |
| Data export | Request export → async job → download when ready | SRS 3.13; FRS FE-13; implemented as synchronous `GET /me/export` today, not yet the asynchronous job the FRS describes — gap already disclosed in the FRS Implementation Plan §7 |
| Account deletion | Request deletion → typed confirmation → disclosure of recovery window and billing retention | SRS 3.13; FRS FE-13 — **not implemented**, no backend endpoint exists (disclosed gap) |
| Bank linking (future, blocked) | Select institution → redirect to bank-hosted consent → user authorizes directly with the bank → bank approves per its own verification → read-only reference returned to platform → linked account appears with Gross Balance, last-sync, and re-authorization/unlink controls | SRS 3.14; FRS FE-14; Gate1_G0_Intake_Record.md §14 R8 — blocked pending provider/legal/security approval, not yet built |
| Staff support lookup | Staff logs into isolated console session → reason-captured, time-boxed tenant lookup → masked minimal-necessary display | SRS 3.11; FRS FE-11 — implemented but not yet on a separate origin (disclosed FR-11.3 gap) |

This is a restatement of already-approved requirements into journey form, not a new
requirements source — it does not by itself resolve the FRS's own disclosed gaps
(email verification, async export, account deletion, bank linking, separate admin
origin), which remain tracked in the FRS Implementation Plan's own coverage matrix.

## 2. Data inventory and classification (item #97)

Applying the SDLC Framework's own four-tier classification (Public / Internal /
Confidential / Restricted — the framework's data-classification table) to the entity
list already documented in `SRS_Finance_Management_Platform.md` Section 5:

| Entity | Classification | Basis |
|---|---|---|
| Tenant, User | Restricted | Contains personal identity data |
| Account, Transaction, RecurringBill, SavingsGoal | Restricted | "Financial/identity records" per the SDLC Framework's own Restricted definition |
| BankLink, BankAccountSnapshot, EncryptedTokenVault | Restricted | Sensitive personal data plus, for the token vault, credential-equivalent material — not yet built, classification recorded ahead of implementation |
| Category, Notification | Internal | Operational metadata, not directly financial or identifying on its own |
| RefreshToken | Restricted | Session-equivalent credential material per SDLC Framework's Restricted definition ("passwords/keys") |
| AuditLog | Confidential | Internal operational record; explicitly required by SRS §5 to exclude raw balances, amounts, passwords or tokens |
| Subscription, BillingRecord | Restricted | Financial/billing records |
| Source code, this and other project documents | Confidential | Per the SDLC Framework's own Confidential definition ("source code, contracts, non-public designs") |

This table exists ahead of several of these entities being implemented (RefreshToken,
AuditLog, Subscription, BillingRecord, BankLink, BankAccountSnapshot,
EncryptedTokenVault are all specified in the SRS but not yet built, per the FRS
Implementation Plan's own disclosures) — classification is recorded now so it governs
implementation when built, not retrofitted afterward.

## 3. Requirement quality review (item #101)

Sampled the SRS's numbered requirements (FR/NFR/FE series) against the framework's
clear/atomic/feasible/testable/traceable/consistent/controlled criteria:

- **Traceable**: strong — every requirement is numbered (FR-x.x, NFR-x, FE-x.x) and the
  FRS Implementation Plan's §7 matrix links FE-numbers to implementation surfaces and
  exit evidence.
- **Testable**: strong for NFRs (each has a measurable threshold, e.g. NFR-1's 300ms
  p95) and functional requirements tied to concrete CRUD/endpoint behavior.
- **Controlled**: weak — the SRS document itself is still "Draft for review" (item
  #100); nothing has been formally baselined under change control yet.
- **Consistent**: one real inconsistency found and worth flagging: SRS §5 lists
  `RefreshToken` as a required entity, but the FRS Implementation Plan's Increment 2
  notes state "token refresh... [is] not built, because the backend does not implement
  them" — this is not a defect in the requirements themselves, just confirmation that
  requirements currently outrun implementation, which is expected at G1 and already
  disclosed elsewhere.
- **Atomic/feasible**: no violations found in this sampling pass; a full line-by-line
  audit was not performed and this is not claimed to be exhaustive.

This constitutes a genuine, if lightweight, quality review — not a formal independent
QA audit (no QA reviewer role currently exists on this project — see the role-separation
disclosure in `Gate1_G0_Intake_Record.md` §10).

## 4. Unresolved-question log (item #102)

Restated from `SRS_Finance_Management_Platform.md` Section 9 ("Launch blockers and open
decisions") with owners assigned. Dates are honestly marked "not yet scheduled" rather
than invented.

| # | Open question | Owner | Target date |
|---|---|---|---|
| 1 | Celery versus APScheduler for background jobs | Freston Kenny Adedeme | Not yet scheduled |
| 2 | Email, payment, FX and bank providers | Freston Kenny Adedeme | Not yet scheduled |
| 3 | Pricing, trial length, grace period, refund policy, supported regions | Freston Kenny Adedeme | Not yet scheduled |
| 4 | Hosting, KMS, secrets manager, observability stack | Freston Kenny Adedeme | Not yet scheduled |
| 5 | Named product owner, security reviewer, QA reviewer, data owner distinct from the sponsor | Freston Kenny Adedeme | Not yet scheduled — depends on resolving the role-separation gap (Gate1_G0_Intake_Record.md §10) |

A log with owners but no committed dates is genuine progress over no log at all, but is
not a fully "controlled" artifact — consistent with the "Controlled: weak" finding in
Section 3 above.

## 5. Requirements baseline decision (item #100)

Not marked Complete by this document. Baselining is a sponsor action — reviewing the
current SRS v1.1 and formally accepting it as the controlled baseline (updating its own
"Status: Draft for review" header) — not something this session can do on the sponsor's
behalf.

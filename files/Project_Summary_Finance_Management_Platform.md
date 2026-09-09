# Finance Management Platform — Project Summary

*A plain-language overview of what the platform is, how it works, and how it protects users. Full technical detail lives in the SRS (`SRS_Finance_Management_Platform.docx`, v3.5) — this document is the readable companion to it.*

---

## What the Platform Is

The Finance Management Platform is a personal budgeting service: users track income and expenses, set category budgets, manage recurring bills, work toward savings goals, and view spending reports. It started as a single-user backend (FastAPI + PostgreSQL) and has since been redesigned as a public, multi-user product — meaning many people can use it at once, each with their own completely private slice of the system.

## How the Platform Is Organized

Every user is treated as their own **tenant** — a self-contained, isolated unit of data. No user can ever see, query, or accidentally receive another user's information. This isn't just a promise in the product design; it's enforced twice over:

1. **In the application code** — every request is automatically scoped to the logged-in user.
2. **In the database itself** — PostgreSQL row-level security policies act as a second, independent lock, so even a bug in the application code can't leak one user's data to another.

There's also an automated test suite whose specific job is to try to break this — to prove Tenant A can never read or write Tenant B's data.

## Core Features

- **Accounts** — checking, savings, and credit accounts, each with a running balance.
- **Categories** — custom budget categories with optional monthly limits.
- **Transactions** — manually logged income/expenses, each automatically updating the relevant account balance.
- **Recurring bills** — defined once, automatically generating transactions on their due date.
- **Savings goals** — target amounts and dates, with automatic progress tracking.
- **Reports** — spending by category, income vs. expense, and net worth.
- **Notifications** — email alerts for verification, password reset, and bill reminders.

## Bank Account Connectivity (Read-Only Monitoring)

The newest and most sensitive capability: users can link real bank accounts — across multiple banks — to see a consolidated balance inside the app, without manually entering every transaction.

**What this does:**
- Links multiple accounts, across multiple institutions, for one user.
- Shows a single **Gross Balance** figure that adds them all up.
- Pulls in real transaction history for those linked accounts automatically.

**What this deliberately does not do:**
- It can never pay money into or out of any account. This is a hard, permanent boundary — read-only monitoring only, never payment initiation. Any future payment capability would require a completely separate design and regulatory review; it isn't a setting to be quietly turned on later.

**How the connection works:**
- For each bank, the platform first tries to connect **directly** through that bank's own regulated Open Banking-style API — no company in the middle.
- Only if a bank doesn't offer that does the platform fall back to a certified aggregation service (the Plaid/TrueLayer/Yodlee category of provider), and the user is told plainly when this fallback is being used.
- Either way, the user's actual bank login (username/password) is never seen, touched, or stored by this platform or any partner — it's entered only on the bank's own login screen. No interface anywhere in this system is allowed to visually resemble a bank's login page, specifically to prevent the kind of credential-harvesting confusion that has caused real legal trouble for aggregators in the past (one major provider paid a $58 million privacy settlement for exactly this pattern).

**The privacy boundary, stated plainly:** the only outside party that ever touches a customer's financial data is that one connection channel (the direct bank link, or the fallback provider) — and its access is limited strictly to reading balances and transactions. It is contractually forbidden from selling, sharing, or reusing that data for anything else — analytics, advertising, its own products, nothing. That commitment has to be in a signed agreement before any such provider is used in production.

The one narrow exception is a currency exchange-rate lookup service (see below) — but it only ever receives generic requests like "USD to GBP as of a date." It never receives anything that identifies the customer or their accounts, so it sits outside this privacy boundary rather than inside it.

## How Currency Works

Money doesn't always come in one currency, so the platform treats currency at three distinct levels:

1. **Account currency** — each account (checking, savings, linked bank account) has its own native currency, set when it's created.
2. **Transaction currency** — when a user manually logs an expense or income, *they* choose the currency it happened in — it's never assumed from the account. A trip expense paid in euros can be logged as euros even if the account itself is in dollars.
3. **Display currency** — the Gross Balance view converts everything into the user's single preferred currency so all accounts, in whatever currency they're actually held in, can be added into one meaningful total.

Conversions use a licensed exchange-rate data source: current rates for the Gross Balance (refreshed daily), and the historical rate as of the actual date for a past transaction. Nothing is ever silently overwritten — both the original entered amount and the converted amount are kept and shown side by side, so the math is always visible, not hidden.

## Security & Privacy Posture

- Passwords are hashed, never stored or logged in plain text.
- Login sessions use short-lived tokens plus a separately revocable refresh token.
- All authentication endpoints are rate-limited to resist brute-force attempts.
- Bank-connection credentials (tokens, not passwords — see above) are encrypted at rest using envelope encryption through a managed key-management service; they're never sent to any client app, only used server-side.
- Every sensitive action — support staff looking at a user's account, a bank account being linked or unlinked — is logged for audit, without logging the actual financial figures involved.
- A dedicated security review and penetration test is required before public launch, with the bank-connectivity feature getting its own additional review on top of the platform-wide one.

## Compliance & Legal Considerations

- **Data rights**: users can export all their data and request full account deletion (supporting GDPR/CCPA-style rights).
- **GLBA** (US): applies once real bank data is involved, requiring a documented information security program.
- **Open Banking / PSD2** (UK/EU, where relevant): the platform operates strictly as an "Account Information" service — read-only — never as a "Payment Initiation" service.
- A Terms of Service and Privacy Policy are required before public launch, and must specifically disclose when a third-party connection provider is involved in linking a given bank.
- Bank-linking has its own separate, explicit consent step — distinct from agreeing to the general Terms of Service — and that consent has to be periodically renewed, not treated as granted forever.

## Billing & Subscription

Rather than gating the whole platform behind payment, billing is scoped specifically to bank account linking — the feature that actually costs money to provide (via a direct bank connection or aggregator, Section 3.14). **Manual tracking — accounts, categories, transactions, recurring bills, savings goals, reports — is free for every user, no payment required, ever.**

The subscription only applies once someone wants to link a real bank account and see the Gross Balance view:

- Billing is handled entirely through a PCI-compliant payment processor (e.g., Stripe); the platform itself never touches raw card details.
- A free trial period is included as a reasonable default (assumed 14 days) so people can evaluate bank-linking before being charged — the exact length is a pricing decision to confirm, not fixed.
- If a monthly charge fails, bank-linking access isn't cut off immediately — there's a retry and a grace period before restriction, so a single failed card doesn't lock someone out.
- Users can see their subscription status, next billing date, and billing history at any time, and can cancel whenever they like — bank-linking access continues through the end of the period already paid for, and afterward the account simply reverts to free manual tracking rather than being locked out entirely.
- Billing and invoice records are kept for standard financial record-keeping purposes (commonly 5–7 years), separately from how long regular account data is retained after someone deletes their account.

This design lets a new, unproven product build trust with manual tracking before ever asking someone for a card number and their actual bank login at the same time.

## Operational Architecture

- **Infrastructure**: the API runs as multiple identical, stateless server processes behind a load balancer, so it can scale horizontally as usage grows.
- **Background jobs**: a separate worker process handles scheduled tasks — generating recurring-bill transactions, syncing bank balances — safely, so retries never create duplicate financial records.
- **Environments**: separate development, staging, and production environments, with database changes always going through reviewed migrations rather than being made directly.
- **Reliability targets**: 99.5% uptime goal, daily backups, and a tested (not just assumed) disaster-recovery process.
- **Observability**: errors are tracked centrally with alerting, and system health (latency, error rates, job queue backlog) is visible on a monitoring dashboard.

## Testing Approach

Beyond standard unit and integration tests, there's a specific test category for **tenant isolation** — proving no user can ever reach another user's data — and one for the **bank-connection boundary** — proving there's no code path capable of moving money, and no way for the connection token or the customer's data to end up somewhere it shouldn't.

## What's Deferred (Not in the Current Scope)

A few things were identified as reasonable future additions but are intentionally not required for the initial public launch:
- **Household/shared tenancy** — multiple people sharing one budget (currently: one user = one tenant, strictly separate).
- **Single sign-on / multi-factor authentication** — stronger login options beyond password + email verification.
- **Payment initiation** — explicitly and permanently out of scope as its own feature, not just "later" — it would need its own ground-up review.

## Where to Go for More Detail

This summary intentionally leaves out requirement IDs, priority levels, and architecture diagrams. For the full, formally numbered specification — including every functional and non-functional requirement, the complete data model, and the regulatory rationale behind each decision — see **SRS_Finance_Management_Platform.docx (v3.5)**.

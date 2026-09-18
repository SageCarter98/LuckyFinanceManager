# User-Acceptance Test Script

Prepared 15 September 2026, to be executed for tracker item #137 (SDLC
G4.10), currently Not started. **Drafting this script does not satisfy
#137** — only a completed, signed run by an authorised product owner or
client representative does (the framework's own wording). Freston, as
product owner, is the expected executor absent a separate client
representative.

Covers every shipped route per
`FRS_Finance_Management_Platform_Implementation_Plan.md` §8, in the order
a real new user would hit them. Each step names the expected outcome —
check it off only if that outcome actually happened, not if something
close enough happened. Record any deviation in §10 rather than silently
checking the box.

## 1. Signup and verification

- [ ] `/signup` — create a new account with a real-looking email/password.
      Lands on `/onboarding`.
- [ ] `/verify-email` — the dev-safe token (surfaced in the API response,
      not emailed — disclosed limitation, no email provider chosen yet)
      verifies the account.
- [ ] Onboarding can be skipped (`Skip for now`) and lands on `/`.

## 2. Accounts

- [ ] `/accounts` — create at least two accounts in different currencies
      (e.g. USD and EUR).
- [ ] Edit an account's name; confirm native currency cannot be changed
      after creation.
- [ ] Delete an account with the confirmation dialog; confirm it's gone.

## 3. Categories

- [ ] `/categories` — create a category with a monthly limit and one
      without.
- [ ] Edit and delete a category.

## 4. Transactions

- [ ] `/transactions` — create a transaction against each account created
      in §2; confirm each keeps its own account's currency.
- [ ] Filter by account and by date range.
- [ ] Import a CSV of transactions; confirm a deliberately malformed row
      is rejected with a clear error, not silently dropped.
- [ ] Edit a transaction; confirm currency doesn't reset to a different
      account's default.
- [ ] Delete a transaction; confirm the balance-impact warning appears.

## 5. Recurring bills

- [ ] `/bills` — create a bill due today (or use "Generate due bills now"
      logic); confirm exactly one transaction is generated.
- [ ] Run generation again the same period; confirm no duplicate.
- [ ] Pause a bill; confirm it's excluded from generation.

## 6. Savings goals

- [ ] `/goals` — create a goal, contribute toward it, confirm progress
      reflects correctly.

## 7. Reports

- [ ] `/reports` — with accounts in more than one currency, confirm the
      mixed-currency disclosure banner appears rather than a silently
      summed total.

## 8. Subscription

- [ ] `/subscription` — review the trial/checkout flow presentation (real
      Stripe checkout requires live keys, not available in this
      environment — confirm the page itself renders correctly and
      discloses this is Stripe-hosted, not attempt a real purchase).
- [ ] Confirm cancellation preserves access through the paid period rather
      than revoking immediately.

## 9. Banking

- [ ] `/banking` — before any subscription, confirm the upsell empty state
      appears (`A subscription unlocks bank linking`), not an error.
- [ ] With an entitlement active, `/banking/link` — select an institution,
      give consent, link. Confirm the "Test data only" disclosure banner
      is visible and unmissable.
- [ ] Expand the linked account; confirm recent transactions appear.
- [ ] Sync; confirm either a new "Synced" timestamp or a disclosed sync
      failure appears (both are valid documented outcomes).
- [ ] Unlink; confirm the account and its transaction detail are both
      gone from the UI.

## 10. Settings and data

- [ ] `/settings/profile` — edit name, timezone, preferred currency;
      confirm they persist.
- [ ] `/settings/security` — confirm it honestly discloses MFA/SSO as
      Phase 2/not yet built, not a fake toggle.
- [ ] `/settings/data` — export data (`GET /me/export`); confirm the
      download contains the accounts/transactions created above.
- [ ] Delete the account with typed confirmation; confirm login
      afterward is rejected.

## 11. Admin console

- [ ] `/admin` (separate build entry, `admin.html`) — confirm it never
      shares a session with the consumer app (log into both
      simultaneously in separate browser profiles/incognito, confirm
      independence).
- [ ] Search for a tenant; confirm sensitive values are masked and the
      lookup is logged with a required reason.

## Sign-off

| Field | Value |
|---|---|
| Executed by | |
| Role (product owner / client representative) | |
| Date | |
| Environment tested against | |
| Overall outcome (Accept / Accept with noted deviations / Reject) | |
| Deviations recorded (see below) | |

## 12. Deviations found during this run

_(List each deviation from an expected outcome above, with the section
number it belongs to. A signed "Accept" with unresolved deviations listed
here should be read as accepting known, disclosed gaps — not as claiming
none exist.)_

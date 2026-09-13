# Benefits Register — Finance Management Platform

Prepared 13 September 2026. Addresses the "Measures" half of tracker item
#22 (Gate 2.11) and the Charter's "Benefits ownership and funding" row —
the other three parts of that item (operational owner, default Gate 7
date, protected review effort) were already recorded in the Charter on
2026-09-09 and are not restated here.

**This document defines what to measure, from where, and how often — it
does not set target numbers.** Per PM Framework §10.5/Appendix I, Gate 7
benefits measures are about this specific product's adoption and outcomes
(user growth, conversion, retention), not the institutional delivery
measures in §18.1 (milestone reliability, cost variance — those are
process measures, already distinct and unaffected by this document).
Setting adoption/conversion/retention targets requires the Sponsor's own
business judgment — there is no user base, market data, or historical
baseline in this project to derive a number from, and inventing one would
misrepresent it as evidence-based when it would just be a guess.

## 1. Proposed measures

| Measure | Definition | Data source (real, in this codebase) | Owner | Frequency | Target |
|---|---|---|---|---|---|
| User adoption | Count of registered tenants (accounts created) | `tenants` table row count | Sponsor | Monthly | **[SPONSOR TO SET]** |
| Activation | % of new signups that record at least one transaction within 7 days | `users.created_at` vs. earliest `transactions.created_at` per tenant -- **no reporting query for this exists yet**, would need a small new endpoint/query, not built in this pass | Sponsor | Monthly cohort | **[SPONSOR TO SET]** |
| Free-to-paid conversion | % of tenants with `subscriptions.status` in (`trialing`, `active`) out of all active tenants | `subscriptions` joined to `tenants` | Sponsor | Monthly | **[SPONSOR TO SET]** |
| Retention | % of subscriptions still `active` 90 days after their trial ended | `subscriptions` table -- **real gap found while defining this**: the schema stores only *current* subscription status, not a status history, so a genuine cohort-retention-over-time calculation cannot be computed from this database alone yet; would need either a lightweight status-history table or querying Stripe's own historical event log directly | Sponsor | Monthly | **[SPONSOR TO SET]** |
| Reliability | % of requests not resulting in a 5xx response | The new structured request logs (`backend/app/main.py`'s logging middleware, added this session) log `status_code` on every request -- this is the first measure on this list with real data behind it already, once deployed | Sponsor | Monthly | **Suggested default: 99% monthly (< 1% of requests 5xx)** -- a conventional small-SaaS floor, not a market-specific figure; override if a stricter or looser bar fits, but a reasonable default given the lack of a downstream aggregation tool to compute a fancier SLO yet |

## 2. What's needed from the Sponsor

Four numbers (adoption, activation, conversion, retention targets), or
confirmation that "no target yet, revisit at Gate 7 planning" is the
honest answer for now -- both are legitimate; inventing plausible-sounding
numbers to fill the table is not. The reliability suggestion (§1, last row)
can be accepted as-is or overridden.

## 3. What this does not resolve

- The activation and retention measures both surfaced real, undisclosed
  data gaps (no cohort-activation query exists; no subscription-status
  history exists) -- these are now known follow-up work items, not solved
  by defining the measure.
- This document does not set Gate 7's date or protected review effort --
  already recorded in the Charter.

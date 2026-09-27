---
name: add-payment-provider
description: Add a payment/revenue provider (Stripe, LemonSqueezy, Polar, Paddle, Creem, Dodo, RevenueCat, Superwall, Whop, Omise/Opn, 2C2P, …) to MRRMafia's revenue verification — implements the RevenueProvider interface, read-only key validation, transaction/subscription normalization, tests against the provider's test mode, the connect-wizard option and docs. Use whenever the user wants to support, verify revenue from, or "connect" a new payment platform, or fix how a provider's MRR/revenue is calculated.
---

# add-payment-provider

Verified revenue is MRRMafia's whole trust promise, so a provider integration has to be safe (read-only, keys never leak) and consistent (every provider feeds the same metrics engine). Providers only _fetch and normalize_. They never compute MRR themselves. The engine does that once, the same way for everyone, which is why numbers are comparable across providers.

## Before writing code

1. **Confirm read-only access exists.** Read the provider's API docs (use WebFetch or search) and find a restricted, read-only or scoped key type.
   - **If only full-access secret keys exist, stop.** Tell the user and record it in Project.md §7. Storing a key that can move money breaks rule 4 in CLAUDE.md.
2. Note these endpoints:
   - list charges/orders/transactions (paginated, filter by date)
   - list subscriptions (status, interval, amount, currency)
   - a cheap "who am I" call for key validation
   - rate limits
3. Read `src/lib/providers/types.ts` (the `RevenueProvider` interface) and one existing provider, e.g. `stripe.ts`, and copy its structure. If `types.ts` doesn't exist yet, create it from the interface in Project.md §5.

## Implement

- `src/lib/providers/<id>.ts` exports an object implementing `RevenueProvider`:
  - `validateKey(key)`: call the whoami endpoint. Return `{ ok, readOnly, accountName }`. **Detect and reject write-capable keys.**
  - `fetchTransactions(key, since)` / `fetchSubscriptions(key)`: async generators that page through results and yield `NormalizedTxn` / `NormalizedSub`:
    - amounts are integer minor units plus an ISO currency
    - refunds are negative txns
    - trials are excluded from MRR
    - yearly plans are normalized by the engine, not here
  - Never read, return or log customer names, emails or other personal data. Aggregate fields only.
  - Respect rate limits with backoff. Surface errors as typed `ProviderError`s (`invalid_key`, `not_read_only`, `rate_limited`, `upstream`).
- Register it in `src/lib/providers/index.ts`. Add the provider to the `provider` enum in a **new** Supabase migration if the column is an enum.
- Connect wizard: add the provider card and "how to create a read-only key" steps (Thai and English strings in `messages/*.json`). Follow Design.md.

## Test

- `src/lib/providers/<id>.test.ts` (Vitest) with recorded fixtures. Test these cases:
  - pagination
  - a refund
  - a trial
  - an annual plan
  - a non-USD currency
  - key rejection for a write-capable key
- If the user supplies a **test-mode** key (via `.env.local`, which is never read or printed), run one live sync and compare MRR and 30-day revenue with the provider dashboard. Tolerance is ±5%. Explain any gap: refunds, FX, trials.

## Finish

- `npm run typecheck && npm run lint && npx vitest run providers` all pass.
- Project.md: tick the provider in the parity matrix and add any decisions (e.g. how that provider reports MRR).
- Run `/log-progress`.

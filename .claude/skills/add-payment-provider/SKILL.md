---
name: add-payment-provider
description: Add a source of verified numbers to JaoPor — a revenue provider (Stripe, RevenueCat, LemonSqueezy, Polar, Paddle, Creem, Dodo, Superwall, Whop, Omise/Opn, 2C2P, App Store Connect…), a traffic/analytics source (Plausible, Umami, PostHog, GA4…) or a build-proof source (GitHub…). Covers read-only credential validation, normalization, the sources engine, the VerifyPanel option, tests and docs. Use whenever the user wants to support, verify numbers from, or "connect" a new platform, or fix how a source's MRR/revenue/visitors are calculated.
---

# add-payment-provider (any verified-number source)

Verified numbers are JaoPor's whole trust promise, so a source integration has to be safe (read-only, credentials never leak) and consistent (every source of a kind writes the same columns the same way).

## The architecture (read first)

- `src/lib/sources/catalog.ts`: `SOURCES`, `SOURCE_KIND` (`revenue` | `traffic` | `build`), `SOURCE_NAME`, `ConnectInput`. Client-safe.
- `src/lib/sources/sync.ts` (server-only): `connectSource` (validate → prove read-only → prove it belongs to this project → store encrypted → first sync), `syncSource` (cron + Refresh), `disconnectSource`. One writer per kind: `writeStripe` / `writeRevenueCat` → revenue columns + `revenue_snapshots`; `writeTraffic` → `visitors_*` + `traffic_snapshots`; `writeBuild` → `build_*`.
- Connectors only fetch + normalize:
  - revenue from raw transactions: `src/lib/revenue/providers/<id>.ts` implementing `RevenueProvider` (like `stripe.ts`); the pure engine `metrics.ts` computes MRR etc.
  - revenue that is pre-aggregated (like `revenuecat.ts`): return finished numbers in cents.
  - traffic: `src/lib/traffic/<id>.ts` returning `TrafficReading` (like `plausible.ts`, `umami.ts`).
  - build proof: `src/lib/build/<id>.ts` (like `github.ts`).
- API: `/api/startups/[id]/sources/[source]` (POST connect, PATCH refresh, DELETE). UI: `src/components/wizard/VerifyPanel.tsx` (`FIELDS`, `HOW_TO`, `SETTINGS_URL`).

## Before writing code

1. **Confirm a read-only credential exists.** Read the provider's API docs (WebFetch / search; for open-source providers read the source with `gh api`).
   - **If only full-access keys exist, stop.** Tell the user and record it in Project.md §7. Storing a credential that can write breaks rule 4 in CLAUDE.md.
   - Plan **how to prove** it can't write. Patterns in use: Stripe = empty-body update of a nonexistent id (403 ok / 404 reject); RevenueCat = reads of other permission areas must be 403; Plausible = Sites API must refuse the key; Umami = view-only share link; GitHub = no credential at all. Anything unexpected **fails closed**.
2. Plan **how to prove the numbers belong to this project**: analytics domain must match the website (`domainMatches`), repo owner must be the signed-in GitHub login, etc.
3. Any founder-supplied URL is fetched through `fetchPublic` (`src/lib/net/public-url.ts`, SSRF guard).

## Implement

- Connector with an injectable `fetchImpl`, typed `ProviderError`s (`invalid_key`, `not_read_only`, `missing_permission`, `rate_limited`, `upstream`, `not_found`, `domain_mismatch`, `not_owner`, `no_github_identity`, `no_website`), 15 s timeouts, and **no personal data** (aggregate numbers only; customer refs are opaque and never stored).
- Register it: `SOURCES`/`SOURCE_KIND`/`SOURCE_NAME`, `prepare()` + `pull()` in `sources/sync.ts`, and the DB CHECK constraints (`provider_connections.provider`, and `startups.verified_provider` / `traffic_provider`) in a **new** migration (then `rls_smoke.sql`, advisors, regenerate types).
- VerifyPanel: `FIELDS`, `HOW_TO` count, `SETTINGS_URL`; strings `Sources.<id>.*` in both `messages/th.json` and `messages/en.json`. Follow Design.md §5 VerifyPanel. The ProviderStrip picks it up from the catalog automatically.

## Test

- Add cases to `src/lib/sources/connectors.test.ts` (or a `<id>.test.ts`) with a fake fetch: happy path, the write-capable credential rejected, an unexpected probe answer failing closed, unit conversion (cents, compact numbers), and ownership/domain mismatch.
- Revenue from transactions also needs: pagination, a refund, a trial, an annual plan, a non-USD currency.
- If the user supplies a **test** credential (they paste it into the UI themselves; Claude never types secrets), run one live connect and compare with the provider dashboard (±5%). Explain any gap.

## Finish

- `npm run typecheck && npm run lint && npm test` all pass.
- Project.md: tick the source in the parity matrix, add decisions (how it defines MRR / visitors / commits) and any "pending real-key check" open item.
- Run `/log-progress`.

# PostHog (visitors) and App Store Connect (downloads): research & design

> Written 2026-10-15. **Research + proposal for owner review; no code, no migration applied.**
> Follows the `/add-payment-provider` skill order (connector → register → DB CHECK → messages →
> VerifyPanel → strip). Owner decisions this date:
>
> 1. PostHog: **do not** treat the public project token (`phc_…`) found in the site's HTML as
>    sufficient proof on its own. Inspect the available verification options and **propose a method**
>    that proves control of the project (or its associated website). If none is reliable, **leave it
>    blocked** and document the limitation (section 1.7).
> 2. App Store Connect: **yes, add a `downloads` metric**, kept **separate** from revenue and user
>    metrics. This document is the required "document first" step: source API, exact definition of a
>    download, historical data, refresh behavior, limitations, and the **"reported by App Store
>    Connect"** label (not "verified"). Section 2.

Nothing here is wired into the catalog yet. The current source list is
`stripe, revenuecat, polar, jaopor, plausible, umami, cloudflare, ga4, github`
(`src/lib/sources/catalog.ts`).

---

## 1. PostHog as a visitor source (traffic)

### 1.1 What we would show

The same three traffic facts every visitor source produces (`TrafficReading`,
`src/lib/traffic/types.ts`): **unique visitors in the 30 whole UTC days before today**, the previous
30 days (for the growth line), and a daily series. PostHog calls this a **visitor** = "a single,
unique person" (PostHog web-analytics docs), which lines up with how JaoPor labels visitors
("counted", not audited).

### 1.2 Credentials PostHog offers

| Key                      | Prefix    | Visibility                 | Scope                                            | Verdict                       |
| ------------------------ | --------- | -------------------------- | ------------------------------------------------ | ----------------------------- |
| Project API key          | `phc_…`   | **public** (sits in HTML)  | ingestion only (send events)                     | Not proof of ownership (§1.7) |
| Personal API key         | `phx_…`   | secret                     | user-chosen scopes; can be read-only or full     | Candidate credential (§1.4)   |
| Project secret API key   | `phs_…`   | secret (beta)              | single project, only granted scopes, server-side | Preferred binder if GA'd (§1.5) |

Up to 10 personal keys per user; scopes are chosen at creation (e.g. `project:read`,
`web_analytics:read`, `query:read`, `insight:read`, `user:read`). Authentication is
`Authorization: Bearer <personal key>` against the region host (`https://us.posthog.com` or
`https://eu.posthog.com`). The project object exposes `app_urls` (the authorized URLs) and
`api_token` (the public `phc_…`).

### 1.3 The endpoint (and the definition caveat)

Reading traffic data needs the **`web_analytics:read`** scope. The ready-made overview endpoint is:

```
GET /api/projects/:project_id/web_analytics/weekly_digest/?days=N&compare=true
```

It returns unique visitors, pageviews, sessions, bounce rate and average session duration **with a
period-over-period comparison**, plus the top pages and sources. The window parameter is `days`
(default 7) and `compare` (default true) — so `days=30` should give the current 30-day window and
its previous-period comparison.

**Caveats to verify against a real key before shipping:**

- The endpoint is named "weekly_digest"; whether `days` is honoured for values well above 7 (and what
  the previous-period window becomes) must be confirmed live. If `days=30` is ignored, the fallback
  is HogQL through `POST /api/projects/:id/query/` (`web_analytics:read`), computing uniques with the
  `uniq()` aggregate over `$pageview` events — more flexible, more code, and PostHog's own docs warn
  that connector/`query` endpoints are the unsupported path.
- PostHog's "visitor" is a distinct **person** over the window, which is the definition we want, but
  it is a client-side-identified count (identified via a cookie/localStorage), so ad-blockers and
  cookieless setups lower it. Same class of caveat as GA4 "Total users".

### 1.4 Proposed ownership proof (personal API key)

A read-only personal key proves **control of the PostHog project**. Bind that project to the
listing's website so a key for an unrelated project can't count here:

1. **Read-only by scope.** Request the key with only read scopes. We must *prove* it cannot write,
   not trust it. Probe an endpoint that requires a write scope (e.g. create/update something that
   requires `*:write`); a **200 means the key can write → refuse it** (`not_read_only`), a 403 is
   what we want. This is the Cloudflare "probe and fail closed" pattern
   (`src/lib/traffic/cloudflare.ts:64`).
2. **Ownership = authorized URL match.** `GET /api/projects/:project_id/` returns `app_urls`. At
   least one authorized URL must match the project's website host, using the existing
   `domainMatches(bareDomain(url), websiteHost)` rule (`src/lib/traffic/types.ts:34`) — the same rule
   GA4 and Plausible use. This is what makes it "belongs to this project", not just "a PostHog
   project you own".
3. **Then** read `weekly_digest?days=30`.

The public `phc_…` token would only ever be a *corroboration* (the project's `api_token` appearing in
the site HTML), never the primary proof — the owner explicitly rejected token-on-site as sufficient.

### 1.5 Preferred binder (if available): project secret API key (`phs_…`)

`phs_…` keys are scoped to a **single project** and carry only the scopes granted. If a founder can
mint one with just `web_analytics:read` (+ `project:read`), it is a stronger ownership proof than a
personal key: the credential is intrinsically bound to one project, so cross-project confusion is
impossible. It is **beta / rolling out gradually**, so we cannot require it yet. Design the connector
to accept either, preferring `phs_` when present.

### 1.6 Region / host

PostHog is region-split: the key only works against its own host (`us.posthog.com` vs
`eu.posthog.com`). The founder must supply the host too (or we infer it). A wrong-region key returns
401/404 → `invalid_key`/`not_found` with a "check your PostHog region" hint. Implementation note: add
a `host` form field (default `https://us.posthog.com`).

### 1.7 Why the public token alone is not accepted

`phc_…` is designed to be embedded in client-side code; anyone can read it from the page source or
the network tab. It is an **ingestion** key — it cannot read any data back, so it proves nothing
about who controls the project and can't even fetch the numbers. It also appears on countless sites
and could be scraped. So possession of `phc_…` (even on the listed site) is **not** an ownership
proof, exactly as the owner said.

### 1.8 Met / not met

- **Proves control of the project:** yes — a read-only personal (or project-secret) key.
- **Proves the project is this website's:** yes — `app_urls` match, same rule as GA4.
- **Reliability:** the *method* is reliable (read-only probe + authorized-URL match). The remaining
  uncertainty is only in the **numbers** (does `weekly_digest?days=30` return a true 30-day unique
  count), which is a data-shape question, not an ownership one. If live testing shows `days=30` does
  not work, we either use HogQL `uniq()` via `/query/` or mark PostHog numbers "approximate".

### 1.9 If we build it (scope of change)

- `src/lib/traffic/posthog.ts` — validate (read-only probe + `app_urls` match) + fetch
  (`weekly_digest`), with injectable `fetch` like the other connectors.
- `traffic/types.ts` — add `"posthog"` to `TrafficProviderId`.
- `catalog.ts` — add `"posthog"` to `SOURCES`, `SOURCE_KIND.posthog = "traffic"`,
  `SOURCE_NAME.posthog = "PostHog"`, and to `CLAIM_SOURCES` (authorized-URL match makes it
  asset-bound, so a claim could use it).
- `sync.ts` — `prepare` case (validate + `app_urls` + first read), add to `readTraffic`.
- Migration (write, not apply): extend `provider_connections_provider_check` and
  `log_verify_result`'s source whitelist with `posthog`.
- `funnel-types.ts` — add `posthog` to `VERIFY_SOURCES`.
- `messages/{en,th}.json` — `Sources.posthog.*` (howTo, labels) + add to the traffic `names` list
  (derived automatically).
- `VerifyPanel.tsx` — `FIELDS.posthog` (project ID + key + host), `HOW_TO`, `SETTINGS_URL`
  (`https://app.posthog.com/settings/user-api-keys`).
- Tests: `connectors.test.ts` (fakeFetch routes for validate/read-only-probe/`app_urls`/digest),
  `catalog.test.ts` (traffic mapping now includes posthog), `funnel` parity test.

---

## 2. App Store Connect as a `downloads` metric

### 2.1 What we would show

A single, **separate** number: **downloads** (first-time app installs) reported by App Store Connect.
Kept out of `revenue` and `users`, and labelled **"reported by App Store Connect"** — because we
cannot independently verify Apple's numbers, only read the report Apple produces.

### 2.2 Source API

```
GET https://api.appstoreconnect.apple.com/v1/salesReports
  ?filter[frequency]=DAILY|WEEKLY|MONTHLY|YEARLY
  &filter[reportType]=SALES
  &filter[reportSubType]=SUMMARY          (also DETAILED)
  &filter[version]=1_0
  &filter[vendorNumber]=<vendor number>
  &filter[reportDate]=YYYY-MM-DD          (required for non-daily frequencies)
```

- Response body is **gzipped TSV** (`application/a-gzip`), one row per (day, app, product type,
  country, …) in the SUMMARY report.
- Valid combinations include `SALES+SUMMARY+DAILY/WEEKLY/MONTHLY/YEARLY+1_0`,
  `SALES+DETAILED+DAILY`, `SUBSCRIPTION+…`, `INSTALLS+SUMMARY+MONTHLY+1_2`, etc. We want
  `SALES + SUMMARY` (units, including free downloads) for a first cut.

### 2.3 Authentication (founder-supplied, read-only)

- **ES256 JWT**, signed with an App Store Connect API **`.p8` private key**:
  header `{ alg: "ES256", kid: <key id>, typ: "JWT" }`,
  claims `{ iss: <issuer id>, iat, exp: iat + ≤1200, aud: "appstoreconnect-v1" }`.
- The key must be a **Team key** (Individual keys cannot use the Sales and Trends reports) whose role
  includes **"Sales and Reports"**. "Sales and Reports" can read sales & trends but **cannot** read
  Finance — read-only for our purposes.
- Vendor number comes from **Payments and Financial Reports** (or Sales and Trends → Reports).
- These are **secrets**: store the `.p8` (encrypted, like other keys) and keep the issuer id + key id
  in `config`. Never log them. The founder can revoke the key in App Store Connect at any time.

### 2.4 Exact definition of "download" (important)

Apple's SUMMARY sales report exposes a **Units** column and a **Product Type Identifier** column.
"Downloads" must be defined as **first-time app/bundle units**, i.e. the sum of `Units` for product
type identifiers that represent an app or bundle **acquisition**, **excluding** updates, re-downloads
and in-app purchases:

| Product type id                       | Meaning                                   | Counts as a download? |
| ------------------------------------- | ----------------------------------------- | --------------------- |
| `1`                                   | Free/paid app (iOS/iPadOS/visionOS/watch) | **Yes**               |
| `1F`                                  | Universal app (excl. tvOS)                | **Yes**               |
| `1T`                                  | iPad app                                  | **Yes**               |
| `1-B`, `F1-B`                         | App bundle                                | **Yes**               |
| `1E`, `1EP`, `1EU`                    | Custom (B2B) app                          | **Yes**               |
| `F1`                                  | Mac app                                   | **Yes**               |
| `7`, `7F`, `7T`                       | **Update**                                | No                    |
| `3`, `3F`                             | **Re-download**                           | No                    |
| `IA1`, `IA9`, `IAY`, `FI1`, …          | **In-app purchase / subscription**        | No                    |

This matches Apple's own **"App and Bundle Units"** definition (first-time purchases; updates,
redownloads and same-Apple-Account installs on other devices are **not** counted; Family Sharing of
a free app is included). Negative `Units` are refunds and reduce the total.

**We must state this definition in one plain sentence wherever the number is shown**, e.g.
"Downloads = first installs Apple reports for this app (updates and re-downloads excluded)."

### 2.5 Historical data & retention

- **Daily** reports are available the **following day**; **weekly** on Mondays; **monthly** **5 days**
  after month end; **yearly** **6 days** after year end. Reports are generally ready by ~**8 a.m.
  PT**.
- Retention: **daily/weekly/monthly kept for 1 year; yearly kept for 10 years** (older reports are
  not regenerated, though aggregated longer windows can help).
- Consequence: a **30-day** and an **all-time** number are only achievable to the extent we persist
  history. Practical plan: a daily cron pulls yesterday's DAILY report (for the series) and, on the
  month's first run, the MONTHLY report for the long tail. The "all-time" figure for a project added
  today can only start from the first day we sync — label it "since …", not "all time", until enough
  history accumulates. (Apple's report also does not include a row on days with **zero** units.)

### 2.6 Refresh behavior

- Only one report per day is new; syncing more often than once per day adds nothing. Use the existing
  daily sync cron; make the App Store pull idempotent (upsert by day).
- The report is in **Pacific Time**, and its rows lag (T+1), so "today" is never present. Day
  boundaries for our `download_snapshots` must be documented as Apple's report days, not UTC.

### 2.7 Ownership / project binding

The App Store Connect key is **account-wide** (it can read every app in the vendor account). We must
bind it to one listing:

- The listing already carries an **App Store link** (`app_store_url`). Parse the numeric **Apple
  identifier** (`idNNNNNNNNN`) from it.
- Keep only report rows whose **Apple Identifier** (a SUMMARY column) equals that id. If the account's
  reports never contain that Apple id, fail with a clear "this app isn't in that App Store Connect
  account" error — the same shape as `domain_mismatch`.
- This means "the key can see this app's sales", which is the strongest binding Apple allows; it does
  not prove the founder *owns* the account, only that they hold a key that can read it. Given that,
  the number stays **"reported"**, never "verified".

### 2.8 Limitations (to disclose)

- Not independently verifiable: it is Apple's own report, read as-is.
- Account-wide credential: it can read the whole vendor account's sales; we filter to the listed app.
- T+1 latency, Pacific-Time days, 1-year daily/monthly retention, no zero rows.
- Free downloads are included, so a "downloads" number is not a revenue number; refunds show as
  negatives.
- Requires a **Team** key with Sales and Reports; Individual keys don't work.

### 2.9 If we build it (scope of change — larger, needs owner sign-off)

`downloads` is **not** revenue or traffic, so it cannot ride the existing `SourceKind` union
unchanged. Options:

- **A (recommended):** add `SourceKind = "downloads"` (a fourth metric in the chooser). New columns on
  `startups` (`downloads_30d`, `downloads_all_time`, `downloads_provider`, `downloads_synced_at`), a
  `download_snapshots` table, a `writeDownloads` writer, `clearKind` branch, `duplicateListing`
  handling, `METRICS`/`METRIC_ICON`/`METRIC_ANCHOR` entries, a VerifyPanel metric row + `appstore`
  source, messages (`metric.downloads*`, `Sources.appstore.*`), an App Store Connect icon
  (`simple-icons`), disclosure group in `DISCLOSURE_SPEC.md`, and RLS tests. This is a real product
  change (a new column in the public metric surface) and should be approved as its own item.
- **B:** treat `downloads` as a sub-metric under `build`/`traffic`. Rejected — the owner asked to keep
  it separate, and it is neither.

Either way the connector (`src/lib/appstore/client.ts`: ES256 JWT signer + gzip TSV parser +
`salesReports` fetch, injectable fetch) and its unit tests are the same and can land first.

---

## 3. Owner actions still required

### 3.1 Credentials (never commit)

- **PostHog:** a **read-only personal API key** (`phx_…`, scopes `web_analytics:read` +
  `project:read`, no write) + the project id + the region host — for live verification only. (Or, if
  available, a single-project `phs_…` key.)
- **App Store Connect:** a **Team API key** (`.p8` private key, key id, issuer id) with role
  **Sales and Reports**, and the **vendor number**; the listing must link the app so we can read its
  Apple identifier.

### 3.2 Migrations (write, do not apply without approval)

- PostHog: extend `provider_connections_provider_check` + `log_verify_result` whitelist with
  `posthog` (one file, mirrors `20261015140000_polar_source.sql`).
- App Store Connect (only if option A): new columns + `download_snapshots` + provider CHECKs +
  `log_verify_result` whitelist (`appstore`), and regenerate `database.types.ts`.

### 3.3 Still blocked / unchanged

- LemonSqueezy remains blocked (full-access-only keys; no read-only scope).
- Nothing above has been applied or connected; no credentials were invented or used.

---

## 4. Open questions for the owner

| ID   | Question                                                                                 | Recommendation                                                        |
| ---- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| P1   | Should PostHog ship as a visitor source now, after the method above?                     | Yes if a real key confirms `weekly_digest?days=30` returns a 30-day count |
| P2   | Accept a personal key (`phx_`, read-only probe + `app_urls` match) now, `phs_` preferred? | Yes                                                                   |
| A1   | Build `downloads` as a new fourth metric kind (option A)?                                | Yes, as its own approved item                                          |
| A2   | Label wording for downloads                                                              | "Downloads — reported by App Store Connect" (never "verified")         |
| A3   | Show "downloads since <date>" until ≥30 days of history exist?                           | Yes                                                                    |

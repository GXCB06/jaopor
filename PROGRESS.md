# PROGRESS

> Completion log. **Newest entry first.** Every completed task adds one entry here and ticks its box / status in [Project.md](Project.md). Use `/log-progress`.
>
> Entry format:
>
> ```
> ## YYYY-MM-DD — <task title>
> **Done:** what changed, in 1–3 bullets
> **Files:** key paths
> **Verified:** how it was checked (command / browser / test)
> **Next:** the immediate follow-up
> ```

## 2026-10-15 — Owner disclosure control (C9) + wizard category auto-select (issues 3 & 2)

**Done:**

- **Issue 3 (C9, the last disclosure surface).** A "ใครเห็นตัวเลขนี้?" control now exists in two places: the wizard's step 2 (appears once a source connects) and the product's edit form (verify section). Picking a level writes `metric_disclosure` through the **owner's own Supabase client** — the row policy + the `update(metric_disclosure)` column grant decide, and the `startups_public_metrics` trigger validates and recomputes every `public_*` column. Reads go through the owner-only `get_my_startup_metrics()` RPC (the raw column isn't client-readable). A failed save reverts the selection and toasts — never a false success. The profile chart no longer shows the misleading "connect Stripe" prompt for verified-but-not-exact revenue: it now says "the chart starts soon" (exact, <2 days) or "the owner keeps this chart private" (owner-only), and only falls back to the connect prompt when nothing is connected.
- **Issue 2.** The website preview now **preselects** a confident, valid category, with an "auto-filled from your website" note; a manual choice is never overwritten when the async preview lands later.
- New: `setStartupDisclosure` server action + `DisclosureControl`; pure helpers `changedDisclosure` / `resolveCategory`; Thai + English strings for both.

**Files:** `src/app/actions/disclosure.ts`, `src/components/wizard/DisclosureControl.tsx`, `src/lib/{disclosure.ts,category-suggest.ts}`, `src/components/wizard/{StartupWizard.tsx,StartupEditForm.tsx,CategoryField.tsx}`, `src/app/[locale]/startup/[slug]/page.tsx`, `messages/{th,en}.json`

**Verified:** `npm run typecheck` ✓ · `npm run lint` ✓ · `npx vitest run` **710 passed / 17 skipped** (+9) ✓ (committed `7428c2e`, pushed). **Not verified against production** — no live connect / profile-chart check was run, and no production writes were made.

**Next:** sign in on the deployed site, connect a source, and confirm the disclosure choice persists and the profile chart reflects it; then the security advisors + `rls_smoke.sql` T146–T176 and the `database.types.ts` regen.

## 2026-10-15 — Fix: disclosure trigger blocked every startup write (42501 permission denied)

**Done:**

- **Root cause found (read-only investigation).** `20261011130000_disclosure_levels` created `private.startups_public_metrics()` as **SECURITY INVOKER** while the same file revoked EXECUTE on the helpers it calls (`private.disclosure_band` / `disclosure_growth` / `disclosure_level`) from `public, anon, authenticated` (its grants at ~lines 139-141). The trigger body runs as the role that fired the statement, so every non-owner `INSERT`/`UPDATE` on `public.startups` failed with `42501 permission denied for function disclosure_band`. That is why the add-product wizard's step 1 showed "พร้อมแล้ว 3/3" (a client-side counter that never touches the DB) yet "เผยแพร่และไปต่อ" returned the generic error — `StartupWizard.tsx` `create()` threw the DB error and fell into `setError(common("genericError"))`. Cron sync (`service_role`) hit the same denial. Evidence: `has_function_privilege('authenticated','private.disclosure_band(numeric,numeric[])','EXECUTE')` = `false` and `set role authenticated; select private.disclosure_band(5, array[1,2,3])` → `ERROR 42501`.
- **Fix applied at the owner's approval:** new migration `20261015180000_fix_public_metrics_trigger.sql` — `alter function private.startups_public_metrics() security definer;`. Minimal: the applied migration is untouched, no EXECUTE was granted to `anon`/`authenticated`/`service_role` on the helpers, and the function body is unchanged (already `set search_path = ''` with schema-qualified `public.fx_rates` / `private.disclosure_*`). DEFINER matches the three other write-path triggers on this table (`startups_anonymity`, `startups_before_insert`, `startups_reserve_old_slugs`). Applied with `supabase db query --linked --file …` (exit 0) then recorded with `supabase migration repair --status applied 20261015180000` — never `db push`.
- **Version collision noted:** this fix took the `20261015180000` version that the planned `flag-stale` draft was pencilled in for; that draft must move to a later version (e.g. `20261015190000_sync_stale.sql`).

**Files:** `supabase/migrations/20261015180000_fix_public_metrics_trigger.sql`, `PROGRESS.md`, `Project.md`

**Verified:** read-only, post-apply — `pg_proc`: `prosecdef = true`, owner `postgres`, `proconfig = [search_path=""]`; trigger `startups_public_metrics` still enabled (`O`); `supabase migration list` pairs `20261015180000` Local↔Remote. **End-to-end not yet confirmed** — no write test was run against production (owner constraint).

**Next:** owner creates a product through the wizard (or a staging/local write test) to confirm step 1 → step 2 and that `service_role` sync writes succeed; then the security advisors + `supabase/tests/rls_smoke.sql` T146–T176.

## 2026-10-15 — Applied the six pending migrations (disclosure, chat edit/delete, saves, claim, Polar, PostHog)

**Done** (owner approved "apply the 6 pending migrations only" — no code, no commit, no push):

- **All six pending migrations are live** on `letfxefyqxxrfujpwtri`, in dependency order: `20261011130000_disclosure_levels` → `20261014120000_chat_message_edit_delete` → `20261015120000_saves` → `20261015140000_polar_source` → `20261015160000_claim_startup` → `20261015170000_posthog_source`. The features that were code-only before (saves, claim, Polar, PostHog, chat edit/delete) now have their tables / columns / constraints, and the disclosure layer (`public_*`) exists.
- **Method — never `db push`.** Every local migration version is unpaired with its remote version (the DB holds apply-time stamps, e.g. local `20261011120000_add_funnel_events` ↔ remote `20261011054920`), so `db push` / `migration up` would treat all 27 history migrations as pending and try to replay them. Instead each file was run with `supabase db query --linked --file <path>` (one implicit transaction per file) and recorded with `supabase migration repair --status applied <version>`. A comment-stripped/whitespace-normalised comparison confirmed the local files' executable SQL was identical to what the DB already held, so only comments had drifted.
- **Disclosure backfill verified (Option A respected — the generated `proof_level` was not touched):** `startups.id = 105` → `proof_level = 3`, `public_proof_level = 3`, `public_revenue_level = exact`, `public_mrr_cents = 6880`, `public_traffic_level = exact`, `public_build_level = exact`.
- **Migration headers corrected** (several still said "NOT APPLIED" / the wrong date). This is a deliberate exception to the "applied migrations aren't edited" convention, at the owner's request; SQL bodies are untouched.

**Files:** `supabase/migrations/{20261011130000_disclosure_levels,20261014120000_chat_message_edit_delete,20261015120000_saves,20261015140000_polar_source,20261015160000_claim_startup,20261015170000_posthog_source,20261011120000_add_funnel_events,20261001181036_profile_avatars_v2}.sql` (header comments only), `Project.md`, `PROGRESS.md`

**Verified:** read-only SQL after applying — all 38 `public_*` columns present, `startups_public_proof_level_idx` + trigger `startups_public_metrics` + `private.startups_public_metrics` live; `provider_connections_provider_check` = `stripe/revenuecat/polar/plausible/umami/cloudflare/ga4/jaopor/posthog/github`; `startups_verified_provider_check` incl. `polar`; `public.saves` exists with RLS on; `chat_messages` has `edited_at`/`deleted_at` + `private.chat_messages_edit_guard`; `supabase migration list` pairs all six Local↔Remote; live `https://jaopor.vercel.app/api/public/landing` → 200 with the identical payload (`mrrCents:6880`) and `/api/health` ok. Advisors + `rls_smoke.sql` (T146–T176) **not run yet**; `database.types.ts` **not regenerated**.

**Next:** run the security advisors + `supabase/tests/rls_smoke.sql` T146–T176 against the live DB; regenerate `src/lib/supabase/database.types.ts`; still open — the `flag-stale` implementation (`20261015180000_sync_stale.sql` draft not yet written) and the real-key live checks (Polar OAT, PostHog `phx_`).

## 2026-10-15 — PostHog visitor source + App Store Connect connector (items 1 remainder + ASC research)

**Done** (owner chose "Implement now" for PostHog and "connector + tests only" for App Store Connect):

- **PostHog is now a visitor (traffic) source** — `src/lib/traffic/posthog.ts`: ownership is proven two ways, never by the public `phc_…` token. (1) The key must be **read-only**: a `PATCH /api/projects/:id/` write probe must be refused (`2xx` → `not_read_only`; `401/403` ok; else `upstream`, fail-closed). (2) The project's authorized URL (`app_urls`) must match the listing's website host (`domainMatches`). Visitors 30d / prev 30d from `web_analytics/weekly_digest?days=30&compare=true`; the connector **fails closed** if the returned `metadata` window isn't ≈30 days. Host is region-split and allow-listed (`us.posthog.com` / `eu.posthog.com`; self-hosted unsupported → no SSRF surface). `phx_` only (`phs_` beta → not required yet).
- **PostHog wiring** — `TrafficProviderId` + `"posthog"`; `catalog.ts` (`SOURCES` / `SOURCE_KIND` / `SOURCE_NAME` / `CLAIM_SOURCES` — asset-bound via `app_urls`); `sync.ts` `prepare` case (validate + `app_urls` + first read), `readTraffic` + `pull` switch; `VERIFY_SOURCES`; `ConnectInput.host`; `VerifyPanel` `FIELDS` / `HOW_TO` / `SETTINGS_URL` (`https://app.posthog.com/settings/user-api-keys`); `BRAND_ICONS.posthog` (Simple Icons, black tile) + `ProviderStrip` LIVE; `Sources.posthog.*` in `messages/{th,en}.json`. Migration `supabase/migrations/20261015170000_posthog_source.sql` (**not applied**: `provider_connections_provider_check` + `log_verify_result` whitelist).
- **App Store Connect connector (lib + tests only, no DB/UI)** — `src/lib/appstore/client.ts`: `signAppStoreToken` (ES256 JWT, `.p8` PKCS#8, `ieee-p1363` raw signature, `kid`/`iss`/`aud:"appstoreconnect-v1"`, lifetime capped at Apple's 20 min), `buildSalesUrl` + `fetchSalesReport` (gzipped-TSV `GET /v1/salesReports`, `SALES`+`SUMMARY`), and pure helpers `gunzipSalesReport` / `parseSalesTsv` / `appleIdFromUrl` / `countsAsDownload` / `sumDownloads`. The `downloads` metric kind (option A) is **not** built — it needs owner sign-off.
- **Tests** — 9 PostHog connector tests + `catalog.test.ts` traffic list + claim list + `add-funnel.test.ts` migration-filter now reads `_posthog_source.sql`; 11 App Store Connect tests. Research/design doc: `docs/research/posthog-and-appstore.md`.

**Files:** `src/lib/traffic/posthog.ts`, `src/lib/appstore/client.ts`, `src/lib/appstore/client.test.ts`, `src/lib/traffic/types.ts`, `src/lib/sources/{catalog.ts,catalog.test.ts,connectors.test.ts,sync.ts}`, `src/lib/analytics/{funnel-types.ts,add-funnel.test.ts}`, `src/lib/brand-icons.ts`, `src/components/ProviderStrip.tsx`, `src/components/wizard/VerifyPanel.tsx`, `supabase/migrations/20261015170000_posthog_source.sql`, `messages/{th,en}.json`, `docs/research/posthog-and-appstore.md`, `Project.md`, `Design.md`, `docs/SPEC.md`

**Verified:** `npm run typecheck` ✓ · per-file `npx eslint` ✓ · `npx vitest run` **701 passed / 17 skipped** ✓ (+20) · `npm run build` ✓ · `messages.test.ts` parity + `config.test.ts` ✓. Migrations **not applied**; live PostHog real-key check pending (the `weekly_digest?days=30` window still needs confirming against a real project).

**Next:** owner applies `20261015170000_posthog_source.sql` (+ `20261015160000_claim_startup.sql`, `20261015120000_saves.sql`, `20261015140000_polar_source.sql`); a real read-only `phx_` key to run the PostHog live check; owner sign-off on the `downloads` metric (option A) before wiring App Store Connect into the public surface.

## 2026-10-15 — Claim an imported listing (item 3, second half)

**Done** (owner picked items 1/2/3/5; this finishes item 3):

- **`unclaimed` flag + a system owner** (`supabase/migrations/20261015160000_claim_startup.sql`, **not applied**) — seeds a no-login system auth user (`00000000-0000-4000-a000-000000000001`), adds `startups.unclaimed boolean not null default false`, redefines `private.startups_before_insert` to skip `unclaimed` like `is_demo` (no founding number, no 5-cap), and adds a partial index. `owner_id` stays `NOT NULL`, so every existing RLS policy and `owner_id === userId` check keeps working.
- **Proof must be asset-bound** — `CLAIM_SOURCES` + `isClaimSource` (`catalog.ts`): the listing's website (JaoPor snippet found live / Plausible / Umami / Cloudflare / GA4 domain match) or its GitHub repo matching the listing's `github_url`. **Revenue keys are refused** (`not_claimable`) — holding a payment key proves you took a payment, not which listing is yours.
- **Atomic transfer** — `connectSource` (`sync.ts`) detects `claiming = owner_id !== userId && unclaimed === true`, refuses non-claim sources, then transfers `owner_id` + clears `unclaimed` with a compare-and-set (`.eq("unclaimed", true)`); a losing concurrent claimant gets `not_claimable`. The API route now returns `claimed`.
- **UI** — dashboard tile re-enabled (`SearchIcon` → `/dashboard/claim`); list page (`?q` search over name / website) → detail page (`/dashboard/claim/[id]`) reusing `VerifyPanel` in a new `claim` mode (chooser forced open, sources filtered to claim-safe, success toast + return to `/dashboard`). `src/lib/data/claims.ts` holds the admin-client loaders.
- **Tests/docs** — 3 claim-source catalog tests; RLS smoke T173–T176; messages `Errors.not_claimable` · `Sources.claim.claimed` · `Claim.*`; `Project.md` (§4/§5/§6/§7), `Design.md` (§5 claim section + dashboard tile), `docs/SPEC.md`.

**Files:** `supabase/migrations/20261015160000_claim_startup.sql`, `src/lib/sources/sync.ts`, `src/lib/sources/catalog.ts`, `src/lib/sources/catalog.test.ts`, `src/lib/data/claims.ts`, `src/lib/revenue/types.ts`, `src/app/[locale]/dashboard/claim/{page.tsx,[id]/page.tsx}`, `src/app/[locale]/dashboard/page.tsx`, `src/app/api/startups/[id]/sources/[source]/route.ts`, `src/components/wizard/VerifyPanel.tsx`, `src/lib/supabase/database.types.ts`, `supabase/tests/rls_smoke.sql`, `messages/{th,en}.json`, `Project.md`, `Design.md`, `docs/SPEC.md`

**Verified:** `npm run typecheck` ✓ · per-file `npx eslint` ✓ · `npx vitest run` 681 passed / 17 skipped ✓ (+3) · `npm run build` ✓ (claim routes present) · `messages.test.ts` parity ✓. Migration **not applied** and no importer yet, so the end-to-end claim is pending the owner's apply + imported rows.

**Next:** PostHog source (resolve ownership proof) → App Store Connect (Team key + ES256 JWT). Owner applies `20261015160000_claim_startup.sql` + `20261015120000_saves.sql` + `20261015140000_polar_source.sql`.

## 2026-10-15 — Polar revenue source (item 1, first provider)

**Done** (owner picked item 1, "do all four providers"; Polar is first — read-only key confirmed by research):

- **`createPolarProvider`** (`src/lib/revenue/providers/polar.ts`) — a `RevenueProvider` on `https://api.polar.sh/v1` with bearer `polar_oat_…`: `GET /orders/` (paid only, `net_amount − refunded_amount`) and `GET /subscriptions/`, both paginated (`?page=&limit=100`, up to 500 pages with retries). Read-only is proven by a **write probe**: three `PATCH` calls to a nonexistent UUID (`/products/`, `/customers/`, `/subscriptions/`, body `{}`) → `403` = read-only, `404`/`422` = writable → `not_read_only`. A non-`polar_oat_` key is rejected as `invalid_key` before any request.
- **Wiring** — `ProviderId` / `TransactionProviderId` (`"stripe" | "polar"`) in `revenue/types.ts`; registry in `providers/index.ts`; `catalog.ts` (`SOURCES`, `SOURCE_KIND.polar = "revenue"`, `SOURCE_NAME`); `sync.ts` generalized `writeStripe` → **`writeRevenue(…, provider)`** with a `polar` case in `prepare` and the pull switch; `VERIFY_SOURCES`; `ProviderStrip` moved Polar to LIVE; `VerifyPanel` `FIELDS` / `HOW_TO` / `SETTINGS_URL`; profile page's `mrrAboveRevenue` treats Polar like Stripe; `Sources.polar.*` + provider-enumeration strings in `messages/{th,en}.json`.
- **DB** — `supabase/migrations/20261015140000_polar_source.sql` (**not applied**): adds `polar` to `provider_connections_provider_check`, the one-revenue partial index, `startups_verified_provider_check`, and the `log_verify_result` source whitelist.
- **Tests** — 5 new connector tests (`connectors.test.ts` `describe("Polar")`); `catalog.test.ts` revenue list → `["stripe","revenuecat","polar"]`; `add-funnel.test.ts` parity filter reads `_polar_source.sql`.
- LemonSqueezy recorded as **blocked** (full-access-only keys); PostHog ownership-proof left open — both in `Project.md` §7.

**Files:** `src/lib/revenue/providers/polar.ts`, `src/lib/revenue/types.ts`, `src/lib/revenue/providers/index.ts`, `src/lib/sources/catalog.ts`, `src/lib/sources/sync.ts`, `src/lib/sources/{catalog,connectors}.test.ts`, `src/lib/analytics/funnel-types.ts`, `src/lib/analytics/add-funnel.test.ts`, `src/components/wizard/VerifyPanel.tsx`, `src/components/ProviderStrip.tsx`, `src/app/[locale]/startup/[slug]/page.tsx`, `src/app/api/startups/[id]/sources/[source]/route.ts`, `supabase/migrations/20261015140000_polar_source.sql`, `messages/{th,en}.json`, `Design.md`, `Project.md`

**Verified:** `npm run typecheck` ✓ · per-file `npx eslint` ✓ · `npx vitest run` 678 passed / 17 skipped ✓ · `npm run build` ✓ · `messages.test.ts` parity ✓. Migration **not applied** (owner) and no real Polar key yet, so the live end-to-end check is pending.

**Next:** PostHog (resolve ownership proof) → App Store Connect (Team key + ES256 JWT) → the claim flow. LemonSqueezy stays out.

## 2026-10-15 — Bookmarks: a `saves` table, a Save button, and a real "ที่บันทึกไว้" page

**Done** (owner picked item 3; the saves half lands now, the claim flow next):

- **`public.saves`** (`supabase/migrations/20261015120000_saves.sql`, **owner applies**) — `(user_id, startup_id)` PK, `created_at`, cascade deletes, `saves_user_created_idx` / `saves_startup_id_idx`, RLS showing a save only to its saver (no public read), grants: anon none, authenticated select/insert/delete, service_role all. Hand-added to `database.types.ts` until the owner regenerates.
- **`SaveButton`** on the project page (header actions, before Share) — a client toggle that reads its state after mount (the profile is ISR and cookie-free), links signed-out users to `/login?next=…`, and flips optimistically with `useTransition` + a toast on failure.
- **`/dashboard/saved`** is no longer a placeholder: it lists the viewer's saves newest-first as large `StartupCard`s, dropping anything no longer published, with an empty state.
- **Server actions** `getSaveState` / `setSave` (idempotent upsert / delete, `revalidatePath` on the saved page) plus a `getStartupsByIds` loader.
- RLS smoke tests **T169–T172** added (own row only, no cross-user read/delete, anon denied) — they only pass once the owner applies the migration.

**Files:** `supabase/migrations/20261015120000_saves.sql`, `supabase/tests/rls_smoke.sql`, `src/app/actions/saves.ts`, `src/lib/data/saves.ts`, `src/lib/data/startups.ts`, `src/lib/supabase/database.types.ts`, `src/components/SaveButton.tsx`, `src/app/[locale]/startup/[slug]/page.tsx`, `src/app/[locale]/dashboard/saved/page.tsx`, `messages/{th,en}.json`, `Design.md`, `Project.md`

**Verified:** `npm run typecheck` ✓ · `npm run lint` ✓ · `npx vitest run` 673 passed / 17 skipped ✓ · `npm run build` ✓. Migration **not applied** (owner), so the RLS smoke block is unrun.

**Next:** the claim flow (imported unclaimed listings) → item 1 (Polar / LemonSqueezy / PostHog / App Store Connect) → item 5 (analytics re-check).

## 2026-10-14 — AI-readable surfaces: `llms.txt` + a Markdown twin per project

**Done** (roadmap item "`llms.txt` + Markdown pages", launch-plan §Should-have; the visitor-chart half of the neighbouring roadmap row turned out to be already shipped):

- **`/llms.txt`** — a plain-text [llms.txt](https://llmstxt.org/) index generated from the same public data as the site: key pages, non-empty categories and up to 60 recent non-demo projects, each linking to its Markdown twin. English-only machine file, `Content-Type: text/plain`, hourly revalidation.
- **A Markdown twin per project** at `/{locale}/startup/{slug}/md` — localized labels, a blockquote summary, the verified/counted numbers each stamped with its source (the page's `tractionTiles` logic), then Basics / Description / Problem / Value / Links, and a provenance footer (canonical URL + last updated). Demos and bad locales/slugs 404.
- **Discovery + negotiation** — the profile advertises the twin with `<link rel="alternate" type="text/markdown">`, and the proxy rewrites the human URL to the twin on `Accept: text/markdown` (`markdownPathTarget` in `lib/llms.ts`).
- **Visitors chart was already shipped** — `getChartSeries` builds the `visitors` series when traffic disclosure is exact and the chart already renders it; no code change, just the roadmap tick.
- Decisions: the canonical twin is a `/md` sub-path (not a `.md` suffix) so the proxy's dot-based matcher stays untouched; builders (`/u/…`) are excluded — they read through the admin client (`SUPABASE_SECRET_KEY`).

**Files:** `src/lib/llms.ts`, `src/lib/llms.test.ts`, `src/app/llms.txt/route.ts`, `src/app/[locale]/startup/[slug]/md/route.ts`, `src/proxy.ts`, `src/app/[locale]/startup/[slug]/page.tsx`, `e2e/llms.spec.ts`, `messages/{th,en}.json`, `Design.md`, `Project.md`

**Verified:** `npm run typecheck` ✓ · `npm run lint` ✓ · `npx vitest run` 673 passed / 17 skipped ✓ · `npm run build` ✓ · `npm run test:e2e` 125 passed / 21 skipped ✓ · prettier ✓. Runtime: `/llms.txt` 200 with real data; `/th/startup/jaopor/md` shows the Thai fact bullets with source stamps; `/en/…/md` shows English labels; `Accept: text/markdown` on the human URL returns the twin; an unknown slug 404s. Committed `cd5f441`, pushed to `master`.

**Next:** item 5 (OG-card font, analytics-connection re-check) → item 1 (Polar / LemonSqueezy / PostHog / App Store Connect) → item 3 (bookmarks/saves + claim flow, ships a migration the owner applies).

## 2026-10-14 — Content-driven BuilderCard footer + drag-to-reorder screenshots

**Done** (owner: the founder card should lay out safely for arbitrary user content at any width, and the screenshot `<`/`>` reorder was frustrating — make it drag-and-drop):

- **BuilderCard footer is now content-driven and robust.** The previous fix used a zero-basis flexible spacer to push the province right, but a spacer still consumes the `gap-x-3` column gap, so at some widths it wrapped onto the province's own line and its `flex-grow` pushed the _wrapped_ province to the far right (the exact bug it was meant to prevent). Replaced the spacer with `justify-between` and the province as the row's second child: on one line the province sits at the right edge, and because `space-between` falls back to the start for a lone item, a province that wraps to its own line lands at the **left** edge. Every part wraps internally (`min-w-0` + `[overflow-wrap:anywhere]`); no item carries `nowrap` and nothing is width-fixed. Also added `title` tooltips on name / handle / headline and made skill chips truncate (`max-w-full truncate`).
- **Screenshots reorder is now drag-and-drop.** Native HTML5 DnD on each tile with real feedback: a `GripVerticalIcon` handle, the dragged tile fades to 40% (`opacity-40`), and the hovered drop target gets `ring-2 ring-brand`. `draggable={false}` on the image and `text/plain` set on the dataTransfer (Firefox won't start a drag without data). The pure `moveShot` helper was extracted to `lib/media.ts` and unit-tested; the `<`/`>` buttons stay for keyboard and touch (native DnD doesn't work on touch) and the caption input keeps `select-text`.

**Files:** `src/components/builder/BuilderCard.tsx`, `src/components/wizard/ScreenshotsManager.tsx`, `src/lib/media.ts`, `src/lib/media.test.ts`, `Design.md`

**Verified:** `npm run typecheck` ✓ · `npm run lint` ✓ · `npx vitest run` 665 passed / 17 skipped ✓ · `npm run build` ✓ (60/60). BuilderCard measured with a temporary stress route (fixed-width fixtures at **360→110 px**, th + en, desktop 1280 + mobile-375): same-row province right-aligned, wrapped-alone province **left**-aligned, no horizontal overflow, and the revenue badge + amount always on one row (both alignment branches exercised). Temporary route + Playwright spec deleted afterwards. Committed `3ca6e29`, pushed to `master`.

**Next:** owner click-through of drag reordering on the edit page (needs a signed-in my project); builder profile pages still need `SUPABASE_SECRET_KEY` to render locally.

## 2026-10-14 — Fix four owner-reported issues: unread badge, login logos, Stripe guide, GA4

**Done** (owner: four issues after using the product — the messages badge didn't clear, the login buttons had no provider logos, the Stripe restricted-key guide was confusing after Stripe changed its flow, and Google Analytics never appeared as a choice):

- **Header messages badge now clears when you read.** `markRead` stamps `conversation_reads.last_read_at` with the **database's own clock** (the newest message's `created_at`) instead of the server's `new Date()` — server/frontend clock skew left the last message reading as unread forever. `unreadByConversation` also skips soft-deleted messages. `ChatThread` dispatches a `READ_EVENT` on `window` after each read; `MessagesLink` listens for it (plus window focus), so the badge drops the moment you open a thread instead of waiting up to the 60s poll.
- **Login buttons show provider logos.** Monochrome Google "G" and GitHub marks (Simple Icons paths) inside `LoginButtons`, sized by the Button's `[&_svg]` rule.
- **Stripe restricted-key guide matches the new dashboard flow.** Steps now walk Stripe › Developers › API keys › Create restricted key → "Building your own integration" → "Custom permissions", and the permission table labels each row's category — **Charges sits under Core, Subscriptions under Billing**, so setting all of Core to Read is not enough (the owner's exact trap). `ProviderError("missing_permission")` now carries the resource as `detail`, so the error names it: "คีย์ยังขาดสิทธิ์อ่านสำหรับ Subscriptions — ตั้ง Subscriptions เป็น Read ตามขั้นตอนด้านบน".
- **Google Analytics is always offered in the verify chooser.** Removed the `NEXT_PUBLIC_GA4_SERVICE_EMAIL` gate on visibility; when the email isn't set the email box shows a "not configured on this deployment" note (the secret `GA4_SERVICE_ACCOUNT_JSON` still gates a real connect). Also dropped the stale "Google Analytics not supported yet" traffic note.

**Files:** `src/lib/chat.ts`, `src/app/actions/chat.ts`, `src/components/chat/{ChatThread,MessagesLink}.tsx`, `src/components/LoginButtons.tsx`, `src/components/wizard/VerifyPanel.tsx`, `src/lib/revenue/providers/stripe.ts`, `messages/{th,en}.json`

**Verified:** `npm run typecheck` ✓ · `npm run lint` ✓ · `npx vitest run` 661 passed / 17 skipped ✓ · `npm run build` ✓ (60/60). Committed `9bc555c`, pushed to `master`. UI not visually checked (badge needs a signed-in conversation; the GA4 email box needs `NEXT_PUBLIC_GA4_SERVICE_EMAIL`).

**Next:** owner sets `NEXT_PUBLIC_GA4_SERVICE_EMAIL` (public) **and** `GA4_SERVICE_ACCOUNT_JSON` (secret) in Vercel for GA4 to connect; a signed-in click-through that the header badge clears after reading a thread.

## 2026-10-14 — Chat: edit and delete your own messages (+ card, bubble and wizard fixes)

**Done** (owner: after the dark-theme chat review, "yes" to edit/delete + commit):

- **Edit / delete your own chat messages.** New soft-delete migration `chat_message_edit_delete`: `chat_messages` gains `edited_at` / `deleted_at`, an author-only RLS UPDATE policy (live row, open conversation) and `private.chat_messages_edit_guard`. A delete empties the body and stamps `deleted_at`, so both people see "ข้อความถูกลบ" and the order is unchanged. New `editMessage` / `deleteMessage` server actions; the bubble's `⋯` menu (mine only) offers แก้ไข / ลบ with an inline editor; a realtime `UPDATE` subscription patches edits and deletes live; an edited bubble shows "· แก้ไขแล้ว". The conversation-list preview shows the deleted placeholder too.
- **Card and bubble fixes.** The large StartupCard's category tag moved to its own full-width line (the header's copy-link / ✓ verified block was squeezing it to ~57px); the BuilderCard footer wraps its groups instead of overflowing; the incoming chat bubble gets a `border-border` outline (in the dark theme `--secondary` #18181b sat ~2 levels from the card #161618 and vanished into the thread).
- **Wizard hint.** A pasted link we never read (LINE OA, GitHub, a social page) now says so, so the founder fills the name and details in.

**Files:** `supabase/migrations/20261014120000_chat_message_edit_delete.sql`, `src/app/actions/chat.ts`, `src/components/chat/{ChatThread,ChatShell}.tsx`, `src/lib/data/chat.ts`, `src/lib/supabase/database.types.ts`, `src/components/StartupCard.tsx`, `src/components/builder/BuilderCard.tsx`, `src/components/wizard/StartupWizard.tsx`, `messages/{th,en}.json`, `supabase/tests/rls_smoke.sql`, `Design.md`

**Verified:** `npm run typecheck` ✓ · `npm run lint` ✓ · `npx vitest run` 661 passed / 17 skipped ✓ · `npm run build` ✓ (60/60). Committed `a0a038b`, pushed to `master`. **Chat UI not visually checked** (needs a signed-in conversation) and the migration is **not applied** yet.

**Next:** owner applies `20261014120000_chat_message_edit_delete.sql` → regenerate `database.types.ts` → advisors + `rls_smoke.sql` (T98a–d) → a signed-in click-through of edit/delete.

## 2026-10-14 — Main domain opens the product; the landing stays on its own domain

**Done** (owner: the landing already lives at `jaopor-landing.vercel.app`, so serving it from `jaopor.vercel.app` too is redundant — a click on `jaopor.vercel.app` should open the product):

- **Reverted the multi-zone.** Removed the `beforeFiles` rewrites in `next.config.ts` (`/` → landing, `/landing/:path*` → landing) and the `LANDING_ORIGIN` constant; the proxy (`src/proxy.ts`) no longer bypasses `/` and `/landing/*`, so next-intl handles `/` as usual.
- **Result:** `jaopor.vercel.app/` → **307 `location: /th`** (product home); `/en` and all other paths unchanged. The landing is now served **only** at `jaopor-landing.vercel.app`. The app keeps `GET /api/public/landing`, which the landing still reads for live numbers.

**Files:** `next.config.ts`, `src/proxy.ts`
**Verified:** `npm run typecheck` ✓ · `npm run lint` ✓ · `npx vitest run` 658 passed / 17 skipped ✓ · `npm run build` ✓ (60/60). Runtime (`next start`, port 3999): `curl -I /` → `HTTP/1.1 307` `location: /th`; `/th` → 200.
**Next:** owner go → push; the app redeploys and the main-domain root stops serving the landing. Landing repo later: point its canonical/OG at `jaopor-landing.vercel.app` (currently `jaopor.vercel.app`).

## 2026-10-13 — Olympics podium on every metric + LINE OA link guide

**Done** (owner: the podium "doesn't display in every category", plus a request for a guide for LINE OA links):

- **Podium never disappears.** It was gated on `board.length > 0`, so for `revenue30d` / `mrr` / `visitors` / `commits` — where no province had data yet — the podium _and_ the whole standings table vanished, leaving a large hole (confirmed on prod: `?metric=mrr` → 0 podium steps, 0 tables). The podium now renders for every metric and every region filter; unfilled places are dashed invite steps ("ที่ว่าง · จังหวัดของคุณ?") and, when fewer than three provinces qualify, a one-line invitation with the add-project link sits under the steps.
- **Board empty state.** Instead of rendering nothing, the standings area shows "ยังไม่มีจังหวัดที่มียอด<metric>" + a short body + "เพิ่มผลงาน".
- **Motion.** Places rise in, staggered, once when the podium is first seen and again on a metric / region switch (the section is keyed `metric-region` so it remounts); reduced motion is instant. Reuses `InView` + globals.css — no new dependency.
- **LINE OA guide.** The add-startup link field now has a collapsed "ลิงก์แบบไหนใช้ได้บ้าง?" guide listing each accepted link and where to find a LINE OA `@id` (LINE Official Account Manager → account page, or a `lin.ee/…` / `page.line.me/…` link).

**Files:** `src/components/olympics/PodiumSteps.tsx`, `src/components/olympics/OlympicsBoard.tsx`, `src/app/[locale]/olympics/page.tsx`, `src/app/globals.css`, `src/components/wizard/StartupWizard.tsx`, `messages/{th,en}.json`

**Verified:** `npx tsc --noEmit` ✓ · `npx eslint` (touched files) ✓ · `npx vitest run` 658 passed / 17 skipped ✓ · `npx next build` ✓. **Not visually verified** — no local Supabase env, so the page can't be rendered here; check the Vercel preview after a push.

**Next:** owner says "push" → the app redeploy ships the podium fix + guide.

## 2026-10-13 — Store logo gets its own read budget (App Store / Google Play auto-fill)

**Done** (owner: on production the Google Play link filled the name and tagline but not the logo, though it worked locally): the icon fetch shared the same 3 s `AbortSignal.timeout` as the metadata read, which is slow on Vercel, so the text parsed but the icon fetch was already aborted. Both `appStoreAutofill` and `playStoreAutofill` now start the logo fetch on a fresh 3 s signal (`signal.aborted ? null : await firstLogo(...)`).

**Files:** `src/lib/net/link-preview.ts`
**Verified:** typecheck ✓ · lint ✓ · unit 658 passed / 17 skipped ✓ · `next build` ✓ (temporary live checks deleted).
**Next:** ship with the next app push (commit `363aa17`).

## 2026-10-13 — Add-startup auto-fill now works for App Store and Google Play links

**Done** (owner: "when i tried to add app store link, that function did not work" — store links were excluded from auto-fill by design, so they returned `not_website` and nothing filled):

- **App Store** (`apps.apple.com/.../idN`): reads Apple's public lookup API (`itunes.apple.com/lookup?id=N`, storefront from the URL path, 256 KB) → name (`trackName`), one-liner (first sentence of the description, ≤ 140) and logo (`artworkUrl512`, resized to 256 px PNG). The store page's own og tags are skipped — they name the store ("App Store", Apple's favicon), not the app.
- **Google Play** (`play.google.com/store/apps/details?id=…`): reads the page (2 MB; Play's og tags sit ~1 MB in, after a large inline state) → name (`og:title` minus the " - Apps on Google Play" suffix), one-liner (`og:description`, ≤ 140) and logo (`og:image`, its `=s0-br30` / `=w240-h480` size suffix rewritten to `=s512`; Google's own favicon dropped).
- **Wizard:** auto-fill now runs for store links too (`siteUrl` covers website + both stores, never a platform page or GitHub / LINE), with honest status copy ("เติมจากหน้าร้านแล้ว" / "we read the name, tagline and icon from the store page").
- Same SSRF guard (`lib/net/public-url`), 3 s budget and 1 h memo as the website path.

**Files:** `src/lib/og-parse{,.test}.ts` (pure `appStoreId`, `parseAppStoreLookup`, `parsePlayStore`), `src/lib/net/link-preview.ts` (`getStoreAutofill`), `src/app/api/startups/preview/route.ts`, `src/components/wizard/StartupWizard.tsx`, `messages/{th,en}.json`, `Design.md` §5.

**Verified:** typecheck ✓ · lint ✓ · unit 658 passed / 17 skipped (4 new parser tests) ✓ · build ✓ · **live run** (temporary test, deleted): `apps.apple.com/th/app/line/id443904275` → name "LINE" + first-sentence one-liner + 512 icon as a PNG data URL; `play.google.com/.../com.whatsapp` → "WhatsApp Messenger", "Simple. Reliable. Private." + icon.

**Next:** owner says "push" → the app redeploy ships store auto-fill.

## 2026-10-13 — Landing uses real featured data + quick text set; app login hint

**Done** (carried over after the previous session hit its limit; all three remaining decisions implemented — nothing pushed or deployed without the owner's go):

- **Hero contradiction fixed** (`feat/featured-team-project` merged into landing `master` as `8c2e9dd`): the card now reads the app's `featured` (JaoPor's real verified MRR, pill "ผลงานของทีม JaoPor · ไม่จัดอันดับ"); the Sample card stays as the only fallback when nothing is verified. Boards never list team projects and open at 3 (`rankedRows`, `Board.emptyMin`/`unavailable`; `featured.ts` + 8 tests). Only hero conflict — resolved so the real card wins and `p && featured` replaces the old `p && top`.
- **Quick text set** (`b0215f9`): nav/footer Olympics labels match the app (nav "โอลิมปิก"/"Olympics", footer "โอลิมปิกจังหวัด"/"Province Olympics"); "Pending / รอยืนยัน" → "Awaiting verification / รอยืนยันตัวเลข"; Proof section example one-liner (MRR verified through Stripe at the source · 30-day visitors counted by Plausible); dropped the double-read `aria-labelledby` on the stack scene.
- **Cleanup** (`84a703f`): removed the accidentally committed `.cursor/settings.json`, added `.cursor/` to `.gitignore`.
- **App login hint:** `/login` adds "ยังไม่มีบัญชี? กด Google หรือ GitHub เพื่อสร้างบัญชีฟรี" / "No account yet? Use Google or GitHub to create one free." under the sign-in buttons.

**Files:** landing `src/components/Hero.tsx`, `src/lib/featured.ts`, `src/lib/featured.test.ts`, `src/components/Leaderboard.tsx`, `src/components/ProofNetwork.tsx`, `src/components/StartupConstellation.tsx`, `messages/{en,th}.json`; app `src/app/[locale]/login/page.tsx`, `messages/{en,th}.json`.

**Verified:** app typecheck ✓ · lint ✓ · unit 654 passed / 17 skipped ✓ · local build renders `/th/login` + `/en/login` with the hint and legal line, no raw key ✓ · landing typecheck ✓ · lint ✓ · 30 unit tests ✓ · `npm run build` ✓.

**Live:** owner said "push" → pushed landing `master` (`84a703f`) and app `master` (`dd5c218`); both Vercel projects auto-deploy from GitHub. Confirmed on prod: `/th/login` + `/en/login` show the new hint, and the landing (root + `/th`) shows "รอยืนยันตัวเลข", the footer "โอลิมปิกจังหวัด", and the proof example line — the old "โอลิมปิก 77 จังหวัด" is gone.

## 2026-10-13 — Founder profile: 4 key cards like TrustMRR (revenue · MRR · followers · projects)

**Done** (owner, from TrustMRR's founder profile: "ชอบ … followers จาก social media และ total startups"; GA kept):

- **The `/u/…` number strip** is now always the same 4 cards (the project page's StatCard look):
  - รายได้รวม and MRR รวม: verified only, "—" + "ยังไม่มีรายได้ที่ยืนยัน" when none.
  - **ผู้ติดตาม**: JaoPor followers with "+n ใน 30 วัน". It adds "GitHub n (@login)" only when the GitHub listed on the profile is the account the builder signs in with (`lib/data/github-followers`, GitHub public API, cached a day; 12 unit tests).
  - **ผลงานทั้งหมด**: with "ยืนยันตัวเลขแล้ว n ชิ้น · ★ stars".
- The old tiles (posts in 6 months, GitHub stars card) are folded into these cards.
- **X followers are not offered:** X's API is paid, and we don't show numbers we can't check.
- **Google Analytics as a visitor source in Add Startup:** the code and migration are live but the option stays hidden until JaoPor's Google service account exists (owner tasks in Project.md §7: create it, then add `GA4_SERVICE_ACCOUNT_JSON` and `NEXT_PUBLIC_GA4_SERVICE_EMAIL` in Vercel).

**Verified:** typecheck ✓ · lint ✓ · unit 654 passed / 17 skipped · e2e local 121 passed / 0 failed.
**Not verified:** the founder page in a browser. It can't render locally without `SUPABASE_SECRET_KEY`, which Claude doesn't handle. To check on production after the push.
**Next:** owner says "push", then check `/th/u/gxcb06` at 1440 and 375.

## 2026-10-13 — Landing release: copy pass, example MRR card, two-line scene headline

**Done** (owner: "commit, push และ deploy" plus four small changes; landing repo `da10466`, deployed as `dpl_83Vws4qXuTjhXM7u4bYeqDCvh81t`, READY, live on both `jaopor-landing.vercel.app` and the main domain):

- **Hero MRR card:** the owner wanted it filled with a made-up example and a chart. With no verified MRR the card now shows a clearly labelled example (neutral dot, "ข้อมูลสมมติ / Sample data" pill, ฿48,000 / $1,400, a rising chart, "made-up numbers, to show how it looks once connected"); no verified shield, no "verified" wording. When a project has a verified MRR the real card and its real chart are shown as before.
- **Wording:** scene sub-line "แชร์ Product ที่คุณสร้าง แล้วให้ตัวเลขยืนยันความสำเร็จ" (en "Share the product you built, and let real numbers confirm its success."); proof title "ตัวเลขทุกตัว มีที่มาที่ไป" (en "Every number has a clear origin").
- **Scene headline:** the first line no longer runs across the whole screen on wide displays: it is two short lines, "ทุกเครื่องมือ ทุกภาษาโค้ด" / "ทุกเอเจนต์ AI ที่คุณใช้สร้าง" (new key `Stack.line1b`), max width 54 rem.
- **Copy pass** (previous entry) shipped in the same commit.

**Verified:** typecheck ✓ · lint ✓ · 22 unit tests ✓ · build ✓; screenshots: card th/en, dark/light, 375 / 1280 / 1900 (no clipping, no sideways scroll); live pages on both URLs contain the new strings and none of the old ones.
**Slip:** `git add -A` also committed an untracked `.cursor/settings.json` (a Vercel plugin toggle created by a tool, no secrets). Harmless; remove it with a follow-up commit if unwanted.
**Not done:** the app repo's unpushed docs commit (`6839cac`) and this entry are not pushed (a push redeploys the app); the leaderboard badge "VERIFIED SOURCES ONLY" is unchanged; "success" in the scene sub-line is the owner's wording (early projects have no success numbers yet).

## 2026-10-13 — Landing copy pass (English + Thai), local only

**Done** (owner pasted a section-by-section copy review and asked to apply it in English and Thai; landing repo; Hero untouched as asked; since released, see the entry above):

- **Applied:** "What do you get when you add your project to JaoPor?" + lead ("meet people to build with"; Thai "คนร่วมสร้าง" instead of "คนร่วมทาง"); Projects ("What Thai builders are building" / "สิ่งที่คนไทยกำลังลงมือสร้าง"); leaderboard footnote (metrics synced from connected sources, a dash means no verified data, visitor counts come from analytics tools and are not verified by JaoPor); the 77-provinces card ("Great work can start anywhere"); Security headline and lead ("Share your metrics, not your private data"); founder title ("Built by a builder, for builders", Thai "สร้างโดยคนสร้าง เพื่อคนสร้าง") and a light grammar fix of the quote; CTA headline, text and the three steps (step 3 now says it is optional); footer line.
- **Adjusted from the review on purpose:** (1) headings stay in sentence case like the rest of the page, not Title Case; (2) "What we never touch" became "What we never store or ask for" (th "สิ่งที่เราไม่เก็บและไม่ขอสิทธิ์"), because that matches the app's own Security page ("We never store your customers' data…") and the connectors do read API responses that may contain such fields, so "don't access" would overclaim; (3) the founder quote only got a grammar fix (owner's voice kept), the heavier rewrite was not applied.
- **Bug:** the CTA headline had no space between its two parts in the text (`it.Let`); fixed in `Closing.tsx` (the same pattern in the Hero was left alone as asked; it is invisible on screen).

**Verified:** typecheck ✓ · lint ✓ · 22 unit tests ✓ · build ✓; th + en at 1280 and 375: no sideways scroll, no clipped text, CTA text reads "You've built it. Let people see it."; screenshots of Features, CTA, Builders, Security checked.
**Not changed (flag):** the leaderboard badge still says "VERIFIED SOURCES ONLY" while the board also ranks visitors and commits, which the footnote now says are not verified by JaoPor. Worth a decision.
**Next:** owner review; then explicit go to commit, push and deploy the landing.

## 2026-10-13 — Olympics stepped podium, province dot on the map, clearer verify step, faster-feeling site

**Done** (owner, testing production: Olympics "อยากให้มี bar ranking … ตัวอย่างก็ให้ดูแล้ว"; "รูปจังหวัดทำไมไม่ตรง"; step 2 "แอบดู plain text", the way back to change the verify method "หาไม่ค่อยเจอ", the stepper "ยังไม่สมบูรณ์"; the site "หน่วง ๆ แลค ๆ"):

- **Olympics podium (`PodiumSteps`):**
  - Flat steps 2 · 1 · 3, side by side on every width.
  - Each place has the province badge, a medal next to the name, and its total in a chip; #1 gets a trophy.
  - It shows as soon as one province competes; empty places are dashed "+ ที่ว่าง" steps → `/new`. Only 2 provinces compete today (JaoPor's own project never ranks), so a podium gated at 3 or 5 would never have shown.
  - The full ranking with leader bars stays below. The old podium cards (`Podium.tsx`) are removed.
- **Province badge:**
  - A dot now marks the province itself (`lib/config/province-points`: capital lon / lat, projected the way the map was drawn).
  - 6 coastal or border points are nudged; a test keeps all 77 inside their region.
  - Olympics rows used `sm:block`, which dropped the centring, so the map hugged the tile's left edge. Fixed.
- **Add Startup step 2:**
  - Two cards with icon tiles like step 1.
  - Stage cards show what you'd verify, as metric chips.
  - The chosen method has an outline "← เปลี่ยนวิธี" button (was a small grey link).
  - Metric rows got icon tiles and chevrons; the source switch is a segmented control. The edit page shares these.
  - Stepper circles are opaque, so the line no longer runs through the done ✓.
  - Fixed the doubled "✓ ✓" in the "what you get" strip.
- **Faster feel:**
  - `NavProgress`: a thin brand bar at the top starts on every internal link click (measured 38 ms) and completes when the new page renders. A root `loading.tsx` was tried first and dropped: it turned 404s into 200s (`e2e/not-found.spec.ts` caught it).
  - The Recharts plot (~390 KB) loads after the page is interactive (`MetricChartPlot`, `next/dynamic` `ssr: false`, same-height placeholder); the total, controls and stamp still render on the server.
  - Google Analytics now loads `lazyOnload`.

**Measured** (Playwright + Chrome, CPU ×4; before = live site on the old code, after = local production build; one run each, different hosts, so indicative only):

- Main-thread blocked time during load:
  - project page 2.2 → 1.4 s (desktop), 2.5 → 1.9 s (375);
  - Olympics 1.4 → 0.9 s / 1.6 → 1.3 s;
  - home 1.2 → 0.9 s / 1.5 → 1.35 s;
  - builder profile and feed about unchanged.
- Scroll p95 frame: project page and home 34–50 → 17 ms.
- CPU profile: Recharts and gtag now run after load rather than before; total work is similar, moved off the first moments.

**Verified:**

- typecheck ✓ · lint ✓ · unit 642 passed / 17 skipped · e2e local 121 passed / 0 failed · build ✓.
- Screenshots: Olympics 1440 / 375 dark / light; zoomed podium; wizard step 2 and the picked method 1440 / 375 (temporary local page, deleted).

**Not verified:** a real phone; the signed-in step 1 → 2 for real.
**Next:**

- Owner review, then push.
- Open decision: keep Google Analytics (≈330 ms of main thread per page on a mid phone) or rely on Vercel Analytics only.

## 2026-10-13 — Next / back in Add Startup and onboarding starts the step at its top

**Done** (owner, on production: "กดถัดไปแล้วมันค้างอยู่ส่วนนั้น แต่ผมกลับต้องเลื่อนขึ้นเอง"):

- New `useStepScroll` (`src/lib/use-step-scroll.ts`). When the step changes, the top of the flow comes back under the header, smoothly or instantly with reduced motion, and only when it is off screen. Focus moves there for keyboards and screen readers.
- Used in the Add Startup wizard (step 1 ↔ 2) and the onboarding steps. The edit page already scrolled up.
- Design.md §5: the rule for every multi-step flow.

**Verified:**

- Playwright on a temporary local wizard page (deleted). Scrolled to the bottom of step 2, then "ย้อนกลับ":
  - 375 px: scroll 778 → 32, stepper 68 px from the top, just under the header;
  - 1440 px: scroll 670 → 0;
  - the same with reduced motion;
  - focus lands on the flow's top.
- typecheck ✓ · lint ✓ · unit 640 passed · e2e local 121 passed / 0 failed.

**Not verified:** step 1 → 2 for real (it needs a signed-in insert); it uses the same hook on the same element.
**Next:** push on the owner's go.

## 2026-10-13 — Aetox text updated; app pushed

**Done** (owner: "Push + A"; the founder's consent was relayed by the owner):

- Aetox (`aetox-harness`) one-liner set to option A (137 characters, within the 140 cap). The description, which was empty, is now the founder's full 189-character text. One row updated with `execute_sql`; no other data touched.
- Pushed the 3 local app commits: profile v3, theme contrast, Add Startup v3 / v3.1, Olympics bar, builder columns. Then this log.

**Verified:** the update returned the row with lengths 137 / 189.
**Next:** check production after Vercel's build: the project page, `/new` signed in, and the Aetox card.

## 2026-10-13 — Add Startup with icons and a clear "who sees the name" choice; founder page columns scroll together

**Done** (owner: "ไม่รู้เลยว่าปุ่ม anonymous หมายความว่ายังไง … ใช้พลังงานสมองให้น้อยที่สุด"; "ตอนเลื่อนลงให้มันเลื่อนไปพร้อมกัน … รู้สึกเวียนหัว"):

- **Add Startup v3.1:**
  - The two intro paragraphs became 4 icon chips: one link, we fill the rest · change anything later · public when you publish · verified numbers come in step 2.
  - Each part has an icon tile (link, pencil, map pin, eye) that turns into a green check once the part is complete.
  - The logo moved into part 2, so part 3 is just the province.
  - **"ใครเห็นชื่อผลงาน?"** replaces the anonymous checkbox with two picture cards:
    - "แสดงชื่อผลงาน" (recommended), showing a logo and the typed name;
    - "ไม่เปิดเผยชื่อ", showing a grey square and a blurred bar.
  - Strings that are no longer used were removed (`Wizard.basicsIntro`, `selfReportedNote`, `Anonymous.wizardLabel/Hint`).
- **Founder profile (`/u/…`):** the sidebar is no longer pinned, so both columns scroll together.
- **Design.md §4:** new rule "Columns scroll together". Only navigation, bars and the wizard's live preview may stay pinned.
- **Recorded in Project.md §7:**
  - Aetox: consent given, but the 189-character text doesn't fit the 140-character one-liner, so the owner picks the wording.
  - Spacing: the site reads easier at 90% zoom; to revisit.

**Verified:**

- typecheck ✓ · lint ✓ · unit 640 passed / 17 skipped · e2e local 121 passed / 0 failed.
- Wizard screenshots at 1440 and 375, dark and light, through a temporary local page (deleted).

**Next:** the owner picks the Aetox one-liner; push on the owner's go.

## 2026-10-13 — Project page like TrustMRR (4 key cards, Share + Visit on top), clearer cards in both themes, Add Startup with steps, Olympics bar always on

**Done** (owner: profile "overwhelming" next to TrustMRR, wants 4 cards + Visit / Share placed properly; cards blend into the light page; Add Startup "plain text, no interactive experience"; "ranking bar … always display it"):

- **Project page (Profile layout v3):**
  - One column. Header: logo, name, one-liner, a meta row (category, badges, proof ⓘ, links). **Share + Visit sit top right** (phones: one row under the name).
  - **Four key cards:** all-time revenue · MRR · founder (links to their profile) · founded (+ province / Olympics rank). Without verified revenue the first two take the next public numbers (visitors, commits, users), which then aren't repeated below. The "MRR above revenue" explanation moved into the MRR ⓘ.
  - Then the chart; then tabs (screenshots · about · insights · updates) and the story. The cover banner and the pinned left column are removed; the name bar now appears at every width.
- **Theme contrast:**
  - Light: grey page `#f4f4f5`, white cards, chips `#ebebee`, faint text `#67676f` (contrast rechecked).
  - Dark: cards `#161618`, borders `#2a2a2e`.
  - Cards get a hairline shadow.
- **Add Startup v3:**
  - A 3-step stepper (ลงผลงาน → ยืนยันตัวเลข → เปิดหน้าผลงาน).
  - Step 1 split into 3 numbered cards that turn green when complete, with a "พร้อมแล้ว n จาก 3" bar.
  - Live card preview + "หลังจากนี้" beside the form (under it on phones).
  - Step 2 opens with "สร้างหน้าผลงานแล้ว". Same fields and rules as before.
- **Olympics:** the table always starts at #1 with every row's leader bar, also when the desktop podium shows.
- Design.md first for each (§2 page vs card, Profile layout v3, wizard v3, Olympics); th + en strings.

**Files:**

- `src/app/[locale]/startup/[slug]/page.tsx`, `src/components/ProfileBlocks.tsx` (FounderCard), `src/components/profile/{ProjectBlocks,StickyIdentity,SectionTabs}.tsx`, ProfileCover removed;
- `src/app/globals.css`, `src/components/core/Card.tsx`;
- `src/components/wizard/{StartupWizard,WizardParts}.tsx`, `src/app/[locale]/new/{page,loading}.tsx`;
- `src/components/olympics/OlympicsBoard.tsx`, `src/app/[locale]/olympics/page.tsx`;
- `messages/{th,en}.json`.

**Verified:**

- typecheck ✓ · lint ✓ · unit 640 passed / 17 skipped · e2e local 121 passed / 0 failed.
- Screenshots at 1440 and 375, dark and light: project page th / en (cards fit after shortening the month on phones and letting labels wrap), Olympics, home.
- Wizard (signed out, through a temporary local page, deleted before commit): empty, filled, step 2.

**Not verified:** the real signed-in `/new` flow end to end (OAuth can't be automated here); share images still use the old card colours (separate renderer palette, unchanged on purpose).
**Next:** owner review in the browser; push only on the owner's go.

## 2026-10-13 — Landing zone merged and live on the main domain

**Done** (owner approved the release after the pre-release verification):

- **Merged `landing-zone` into `master`** (`c117510`, 3 commits, `next.config.ts` +18 and `src/proxy.ts` +5) and pushed. The push also carried `2f3ba65`, another chat's docs-only commit (Design.md, PROGRESS.md, Project.md). Vercel production deployment `dpl_8vfBMaxByTNc7hwfYvNZKV7muHDz` (`c117510`) is READY.
- **Before the push:** `d0486f5` (live map always on, swipeable home rows) had already been pushed by someone else and was validated here: typecheck, lint, 640 unit tests, build, browser checks at 375 / 420 / 768 / 1280. A merged candidate (`master` + `landing-zone`, isolated worktree, removed afterwards) passed the same checks plus route and metadata checks.
- **Corrects earlier entries:** the 2026-10-13 entries that say the landing is "local only / not committed / not deployed" are out of date: landing commits `4e2d0c2` and `4a4cb37` are pushed, deployed (`dpl_EHm4gVtehF4DTqzbBwNRc17PaJL5`), and now served at `/`.

**Verified on production (https://jaopor.vercel.app, read-only):**

- `/` 200 serves the landing (Thai by default, `Accept-Language` and `NEXT_LOCALE` pick th / en); canonical, `og:url`, `og:image` point at the domain; `/landing/og` 200 image/png 1200×630; landing assets under `/landing/_next` 200.
- App routes unchanged: `/th`, `/en`, `/th|en/startups`, `/th/olympics`, `/th/feed`, `/th/security`, `/th/new`, `/th/startup/jaopor`, `/api/public/landing`, `/robots.txt`, `/sitemap.xml` all 200 with the right language and canonical; `/startups` still 307 → `/th/startups`.
- All 12 landing links to the app (new, startups, a project, builders, security, feed, categories, privacy, terms, olympics, a builder handle) return 200.
- e2e on production: 136 passed, 6 skipped, 0 failed (1.5 min).

**Not verified:** Safari / Firefox / a real phone for the pinned scene and the swipeable rows; the world-map mode of the live board; a user arriving with a language other than th / en. No email, domain or search-console changes were made.
**Next:** watch production for a day (Vercel logs, `/` latency, the landing project's health: if it is down, `/` is down); the landing is one project, so rollback is on the app project (see Project.md); add a custom domain when chosen.

## 2026-10-13 — Landing shows JaoPor's MRR as an unranked team project (local only); Olympics v4 and tabs proposals

**Done** (owner brief: landing local only, Aetox option B, Olympics v4 proposal with the podium image as inspiration, tabs analysis; no push / deploy / merge):

- **Landing** (separate repo; worktree `C:\Users\ACER\jaopor-landing-featured`, branch `feat/featured-team-project`, commit `7d8819b`, **not pushed**):
  - The hero MRR card reads the app API's `featured` field (contract checked against `lib/public-landing.ts`); the team project shows its real MRR with "ผลงานของทีม JaoPor · ไม่จัดอันดับ" / "JaoPor team project · Not ranked", keeping source, chart and update date.
  - The leaderboard never lists a team project and opens only from 3 ranked projects; otherwise an honest empty line, and a separate line when the API is unreachable.
  - An older API without `featured` falls back to the top independent project, never a team one.
  - 8 files, +239 / −15; patch `C:\tmp\jaopor-landing-featured.patch`. The landing's OG image and metadata don't use API data, so they're unchanged.
- **Aetox:** option B recorded as a pending content decision (Project.md §7). No text or data changed.
- **Design.md:** the complete Olympics v4 proposal (stepped 2-1-3 podium on every width from 3 provinces, rows from #4 with a share ring, your-province bar, map placement, 0 / 1–2 / 3–4 / 5+ states, one-line metric explanations, acceptance criteria). The product-page tabs analysis (measured: instant 450–930 px jumps, focus not moved) recommends keeping anchors with smooth scrolling, a steady active tab and focus on the heading, over switching panels. **Neither is built.**

**Files:** landing `src/lib/featured.ts` (+ test), `src/lib/landing-types.ts`, `src/components/Hero.tsx`, `src/components/Leaderboard.tsx`, `messages/{th,en}.json`, `DESIGN.md`; app `Design.md`, `Project.md`.
**Verified:** landing: unit tests 30 passed, lint ✓, typecheck ✓, production build ✓; th / en at 1440 and 375: card, pill and chart shown, board empty line, no horizontal scroll. Tabs: Playwright measurements on the local app at 1440 and 375.
**Not verified:** the landing "unavailable" line in a browser (Next's 5-minute fetch cache kept serving data while the API was down; covered by unit tests only).
**Next:** owner review of the landing diff (then push / deploy), and approval of the Olympics v4 and tabs proposals.

## 2026-10-13 — Live map always on; home rows swipe on phones

**Done** (owner: "เอา map ผมขึ้นมาสิ ไม่ใช่ทำให้หายไป"; "สินค้าใหม่ให้ปัดดูได้"):

- **Live board:** the one-line "fewer than 5 viewers" mode (2026-10-12) is removed, so the map always shows. On phones the collapsible stats overlay keeps the map visible. String `Live.watchingNow` removed.
- **Home rows on phones** ("เพิ่มล่าสุด", "ตัวเลขแรงสุด"):
  - Below `md`, one swipeable row: snap scrolling; cards 80% wide, 46% from 420 px; the next card peeks; no scrollbar.
  - From `md` the grid is unchanged; no sideways page scroll.
- Design.md: §5 home rows rule (the 2026-09-30 "no horizontal scrolling" rule now applies from `md` up) and LiveVisitorsSection.

**Verified:**

- typecheck ✓ · lint ✓ · unit 640 passed / 17 skipped · e2e local 121 passed / 0 failed · build ✓.
- Screenshot at 375: swipe row with a peeking card, map visible under the collapsed overlay, page width 375.
- 1440: layout unchanged.

## 2026-10-13 — Landing deployed to its own production URL; merge of landing-zone blocked, waiting

**Done** (owner: "ทั้งสามอย่าง" = push the app, deploy the landing, merge `landing-zone`):

- **Landing deployed:** `jaopor-landing` production, commit `4a4cb37` (deployment `dpl_EHm4gVtehF4DTqzbBwNRc17PaJL5`, Vercel's own Turbopack build, READY). Live checks on https://jaopor-landing.vercel.app: 200, the new scene (68 words), full Open Graph tags, `/landing/og` 200 image/png.
- **Not done:** merging `landing-zone` into the app's `master` and pushing the app were refused by Claude Code's permission classifier ("Production Deploy"), so nothing changed in the app. Local `master` is 1 commit ahead of origin (docs only); `landing-zone` is 3 commits / 2 files (`next.config.ts`, `src/proxy.ts`, +23 lines) away from `master`, no overlap with the other chat's uncommitted files.

**Verified:** deploy state READY and the live URL checks above. The main domain is unchanged: `/` is still the app's own page and `/landing/og` still 307s there.
**Next:** the owner runs `git merge --no-ff landing-zone && git push origin master` (or adds a Bash permission rule so it can be done here), then check `/` (landing), `/th`, `/en`, `/api/*` (app) and `/landing/og` (200) on the main domain. Rollback: Vercel Instant Rollback on the app project, or `git revert` the merge commit.

## 2026-10-13 — Landing: scroll-linked "built with" text (like Aetox) and the features tabs wait for the reader

**Done** (owner: make the text reveal like Aetox, and the "what do you get" cards must start only when the reader is on them; landing repo, **local only: not committed, not pushed, not deployed**):

- **Studied Aetox's text reveal** (their published page source, read for the mechanism, nothing copied): the section is 250 vh tall, the stage inside is pinned (CSS sticky), and the scroll position (0..1) drives every word from dim + blurred to sharp one after another, plus the star field brightening. Ours was a timer that ran once, so it did not feel the same.
- **Rewritten the same way for JaoPor:** pinned stage; each word (Thai split with `Intl.Segmenter`, `lib/words.ts`) resolves in reading order; each logo / chip scales in; the canvas brightens; the logos pulse once everything is revealed. Reduced motion, no JavaScript: not pinned, everything visible. Screen readers get the plain text.
- **Features tabs:** the auto-advance now runs only while the panel is in the middle half of the screen. Before, it ran from page load, so a reader arriving after 14 s found the 3rd of 4 tabs (the owner saw the 4th).
- **Language switch inside a pinned section:** anchoring a word inside a sticky stage is meaningless (it never moves in the viewport), so the capture now anchors the tall section that holds a sticky stage. Unit test added.

**Verified** (local production build, webpack; Chrome):

- typecheck ✓ · lint ✓ · 22 unit tests ✓.
- Scroll through the section at 1280 and 375: stage pinned (top 0), words and logos reveal progressively (0 → 68 of 68 words, 0 → 37 / 18 logos), no sideways scroll, no console errors.
- Tabs, same method before (deployed) / after: waiting 14 s at the top, the deployed page arrives on tab 3 and advances while away; the new build arrives on tab 1, moves to tab 2 after about 7 s in view, and does not move when away. Reduced motion: stays on tab 1. Desktop and 375.
- Scroll smoothness (4 s steady scroll through the section, 3 runs, idle machine): the first version blurred all 68 words at once and dropped frames (p95 frame 33–200 ms, up to 30 frames over 33 ms); words now blur only shortly before their turn: desktop p95 about 18 ms, 0–5 frames over 33 ms; 375 px with 4× CPU throttle p95 17–35 ms, 1–16 slow frames. Not a pass/fail claim: one machine, Chrome, synthetic throttling.
- Language switch, real clicks, TH↔EN, 32 runs (desktop 11 positions each way, 375 px 5 each): same section 32 / 32 (the previous build had the same score but anchored the pinned section wrongly); same block 29 / 32, the 3 misses are the hero text and one heading wrapping differently.
- Screenshots: dark + light, desktop + 375, mid-scroll and fully revealed, reduced motion.

**Not verified:** Safari / Firefox (sticky and filter behave differently on iOS); a real phone; the pinned section on a short landscape phone (stage is at least 34 rem tall).
**Next:** owner review; then explicit go for commit / push, deploy of the landing, and merging `landing-zone`.

## 2026-10-12 — Olympics ranking as rows (v4 part 1), collapsible live stats on phones, duplicate-key guard

**Done** (owner: ranking "เรียงเป็นการ์ด … unsatisfying" on phones; live stats overlay covers the map):

- **Olympics v4 part 1:**
  - The table starts at #1 everywhere, with medals on #1–3 and a bar against the leader on every row.
  - Phones drop the change column and the badge (the change shows beside the region).
  - The podium shows only on desktop with ≥ 5 competing provinces.
  - Coverage bar "ปลดล็อกแล้ว N จาก 77 จังหวัด" (listing counts).
  - The map card moves right under the ranking on phones; the duplicate "ผลงาน" column is hidden on the projects board.
  - Phone page 4,962 → 4,323 px.
- **Live board:**
  - The stats overlay collapses to one line on phones (open from `sm`); the activity feed shows 2 items on phones.
  - Checked by temporarily lowering the map threshold, then restored to 5.
- **Bug found and guarded:** a new `Olympics.coverage` hid behind an existing key of the same name (JSON keeps the last one). Renamed to `unlocked`.
  - New test: no duplicate keys in any object of th.json / en.json (verified to catch nested and top-level duplicates).
- **Aetox description:** not changed. It's another owner's project (Chayapol Promsavana), and the text is 189 characters while `tagline` is capped at 140 by a DB check. Waiting for the owner's choice.

**Verified:**

- typecheck ✓ · lint ✓ · unit 640 passed / 17 skipped · e2e local 121 passed / 0 failed / 21 skipped · build ✓.
- Screenshots at 1440 and 375 (Olympics, live board).

**Production** (owner "push and commit"; pushed `eb7c983..4972265`: `8e08fc3`, `2c144dd`, `2d9626e`, the harness config, and the other session's progress commits):

- e2e against jaopor.vercel.app: 136 passed / 0 failed / 6 skipped.
- `robots.txt` live; `sitemap.xml` has 48 URLs (builders included on production).
- Landing API: `featured` = jaopor (`team: true`, MRR series present); all four boards empty; `recent` carries `team` flags.
- **Known gap:** jaopor-landing doesn't read `featured` yet, so once its cache refreshes the hero MRR card and the landing board show empty. Landing update pending owner approval.

## 2026-10-12 — Review follow-up: one competition gate, per-metric home boards, MRR notes per source, Olympics + tabs proposals

**Done** (owner approved A, B, C locally; D decided, landing repo untouched; E as a Design.md proposal; not pushed, `8e08fc3` not amended):

- **A. One competition gate** (`lib/team` `isRankEligible`: published, not demo, not the team's own):
  - Used by `isBoardEligible` (home boards, landing API boards), `rankProvinces` (every Olympics score, rank, podium, "ตัวท็อป", region standing, climber, OG image, province rank on project / profile / province pages, home teaser) and `getRank` (the team project no longer counts as a competitor either; that was a bug).
  - **Listing is separate from competing:** new `countByProvince` / `getProvinceProjectCounts` drive "ยังไม่มีผลงานจาก N จังหวัด", the province noindex and the sitemap. Mukdahan stays indexed and is not shown as empty.
  - Olympics header: "ผลงานที่นับคะแนน รวมทั้งประเทศ" on the projects board. "นับคะแนนยังไง" says team projects aren't scored.
- **B. Home leaderboard per metric** (`boardState`, `BOARD_OPEN_MIN` = 3): states closed / sparse / open.
  - Only open boards are in the picker; sparse adds a footnote.
  - Closed shows "ผลงานที่ลงไว้ {listed} ชิ้น · มีตัวเลขพอจัดอันดับ {eligible} ชิ้น" (eligible = distinct projects across boards).
  - The CTA is "เชื่อมตัวเลขของผลงาน" → `/dashboard`, no longer "ยืนยัน" → `/new`.
- **C. MRR note per source:**
  - Stripe: exactly our calculation (not cancelled, incl. overdue, excl. trials, per month, coupons not deducted).
  - RevenueCat: RevenueCat's own figure.
  - Others: none.
- **D (app side only):**
  - Every landing API project carries `team`, and a new `featured` field holds the hero project. With nobody ranked yet that's JaoPor's verified MRR, flagged as a team project.
  - Boards also drop team projects inside `buildLandingPayload`.
  - **The landing site must read `featured` before the app ships, or its hero card shows "no verified revenue".**
- **E.** Design.md: "Proposal — Olympics v4" (coverage hero + map, your-province bar, ranking rows, podium only on desktop with ≥ 5 provinces, phone order) and "Proposal — tabs that switch, not scroll" (owner: tab jumps feel jarring). Both are not built.
- **Tests (controlled fixtures, no data needed):**
  - `boardState` closed / sparse / open / demo-and-draft.
  - Team project excluded per board and in `rankProvinces`, counted in `countByProvince`.
  - Landing team flag, board exclusion and `featured`.
  - Closed-state e2e: copy, both counts, `/th/dashboard` link.

**Verified:**

- typecheck ✓ · lint ✓ · unit 638 passed / 17 skipped · e2e local 121 passed / 0 failed / 21 skipped · build ✓.
- e2e skips:
  - most need `SUPABASE_SECRET_KEY` (builder pages);
  - the open-board UI checks (metric labels, row FLIP) skip while the live home board is closed. Their logic is covered by the fixture unit tests.
- Rendered HTML:
  - home closed card "ผลงานที่ลงไว้ 3 ชิ้น · มีตัวเลขพอจัดอันดับ 0 ชิ้น";
  - Olympics "จังหวัดที่ลงแข่ง 2 / 77", "ผลงานที่นับคะแนน 2", and Mukdahan not listed as empty.

**Risks:**

- Landing hero (see D).
- Olympics now ranks 2 provinces.
- The e2e first run had one failure while the dev server recompiled after edits; the rerun passed (17 / 17 in the related specs).

## 2026-10-12 — Landing pre-merge fixes (landing repo, committed + pushed, not deployed, not merged)

**Done** (owner: three pre-merge fixes locally, then "push and commit" for the landing repo only; commit `4e2d0c2` on `GXCB06/jaopor-landing` master):

- **Language switch keeps the block on screen:** the switch records an element path + ratio (not a pixel offset) and restores it once after the reload (re-applied on load / fonts / 300 ms, stops at 1.5 s or on user input). Locale cookie and currency behaviour unchanged.
- **Cheaper hero motion:** hero canvas runs from a timer (66 / 100 ms) instead of requestAnimationFrame; floating MRR card and glow animate only on wide hover devices; the live dot is stepped; reduced motion still shows one still frame.
- **Open Graph / Twitter:** og:url, og:image (+ type, width, height, alt), twitter image alt, canonical, og:locale + alternate, in th and en; share card at `/landing/og` (200, image/png, 1200×630).
- **New scene under the hero** ("everything you build with": tool / language / AI-agent / channel logos and code chips in a star field, headline fades in line by line) and a "how a number is verified" proof network. Logos are Simple Icons glyphs (CC0); the scene says they are not partnerships.

**Verified:**

- typecheck ✓ · lint ✓ · 18 unit tests ✓ · webpack build ✓ (scratch copy; **not** Vercel's Turbopack build).
- Language switch, real clicks without page scroll, TH→EN and EN→TH, desktop 1280 (11 positions each) and 375 (5 each): the same section stayed on screen in all 32 runs on the new build. The deployed version, same method, kept the section in 41 of 42 runs. Same block (matched by tag): new build 31 of 32, deployed 36 of 42; the misses are text wrapping differently between languages, not jumps.
- **Correction:** the earlier claim that "4 of 7 positions landed in a different section, 300–400 px drift" was a test artifact: Playwright's `.click()` scrolled the page before the switch. Re-measured with a DOM click; the claim is withdrawn.
- Hero cost, same machine, interleaved before (deployed) / after (local build), 5 rounds, hero in view, main-thread busy % (CDP TaskDuration, 4 s window): desktop median 10.5 → 7.3 %; 375 px with 4× CPU throttle median 54.4 (range 34–63) → 15.9 (13–18) %. Trace counts per second, desktop: rAF callbacks 60 → 0, style recalcs 60 → 36, paints 9.5 → 22.5 (the timer canvas repaints about 15×/s, so paints rose). New scene in view: 4.6 % desktop, 11.9 % mobile-throttled, against 5.8 / 15.4 % on a quiet section. Limits: one machine, Chrome only, synthetic throttling, CPU % moves with machine load (the trace counts do not); no universal pass/fail percentage claimed.
- Reduced motion: no pop-in, no pulses, no canvas redraws, nodes and text visible. Desktop + 375 screenshots, dark + light, before and after compared by eye.

**Not verified:** Safari / Firefox; real phone hardware; social validators (Facebook / LINE / X crawlers cache and may ignore tags). The `og:image` URL points at the production domain, which keeps returning 307 for `/landing/og` until `landing-zone` is merged.

**Not done on purpose:** no Vercel deployment of this commit, `landing-zone` not merged, no production setting changed; the app repo was not pushed (it holds another chat's uncommitted work).
**Next:** owner review, then explicit go for (1) deploy the landing, (2) merge `landing-zone`.

## 2026-10-12 — Audit fixes 1–2: trust wording in the product, SEO basics, thresholded home

**Done** (owner: "ทำเลย" to the audit's first two tasks, product-repo parts; the landing repo is waiting for approval):

- **Team project:** new `lib/team` (`TEAM_PROJECT_SLUGS = ["jaopor"]`).
  - JaoPor stays listed and verified, with the chip "ผลงานของทีม JaoPor · ไม่จัดอันดับ".
  - It's excluded from every leaderboard (`isBoardEligible`, so also the landing API's board) and from the profile rank. Unit test added.
- **MRR > revenue so far:** a one-line explanation under the headline MRR, matching how `lib/revenue/metrics.ts` computes it (active subscriptions, annual ÷ 12, before discounts).
- **SEO:**
  - `localeAlternates` (canonical + hreflang th/en/x-default) on every public page.
  - `/startups` filters canonicalise to `/startups`.
  - `noindex, follow` on 0-project category and province pages.
  - `app/robots.ts` and `app/sitemap.ts` (36 URLs locally; builders are added where the server key exists).
- **Thresholded home:**
  - The leaderboard opens at 3 rankable projects (an "opens when…" card until then).
  - The live board becomes one line below 5 viewers (the board stays, as the owner asked).
- **Bug fixes:**
  - The home Olympics teaser showed "฿0" for project counts; it now shows "1 ผลงาน" with a matching subtitle.
  - The Olympics "จังหวัดของคุณ" row ran 3 px past the screen at 375 (caught by the updated dropdown e2e); the row now wraps.
- **e2e:**
  - Leaderboard tests skip while the board is closed; a new test checks the closed card and its `/th/new` link.
  - Dropdown tests now use the Olympics province picker (always present, 77 options).

**Verified:**

- typecheck ✓ · lint ✓ · unit 629 passed / 17 skipped · e2e local 121 passed / 0 failed · build ✓ (robots.txt, sitemap.xml).
- `curl`:
  - robots and sitemap served;
  - project page has canonical + 3 hreflang links;
  - `/th/category/education` (0) is noindex, `/th/category/ai` is indexable.
- Browser:
  - home shows the leaderboard card ("ตอนนี้มี 0 ชิ้น"), the live board as one line, and the Olympics teaser counts;
  - `/th/startup/jaopor` shows the team chip, the MRR note and no "อันดับ #1" on all-time revenue.

**Not done (needs approval):** landing repo fixes (OG image 404, canonical, CTA targets, "Pending" / "VERIFIED SOURCES ONLY" wording).
**Next:** owner review, then push; contact-request email after a domain is chosen.

## 2026-10-12 — Layout balance audit: one container, sparse grids, home rhythm, feed and Olympics columns

**Done** (owner brief "Layout Balance & Composition Audit"; local only, not pushed):

- **Audit:** full-page screenshots at 1440 and 375 of home, `/startups`, `/builders` (production, because local needs the secret key), `/feed` and `/olympics`, plus measured container edges and column widths.
- **Five issues found:**
  1. Home and the project page used `max-w-5xl`, so their content started 72 px inside the header's logo while every other page was flush.
  2. Sparse grids: home "เพิ่มล่าสุด" had 3 cards in a 5-column grid (40% empty), and `/startups` used 2 columns while `/builders` used 3.
  3. Home section headings were `text-sm` (15.75 px) under a 60 px hero, and some sat inside cards, some outside.
  4. The live board pushed the map to the right edge, leaving a wide empty band.
  5. The feed's right rail was 243 px (names truncated); the Olympics sidebar ran about 460 px past the main column.
- **Fixes:**
  - One container, `max-w-6xl`, on home, project page and identity bar.
  - Home rows choose 3 / 4 / 5 columns by count. `/startups` is `sm:2 xl:3` with `minmax(0,1fr)`.
  - Home sections are `mt-12` apart, the heading outside a card is `text-lg` and headings inside cards are `text-base` (Leaderboard stays `text-sm` on phones).
  - The live map is centred right of the overlay; the height is kept, since a smaller one was reverted once.
  - Feed `xl` columns are `12.5rem | 1fr | 18rem`.
  - The Olympics "นับคะแนนยังไง" card moved under the board.
- Design.md §4 Layout: container, sparse grids, section rhythm. Feed, Olympics and live board notes updated.

**Verified:**

- Before / after screenshots: the home left edge moved from x = 162 to x = 90, matching the logo. The Olympics page is 242 px shorter (2612 → 2370) and its columns end together. The feed rail is 324 px. `/startups` shows 3 cards in one row. No sideways scroll at 375 on any page.
- typecheck ✓ · lint ✓ · unit 628 passed / 17 skipped · build ✓.
- e2e local: 123 passed / 0 failed. One earlier run had 1 flaky motion test; motion spec ×3 = 27 / 27.

**Not verified:** feed and builders with real data locally (they need the secret key); production screenshots are from before the change.

**Production** (pushed `0714a26`, owner "push"): the first e2e run failed `motion.spec` "sections below the fold fade up once" at 375.

- Cause: the test took the first `<section>` in the DOM as on screen, but the new cover and identity column push the profile's first section below the fold, so it rightly waits.
- The test now checks the first section that is actually on screen.
- Motion spec ×3 on production 27 / 27; full production e2e 139 passed / 0 failed.

**Remaining:** in 3-column `/startups` cards the label "รายได้ (30 วัน)" truncates to "รายได้ (30 …" (the number stays whole).

## 2026-10-12 — Early-stage projects: no-numbers cards, wizard stage choice, OG card in the profile layout

**Done** (owner: "ทำเลยครับ" to the order 2 → 6 → 3):

- **Projects with no public numbers** (the right column used to be headings with nothing under them):
  - Visitors get "ผลงานช่วงเริ่มต้น" (`NoNumbersCard`): one sentence, "ลองใช้งาน ↗" and "ดูโปรไฟล์ผู้สร้าง".
  - The owner gets "อัปเกรดเป็นตัวเลขยืนยัน" with GitHub commits and the JaoPor counter first (no key), then revenue. Each opens the editor's chooser at that metric.
  - "เกี่ยวกับ" without a description renders nothing for visitors.
  - Section tabs only appear with 3 or more parts. Parts known to be empty are filtered on the server, so the tab row never shows and then disappears.
- **Wizard step 2 asks the stage first:** "ยังไม่มีรายได้ / กำลังสร้าง" or "มีรายได้แล้ว".
  - The early choice reorders the chooser (build · visitors · revenue) and makes "ไปหน้าผลงานเลย" the main button.
  - New `VerifyPanel` `order` prop.
- **OG image in the profile layout:**
  - The cover is a band across the top (the same screenshot the page uses; `ogCoverDataUri` now prefers the first desktop shot and takes a size), else the hero-blue gradient (`HERO_HEX`).
  - The logo overlaps the band, with name + tagline beside it. The tagline is cut at a word with "…". Projects with no numbers get an "ผลงานช่วงเริ่มต้น" pill.

**Verified:**

- typecheck ✓ · lint ✓ · unit 627 passed / 17 skipped · e2e local 123 passed / 0 failed.
- Browser at 375 (aetox-harness, visitor): gradient cover, early-stage card, no tabs, no sideways scroll.
- OG rendered and checked for jaopor (cover, 3 numbers) and aetox-harness (gradient, early pill), th and en.

**Not verified:** the owner upgrade card and the wizard stage choice in a browser. Both need a signed-in session.

## 2026-10-12 — Product Profile: section tabs and shorter insights

**Done** (owner: "i like it proceed the rest", proposals 4–5):

- **Section tabs** (`profile/SectionTabs`): ตัวเลข · ภาพผลงาน · เกี่ยวกับ · ข้อมูลเชิงลึก · อัปเดต, pinned under the header (under the identity bar on phones).
  - The part on screen is marked. Tabs for parts that are empty for this visitor drop out.
  - Each part has an anchor (`#numbers`, `#shots`, `#about`, `#insights`, `#updates`) with scroll margin.
- **Shorter page:** "ข้อมูลเชิงลึก" shows its first part with a fade and "ดูข้อมูลเชิงลึกทั้งหมด" (`profile/ShowMore`). The full text stays in the HTML.
- Strings: `Profile.tabs.*`, `Profile.insightsMore/insightsLess` (th + en).

**Verified:**

- typecheck ✓ · lint ✓ · unit 623 passed / 17 skipped · e2e local 123 passed / 0 failed.
- Browser at 1280: the tabs stay at 63 px. "เกี่ยวกับ" lands its heading just under them and marks the tab. Insights are clipped to 515 px with the button.
- Browser at 375: header, identity bar and tabs stack (tabs at 117 px). "ข้อมูลเชิงลึก" lands under them. No sideways scroll.

## 2026-10-12 — Product Profile stands out: cover, headline number, screenshots earlier

**Done** (owner: "yes please" to proposals 1–3):

- **Cover:** a full-width banner (`profile/ProfileCover`) from the first screenshot, else a hero-blue gradient. The logo overlaps its bottom edge at every width.
- **Headline number:** the strongest public number, big, under the badges: MRR → revenue 30 days → visitors → commits. It shows its source and is never shown for demos. New string `Profile.headlineCommits` (th + en).
- **Screenshots** moved up to right after the chart.
- **Fix:** the phone identity bar was always visible. The page-enter animation's last frame pinned its opacity at 1; the bar now opts out with `data-entered`.

**Verified:**

- typecheck ✓ · lint ✓ · unit 623 passed / 17 skipped · e2e local 123 passed / 0 failed.
- Browser at 1280: the cover is 1116 × 234 and the logo overlaps it by 45 px.
- Browser at 375: logo over the cover; the bar is hidden at the top and shows after scrolling; no sideways scroll.

**Not verified:** how the cover looks for a project without screenshots (gradient) by eye.

## 2026-10-12 — Product Profile: the name stays in view while scrolling

**Done** (owner: "เลื่อนลงแล้วพลาดชื่อ product ฝั่งซ้าย"):

- **Desktop (`lg`):** the left column (logo, name, badges, visit button, founder) is sticky under the site header. It only sticks on screens at least 40rem tall, so it never hides its own bottom.
- **Phones and tablets:** the new `profile/StickyIdentity` slides a slim bar under the header once the name has scrolled away. The bar holds a small logo, the name and "เข้าเว็บไซต์ ↗".

**Verified:**

- typecheck ✓ · lint ✓ · e2e project / pages / readability / a1: 80 passed.
- Browser at 1280: after scrolling 1,500 px the column is still at the top.
- Browser at 375: the bar shows after scrolling past the name; no sideways scroll.

## 2026-10-12 — Pre-merge smoke test of the `landing-zone` preview (nothing changed, nothing deployed)

**Done** (owner asked for a final smoke test before any merge approval): five checks on the landing deployment and on the latest `landing-zone` preview (`80244ab`, opened in the owner's Chrome). Playwright with the installed Chrome drove the public landing; the preview (behind Vercel Auth) was read in the owner's signed-in Chrome.

**Results:**

- **Render:** desktop 1280 and 375 px, dark and light: no sideways scroll, 0 of 11 images broken, no console or network errors, fonts loaded, all 8 sections present. CLS 0 (desktop) and 0.049 (375 px).
- **Reduced motion** (emulated): CSS animations off, smooth scroll off, reveals visible, feature tabs stop auto-advancing, the canvas draws one still frame (0 redraws in 8 s), mouse light off. A touch tap does not turn on the mouse light.
- **Speed:** LCP 520–860 ms over 3 cold runs per size (the LCP element is the headline text); one earlier first-ever request measured 4.8 s and did not repeat.
- **Cost of the hero:** main thread busy 10.5 % on desktop and about 35–42 % under a 4× CPU slowdown while the hero is on screen; 0.3–1 % once it is scrolled away (the canvas stops). Taking the layers apart in the page: hiding the canvas changed nothing, so the cost is the endless CSS animations of the full-size gradient layers and the floating MRR card (all animations off: 3.9 % / 13 %; whole backdrop removed: 0.4 % / 1.1 %).
- **Routes** (direct and, where marked, full-page reload) on the preview: `/` (+ reload), `/th` (+ reload), `/en` (+ reload), `/th/startups`, `/th/startup/jaopor` (+ reload), `/th/olympics`, `/th/builders`, `/th/feed`, `/th/security`, `/@gxcb06`: all 200 and none is the landing except `/`. `/th/new` → `/th/login` (existing). `/api/public/landing` (has `topMrrSeries`), `/api/health`, `/api/badge/jaopor`, icons, `/landing/*`, `/landing/og`: all 200 with the right types. The app has 0 links to `/` (its logo goes to `/th`).
- **Open Graph:** read from the real HTML (also fetched with Facebook, LINE and Twitter bot user agents, no cookie): `og:image` and `twitter:image` = `https://jaopor.vercel.app/landing/og`, 1200 × 630 PNG, 50,886 B, byte-identical to the landing's own; `og:title` / `description` Thai, `og:locale th_TH`, `summary_large_image`; all in the server HTML. Gaps: no `og:url`, `og:image:alt`, `og:image:type`, no hreflang; the card text is English only.
- **Language switch:** fixed for the footer jump (no scroll after the reload), but the browser restores the position by element, so the reader lands about 300–400 px higher: the same section in 3 of 7 start positions, an adjacent one in 4 of 7. Same on dev and production.

**Not verified:** Safari, Firefox, real phones (no Firefox / WebKit in this machine and downloading them was not done); Facebook / LINE / X validators (they need a public URL; the image URL is on the production domain, which answers 307 until the merge); the share card in a real feed; the phone battery effect; latency added by the extra hop; what the CDN serves if the landing origin is down (not tested, production settings untouched).

**Files:** none changed.
**Next:** the owner decides on the merge and on the three small fixes listed in the report (hero animation cost, language-switch position, OG tags).

## 2026-10-12 — App pushed; landing as a zone at `/` (preview verified, not merged); space hero; language-jump fix

**Done** (owner: "follow your advice" = push the app, then step C; then: a hero background like aona.co.th, and the language switch still jumped to the footer):

- **App pushed to master** (`c6dc16c..f0c7cec`, with four profile commits from another session; the clean HEAD passed typecheck and 628 tests in a throw-away worktree first). Production now serves the new logo (favicon 12,858 B = the new ICO) and `topMrrSeries` (revenue, 30 points).
- **Step C, multi-zone, on branch `landing-zone` only** (worktree `C:\Users\ACER\mrr-landing-zone`, **not merged to master**):
  - `next.config.ts`: `beforeFiles` rewrites `/` and `/landing/:path*` to `https://jaopor-landing.vercel.app` (`LANDING_ORIGIN` overrides).
  - `src/proxy.ts`: `/` and `/landing/*` skip the locale redirect and the session refresh.
  - Landing: `assetPrefix: "/landing"`, public files moved to `public/landing/`, the share card is now `GET /landing/og` with an explicit `og:image` (a metadata file under `[locale]` would have been advertised as `/en/opengraph-image`, which on the shared domain is the app's card).
- **Space hero** (landing, dark theme only; light keeps the soft wash): our own CSS and one small canvas after reading how aona's hero is layered. Blue spotlight and soft beam from the top edge, ~170 slowly twinkling stars, a curved glowing horizon, and a light that follows a real mouse. Canvas ~30 fps, only while visible; still with reduced motion; no touch-pointer light. Nothing copied (no logo or images).
- **Language switch jump, really fixed.** I had only tested from mid-page. From the hero the page smooth-scrolled to ~6,200 of 7,000 px (`router.refresh()` plus smooth scroll). The switch now sets `NEXT_LOCALE` and reloads, so the browser keeps the position.
- Nav labels no longer wrap at 1024 px in English.

**Files:** app branch `landing-zone`: `next.config.ts`, `src/proxy.ts`; landing repo: `HeroBackdrop`, `Hero`, `Nav`, `globals.css`, `next.config.ts`, `src/proxy.ts`, `src/app/landing/og/route.tsx`, `[locale]/layout.tsx`, `public/landing/*`

**Verified:**

- Landing deployed to `jaopor-landing.vercel.app` (assets under `/landing/_next/...`, `/landing/og` 200).
- App preview of `landing-zone` (opened in the owner's Chrome, which is signed in to Vercel): `/` is the landing, 0 of 11 images broken, `og:image` is `/landing/og` and returns a PNG; `/th`, `/en`, `/th/startups`, `/api/public/landing`, `/icon.png`, `/landing/product/home.webp` all 200; the language switch en → th kept the scroll at the top.
- Dev server, language switch from y = 0 and y = 450: scroll kept (0 → 0, 450 → 451).

**Not verified:** a phone, Safari / Firefox, the star canvas CPU use over time, the beam and horizon on very wide screens; the light theme hero by eye on the preview; Search Console / LINE / Facebook share previews; the app e2e suite on the branch. A local `npm run build` of the landing was skipped this round (a dev server from another session holds `.next`), Vercel built it instead.
**Known risks of the cut-over:** `/` depends on the landing project being up; the old `/` redirect to `/th` goes away (bookmarks of `/` now show the landing); both zones set the `NEXT_LOCALE` cookie.
**Next:** the owner's go to merge `landing-zone` into master (production `/` changes for everyone). Then the Proof Flow animation and the "add a project" steps (waiting for screens). The worktree and its `node_modules` junction can be removed after the merge.

## 2026-10-12 — Landing: real product screenshots, chart from real history, new logo, language-switch fix

**Done** (owner: show real product images, the MRR card must come from the product, fix the language jump, new logo except the home hero):

- **Real screenshots.** The owner's five app screenshots (home, all projects, feed, builders, Olympics) replace my mock panels in the hero and the four feature tabs. Each says "ภาพจากผลิตภัณฑ์จริง · ถ่ายเมื่อ 12 ต.ค. 2569 · ไม่ใช่ข้อมูลสด" and opens full size. The "how to add a project" steps still wait for the owner's screens.
- **MRR card chart from the product's own data.** `GET /api/public/landing` now returns `topMrrSeries` (`getChartSeries`, exact disclosure only): MRR when it has history, else daily revenue, with a `metric` field so the card never calls revenue "MRR".
  - Today JaoPor has one MRR snapshot (10-11) but 65 days of revenue, so the card shows "รายได้รายวัน 30 วันล่าสุด" (two days with revenue). It switches to MRR by itself once two or more snapshots exist.
  - Drawn like the project-page chart: smooth 2 px line, faint fill, quiet grid.
- **Language switch** sets the `NEXT_LOCALE` cookie and refreshes in place. The old navigation to `/` jumped to the footer; now the scroll stays (3091 → 3007 px, Board still in view).
- **Logo:** the owner's circle mark replaces the square tile in the **app and the landing** (header, footer, login, OG and share cards, badge via the same files, tab icon, `favicon.ico` 16–64, apple icon, `icon-192/512`). The home hero mascot is untouched. Source images had a black background, so the circle was cut with a transparent outside.

**Files:** `src/lib/public-landing.ts` (+ test), `src/app/api/public/landing/route.ts`, `public/brand/jaopor-tile.png`, `public/icon-{192,512}.png`, `src/app/{icon.png,apple-icon.png,favicon.ico}`, `src/assets/jaopor-tile-64.png`, `Design.md`; landing repo `GXCB06/jaopor-landing` (`ProductShot`, `MrrChart`, `Hero`, `Features`, `Nav`)

**Verified:**

- App: typecheck ✓ · lint ✓ · unit 628 passed / 17 skipped (new: series helper ×4). Browser `/th/startups`: the header shows the circle, the `<link>` icons point at the new files.
- Landing: typecheck ✓ · lint ✓ · tests 3 ✓ · `npm run build` ✓. Browser at 1024: real screenshot in the hero and in each tab (builders, Olympics seen), chart in the card (peak ฿990 read from the API), language switch th → en keeps the scroll.
- Landing redeployed to `jaopor-landing.vercel.app` (production of that project only).

**Not verified:** the chart and logo on the live `jaopor.vercel.app` (the app is not pushed yet, so the live API has no `topMrrSeries` and the landing shows the number without a chart); a Windows / iOS home-screen icon by eye; share-card and badge images with the circle; the e2e suite (not re-run).
**Next:** the owner decides whether to push the app (it carries four unpushed profile commits from another session), then step C (rewrites). Waiting for the "add a project" screens.

## 2026-10-12 — `jaopor-landing` built locally (step B), live data, dark + light, th + en

**Done** (owner: "go next"). New project at `C:\Users\ACER\jaopor-landing` (local git repo, no commits, **no GitHub repo created yet**):

- **Stack:** Next.js 16.3.6, Tailwind v4, next-intl 4 (th + en; one URL `/`, language from the `NEXT_LOCALE` cookie because the app owns `/th` and `/en`), dark + light with the app's `localStorage.theme` key.
- **Sections** (Lovable structure, our code): floating pill nav, hero with live recent-projects frame and a live MRR card, four auto-advancing feature tabs (pause, arrow keys), recent projects, leaderboard with metric tabs, builders and provinces, security, founder note, final CTA, footer.
  - **Every number is live** from the app's `/api/public/landing` (ISR 5 min). Revenue and build proof read "verified", visitors "counted by {source}". No data shows `—` or "ยังไม่มีข้อมูล".
  - Anonymous projects stay blurred. No mock rows or screenshots, so no "sample data" label is needed.
- **Fixed from the Lovable prototype:** final-CTA step titles broke glyph by glyph; nav anchors with no target (olympics now links to the app); no language switch.
- **Light palette designed and contrast-checked.** The first dark `--faint` was 4.1 : 1 on cards, raised to 4.9 : 1; every text pair is now at least 4.9 : 1 (table in the landing's `DESIGN.md`).
- Also: `DESIGN.md`, `README.md`, `sitemap`, `robots`, a Latin-only OG card, `messages.test.ts` (th/en same keys and placeholders, ICU parses).
- `.claude/launch.json` here gained a `landing` entry (port 3100) to preview it.

**Files:** `C:\Users\ACER\jaopor-landing\*` (key: `src/components/*`, `src/app/globals.css`, `messages/*.json`, `DESIGN.md`), `.claude/launch.json`, `Project.md`

**Verified:**

- Landing: `npm run typecheck` ✓ · `npm run lint` ✓ · `npm test` ✓ (3) · `npm run build` ✓ (`/th`, `/en`, OG, robots, sitemap).
- Browser at 1024 wide (dark and light) and 375: no sideways scroll (scrollWidth 375), every section read with live data (JaoPor ฿2,310 via Stripe, 2 projects without numbers show "ยังไม่ยืนยัน"), EN switch gives "$69 / month" and the English headline, tab auto-advance seen.
- The dev server reads the app on `localhost:3000`, which runs the new endpoint.

**Not verified:** against production (the endpoint isn't pushed, so a build today would bake dashes until the next 5-minute refresh); the mobile menu opened; Playwright (none set up); the OG card visually; screenshots in the first tab of the browser pane came out cropped (devicePixelRatio 2.5), a fresh tab was fine.
**Known gaps:** the provinces tab counts provinces among the 12 most recent projects (the API has no province count); OG card is Latin only; the production domain is undecided.
**Next:** the owner creates the GitHub repo (or approves `gh repo create GXCB06/jaopor-landing`), then push the app first (endpoint), then the landing, then the Vercel rewrites (step C).

## 2026-10-12 — Landing site plan + public data endpoint (step A)

**Done** (owner: studied the Lovable landing midnight-show-hub.lovable.app, chose the direction in plan mode):

- **Studied the Lovable landing** read-only in the browser pane: structure, tokens (OKLCH dark, blue pill CTAs, Manrope + Noto Sans Thai), motion, mobile. It is a Vite SPA with hard-coded cards and static screenshots.
- **Decisions:** the landing is a **separate repo** (`jaopor-landing`, Next.js, th + en, dark + light) on **one domain via Vercel rewrites**; it shows **live public numbers**; sample screenshots are labelled; missing data is `—`. **The app is not restyled this round** (the measured gap is in the plan for a later pass).
- **`GET /api/public/landing`:** read-only, cacheable (`s-maxage` 300 s), open CORS. Returns 6 recent real projects, the top 5 of each board (MRR, revenue 30 d, visitors 30 d, commits) with competition ranks, counts, category counts and THB per USD.
  - Each number carries its basis: revenue and build proof "verified", visitors "counted" with the source name, plus the last sync time.
  - Demo and unpublished projects never appear. An anonymous project returns no name or logo, only a mask.
- Pure mapper `lib/public-landing.ts` reuses `getBoard`, `getRecent`, `countStartups`, `getCategoryCounts`, `rankBoard`.

**Files:** `src/app/api/public/landing/route.ts`, `src/lib/public-landing.ts`, `src/lib/public-landing.test.ts`, `Project.md`

**Verified:**

- `npm run typecheck` ✓ · `npm run lint` ✓ · `npx vitest run src/lib/public-landing.test.ts` ✓ (8 tests; demo / draft / anonymous / unverified / ranking / private-field checks). The full unit suite and e2e were not re-run this round.
- Called the endpoint on the running dev server (port 3000, another session's): 200, CORS and cache headers present, real numbers (JaoPor MRR 6,890 cents with source Stripe; the two projects without numbers show nulls and no proof).

**Not verified:** the endpoint on production (not pushed). `province` comes back as a slug (`mukdahan`); the landing must map it to a name.
**Next:** scaffold the `jaopor-landing` repo (tokens, light set, sections), then the Vercel rewrite plan. Needs the owner to create the GitHub repo or approve `gh repo create`.

## 2026-10-12 — Product Profile in the Lovable layout; card hover lift + glow ring

**Done** (owner: liked the Lovable mockup thai-maker-hub.lovable.app, studied read-only in the browser pane):

- **Project page (`/startup/[slug]`):** two columns from `lg` (`16.25rem | 1fr`), like the mockup.
  - **Left:** logo, name, category, badges, tagline, a full-width "เข้าเว็บไซต์" + share, other links, a new founder row (`FounderLine`, replaces `FounderCard`), province and founded date, live viewers.
  - **Right:** stat tiles, chart, traction tiles, a new "เกี่ยวกับ {name}" section with the long description, then the existing blocks (looking-for, screenshots, founder message, insights, updates). Nothing was removed.
  - New string `Profile.aboutTitle` (th + en).
- **Card hover:** StartupCard and BuilderCard lift 4 px with a soft shadow. The new `CardGlow` draws a brand ring that follows the mouse along the border, plus a faint wash. Mouse / trackpad only; none with reduced motion.
  - The mockup itself only lifts 2 px and brightens the border. The ring is our own, from the owner's description.

**Verified:**

- typecheck ✓ · lint ✓ · unit 612 passed / 17 skipped · e2e local 123 passed / 0 failed.
- Browser at 1280 and 375 (no sideways scroll; at 375 the first number is on the first screen).
- Hover state read from the page: `translate: 0 -4.5px`, both glow layers on and following the pointer.

**Production** (pushed with `604c738`, owner "push and commit"): the e2e run right after deploy had 133 passed + 6 flaky (passed on retry, cold pages). A second run passed 138 / 0 failed / 0 flaky.

**Not verified:** the ring in the light theme by eye. The pane kept resetting the emulated size during hover screenshots.

## 2026-10-12 — Hero headline types itself in; light becomes a breathing, twinkling sun through clouds

**Done** (owner: headline "ค่อย ๆ ปรากฏเหมือนการพิมพ์"; background "วงกลม แสงระยิบระยับขยายเข้าออก เหมือนแสงลอดก้อนเมฆ"):

- **Typing** (`TypedHeadline`, CSS only):
  - `lib/motion/typing.ts` splits the message into grapheme clusters with `Intl.Segmenter`, so Thai marks stay on their letter.
  - Each glyph appears at 250 ms + i × 55 ms, about 2 s for both lines.
  - A caret passes along the text and blinks 3 times at the end.
  - "ตัวเลขจริง" keeps the blue → cyan gradient, one slice per glyph (`gradientAt`, color-mix of the tokens).
  - The text is in the HTML from the first byte, with an sr-only copy for screen readers.
  - Plays on a link or a reload only, never on Back / Forward or with reduced motion.
- **Hero light** (`HeroLight`, CSS only):
  - A round glow above the brand lockup that breathes in and out (5 s).
  - Rays all around it: two fans turning against each other make them twinkle, and the fan pulses (7 s).
  - Soft clouds in the page colour drift across, so light breaks through in gaps (22 s).
  - Only transform, rotate, scale and opacity animate; the light is still with reduced motion.
  - New token `--hero-cloud`; `--hero-light` and `--hero-beam` are a little stronger.
  - Follow-up (owner: "ตำแหน่งแสงเหมือนก่อนหน้านี้ มาจากข้างบน"): the source moved to the hero's top edge, so the glow and rays fan down from above as in the first version. The clouds are centred 12rem down. Checked at 1280 (dark + light) and 375 (no sideways scroll).

**Verified:**

- Browser `/th` at 1280:
  - Mid-typing frames show "ดูผลงานจริ|" and "ตัวเลขจริ|" with the caret; the final text is complete.
  - Light and dark themes checked.
  - After Back from `/startups`: `data-nav=back`, glyph animation `none`.
- At 375: scrollWidth 375 = clientWidth, and the caret blinks at the end.
- Unit tests for `typedGlyphs` / `plainText` / `gradientAt`.

**Production** (pushed `604c738`, owner "push and commit"):

- jaopor.vercel.app serves the typed headline and the top-edge light.
- Production e2e, run three times:
  - Run 1 (right after the deploy): 133 passed, 6 flaky (passed on retry, likely first loads).
  - The final clean run: 138 passed / 0 failed / 0 flaky.

**Files:** `src/lib/motion/typing.ts` (+ test), `src/components/home/TypedHeadline.tsx`, `src/components/BrandLogo.tsx`, `src/app/globals.css`, `src/app/[locale]/page.tsx`, `Design.md`

## 2026-10-12 — Hero in the Aetox look: blue → cyan highlight, moving spotlight

**Done** (owner: the colour of Aetox's highlighted words, plus its moving background):

- **Highlight:** `.text-hero-gradient` replaces the solid `--brand-logo` (removed). It is a 90° gradient clipped to the text, used on the dot of "JaoPor." and on "ตัวเลขจริง" / "Real numbers.".
  - Dark theme: Aetox's own stops `#3b78ff → #7fb0ff → #a8f0ff`.
  - Light theme: deeper stops `#1251fd → #2563eb → #0e7490`, so every stop is ≥ 5:1 on white.
  - Padding keeps Thai marks inside the clipped background.
- **Hero light** (`HeroLight`, CSS only):
  - A soft spotlight from the top: two radial gradients, breathing in opacity.
  - Two fans of soft beams (`repeating-conic-gradient`) swaying ±5° in opposite directions, over 18 s and 11 s.
  - Full window width; faded out at the bottom.
  - The layout's content wrapper became `overflow-x-clip`, so a full-width layer can't cause sideways scroll.
  - Only transform and opacity animate. Reduced motion gets a still light.
  - Design.md records this as an owner-approved exception to the no-infinite-loop rule.
- Built from our own CSS after reading the reference's computed styles. Nothing was copied: theirs is a JS canvas, ours is pure CSS.

**Verified:**

- Browser `/th` at 1280, dark and light: the beams' transform changes over 1.5 s; the text stays readable.
- At 375 px: scrollWidth 375 = clientWidth.
- The old dev server on port 3000 had hung. It was stopped with the owner's OK and restarted.

**Files:** `src/app/globals.css`, `src/components/BrandLogo.tsx` (`HeroLight`), `src/app/[locale]/{page,layout}.tsx`, `Design.md`

## 2026-10-12 — Hero lockup like the owner's mockup, constellation removed, anonymous names blurred

**Done** (owner review of the hero prototype):

- **Constellation removed:** `HeroConstellation` and its data were deleted.
  - The owner's bigger idea is a graph page of every project (linked by province, category and builder) that grows with JaoPor. It is noted as a future page in Project.md §7.
- **Home hero, top part, from the owner's mockup:**
  - **HeroBrand lockup:** the mascot at 56 / 72 px plus "JaoPor." with a brand-coloured dot. It is not a link.
  - **Headline:** line 1 "1 คน + 1 Startup" at 1.75rem → 3xl/4xl (`text-5xl`/`text-6xl`) with a grey "+"; line 2 "ดูผลงานจริง ตัวเลขจริง" with "ตัวเลขจริง" in the brand colour.
  - New rich-text keys `Home.heroTop` / `heroBottom` (th + en). `headline1/2` stay plain for the OG image.
  - Belief line, subline, nav and search are unchanged (owner: "ไม่เกี่ยว").
- **Anonymous projects blurred** (owner: "ทำเบลอ ๆ ไว้"):
  - `ProjectName` shows a blurred made-up word from `anonymousMask(slug)`. It is built from the random slug only, so it carries nothing of the real name. Screen readers hear "ผลงานไม่เปิดเผยชื่อ".
  - The logo tile is a blurred gradient instead of the `EyeOff` icon.
  - The project page heading and breadcrumb use it too. Plain-text places (title, OG image, share card) keep the words.
- **"The category rail disappears after sign-in":**
  - The home page has no signed-in branch; it renders the same for everyone.
  - The signed-in tab was production (jaopor.vercel.app), which doesn't have the unpushed `77e1209` yet. A push fixes it.

**Verified:**

- Unit 612 passed / 17 skipped (new: `anonymousMask`). typecheck ✓ · lint ✓.
- e2e local: 123 passed / 0 failed / 17 skipped.
- Browser: `/th` and `/en` at 1280 and 375. Line 1 fits on one line at 375 in Thai; English wraps in balance. No sideways scroll.

**Production** (pushed `8567776`, owner "push"): e2e against jaopor.vercel.app 137 passed / 0 failed. The signed-in home shows the new hero and the category rail.

**Not verified:** the blur with a real anonymous project. None is listed yet; covered by the unit test and typecheck.

## 2026-10-12 — Olympics pioneers/newest, home category rail, category suggestion, hero constellation (prototype)

**Done** (owner: "ผมเห็นด้วยกับคุณนะ" to the proposals; public pages keep the top navigation):

- **Olympics, under "ยังไม่มีผลงานจาก N จังหวัด":** two cards, "ผู้บุกเบิกจังหวัด" (each province's first project, newest pioneer first: project, "คนแรกของ{จังหวัด}", owner, time) and "มาใหม่ล่าสุด" (newest projects with their province). Both follow the region filter.
  - Pure `provincePioneers` / `newestProjects` in `lib/olympics.ts` (tested); loader `getProjectActivity`; component `olympics/ProvinceActivity`.
  - Anonymous projects show "ผลงานไม่เปิดเผยชื่อ".
- **Home category rail** (`CategoryRail`): chips with icons and counts; categories with projects first, 12 shown, then "ดูทั้งหมด ›". Scrolls sideways on phones (no page overflow) and wraps on wider screens.
- **Category suggestion from the pasted website:** `/api/startups/preview` now also returns `category`.
  - Gemini picks from the fixed list when `GEMINI_API_KEY` is set (name + one-liner only); otherwise the keyword matcher `lib/category-suggest.ts` decides.
  - On a tie it gives no suggestion, and words are length-gated (Latin ≥ 4, Thai ≥ 3).
  - The wizard shows "แนะนำจากเว็บไซต์ของคุณ: [icon] หมวด" as a one-click chip while nothing is chosen. It is never preselected (UX audit M-9).
  - The aliases moved to `lib/config/category-aliases.ts`, shared with the picker. The ambiguous "หนัง" became "ดูหนัง / ภาพยนตร์" (it matched "หนังสือ").
- **Hero constellation (prototype):** a `<canvas>` behind the home hero, using real listed projects' logos (never anonymous ones) and pills with verified sources, provinces and categories, joined by thin lines.
  - The centre is masked so the headline, subline and search stay clear.
  - Full window width, sized from the page's client width (no sideways scroll).
  - About 30 fps on desktop, paused off-screen or in a hidden tab; one still frame on phones and with reduced motion.
- Design.md: §5 Hero (category rail, constellation), Olympics and category picker notes.

**Verified:**

- Unit 611 passed / 17 skipped (new: pioneers/newest, `keywordCategory` ×6, category search).
- typecheck ✓ · lint ✓ · e2e local 124 passed / 0 failed.
- The first run caught 101 px of sideways overflow on `/th` and `/en`: before hydration a bare canvas sizes itself 2:1. Fixed with a default `left-0 w-full`.
- Browser: Olympics panels at 1280; home rail at 1280 and 375 (no overflow); constellation in light and dark at 1280, centre clear.

**Not verified:** the wizard's suggestion chip in a browser (needs sign-in), and Gemini's answer (no key locally).
**Next:** owner review of the hero on a phone and a desktop before push.

## 2026-10-12 — GA4 migration applied; searchable category picker with icons

**Done:**

- **GA4 visitor source migration applied** (owner: "apply GA4").
  - Rolled-back check on the live DB: `ga4` is accepted as a traffic provider, a second traffic source is refused, clients can't write a connection, and the funnel logs a `ga4` verify result.
  - Advisors: nothing new. No type changes (constraints only).
  - The option still appears only after JaoPor's service account is set in Vercel (`GA4_SERVICE_ACCOUNT_JSON`, `NEXT_PUBLIC_GA4_SERVICE_EMAIL`).
- **Category picker** (owner: scrolling 37 categories took too long): `CategoryField` reuses the province combobox.
  - Each option shows its category icon; "ประเภทยอดนิยม" (AI, SaaS, อีคอมเมิร์ซ, เพิ่มประสิทธิภาพงาน, การศึกษา, เกม) comes first.
  - Search matches the Thai and English names, the descriptions and common words (`CATEGORY_ALIASES`, e.g. เกม, ร้านค้า, บัญชี, ไลน์, chatbot, hotel).
  - Used in wizard step 1 (required) and on the edit page. Strings: `CategoryPicker.*`.

**Verified:**

- Unit 603 passed / 17 skipped (new: every category has an icon and keywords; 7 typed words find the right category in th and en).
- typecheck ✓ · lint ✓ · e2e pages / sign-in / dropdowns 66 passed.

**Not verified:** the picker in a browser. The wizard and edit page need a signed-in session; it is the same combobox as the province field.

**Files:** `supabase/migrations/20261011125000_ga4_traffic_source.sql` (header), `src/components/wizard/{CategoryField.tsx,vocab-options.ts,vocab-options.test.ts,StartupWizard.tsx,StartupEditForm.tsx}`, `messages/*`, `Design.md`, `Project.md`

## 2026-10-11 — Fix: a dropdown could still open upward on production

**Done:** The production e2e run after deploy `ac44425` caught the leaderboard list opening above its button (desktop; flaky at 375).

- **Cause:** Radix's collision logic could still flip a list. It happened when the list opened low on screen and the layout moved under it: the section's scroll reveal, or the live board filling in above.
- **Fix:**
  - `ChoiceSelect` and `MultiChoice` now open with `avoidCollisions={false}`, so they never flip.
  - Horizontal alignment comes from the trigger's position (`alignFor`: right half → aligned to the right edge).
  - The height is capped by both our pre-open room and Radix's live `--radix-*-content-available-height`, so a later layout shift shrinks the list instead of pushing it off screen.
  - The row estimate went from 34 to 44 px (Thai rows).

**Verified:**

- New e2e "near the bottom of the screen" (button 60 px from the bottom, clicked at once) passes at desktop and 375; `dropdowns.spec.ts` 6 / 6.
- Full local e2e 123 passed / 0 failed; unit 595; typecheck ✓; lint ✓.
- Production after `ac44425`: the live board shows; a heartbeat returns its key and appears in the snapshot. Production e2e: 135 passed, 1 failed (this bug).

**Files:** `src/lib/ui/room-below.ts` (+ test), `src/components/core/{ChoiceSelect,MultiChoice}.tsx`, `e2e/dropdowns.spec.ts`, `PROGRESS.md`

## 2026-10-11 — Anonymous mode live; project page layout restored; live board back; page-enter motion; Olympics "projects" board

**Done:**

- **Anonymous mode applied** (owner: "apply"; the founder stays visible).
  - Migration `anonymous_mode`, then the advisors showed one new WARN: `startup_identity()` could be executed by signed-in users.
  - Fixed with `startup_identity_server_only`: revoke from `authenticated`. Owner reads now go through the server key after an ownership check (`owner-startups.ts`, the action, autofill).
  - Types regenerated (`is_anonymous`, `startup_identity`, `owner_anonymous_websites`). The temporary casts are removed.
- **Project page back to the pre-10-Oct order** (owner: the Proof / Story split read worse):
  - `tractionFirst` → chart card → `TractionTiles` (with the build story) → screenshots → founder message → `InsightsGrid` → updates.
  - `StorySection` was replaced by the restored `InsightsGrid`.
  - The R2 disclosure and anonymous changes are kept.
  - `e2e/project.spec.ts` was rewritten for this order.
- **Live board ("ตอนนี้มีคนดูอยู่") back on by default as a polled board.**
  - It had been off since 2026-10-09 because the Realtime presence channel would pass the Free plan's 100 msg/s at about 50 people.
  - New engine: the heartbeat (`/api/live/ping` now answers the tab's short key) plus `/api/live/snapshot` (tabs seen in the last 90 s, CDN-cached 30 s, so about one query per 30 s for the whole site) feed the same board. Pins sit at the province capital; avatars are derived from the key.
  - `NEXT_PUBLIC_LIVE_VISITORS`: unset/"poll" (default), "1"/"realtime", "0"/"off".
- **Page-enter motion:**
  - A page opened by a link or a reload fades its top-level blocks up, staggered.
  - Back / Forward shows the page at once.
  - `html[data-nav]` is set by a `<head>` script before the first paint, so nothing blinks. `popstate` sets "back".
- **Olympics default board "จำนวนผลงาน":** every published, non-demo project counts, verified or not, with growth against the projects listed 30+ days ago. It appears first in the switch and is used on province pages and the OG image. The scoring note explains it.
- Your `autofill.ts` copy change was committed (`0cd1b79`).

**Verified:**

- **Live DB after applying, rolled-back checks:**
  - Masked public row; owner rename diverted to the stash.
  - Signed-in users and anon can't call `startup_identity`; the server key reads it.
  - Anon can't read the stash; the real slug stays reserved.
  - Turning it off restores everything.
- **Advisors:** no new WARN. The remaining WARN is the existing Auth leaked-password setting.
- **Gates:** typecheck ✓ · lint ✓ · unit 595 passed / 17 skipped · e2e local 121 passed / 0 failed · build ✓.
- **Browser:**
  - The board renders locally; a link-click navigation runs `page-enter`; Back runs none and resets the flag; below-fold sections still wait for the scroll reveal.
  - `/th/olympics` shows the projects board.
- **Not verified locally:** the heartbeat write (no `KEY_ENCRYPTION_SECRET` in the local env). It is checked on production after the deploy.

**Files:** `supabase/migrations/2026101112{6,7}000_*.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/supabase/database.types.ts`, `src/lib/data/{owner-startups,anonymous}.ts`, `src/app/actions/anonymous.ts`, the project page, `src/components/{ProfileBlocks,profile/ProjectBlocks}.tsx`, `src/lib/live/identity.ts`, `src/components/live/LivePresence.tsx`, `src/app/api/live/{ping,snapshot}/route.ts`, `src/lib/motion/nav.ts`, `src/components/core/ScrollReveal.tsx`, `src/app/globals.css`, `src/lib/olympics.ts`, the Olympics OG image, `messages/*`, `Design.md`, `Project.md`, `e2e/project.spec.ts`

## 2026-10-11 — Anonymous mode for projects (code ready; migration written, NOT applied)

**Done:**

- **Owner request:** list a project like TrustMRR's anonymous mode, showing the numbers and insights but not the product's name, links or anything that identifies it. Checked against TrustMRR's FAQ: it removes the name, logo, website, screenshots and app-store links, and keeps the description, founder, country and verified metrics.
- **Migration `20261011126000_anonymous_mode.sql`, written and dry-run only:**
  - `startups.is_anonymous`. A BEFORE trigger `startups_anonymity` moves the real name, slug, logo, links, repo and demo video into `private.startup_identity`. That table has the same checks plus "at least one link", and its slug stays reserved.
  - The public row then holds placeholders: "Anonymous", `anon-<10 hex>`, nulls, and `anonymous/project` while a repo is connected, so build proof still counts.
  - Old URLs are moved into the stash; otherwise the real name would redirect to the anonymous page.
  - Writes to identity columns while anonymous (the edit form, the GitHub sync) are diverted to the stash.
  - Turning it off restores everything, old URLs included.
  - `startups_has_a_link` now allows an anonymous row. The slug-history, slug-reserve and owner-verified triggers ignore the masking itself.
  - Screenshots are hidden from visitors by RLS.
  - `startup_identity()` (the owner or the service role only) and `owner_anonymous_websites()` (service role).
  - The disclosure migration now grants `is_anonymous`, so apply this one first.
- **App:**
  - `lib/anonymous.ts`: `isAnonymousSlug`; the slug shape is reserved, so any row, embed or search hit is recognisable.
  - `lib/data/anonymous.ts`: a readiness probe, `realIdentity`, and `withRealLinks` for the JaoPor snippet (`/api/collect`), connect, the owner check, autofill and detect-stack. The duplicate-listing check also sees anonymous websites.
  - Owner views overlay the real identity but keep the public slug for links (`OwnerStartup.anonymous.realSlug`).
  - Server action `setProjectAnonymous` revalidates every URL the project had, the lists and the owner's profile.
- **UI** (Design.md §5 Anonymous projects):
  - The wizard's step-1 checkbox; the preview card follows it.
  - The edit page's switch card with a confirm.
  - "ผลงานไม่เปิดเผยชื่อ" (`ProjectName`) on cards, the leaderboard, posts, search, Olympics, builder profile works, the project page (H1, breadcrumb, title, share text, badge snippets), the OG image (no screenshot cover) and the share card.
  - An `EyeOff` logo tile, a page chip and a dashed note.
  - Owner chips on the dashboard, "ผลงานของฉัน" and the edit page.
  - Strings `Anonymous.*` (th + en).
- Everything stays hidden until the migration is applied, and nothing changes for current projects.

**Files:** `supabase/migrations/20261011126000_anonymous_mode.sql`, `supabase/migrations/20261011130000_disclosure_levels.sql` (grant), `supabase/tests/rls_smoke.sql` (T162–T168), `src/lib/anonymous.ts`, `src/lib/data/{anonymous,owner-startups}.ts`, `src/app/actions/anonymous.ts`, `src/components/core/{ProjectName,AnonymousChip}.tsx`, `src/components/wizard/{AnonymousPanel,StartupWizard,StartupEditForm}.tsx`, `src/lib/sources/sync.ts`, `src/app/api/{collect,startups/[id]/autofill,startups/[id]/detect-stack,share-card/[slug]}/route.ts(x)`, the project page + OG image, the dashboard pages, `messages/*`, `Design.md`, `Project.md`

**Verified:**

- **Dry run on the remote DB, in a transaction rolled back (production unchanged; `is_anonymous` absent afterwards):** 12 checks passed.
  - Created anonymous → public "Anonymous" / `anon-…` / no website, and the owner reads the real name.
  - A rename while anonymous is diverted, and an invalid diverted website is refused.
  - Anon can't call `startup_identity` or read the stash.
  - The hidden real slug stays reserved, and `anon-…` is refused for a named project.
  - Off → name, slug and website restored, owner-verified kept, stash emptied.
  - On again → old URLs moved to the stash. Off again → old URLs back.
- **The first dry run found** that `startups_has_a_link` blocked masking; the constraint was relaxed and the stash now carries the checks.
- **Gates:** typecheck ✓ · lint ✓ · unit 590 passed / 17 skipped (new: `anonymous.test.ts` ×2) · e2e local 121 passed / 0 failed · build ✓.

**Not verified:** the switch and checkbox in a browser. They render only after the migration and need a signed-in owner.
**Next:** owner approval to apply → advisors, RLS smoke, types → a signed-in check at desktop + 375 px.

## 2026-10-11 — Dropdowns always open below and stay on screen; multi-choice filters

**Done:**

- **One rule for every dropdown** (Design.md §5 Dropdowns): it opens below its trigger, never above, and stays inside the screen. `src/lib/ui/room-below.ts` scrolls the page just enough before opening (never pushing the trigger under the sticky header) and caps the list to the room below, so the popper never flips.
- **No native `<select>` left.** New `core/ChoiceSelect` (Radix Select, popper below; `field` / `filter` / `chip` variants) replaces all 14: the shared form `Select` (wizard, edit page, profile editor, report dialog), the leaderboard metric, chart metric/period, Olympics province finder, Composer (project, type), link type, screenshot kind. Optional fields keep the placeholder as a choosable row so a choice can be cleared.
- **Multi-choice filters:** new `core/MultiChoice` (Radix Popover with checkboxes, search box above 12 options matching Thai/English/aliases, "ล้าง · เลือก n รายการ · เสร็จ"). /startups (category, province, AI tool, type, looking for), /builders (skill, area = regions + provinces, status, tool) and /feed (province, category). URL: `?category=saas,fintech` (repeated params read too, max 20, `src/lib/url-list.ts`); any value within a filter matches, filters combine. Data: `listStartups` uses `in` / `overlaps` / an OR of link types (`typeFilter`), `listPosts` `in`, `filterBuilders` lists.
- **Menus and pop-up lists follow the same rule:** the DropdownMenu wrapper (side bottom, capped, grows by scrolling the page when taller), QuickSearch (no longer flips upward near the page bottom; phones keep the sheet), VocabCombobox.

**Files:** `src/lib/ui/room-below.ts`, `src/lib/url-list.ts`, `src/lib/config/choice-options.ts`, `src/components/core/{ChoiceSelect,MultiChoice}.tsx`, `src/components/ui/dropdown-menu.tsx`, the three directory pages, `src/lib/{builders,feed}.ts`, `src/lib/data/{startups,posts,feed}.ts`, the components listed above, `messages/*` (`Choice`), `Design.md`, `e2e/dropdowns.spec.ts`
**Verified:** typecheck ✓ · lint ✓ · unit 585 passed / 17 skipped (new: room-below, url-list, typeFilter, multi-value feed and builder filters) · e2e `dropdowns.spec.ts` at desktop + 375 px: the province and category lists start under their trigger and end inside the screen; two categories → `?category=saas,fintech` and kept after reload; leaderboard list below its button. `a1` / `motion` specs updated to the new control and pass. Browser pane at 375 px: the page scrolls up and the category list opens below "ทุกหมวดหมู่".
**Next:** full e2e before push.

## 2026-10-11 — Google Analytics 4 as a visitor source (code ready, hidden until the owner sets it up) + homepage copy live

**Done:**

- **Homepage copy deployed** (`eb7a435`, from the Marketing session): `/th` shows "1 คน + 1 Startup"; production e2e 132 passed / 0 failed.
- **GA4 source** (owner chose: founders add JaoPor's service account as a **Viewer**):
  - `lib/traffic/ga4.ts`:
    - an RS256 JWT bearer grant signed with Node `crypto` (no library) and cached ~50 min;
    - **tokens carry only the `analytics.readonly` scope**, so Google refuses any write whatever role a founder grants;
    - ownership: a property web stream's `defaultUri` must match the website (`domainMatches`);
    - visitors = GA4 **Total users** for 30d / prev 30d (one report, two date ranges) + a daily series;
    - typed errors: our own credentials refused → `upstream` (never blamed on the founder); 403/404 → `not_found` with the fix; 429 → `rate_limited`;
    - 15 s timeouts; no founder secret stored (`encrypted_key` null; config = `propertyId`).
  - Registered in the catalog (`ga4`, "Google Analytics", traffic), `sync.ts` (prepare / pull / readTraffic), the env (`GA4_SERVICE_ACCOUNT_JSON` server-only, `NEXT_PUBLIC_GA4_SERVICE_EMAIL` public), the funnel source list, brand icons and the ProviderStrip.
  - **VerifyPanel:** 3 steps, the email box with a copy button, a Property ID field (accepts the number, `properties/…` or a GA URL), the Open-Google-Analytics link. GA4 is **hidden unless the service email is set**; an existing connection always shows.
  - Strings `Sources.ga4.*` (th + en). Design.md §5 VerifyPanel updated.
- **Migration `20261011125000_ga4_traffic_source.sql`, written only, NOT applied:** `ga4` added to the provider / traffic CHECK constraints, the one-traffic-source index and the `log_verify_result` whitelist. RLS smoke T161 added.

**Verified:**

- unit 574 passed / 17 skipped. New `ga4.test.ts` (17): property-id parsing; token = readonly scope with a verifiable RS256 signature (throwaway key generated in the test) + cache; our credentials refused / broken key → upstream; domain match and mismatch, no web stream, 403 / 429 / 500; report mapping and an empty property. The catalog and funnel-parity tests were updated.
- typecheck ✓ · lint ✓ · e2e local 117 passed / 0 failed · build ✓.
- **Dry run on the remote DB in a rolled-back transaction:** ga4 accepted, a second traffic source refused, client writes denied, funnel logs ga4. Production constraint unchanged afterwards.
- The dev preview had crashed (Windows 0xC0000409) during one e2e run; the rerun was clean.

**Not done (owner):** service account + both APIs enabled + Vercel env vars; approve applying the migration; a live connect against a real property (±5% vs the GA dashboard). Until then GA4 stays hidden.
**Next:** owner setup → apply the migration → live check.

## 2026-10-11 — "Built with AI" out of the site's positioning copy (everything except the homepage)

**Done:**

- Owner asked to drop "สร้างด้วย AI" from the site and lead with startups and products from people in Thailand that have real users, real revenue and real impact. Homepage left as is (owner: no change there).
- **Changed (th + en):** `Directory.subline` ("Startup และ Product ของคนไทย ดูว่าใครมีผู้ใช้จริง รายได้จริง และกำลังสร้างประโยชน์ให้สังคม พร้อมตัวเลขที่ยืนยันจากระบบต้นทาง"; phrased as "see who has", not "everyone has", because most listings are pre-revenue and impact has no verified number), `Olympics.subtitle`, `Privacy.intro` (descriptive only; no change to what is collected, so the policy date stays), `Builders.metaDescription/subline`, `Feed.metaDescription`.
- **`src/lib/autofill.ts`:** the optional Gemini listing-copy prompt now says "a directory of startups and products made by people in Thailand" instead of "built with AI", so generated drafts stop leading with AI.
- **Left on purpose:** the `ai_tools` field and its filters/chips ("สร้างด้วย", "เครื่องมือ AI"), the "co-written with Claude" GitHub stat, the AI category and AI skills, and `Home.searchPlaceholder` (a homepage string: "เครื่องมือ AI ที่สร้างด้วย Claude Code"). These are data/features; the per-project switch to hide them on visitor surfaces is decision D2 (docs/MAJOR_REVAMP_PLAN.md), not built yet.

**Files:** `messages/th.json`, `messages/en.json`, `src/lib/autofill.ts`
**Verified:** `npm run typecheck` ✓; `npm run lint` ✓; `npx vitest run` → 586 passed / 17 skipped; no "ด้วย AI" / "with AI" left in `messages/`; browser check of `/th/startups` at 375 px (new subline, scrollWidth = clientWidth = 375). **Not run:** e2e, `npm run build`, `/en` pages visually.
**Not changed:** the JaoPor listing's own description in the database ("รวมผลงานที่คนไทยสร้างด้วย AI…", shown on `/startups`; production data, owner edits it in the dashboard), internal docs (README, BizModel.md, JAOPOR_SPEC.md, CLAUDE.md, Project.md header) that still describe the old positioning.
**Next:** owner edits the JaoPor listing text; decide on D2 and on the homepage search placeholder; align the internal docs if wanted.

## 2026-10-11 — Specs: disclosure levels (R2) and owner outcomes (proposal only)

**Done:**

- **`docs/DISCLOSURE_SPEC.md`:** detail for pillar P1 / decision D1. Key finding from the code: metric values are plain columns on `startups` with table-level `select` for `anon` and `authenticated`, and the snapshot tables are public, so hiding a number needs masking **in the database** (a masked view and revoked raw-column grants, following the `profiles` precedent), not only in the UI. Covers five levels per group (revenue / users / traffic / build), bands, the surfaces that must respect the level (boards, search RPC, OG, share card, badge, milestones, Olympics), inference risks, tests, order of work, and open questions O1–O5.
- **`docs/OWNER_OUTCOMES_SPEC.md`:** the "value back" half. Today only builder profile views and own-site visitors are counted; project page views and clicks out are not (the link is a plain `href`). Proposes cookie-free counters like `profile_views` (HMAC under a daily key, no IP), a `sendBeacon` click handler, a dashboard block, and open questions V1–V3.
- Background research (web, read-only): TrustMRR's FAQ confirms an anonymous mode that hides name/logo/site but keeps verified metrics; Indie Hackers posts and Baremetrics Open Startups show founders often stop sharing numbers as they grow and that partial data can mislead. No survey data on disclosure rates and no Thai data was found.

**Files:** `docs/DISCLOSURE_SPEC.md`, `docs/OWNER_OUTCOMES_SPEC.md`, `Project.md` (§7 pointer)
**Verified:** read-only review of `database.types.ts`, `20260929050526_schema_v1.sql`, `20260930155147_builder_profiles.sql`, `20261011120000_add_funnel_events.sql`, `src/lib/data/{startups,me}.ts`, `src/lib/leaderboard.ts`, `src/app/api/profile-view/route.ts`, `ScreenshotGallery.tsx`. Nothing built or applied. The badge route, OG image and share-card renderers are listed in the spec as surfaces to audit; they were not read line by line. `supabase/tests/rls_smoke.sql` is modified in the working tree by someone else and was not touched.
**Next:** owner answers O1–O5 and V1–V3; spike whether PostgREST embeds `owner:profiles` through a view; then R2 per the spec (migration applied only after the 14 Oct post and your approval).

## 2026-10-11 — Homepage positioning copy: "1 คน + 1 Startup", AI framing out of the site headline

**Done:**

- **New hero copy (th + en), owner-written:** H1 "1 คน + 1 Startup / ดูผลงานจริง ตัวเลขจริง"; a belief line under it ("คนตัวเล็กก็ทำสิ่งที่ยิ่งใหญ่ได้" / "Ordinary people can achieve extraordinary things.").
  - **Thai subline (owner's final text, ~5 lines at 375 px):** "JaoPor คือพื้นที่รวมผลงานของคนที่ลงมือสร้างเอง … พร้อมแสดงยอดผู้เข้าชม รายได้ และ commit ตามที่เจ้าของเชื่อมไว้ ตัวเลขที่ยืนยันแล้วมีป้ายพร้อมแหล่งที่มาและเวลาที่ตรวจ เพิ่มผลงานได้ด้วยลิงก์เดียว จะเพิ่งเริ่มหรือมีผู้ใช้แล้วก็ลงได้". It replaced an invitation-style subline ("วางลิงก์เดียวก็ลงได้…"); the earlier "แม้ยังไม่มีรายได้" was dropped because it read as condescending (owner feedback). A shorter Thai variant (~150 characters) was drafted and declined.
  - **English subline (shorter, after owner feedback that the first version was long; Claude-edited from the owner's draft):** "Discover what people build on JaoPor: websites, apps, games, SaaS, LINE OAs and GitHub projects. Explore the stats their owners connect, from visitors, revenue and MRR to commits. Verified numbers show their source and when they were last checked. List yours with a single link, at any stage." The English meta description uses the same text; the Thai meta stays the owner's full text.
  - **Wording notes for the owner:** "Users" was changed to "visitors" (the system verifies visitors, not users, except RevenueCat active users); "Mini-app" was left out (LINE LIFF pages are a generic link type in A1.2, not a listing type); "SaaS" was first English-only, then added to the Thai subline and meta description on the owner's request (Design.md now lists it as an allowed English word in Thai copy).
- **Meta and footer:** `Metadata.title/description` and `Footer.tagline` no longer say "built with AI" (the OG image reuses `headline1/2`, so it follows). `Metadata.description` holds the owner's full ~370-character text (search/share snippets truncate it; the hero uses the trimmed one). The "สถานีขนส่งฝัน" line left the footer.
- **Layout:** one new `<p>` for the belief line (`text-body font-medium text-foreground`, no italics for Thai); the H1 gets `text-balance` so "Real work. Real numbers." doesn't orphan a word on phones.
- **Docs:** Design.md hero bullet; Project.md headline + a §6 decision (the AI angle stays in community posts such as Claude Thailand, as that group's rules require).

**Files:** `messages/th.json`, `messages/en.json`, `src/app/[locale]/page.tsx`, `Design.md`, `Project.md`
**Verified:** `npm run typecheck` ✓; `npm run lint` ✓; `npx vitest run` → 445 passed / 17 skipped (incl. the messages ICU test); browser check of `/th` at desktop and 375 px (no horizontal scroll, 375 = 375) and `/en` at 375 px (re-checked after `text-balance`: "Real work. / Real numbers." now breaks evenly). **Not run:** Playwright e2e (another chat's dev server holds port 3000) and `npm run build`.
**Not changed:** the "ลงผลงานของคุณ" button label (still "เพิ่มผลงาน"), the OG/share-card renderer, share text, docs/launch-plan.md (still the old tagline), CLAUDE.md / docs/SPEC.md tagline mentions.
**Next:** owner review of the live hero on a phone; update launch-plan.md and the Facebook post to match; run e2e + build before pushing.

## 2026-10-11 — Motion: numbers no longer animate; sections fade up as you scroll (owner request); R2 A–C deployed

**Done:**

- **R2 A–C pushed** (`34294dc`) and deployed: production e2e 132 passed / 2 skipped / 0 failed (legacy path, pages unchanged).
- **Owner request:** "ตัวเลขไม่ต้องมี animation" + "ขณะเลื่อนลงในหน้าใหม่ ให้แต่ละส่วนค่อย ๆ ปรากฏขึ้น".
  - **Removed:** RollingNumber, `lib/motion/digits.ts` + test, the roll CSS, the `Money roll` option, every roll use (project tiles, TractionTiles, cards, leaderboard, builder cards) and StatCard's InView wrapper.
  - **Added:** `core/ScrollReveal` (in the locale layout). Each top-level `<section>` of `<main>` that starts below the fold is marked `data-reveal="wait"` (out of view) and fades up once (700 ms, 24 px) when it enters. On-screen sections never move. Nothing happens without JS or with reduced motion. It runs again after client navigation.
  - **Kept:** chart draw, live pulse, card rise, leaderboard FLIP and the verify stamp.
  - Design.md §7 Motion updated ("numbers never animate", section reveal).

**Files:** `src/components/core/ScrollReveal.tsx` (new), `src/app/[locale]/layout.tsx`, `src/app/globals.css`, `src/components/{StartupBits,StartupCard,LeaderboardCard,ProfileBlocks}.tsx`, `src/components/builder/BuilderCard.tsx`, `src/components/profile/ProjectBlocks.tsx`, `src/app/[locale]/startup/[slug]/page.tsx`, `e2e/motion.spec.ts`, `Design.md`; deleted `core/RollingNumber.tsx`, `lib/motion/digits{,.test}.ts`.
**Verified:**

- typecheck ✓ · lint ✓ · unit 557 passed / 17 skipped · e2e local 117 passed / 0 failed. The motion spec covers: below-the-fold sections wait then reveal, on-screen sections untouched, no digit columns, reduced motion marks nothing.
- build ✓.
- 375 px screenshots mid-reveal and settled on the project page.

**Next:** production e2e after deploy; owner review of the motion; TrustMRR vs JaoPor UX comparison (owner question).

## 2026-10-11 — R2 surfaces A–C: compatibility layer + masked public reads + band / growth / badge displays (migration still NOT applied; not committed)

**Done (docs/DISCLOSURE_SURFACE_AUDIT.md):**

- **Compatibility layer** `src/lib/data/startup-columns.ts`:
  - `schemaMode()` detects whether the `public_*` columns exist (cached 60 s, so an apply is picked up without a deploy);
  - before the migration every read is exactly as today; after it, public reads select only non-metric columns + `public_*`, and `normalizeStartup()` maps them back to the usual field names. Hidden values arrive as null; a `disclosure` summary (level, band, growth per group) is added.
- **A (would break on apply):**
  - `lib/data/startups.ts`: every query, filter and sort uses `metricColumn()`. Boards, rank, directory sort and Olympics are therefore exact-only, and charts load only at exact.
  - `lib/data/builder.ts`: the profile's works are normalized; summed MRR counts exact only; the directory and OG card read the public twins with the admin client.
  - `lib/data/posts.ts`: the post embed uses the public revenue level and provider.
  - Owner pages (`dashboard`, `dashboard/startups`, `dashboard/[id]/edit`) use the new `lib/data/owner-startups.ts`. After apply it reads the owner's real values via `get_my_startup_metrics()`.
  - `/api/startups/[id]/{autofill,detect-stack}` read `github_repo` with the service role only after the session's ownership check.
  - Write paths only return safe columns (checked).
- **B:** milestones (cron) read the public twins, so a value milestone can only fire at exact. Old milestone posts: amount kept at exact; otherwise "verified its revenue", or dropped (private revenue, or stars without exact build). The stored body with the amount never leaves the server.
- **C:**
  - `DisclosedStat` / `DisclosedInline` / `useBandLabel` (client-safe): "฿10k–25k · แสดงเป็นช่วง", "↑ 18% · เทียบ 30 วันก่อน", "ยืนยันแล้ว · ไม่แสดงตัวเลข".
  - Wired into the project page (revenue tile, TractionTiles, proof flags; title MRR only at exact), `StartupCard`, founder-profile work rows, and the share kit (OG / share text / badge: band and growth forms, "verified revenue" at badge, ASCII "THB" on the SVG).
  - Share-card revenue chart only at exact. Previously a badge-level project would have drawn a zero-filled "฿0" chart.
  - New `Disclosure` message namespace (th + en), appended without reformatting.
- **Deferred:**
  - **C9 owner controls** (the "ใครเห็นตัวเลขนี้?" chooser, settings, preview, "คนอื่นเห็น" line, `revalidatePath`): they write `metric_disclosure`, which only exists after the apply, so they can't be tested end to end before it.
  - **Growth board:** needs new Leaderboard keys, a home page change (marketing edits pending) and a floor rule.

**Verified:**

- typecheck ✓ · lint ✓ · unit 562 passed / 17 skipped (+22: normalizer both schemas, milestone masking, share forms, band text);
- e2e local 117 passed / 0 failed (legacy path identical to before);
- build ✓;
- temporary local page (deleted) at 1280 and 375 px: tiles, cards and inline forms render, no overflow, and the band wraps instead of being cut off ("฿100k–250k", "มากกว่า ฿1M").

**Not changed:** no migration applied, no commit, no setting; homepage copy untouched.
**Next:** owner review → commit → deploy (legacy path) → apply migration after the post (with approval) → advisors + RLS smoke + types → C9 owner controls → remove the legacy branch.

## 2026-10-11 — R2 steps 2–6: disclosure levels (Design.md, logic + tests, migration written, RLS tests, surface audit) — NOT applied, NOT committed

**Done (owner decisions O1–O5 approved 2026-10-11; O4 = precomputed `public_*` columns):**

- **Design.md §7 "Disclosure levels":**
  - five levels with th / en sentences;
  - O1 defaults;
  - the "ใครเห็นตัวเลขนี้?" chooser with a visitor preview;
  - display per level;
  - the dashboard line "คนอื่นเห็น: …";
  - O5 FX rule: THB from the stored `fx_rates` row of the sync day, never a live call, with the rate day stored for audit.
- **`src/lib/disclosure.ts` + 87 table-driven tests:**
  - levels, groups and group → column map;
  - O1 defaults;
  - `parseDisclosure` (drops unknown keys and levels);
  - THB money ladder and 1–2.5–5–10 count ladder (`bandFor`), `thbFromUsdCents`;
  - whole-percent `growthPercent` (no −0);
  - `effectiveLevel` (growth → badge fallback);
  - the spec §6 level × surface matrix (`shownOn`);
  - `publicProofLevel` (O2: private doesn't count).
- **Migration `supabase/migrations/20261011130000_disclosure_levels.sql`, written only, NOT APPLIED.** The CLI's timestamp sorted before the applied funnel migration, so it was renamed. Contents:
  - `metric_disclosure` plus about 40 `public_*` columns;
  - immutable helpers;
  - a BEFORE INSERT/UPDATE trigger (SECURITY INVOKER, `search_path=''`) that validates levels, applies O1 defaults on a first connection, and computes every `public_*` value. Clients have no write grant on them, and the trigger overwrites them on every write;
  - backfill: existing data stays `exact`, and `updated_at` is untouched;
  - revoke of every raw metric column, `proof_level` and `metric_disclosure` from anon / authenticated, with column grants on the public set;
  - owner `update(metric_disclosure)` and `get_my_startup_metrics()` (definer, `owner_id = auth.uid()`);
  - snapshot policies public only at `exact`, owners always;
  - `search_startups`, `province_leaderboard` and the heatmap materialized view rebuilt on `public_*`;
  - rollback notes.
- **`supabase/tests/rls_smoke.sql`:**
  - T125 updated: raw `proof_level` is no longer public; `public_proof_level` is;
  - T146–T160 appended. They pass only after the migration is applied.
- **`docs/DISCLOSURE_SURFACE_AUDIT.md`:**
  - A: 8 paths that break on apply (anon / cookie `select *`, embeds, owner pages);
  - B: 5 admin paths that need rules in code;
  - C: 10 render surfaces;
  - D: tests;
  - E: size, about 4–6 days plus owner UI. Deploy order: code with a compatibility layer first, then apply;
  - F: residual risks.

**Verified:**

- typecheck ✓ · lint ✓ · vitest 540 passed / 17 skipped (+87).
- **Dry run on the remote DB inside `begin … rollback`:**
  - first a probe confirmed rollback leaves nothing;
  - then the whole migration + T125 + T146–T160 ran, and every line matched its expectation. That covers:
    - raw columns denied to anon and to another user (direct select);
    - O1 defaults;
    - exact / band (฿1k–5k at a test rate) / growth (18%) / growth → badge / private (no provider, no sync time, proof 0);
    - sync recompute;
    - snapshots 1/1/1 at exact and 0/0/0 hidden, owner 1/1/1;
    - search masked;
    - Olympics exact-only;
    - heatmap +1 only at exact;
    - backfill complete;
    - helper and trigger privileges and search_path.
  - Afterwards: no new column, function, policy, test user or project remained.
  - **Advisors not run** (they need the applied schema).

**Not changed:** no migration applied, no commit, no surface code, no setting, no homepage files.
**Next:** owner review of the migration + audit; then the compatibility-layer code (audit A–C) → apply after the post with approval → advisors + RLS smoke + types.

## 2026-10-11 — R2 step 1 spike: masked view fails, propose precomputed `public_*` columns (waiting for the owner)

**Done:**

- **M2 pushed** (`24774a4`) and verified on production: e2e 133 passed / 1 skipped / 0 failed, including the founder-profile "request on the first screen" test that failed at 375 px before.
- **Spike for DISCLOSURE_SPEC §4.2** (remote DB, every statement inside a DO block that ends in `raise exception`, so nothing was kept):
  - **Invoker view** (`security_invoker = true`) with the raw metric column revoked from `anon`: **permission denied**. A view that computes a band must read the raw value, and an invoker view reads it with the visitor's rights.
  - **Owner-rights view** (the default): the owner is `postgres`, which has `rolbypassrls = true`, and `startups` does not force RLS, so the view **ignores row-level security**. With a test project set to `private`, anon saw it through the view (1 row) but not through the table (0 rows). It would also be flagged by the Supabase advisor (security-definer view) and would need every row rule rewritten by hand.
  - **PostgREST embed through a view** (`owner:profiles!startups_owner_id_fkey`) can't be tested with a rollback: PostgREST builds its schema cache from committed objects only. It would need a committed view, i.e. a schema change, which the brief doesn't allow. Untested, but moot after the two results above.
- **Recommendation:** the spec's alternative. Precomputed `public_*` columns on `startups`, written by a `security definer` trigger whenever a metric or `metric_disclosure` changes (the sync writes metrics through the service role, so every write path is covered). Raw metric columns are revoked from `anon` / `authenticated`, and the `public_*` columns are granted. RLS on `startups` keeps working unchanged, the owner embed keeps working (same table), and there's no definer view for the advisor to flag. Snapshot policies check the level through a `security definer` helper, so `metric_disclosure` itself needn't be public.

**Not changed:** no file other than this log and Project.md; no migration, commit or setting. Steps 2–6 of the R2 brief are on hold until the owner decides (the brief: stop and wait if the spike fails).
**Verified:** the two rolled-back SQL spikes above; production e2e after the M2 deploy.
**Next:** owner decision on the `public_*` approach (O4) → R2 steps 2–6.

## 2026-10-11 — Revamp M2: card rise, rolling numbers on cards + leaderboard, rank-change slide, first-verify stamp; founder request on the phone's first screen

**Done (Design.md §7 Motion + §5 Builder profile first):**

- **`InView` modes:** `seen` (M1 tiles, waiting state before the first view) and `enter` (cards, leaderboard: nothing hidden before JS; already on screen at load → settled at once, no flash; only elements that scroll in play their effect). The M1 waiting-state CSS is now scoped to `seen`.
- **Card rise:** StartupCard (home rows, directory, category, province, "More startups") and BuilderCard rise in (opacity + 16 px, 700 ms, staggered 60 ms by grid position, 5 steps) and roll their money / visitors / commits; the wizard preview card never moves.
- **Leaderboard:** values roll when the card first scrolls in; switching boards slides rows on both boards to their new rank (FLIP, transform only, 450 ms) and fades up rows new to the board; "show all" and reduced motion just swap.
- **First-verify stamp:** VerifyPanel's just-connected check pops in once with one ring; already-connected rows never animate.
- **Founder profile (production e2e failure on 375 px):** a phone-only "ส่งคำขอคุย →" link under the StatusPill when the founder is looking (never for the owner), same contact flow; the full looking-for card stays first in the main column. Cause: GXCB06's profile now shows the looking-for card, which the test hadn't measured before; M1 did not change this page.

**Not changed:** no migration, data, settings; homepage copy (the parallel marketing session's uncommitted edits left untouched).
**Files:** `Design.md`, `src/app/globals.css`, `src/components/core/InView.tsx`, `src/components/{StartupCard,LeaderboardCard}.tsx`, `src/components/builder/BuilderCard.tsx`, `src/components/wizard/VerifyPanel.tsx`, `src/app/[locale]/u/[username]/page.tsx`, `e2e/motion.spec.ts`
**Verified:** typecheck ✓ · lint ✓ · unit 453 passed / 17 skipped · e2e local 117 passed / 17 skipped / 0 failed (new: cards on screen at load stay put, cards that scroll in rise; leaderboard switch) · build ✓ · FLIP checked on a temporary local page with synthetic rows (deleted): rows slide from their old offsets, the new row fades up, nothing left running after 800 ms, none under reduced motion, no page errors · stamp keyframes start (`stamp-pop` + ring) · 375 px screenshots mid-rise and settled. The profile fix is verified by the production e2e after deploy (profiles need the server key locally).
**Next:** owner "push" → production e2e (incl. the profile test) → R2.

## 2026-10-11 — Revamp M1: motion foundation, rolling verified numbers, chart draw, live pulse

**Done (Design.md §7 Motion first, no animation library):**

- **Tokens + rules** (`globals.css`): `--ease-settle`, `--motion-fast/base/slow` (160 / 240 / 700 ms); a site-wide `prefers-reduced-motion: reduce` rule (every animation and transition effectively instant); effects gated by `(prefers-reduced-motion: no-preference) and (scripting: enabled)`.
- **`InView`** (`core/InView.tsx`, client): sets `data-in="1"` on first view (30%), `done` after the effect, so nothing replays on period / metric / currency switches; reduced motion or no IntersectionObserver → `done` at once.
- **`RollingNumber`** (`core/RollingNumber.tsx` + `lib/motion/digits.ts`, tests): digits of an already-formatted value roll in; the real text stays in the DOM (the 0–9 column is a `::before` with empty alt text), so copy / screen readers / e2e read the exact value. **Waiting state is blank, never a fake "0"** (an early phone frame showed "฿0,000" before hydration). 1em window clipped with `clip-path` (keeps the text baseline); `line-height: 1` pinned on the digit because `:lang(th)` sets 1.6 everywhere.
- **Used in:** project page money tiles (`Money roll`), TractionTiles (visitors, active users, commits). Not leaderboard rows / cards (M2).
- **Chart draw** (`MetricChart`): the series is revealed left → right with `clip-path` once; Recharts' own animation stays off.
- **Live pulse** (`VerifiedBadge live`, `lib/motion/live.ts` + tests): 3 beats when the source synced within 26 h.

**Not changed:** no migration, data, settings; MRR semantics; homepage copy (the parallel marketing session's uncommitted hero edits were left untouched and not committed).
**Files:** `Design.md`, `src/app/globals.css`, `src/components/core/{InView,RollingNumber,VerifiedBadge}.tsx`, `src/components/{StartupBits,ProfileBlocks,MetricChart}.tsx`, `src/components/profile/ProjectBlocks.tsx`, `src/app/[locale]/startup/[slug]/page.tsx`, `src/lib/motion/{digits,live}.ts` (+ tests), `e2e/motion.spec.ts`
**Verified:** typecheck ✓ · lint ✓ · unit 453 passed / 17 skipped (+8) · e2e local 114 passed / 16 skipped / 0 failed (new `motion.spec.ts`: exact text, roll + hold animations run, chart ends unclipped, reduced motion has no motion animations; desktop + 375 px) · build ✓ · Playwright screenshots mid-roll and settled at 1280 and 375 px (one digit row visible, baseline aligned, no horizontal overflow, live ring present).
**Next:** owner review of M1 → R2a (disclosure logic).

## 2026-10-11 — Revamp R0: add-project funnel live + motion study

**Done:**

- **Owner adopted the revamp direction** ([docs/MAJOR_REVAMP_PLAN.md](docs/MAJOR_REVAMP_PLAN.md)): D6 apply the funnel now, D1 all five disclosure levels, D2 per-project AI-label switch (shown by default), R2 coded now with its migration applied only after the 14 Oct post, motion foundation + numbers (M1) before the post.
- **Funnel migration applied** (`add_funnel_events`, from `supabase/migrations/20261011120000_add_funnel_events.sql`, unchanged; its header comment still says "NOT APPLIED" because applied migrations aren't edited):
  - security advisors: no new WARN (new INFO "RLS enabled, no policy" on `analytics.funnel_events` is by design; the existing leaked-password WARN is an Auth setting);
  - performance advisors: only INFO (the new indexes are unused so far);
  - RLS smoke: every line good. Three funnel tests had **test bugs**, not migration bugs: T142b / T143 called `log_verify_result` for user `a` on a project that belongs to `ov` since T120, and T145 compared `search_path=` while Postgres stores `search_path=""`. Fixed in `supabase/tests/rls_smoke.sql` and re-run (verify=1, cap 50, 3 definer functions);
  - `generate_typescript_types`: identical to the hand-added funnel entries, so `database.types.ts` is unchanged;
  - test data rolled back (0 funnel rows, 0 test users).
- **Motion study** (browser, read-only): Finsepa (Framer: 0.4 s fades, ticker marquee, autoplay video, hidden-until-JS content) and Bencho (React + CSS keyframes, `data-in` reveals, 53 reduced-motion blocks, MIT blocks). Findings and the M1 scope are in the revamp plan §P4.

**Not changed:** app code, production data, settings. The deployed wizard now records funnel events (no deploy needed).
**Files:** `supabase/tests/rls_smoke.sql`, `docs/MAJOR_REVAMP_PLAN.md`, `docs/SESSION_HANDOFF.md`, `Project.md`, `PROGRESS.md`
**Verified:** `list_migrations` shows `add_funnel_events`; advisors; RLS smoke; typecheck ✓ · lint ✓ · unit 445 passed / 17 skipped.
**Next:** M1 motion (Design.md first) → R2a.

## 2026-10-11 — Major revamp plan (proposal only)

**Done:**

- **`docs/MAJOR_REVAMP_PLAN.md`:** a proposed plan from two feedback items (builders won't disclose MRR / users; non-developers and investors need an easier way in, "made with AI" can hurt a business brand) plus the Aetox motion suggestion:
  - five pillars: privacy-first proof (per-metric disclosure levels), visitor-first discovery, a reason to return (in-app → email → LINE), motion, user interviews;
  - phases R0–R6 merged with the audit's A1–C3;
  - metrics (no invented targets), risks, and decisions D1–D8 for the owner.
- **Aetox motion check** (browser, read-only): CSS-only (one keyframe, ~75 transitions, ~12 reveal elements, two canvases, no GSAP/Lenis/Lottie found), so no heavy animation library is needed.

**Not changed:** code, data, migrations (the funnel migration is still pending apply), settings.
**Files:** `docs/MAJOR_REVAMP_PLAN.md`, `Project.md` (§7 pointer)
**Verified:** read-only review of Project.md §6/§7, the audit plan and the live Aetox page; nothing built.
**Next:** owner decisions D1–D8 (esp. D6: apply the funnel migration before the post), then R0.

## 2026-10-11 — GA4 re-enabled: `G-JYPJ2RFH4N` restored as the built-in default

**Done:**

- **Owner reversed the same-day GA-off decision:** the tag `G-JYPJ2RFH4N` is back as the built-in default in `src/lib/analytics/ga.ts` (`DEFAULT_MEASUREMENT_ID`), so a production build renders GA with **no env var set**. `NEXT_PUBLIC_GA_ID` still overrides the ID; empty / `"off"` / `"false"` / `"0"` / `"no"` disables it without a code change. **Production-only**, unchanged (dev/e2e never send hits).
- **/privacy restored (th + en):** §6 now discloses the Google Analytics `_ga` cookies (keeping the no-advertising / no-cross-site-tracking-**for-ads** promise, and noting JaoPor's counter and Vercel's Web Analytics stay cookie-free); §8 lists Google Analytics again; date → 2026-10-11.
- **`.env.example` reworded:** GA is on by default (JaoPor's property); the var is commented out (optional override), so copying the file can't accidentally disable it.

**Verified:** `npx vitest run src/lib/analytics/ga.test.ts` → 6 passed; `npm run typecheck` ✓; `npm run lint` ✓; `npm run build` ✓; `.next/server/app/th.html` carries both `https://www.googletagmanager.com/gtag/js?id=G-JYPJ2RFH4N` and the inline `gtag("config", …)` boot.

**Still open:** **no consent banner** — GA loads before any PDPA opt-in (owner decision, unchanged); Vercel Web Analytics still to be enabled in the dashboard.

**Next:** resume the master audit at B2 (charts / settings).

## 2026-10-11 — Launch measurement: first-party add funnel + Vercel Web Analytics (GA4 off)

**Done:**

- **Owner picked Option 3 + Option 2** (rejected GA4 + a consent banner): a first-party, cookie-free add-project funnel in Supabase, plus Vercel Web Analytics for landing/traffic pageviews (Hobby plan: pageviews only, no custom events).
- **GA4 is now off by default** — the hardcoded `G-JYPJ2RFH4N` default is gone; `src/lib/analytics/ga.ts` returns `null` unless `NEXT_PUBLIC_GA_ID` is set, so a production build can't silently enable it. This **supersedes** the 2026-10-10 GA4 entry below. _(**Reversed the same day** — GA is on again with the default restored; see the GA4 re-enable entry above.)_
- **First-party funnel** (migration `20261011120000_add_funnel_events.sql`, **not applied**): new `analytics.funnel_events` table; browser events `add_opened → add_created → verify_chose → add_finished → add_failed` logged from the wizard through a thin `public.log_add_event` invoker; server-only `public.log_verify_result` (from the sources POST in `after()`) and `public.prune_funnel_events` (nightly cron, 180-day retention). Caps 100 client events/user/day + 50 verify results/project/day; every function fails closed.
- **/privacy updated (th + en):** §2 adds the funnel bullet; §6/§8 drop the GA `_ga` cookies and name Vercel's cookie-free Web Analytics; date bumped to 2026-10-11. _(§6/§8 GA disclosure **restored later the same day** — see the GA4 re-enable entry above.)_

**Files:** `supabase/migrations/20261011120000_add_funnel_events.sql`, `supabase/tests/rls_smoke.sql` (T137–T145), `src/lib/analytics/{funnel-types,add-funnel,ga}.ts`, `src/components/wizard/{StartupWizard,VerifyPanel}.tsx`, `src/app/api/startups/[id]/sources/[source]/route.ts`, `src/app/api/cron/sync/route.ts`, `src/app/[locale]/layout.tsx`, `src/lib/supabase/database.types.ts`, `.env.example`, `package.json`
**Verified:** `npx vitest run` → 445 passed / 17 skipped; `npm run typecheck` ✓; `npm run lint` ✓; `npm run build` ✓; `npx playwright test` → 108 passed / 16 skipped / 0 failed; `.next/server/app/th.html` has no `googletagmanager`.
**Not applied:** the migration is **not** applied and no production setting changed — applying it, running RLS smoke T137–T145, regenerating `database.types.ts`, and enabling Vercel Web Analytics in the dashboard are the owner's next steps.
**Next:** resume the master audit at B2 (charts / settings).

## 2026-10-10 — Google Analytics 4 (gtag.js) on production + privacy disclosure

> **Superseded 2026-10-11:** GA is off by default now — see the measurement entry above.

**Done:**

- **GA4 installed** (`src/app/[locale]/layout.tsx`, `src/lib/analytics.ts` (new)): the tag (`G-JYPJ2RFH4N`, pasted by the owner) loads via `next/script` (`afterInteractive`) in the localized root layout — gtag.js plus an inline `ga-init` that boots `dataLayer` and calls `gtag("config", …)`. **Production only**, mirroring the `/v.js` self-counter, so dev and e2e never send hits. `NEXT_PUBLIC_GA_ID` overrides the ID; empty or `"off"` disables it without a code change (unset → JaoPor's property). Documented in `.env.example`.
- **Privacy policy updated (th + en)**: §6 "ข้อมูลที่เก็บในเบราว์เซอร์ของคุณ" now discloses the Google Analytics cookies (`_ga`) while keeping the no-advertising / no-cross-site-tracking-**for-ads** promise; §8 "บริการภายนอกที่เราใช้" lists Google Analytics (traffic statistics on page view); the "last updated" date is bumped to 2026-10-10.
- **New test** (`src/lib/analytics.test.ts`): default/override/disable parsing, the production-only gate, and the init snippet.

**Not changed / still open:**

- **No consent banner.** The tag loads before any consent step; **PDPA / EU consent remains an owner decision** (Project.md §7 flagged it). No migration; no production data or settings change; no deploy.

**Verified:** `npx vitest run` → 437 passed / 17 skipped (new `analytics.test.ts` 6 cases; `messages.test.ts` th↔en parity passes); `npm run typecheck` ✓; `npm run lint` ✓; `npm run build` ✓ (56/56). The production prerender carries the tag: `.next/server/app/th.html` contains `<link rel="preload" href="https://www.googletagmanager.com/gtag/js?id=G-JYPJ2RFH4N" as="script"/>`.

**Files:** `src/lib/analytics.ts` (new) · `src/lib/analytics.test.ts` (new) · `src/app/[locale]/layout.tsx` · `.env.example` · `messages/th.json` · `messages/en.json` · `Project.md` (§7 open item).

**Next:** owner decision on PDPA/consent (consent banner vs. cookie-free Vercel Web Analytics vs. the planned first-party funnel); then resume the master audit at B2 (charts / settings).

## 2026-10-10 — UX master audit phase B1: founder profile order, share, project Proof/Story

**Done:**

- **Item 9 — founder profile order (P0 on phones)** (`src/app/[locale]/u/[username]/page.tsx`): below `lg` the sidebar now keeps only identity (photo, name, proof line, headline, StatusPill, actions, followers, province) plus a skill preview that links to `#profile-extras`; bio, links, badges, the full skills list, "สร้างด้วย" and report move to the **bottom of the main column** (`#profile-extras`). The main column leads with looking-for → proof strip → revenue card → pinned works → **experience → อัปเดตผลงาน** (experience moved above the feed so a founder's history isn't buried under posts). Desktop keeps the old sticky sidebar.
- **Item 11 — Share on profiles (P2)** (`components/builder/ProfileShareButton.tsx`, `ProfileActions.tsx`): a full-width "แชร์โปรไฟล์" button under the actions (owner sees it under "แก้ไขโปรไฟล์"): the native **Web Share** sheet when available, otherwise it copies the canonical `/{locale}/@handle` short link. Instagram-as-a-link is deferred (needs a validation-trigger migration, reviewed separately).
- **Item 6 — project page Proof / Story (P1)** (`page.tsx`, `ProfileBlocks.tsx`, `profile/ProjectBlocks.tsx`): the chart (with its verified-by / counted-by stamps) and `TractionTiles` now sit together in one **"ตัวเลขที่ยืนยัน / นับได้"** container; the narrative moved into one **"เรื่องราวของผลงาน"** container — ปัญหาที่แก้ → คุณค่าที่มอบให้ → กลุ่มลูกค้า, then the founder's build story, then the remaining facts (ราคา · ตลาด · ขนาดทีม · เงินทุน · ช่องทาง · เทคโนโลยี · สร้างด้วย). `InsightsGrid` (which split the "why" to the very bottom) is gone; the build story no longer lives inside the traction tiles. Order is now Proof → Story → screenshots → founder message → updates → more. Proof is hidden from visitors when it holds no number; nothing empty is shown to visitors.

**Not changed:**

- no migration; no production data or settings; no auth change; no deploy;
- Instagram link support (flagged for a separate migration review): untouched.

**Verified:** `npx vitest run` → 431 passed / 17 skipped; `npm run typecheck` ✓; `npm run lint` ✓; `npm run build` ✓ (56/56). `npx playwright test e2e/project.spec.ts` → **4 passed** (th + en × desktop & 375: "Proof before Story before updates" on a real project page). `e2e/readability.spec.ts` + `e2e/pages.spec.ts` + `e2e/numbers.spec.ts` → **76 passed / 10 skipped**, no horizontal scroll, no raw keys. `e2e/profile.spec.ts` (new, item 9): loads clean, **4 skipped** locally (profiles read through the admin RPC, which needs `SUPABASE_SECRET_KEY`).

**Files:** `src/app/[locale]/u/[username]/page.tsx` · `src/app/[locale]/startup/[slug]/page.tsx` · `src/components/ProfileBlocks.tsx` (StorySection) · `src/components/profile/ProjectBlocks.tsx` (TractionTiles) · `src/components/builder/ProfileActions.tsx` · `src/components/builder/ProfileShareButton.tsx` (new) · `messages/th.json` · `messages/en.json` · `Design.md` (§5 profile + §6 Proof/Story) · `e2e/profile.spec.ts` (new) · `e2e/project.spec.ts` (new).

**Next:** A3 item 2 (card v2 + compact directory header) — still blocked on the two TrustMRR screenshots (audit Q8); then B2 (charts / settings), C1 (multi-select filters + leaderboard page).

## 2026-10-10 — UX master audit phase A3 (item 1): 12px type floor

**Done:**

- **Item 1 — type roles + a 12px floor** (`globals.css`, `Design.md` §3): Thai loses its vowel and tone marks below 12px, so `text-3xs` and `text-2xs` are both pinned at the **12px floor** (0.6667rem → 12px at the 112.5% root) — no visible text renders under 12px. `text-caption` (12.4px) is the smallest Thai-capable step. Design.md's scale and role table now state rendered px and the floor rule; `text-3xs`/`text-2xs` are limited to Latin/uppercase micro-labels and counters, never Thai words.
- **Chart ticks raised** (`MetricChart.tsx`): revenue/visitor axis labels were 10px → 12px, the last sub-12 text on a page.
- **New acceptance check** (`e2e/readability.spec.ts`): fails if any visible text inside `<main>` computes under 12px (skips `aria-hidden` decoration and the live map's scaled SVG text, marked `data-live-map`). The whole fix was the token change — no call-site sweep needed.

**Not changed:**

- no migration; no production data or settings; no auth change;
- OG / share-card / badge image routes (their own render targets, not `<main>`).

**Verified:** `npx vitest run` → 431 passed / 17 skipped; `npm run typecheck` ✓; `npm run lint` ✓; `npm run build` ✓ (56/56 pages). `npx playwright test e2e/readability.spec.ts` → **28 passed** (th + en × home/startups/categories/olympics/feed/login + a project page × desktop & 375). `e2e/pages.spec.ts` + `e2e/numbers.spec.ts` → **48 passed / 10 skipped**, no new horizontal scroll and card numbers still fit at the larger size.

**Files:** `src/app/globals.css` · `Design.md` (§3 scale + floor) · `src/components/MetricChart.tsx` · `src/components/live/LiveVisitorsSection.tsx` (`data-live-map`) · `e2e/readability.spec.ts` (new) · `Project.md`.

**Next:** A3 item 2 (card v2 + compact directory header on phones) — blocked until the two TrustMRR reference screenshots arrive (audit Q8); then B1.

## 2026-10-10 — UX master audit phase A2: verification clarity

**Done:**

- **Item 4 — metric-first verify chooser (P0)** (`lib/sources/catalog.ts` + test, `VerifyPanel.tsx`):
  - The chooser asks what a founder wants to prove, not which tool they own: three **metric rows** — รายได้ / MRR (Stripe · RevenueCat), ผู้เข้าชม (JaoPor snippet · Plausible · Umami · Cloudflare), การสร้าง / build proof (GitHub).
  - Each row shows what it measures, its sources, what you get, the limits, and the "ไม่ต้องใช้คีย์" / "คีย์อ่านอย่างเดียว" chip. Choosing a row reveals its sources as a segmented switch, then only the chosen connector.
  - The mapping is a unit-tested `METRICS` in `catalog.ts`, so Google Analytics can never appear (no connector) and issue 7's chart can reuse it. Deep-link anchors `#verify-revenue` / `#verify-traffic` / `#verify-build` are preserved. The snippet row still hides without a website.
- **Item 3 — expectation copy** (`StartupWizard.tsx`, `VerifyPanel.tsx`): a "ต่อไป: ยืนยันตัวเลข (ไม่บังคับ)…" hint under the step-1 button; a "what you get" strip (✓ on your card · leaderboard · badge) at the top of the chooser; a "อ่านอย่างเดียว · เห็นแค่ยอดรวม · ยกเลิกได้ทุกเมื่อ" line above the Stripe key field.
- **Item 8 — Add Startup clarity** (`StartupWizard.tsx`): an owner-stated vs verified line in step 1 ("ข้อมูลที่คุณกรอกจะแสดงเป็น “เจ้าของบอก”…"). Optional fields (tagline, logo) were already labelled "(ไม่บังคับ)". **New projects stay public on create** (owner decision 2026-10-10) — the expectation is already stated in `basicsIntro`, so no RLS/funnel change.

**Not changed:**

- no migration; no production data or settings; no auth change;
- the connector/sync internals, the manage view for connected sources, and the edit page's grouped view.

**Verified:** `npx vitest run` → 431 passed / 17 skipped (incl. new `catalog.test.ts` metric mapping and `messages.test.ts` th↔en parity); `npm run typecheck`; `npm run lint`; `npm run build`. The chooser is behind sign-in (wizard step 2 / edit page), so it is covered by the unit tests and build rather than a browser pass.

**Files:** `src/lib/sources/catalog.ts` (+ `catalog.test.ts`) · `src/components/wizard/VerifyPanel.tsx` · `src/components/wizard/StartupWizard.tsx` · `messages/th.json` · `messages/en.json` · `Design.md` (§5 VerifyPanel chooser + wizard v2) · `Project.md` (§7).

**Next:** A3 (type roles in Design.md + sweep · card v2 + compact directory header on phones).

## 2026-10-10 — UX master audit phase A1: co-founder request, link types, leaderboard rules

**Done:**

- **A1.1 Co-founder request** (`lib/looking-for.ts` + tests, `LookingForBanner`, `ProfileActions`, the profile and login pages):
  - The "กำลังหา" asks are plain text (no tab-like pills).
  - **Each action is a real button:**
    - co-founder → "สนใจร่วมก่อตั้ง? ส่งคำขอคุย ›" opens the founder's existing request flow on the `cofounder` topic (`/u/{handle}?contact=1&topic=cofounder`);
    - investor / buyer → "ติดต่อผู้ก่อตั้ง ›" (`topic=other`);
    - product asks → "ลองใช้เลย ›".
  - **Signed out:** visitors are sent through sign-in (title "เข้าสู่ระบบเพื่อส่งคำขอคุย") and come back with the dialog open on that topic.
  - **An existing pending / accepted / blocked request** no longer opens a form that would fail; a status line says why.
  - **The owner** sees a hint instead of the button.
- **A1.2 Link types** (`lib/links.ts` + tests, `LinkTypeStatus`, `link-text.ts`, wizard, edit form, VerifyPanel callers, server routes):
  - Platform pages (Facebook, Instagram, TikTok, YouTube, X, Threads, LinkedIn, Linktree, Notion, Google Docs / Sites, TestFlight, LINE LIFF) are detected by host and labelled "ลิงก์อื่น". Detection by host, so there's no migration and no stored flag.
  - **Short links are refused.**
  - **The wizard shows a "ประเภทลิงก์" control** to correct the detection. A wrong choice is explained (platform page as own site, "other" for an unknown domain, per-kind format).
  - **Only the project's own website gets** auto-fill, the visitor counter, the owner check and analytics matching. Enforced in the UI and on the server: `requireWebsite`, the owner check, `/api/startups/preview`, `/autofill`, `/api/collect`.
  - **Duplicates:** platform pages compare the page itself (path + identifying query, tracking parameters dropped).
  - **Paths and queries are kept.** Instagram is detected only as a project link; profile social links are unchanged (they need a migration).
- **A1.3 Leaderboard** (`lib/leaderboard.ts` + tests, `getBoard`, home rows, `LeaderboardCard`):
  - **Documented definitions:**
    - MRR current (daily);
    - revenue 30 days;
    - visitors 30 days (counted);
    - commits all-time.
  - **Labels carry the period.** A per-board footer defines the source, the period, and what "เติบโต" compares (revenue growth on the MRR board).
  - **Ties:** equal values share a competition rank (1, 1, 3) with "=", listed by name. This replaces newest-first creation order, and now matches the project page's rank.
  - **Eligibility in one place:** published, not demo, has a value, verified revenue for revenue boards. Applied to the query and again in code.
  - **No new page or Movers view** (later phase).

**Not changed:**

- no migration;
- no production data or settings;
- MRR semantics;
- homepage positioning.

**Not pushed:** waiting for the owner's review.

**Files:**

- **New:**
  - `src/lib/looking-for.ts` (+ test)
  - `src/lib/leaderboard.ts` (+ test)
  - `src/components/wizard/LinkTypeStatus.tsx`
  - `src/components/wizard/link-text.ts`
  - `e2e/a1.spec.ts`
- **Modified:**
  - `src/lib/links.ts` (+ test)
  - `src/lib/next-path.ts` (+ test)
  - `src/lib/data/startups.ts`
  - `src/lib/sources/sync.ts`
  - `src/app/api/{collect,startups/preview,startups/[id]/autofill}/route.ts`
  - `src/app/[locale]/{page,login/page,u/[username]/page}.tsx`
  - `src/components/{LeaderboardCard,builder/ProfileActions,profile/ProjectBlocks,profile/Owner,wizard/StartupWizard,wizard/StartupEditForm}.tsx`
  - `messages/*.json`
  - `Design.md`

**Verified:**

- **Gate:** typecheck ✓ · lint ✓ · unit 424 passed / 17 skipped (was 369; +55: looking-for 9, next-path 3, links 29, leaderboard 14) · local e2e 76 passed / 12 skipped (the A1 contact-link test needs the server key, so it runs on production) · production build ✓.
- **Browser** (local, desktop + 375 px):
  - the "กำลังหา" variants (co-founder, mixed, investor, product-only), from a temporary page deleted afterwards;
  - buttons 41 px tall, no overflow;
  - link-type states (Facebook note, platform-as-own-site error, unknown-domain "other" error, short link, Play format, LINE ID);
  - leaderboard labels + footer.
- **RLS smoke:** not rerun (no database change).

**Next:** owner review of A1 → push → production e2e → A2.

## 2026-10-10 — Master UX/UI audit (Phase 1, audit only) + hardening pass verified on production

**Done:**

- **`docs/UX_UI_MASTER_AUDIT.md`:** the owner's 17-issue brief plus first-visit onboarding and multi-select filters. For each item:
  - current implementation and files;
  - root cause;
  - type, priority;
  - confirmed vs assumption;
  - solution + acceptance;
  - dependencies, risks, tests.

  Also a reordered phased plan (A1 trust fixes → A2 verification clarity → A3 readability → B1 profiles → B2 charts / settings → C1 filters + leaderboard → C2 onboarding → C3 badge + copy) and 8 owner decisions.

- **Key confirmed findings:**
  - essential Thai text at 10–11 px (metric values 11.3 px);
  - directory: the first card at y = 635 of 812 on phones;
  - unknown links silently become "website" (Facebook, YouTube, Linktree…);
  - the co-founder chip looks clickable, and the only button opens the product site;
  - founder profile on phones: the request box 1.8 screens down, the page 6.2 screens;
  - the chart already supports revenue / MRR / visitors, but hides them in a dropdown; commits missing;
  - the leaderboard mixes all-time commits with 30-day metrics and breaks ties by newest;
  - filters are single-select at every layer (no migration needed to fix);
  - Instagram on profiles needs a small migration (the validation trigger).
- **Hardening pass on production** (`2da0b25`):
  - production e2e 82 / 82 ✓ (incl. the new th / en 404 checks);
  - `live_pings` has 0 rows since the deploy (no heartbeat writes);
  - `/api/live/count` → `{count:null}`; `/api/live/ping` → 204;
  - home makes no `/api/live/*` or Supabase calls signed out; the visitor snippet still sends `/api/collect`.

**Nothing changed:** code, data, auth, migrations (the analytics migration is still not applied).

**Files:** `docs/UX_UI_MASTER_AUDIT.md`
**Verified:**

- code inspection;
- production measurements at 375 px / desktop (browser);
- read-only SQL;
- production e2e.

**Next:** owner decisions (positioning, page order, publish-on-create, guest access, preferences storage, `/leaderboard`, founder badge numbers, card screenshots), then Phase A1.

## 2026-10-09 — Pre-launch hardening pass (live map off, th/en 404 and error pages, launch checklists)

**Code changes:**

- **Live map off by default (gate B-2):**
  - `LIVE_ENABLED` now needs `NEXT_PUBLIC_LIVE_VISITORS=1`. The Vercel env couldn't be set from here, so the flag's default was flipped.
  - No Realtime presence or broadcast, heartbeat or geo lookup from the provider.
  - `/api/live/ping` and `/api/live/count` answer without touching the database.
  - The feature, the `live_pings` table and the /privacy wording are kept. Re-enable with the variable + a redeploy.
- **Thai / English 404 and error pages (H-4):**
  - `[locale]/not-found.tsx` + a `[locale]/[...rest]` catch-all;
  - `[locale]/error.tsx` (retry, home, opaque reference only);
  - `app/global-error.tsx` (loads only its language's messages, lazily);
  - shared `ErrorScreen`;
  - `ErrorPage` messages in th / en;
  - a Design.md pattern;
  - `e2e/not-found.spec.ts`.
- **`.gitignore`:** database dumps can't be committed.
- **`eslint.config.mjs`:** ignores `.claude/worktrees/**`. An old worktree's `.next` made lint report 39 k problems that weren't in this checkout.

**Documentation:** `docs/LAUNCH_HARDENING.md`:

- Vercel plan (Hobby; commercial-use terms; Pro recommended before the post);
- Supabase usage table (measured: DB 16 MB, storage 6.9 MB, MAU 8, Edge Functions 0; egress and Realtime need a dashboard login);
- exact backup commands (Docker or PostgreSQL 17 tools are needed; the project isn't linked locally; what's inside; how to store it);
- Google secret and Gemini key rotation checklists;
- OAuth / allowlist checklist;
- uptime monitors (`/api/search?q=jaopor` keyword + `/api/health` + `/th`);
- anonymous-write review with the smallest mitigation (proposed, not built) and a /privacy profile-view bullet for approval;
- the 10-minute daily operator checklist;
- JaoPor's own launch tasks.

**Manual account changes:** none made. All are listed in `docs/LAUNCH_HARDENING.md` §E, §F, §J.

**Not changed (owner instructions):**

- the analytics migration (not applied);
- MRR semantics;
- demo projects;
- homepage positioning.

**Files:**

- `src/lib/live/identity.ts`
- `src/app/api/live/{ping,count}/route.ts`
- `src/app/[locale]/{not-found,error}.tsx`
- `src/app/[locale]/[...rest]/page.tsx`
- `src/app/global-error.tsx`
- `src/components/ErrorScreen.tsx`
- `messages/*.json`
- `Design.md`
- `e2e/not-found.spec.ts`
- `.gitignore`
- `eslint.config.mjs`
- `docs/LAUNCH_HARDENING.md`

**Verified:**

- **Gate:** typecheck ✓ · lint ✓ · unit tests 369 passed / 17 skipped ✓ · local e2e 72 passed / 10 skipped (incl. 8 new 404 checks) ✓ · production build ✓.
- **RLS smoke on production:** all checks good, rolled back.
- **Secret scans** (repo, history, build output): clean.
- **Browser:**
  - the Thai and English 404 inside the layout, with links keeping `/th` / `/en`, at 375 px with no overflow;
  - the error page from a temporary throwing route (deleted afterwards): Thai text, retry, home, reference, header kept;
  - home: no live section, no `/api/live/*` or Realtime requests.
- **The global error chunk:** messages load lazily (no page HTML references them).
- **Production checks** after the push are logged in the next entry.

## 2026-10-08 — Launch-readiness assessment (read-only) + final analytics migration for review

**Done:**

- **`docs/LAUNCH_READINESS_REPORT.md`:** a read-only review of production covering:
  - security;
  - cost and abuse;
  - Supabase Free / Vercel Hobby limits against 100 / 500 / 1,000 online and 5,000+ users;
  - reliability, observability, the new-user journey, OAuth;
  - privacy-page accuracy;
  - recovery paths;
  - the launch gate (3 BLOCKER, 9 HIGH, 12 MEDIUM).
- **Main findings:**
  - Realtime presence (the live map) passes Free-plan limits at about 50 online and can use the monthly 2 M messages in a day;
  - no backups on the Free plan;
  - Google shows the Supabase domain and GitHub shows "MRRMafia" at sign-in;
  - default English 404 / error pages;
  - unbounded anonymous writes to `profile_views`;
  - profile-view counting isn't disclosed on /privacy.
- **`docs/ADD_STARTUP_ANALYTICS_MIGRATION.md`:** the final SQL, event schema, stored data, RLS model, duplicate handling, failure isolation, tests T137–T145 and the /privacy wording (th + en).
  - It fixes a draft bug: the server can't write to an unexposed schema through the Data API, so writes and cleanup now go through service-role-only functions.
- **Nothing was changed** in production, the database or the code.

**Files:** `docs/LAUNCH_READINESS_REPORT.md`, `docs/ADD_STARTUP_ANALYTICS_MIGRATION.md`, `docs/ADD_STARTUP_ANALYTICS_DESIGN.md` (pointer)
**Verified:**

- production e2e 74 / 74 ✓;
- Supabase advisors (0 WARN except leaked-password protection, which only matters while Email sign-in is on);
- read-only SQL on grants, policies, storage and functions;
- curl of the OAuth redirects, the GitHub app name, headers and 404s;
- the Google sign-in page in the browser pane.

**Next:** owner decisions (gate items B-1–B-3, H-1–H-9) and approval of the analytics SQL and privacy wording.

## 2026-10-08 — Old `jaopor-pdt0` link restored; Add-project analytics designed (not built)

**Done:**

- **Owner request:** one row in `startup_slug_history` (`jaopor-pdt0` → project 105). `/th|en/startup/jaopor-pdt0` now 308-redirects to `/startup/jaopor`, and `/api/badge/jaopor-pdt0` serves the badge. Checked on production.
- **`docs/ADD_STARTUP_ANALYTICS_DESIGN.md`:**
  - the real Add-project steps and error states from the code;
  - 6 events (5 client via one silent, whitelisted, owner-checked RPC; `verify_result` server-side);
  - one table in an unexposed `analytics` schema;
  - a privacy model (no IP / contents / verification details, cascade on account delete, 180-day retention via the daily cron);
  - RLS (no client access);
  - performance (fire-and-forget, never blocks);
  - options A / B / C (recommend B);
  - the migration SQL draft, smoke tests T137–T143, and report queries.
- **Not applied, not implemented:** waiting for the owner's approval (and a /privacy bullet the owner must approve).

**Files:** `docs/ADD_STARTUP_ANALYTICS_DESIGN.md`
**Verified:** curl on production (308 for th / en, badge 200).

## 2026-10-08 — Audit Phase 6: polish

**Done:**

- **C-5:** no "$" flash on Thai pages. The header switch renders both labels via the `<Money>` CSS, and `useCurrency()` assumes ฿ on Thai pages before hydration, so the chart's server HTML now starts in ฿.
- **C-6:** no dead ends. The "อ้างสิทธิ์ผลงาน (เร็ว ๆ นี้)" tile and the "ที่บันทึกไว้" sidebar item are hidden until they work.
- **C-9:** signing in to add a project says "เข้าสู่ระบบเพื่อเพิ่มผลงาน".
- **C-11:** on phones the currency switch moved into the ☰ menu (the header keeps five controls).
- **Add-project:**
  - **C-12:** a sticky full-width button on phones;
  - **C-13:** the 5-project limit shown before typing;
  - **C-14:** "เราอ่านแค่ชื่อ คำอธิบาย และโลโก้จากหน้าแรกของเว็บ" under the auto-fill status.
- **Edit-page suggestions from build proof:**
  - **C-1:** "+ เพิ่ม Claude Code" when Claude co-authored commits exist;
  - **C-2:** "ใช้เป็นวันที่ก่อตั้ง" from the repo's first commit.
- **C-8:** the feed composer is one tappable line on phones until opened.

**Files:** `src/components/{CurrencyToggle,MobileNav,SiteHeader}.tsx`, `src/lib/currency.ts`, `src/app/[locale]/{login,dashboard,feed}/page.tsx`, `src/components/dashboard/DashboardSidebar.tsx`, `src/components/wizard/{StartupWizard,StartupEditForm}.tsx`, `src/components/posts/Composer.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- typecheck ✓ · lint ✓ · unit tests 369 ✓ · local e2e 64 passed / 10 skipped (one first-compile timeout passed on its own and in a full rerun) · production build ✓.
- Local:
  - `/th/login?next=/th/new` shows the add title;
  - the 375 px header has five controls and no overflow;
  - the ☰ menu has "แสดงเป็นดอลลาร์ ($)";
  - the desktop switch shows only "฿";
  - the chart's server HTML is in ฿.
- The signed-in pieces are checked on production after the push.

**Audit status:** Phases 1–6 shipped or ready. Open owner decisions: deduct Stripe coupons from MRR, per-step funnel counts (migration), milestones in ฿ on English pages, the jaopor-pdt0 history backfill, Supabase manual linking (GitHub), and later a shared Badge / ProofMark component.

## 2026-10-08 — Audit Phase 5: system-wide consistency

**Done:**

- **S-16, page weight:** the browser no longer receives the legal pages' long texts with every page (Privacy, Security, Terms render on the server; the live-map opt-out keeps its four strings). About 25 KB of the 128 KB messages bundle. Checked: the privacy intro is in `/th/privacy` only, not in `/th` or a project page (before: on every page).
- **S-11, dashboard order:** checklist → ผลงานของฉัน + side cards → the post composer last.
- **S-14, counters say what they count:**
  - "ผลงานของคุณยังไม่ได้นับผู้เข้าชม…" when nothing counts visitors (was "0 ครั้ง");
  - "คนดูโปรไฟล์คุณ" and "คำขอคุยที่ได้รับ" on the profile card;
  - "ไม่มีคำขอคุยที่รอตอบ" on the requests card.
- **S-17, phone edit page:** the dashboard tab row becomes one "← ผลงานของฉัน" link there, so the form gets the screen.
- **S-6, one completeness model (`lib/completeness.ts` + 4 tests):** the edit page and the ผลงานของฉัน cards show the same weighted percentage. The cards now also count screenshots and any connected source.
- **DS-1:** verified is `positive` on ผลงานของฉัน too (was brand).
- **DS-4:** no raw `text-[Npx]` left outside the live map's SVG.
- **DS-3:** ภาพและวิดีโอ and ยืนยันตัวเลข say they save instantly.
- **Not done (bigger refactors, proposed for later):** one shared Badge / ProofMark component to replace about seven pill styles (DS-1 / DS-5).

**Files:** `src/app/[locale]/layout.tsx`, `src/app/[locale]/dashboard/{page,startups/page}.tsx`, `src/components/dashboard/DashboardSidebar.tsx`, `src/components/wizard/StartupEditForm.tsx`, `src/lib/completeness.ts` (+ test), `messages/*.json`, `Design.md`

- **Header fit (found by the width sweep):** in English the 1024 px header overflowed by about 45 px. The currency code and the language name now show from `xl` (the symbol and "TH/EN" below that).

**Verified:**

- typecheck ✓ · lint ✓ · unit tests 369 ✓ (incl. 4 for completeness) · local e2e 64 passed / 10 skipped · production build ✓.
- Width sweep (/th, /en, project, directory, feed, categories at 1440 / 1024 / 768 / 430 / 390): 35 combinations, the only overflow was the English 1024 px header, now 0 at 1024 / 1100 / 1280.
- The dashboard and edit-page changes are signed-in only, so they get checked on production after the push.

## 2026-10-08 — Owner "hide for now" (audit S-10, owner-approved migration)

**Done:**

- **Migration `20261008063754_owner_private_status`** (applied after owner approval): a third status `private`; owners may switch published ↔ private (column grant + a guard trigger) but never set or undo a moderator's `hidden`. Every public query and policy already filters `status = 'published'`, so private projects drop out everywhere public with no other change.
- **Dashboard:**
  - "ซ่อนไว้ก่อน" (with a confirm that says what disappears) / "เผยแพร่อีกครั้ง" in the project ⋯ menu;
  - a "ซ่อนอยู่ · เห็นแค่คุณ" chip;
  - view / copy-link hidden for private projects, whose name opens the editor;
  - the caches are refreshed on every change.

**Files:** `supabase/migrations/20261008063754_owner_private_status.sql`, `supabase/tests/rls_smoke.sql` (T132–T136b), `src/components/DashboardActions.tsx`, `src/app/[locale]/dashboard/{page,startups/page}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- Advisors: nothing new.
- RLS smoke: all 138 lines good, incl. T132 private (anon 0, owner 1), T133 publish again, T134 / T135 the owner can't set or undo `hidden`, T136 another user can't, T136b function locked down.
- typecheck ✓ · lint ✓ · unit tests 365 ✓.
- The toggle needs a signed-in owner, so it was checked by code review; production check after push.

## 2026-10-08 — Audit Phase 4: GitHub without a GitHub sign-in, snippet help, evidence ladder

**Done:**

- **M-11:** the GitHub option no longer dead-ends for Google sign-ins. "เชื่อมบัญชี GitHub" links GitHub to the same account (Supabase `linkIdentity`) and returns to the same page; Add-project restores its step from the session draft.
  - This **needs "Manual linking" enabled in Supabase Auth** (owner, dashboard).
  - Until then, the button shows the fallback (sign out and in with GitHub when the emails match).
- **S-18:** every snippet code box has "วางโค้ดที่ไหน?" with one line per tool (Next.js, Lovable / Bolt / v0 / Vite, Framer, Webflow, WordPress, Wix, HTML). The "not found" box lists the common causes (not deployed, redirect to another domain, GTM / JavaScript injection, cached page).
- **C-4:** an ⓘ beside the project's badges explains the four kinds of proof (verified revenue, build proof, owner verified, counted), with this project's marked ✓.
- **Freshness:** already covered (the chart stamp turns amber when a sync is stale), so no change.
- **S-10, the owner "hide for now":** needs a migration (a `private` status that only owners may set, never undoing a moderator's `hidden`). The draft is shown to the owner; not applied.
- **Caught by the messages test before commit:** a literal `<head>` in two new strings would have broken rendering; reworded.

**Files:** `src/components/wizard/VerifyPanel.tsx`, `src/app/[locale]/startup/[slug]/page.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- typecheck ✓ · lint ✓ · unit tests 365 ✓ (incl. messages parse) · local e2e 64 passed / 10 skipped · production build ✓.
- Local 375 px: the ladder opens full width (339 px) with ✓ on verified revenue, no horizontal scroll.
- The GitHub link button needs a signed-in Google account and the Supabase setting, so it's checked by code review.

**Next:** push; the owner enables manual linking and decides on the `private` status migration.

## 2026-10-08 — Editable project link that keeps old links working (audit S-9, owner-approved migration)

**Done:**

- **Migration `20261008061335_slug_history`** (applied after owner approval):
  - `startup_slug_history` (old slug → project, RLS: readable while the project is published, no client writes);
  - a trigger that remembers every rename;
  - a trigger that keeps an old slug reserved for its project (refused as "taken", so Add-project's suffix retry handles it).
  - One hardening change from the reviewed draft: the reserve check is `security definer`, so it also sees old slugs of hidden projects.
- **App:**
  - `/startup/{old}` permanently redirects to the current slug;
  - `/api/badge/{old}` serves the current badge (README image embeds don't always follow redirects);
  - saving a rename also refreshes the old links' cached pages;
  - the edit page has "ลิงก์หน้าผลงาน" (prefix `{host}/startup/`, typed lowercase), with a "taken" message in its section.

**Files:** `supabase/migrations/20261008061335_slug_history.sql`, `supabase/tests/rls_smoke.sql` (T127–T131), `src/lib/supabase/database.types.ts`, `src/lib/data/startups.ts` (`getRenamedSlug`), `src/app/[locale]/startup/[slug]/page.tsx`, `src/app/api/badge/[slug]/route.ts`, `src/app/actions/revalidate.ts`, `src/components/wizard/StartupEditForm.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- Advisors: no new findings (the existing leaked-password WARN is an Auth setting).
- RLS smoke: all 131 lines good, incl. T127 rename remembered, T128 another owner can't take the old slug, T129 the owner can take it back, T130 no client writes, T131 functions locked down.
- The public REST read of the history works; an anonymous insert gets 401.
- typecheck ✓ · lint ✓ · unit tests 365 ✓.

**Next:** a real rename on production (the owner, in the edit page) to see the redirect end to end. The one rename made before this table existed (`jaopor-pdt0` → `jaopor`) isn't in the history: backfilling it needs the owner's OK.

## 2026-10-08 — Audit Phase 3: edit page that keeps you editing, one logo field, weighted completeness, Thai labels

**Done:**

- **Fix found while checking Phase 2 on production:** the Add-project province was empty although the hint says it comes from the profile. `province` is a visibility-controlled column clients can't select, so the page now reads it server-side like the dashboard (`getMyProfile`), with an empty field if that fails.
- **S-3:** saving the edit page stays on the page, with a "บันทึกแล้ว" toast + "ดูหน้าผลงาน" action; the saved row becomes the new baseline.
- **S-4:** `LogoField` (shared by Add-project and the edit page): the current logo in a 48 px tile, "อัปโหลดเอง", "ลบโลโก้". This replaces the browser's "Choose File / No file chosen" on the edit page, which also had no preview and no remove.
- **S-6:** the edit progress is weighted (verification 30, screenshots 20, description 15, province 10, the rest 25). "ต่อไป" follows the owner-checklist order and never names the open section (C-7).
- **S-8:** "กำลังหาอะไรอยู่?" moved to ข้อมูลหลัก.
- **C-3:** price "ฟรี" next to verified revenue shows a note asking for the paid plan's price (JaoPor's own page has this mismatch).
- **S-12:** Thai pages say คอมมิต, แนวโน้ม, ก้าวสำคัญ, ผู้สร้าง / ผู้ร่วมสร้าง and คนสร้างที่ยืนยันแล้ว instead of English labels.
- **Not done, waiting for the owner:**
  - **S-9, the editable project link:** a migration draft (slug history + redirects + old slugs reserved against takeover) is shown to the owner; not applied.
  - **S-13, milestones in ฿ on English pages:** deferred; converting gives odd amounts, and the rate would have to reach the client feed.

**Files:** `src/app/[locale]/new/page.tsx`, `src/components/wizard/{LogoField,StartupWizard,StartupEditForm}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- typecheck ✓ · lint ✓ · unit tests 365 ✓ · local e2e 64 passed / 10 skipped · production build ✓.
- Local `/th/startup/jaopor` + `/th/feed`: "แนวโน้ม" / "ก้าวสำคัญ", no English labels.
- The edit page and Add-project are signed-in only, so they get checked on production after the push (view only).
- Phase 2 on production (owner view): the JaoPor checklist shows "อีก 1 ขั้น…" with เล่าเรื่องผลงาน next, and no auto share dialog; `/new` at 375 px shows the category placeholder, province and readable step labels.

**Next:** push; the owner approves or edits the slug-history migration; then Phase 4 (GitHub account linking, snippet platform guides, evidence ladder, owner hide toggle).

## 2026-10-08 — Audit Phase 2: Add-project shorter, better data, a "3 steps" panel instead of an early share dialog

**Done:**

- **M-8, shorter onboarding:** when a new account came to add a project (`next=/new`), onboarding is one screen (username + province, then "ไปเพิ่มผลงาน →"), not four steps. Headline, status and skills wait for the dashboard checklist.
- **M-9, category:** no preselected "AI"; "เลือกหมวดหมู่…" is required.
- **M-10, province in step 1:** the province picker (required, no "ไม่ระบุ") is prefilled from the founder's profile and saved with country TH. New projects appear in the Olympics at once, and the edit page no longer blocks the first save on a field that was never asked.
- **S-2, live card preview:** once a name is typed, the large card exactly as the list will show it (the muted "not verified" card) + "ยืนยันตัวเลขในขั้นถัดไปแล้ว การ์ดจะแสดงรายได้หรือผลงานบน GitHub". `StartupCard` got a `preview` mode and a `CardStartup` type (the 17 fields it reads).
- **S-1, OwnerBar "3 ขั้นต่อไป":** until the page has a description, a screenshot and a number from a connected source, the owner sees an ordered checklist linking to the exact editor field; the first open step is highlighted. Right after Add-project it opens with "ผลงานของคุณขึ้น JaoPor แล้ว!".
  - It replaces the amber "not verified yet" bar (its step 3).
  - The share dialog no longer opens by itself on a fresh listing, only with a verified number.
- **Readability:** wizard step labels are `text-caption` without uppercase; the shared field labels / hints use tokens instead of `text-[10px]` / `text-[11px]`.
- **Bug caught before push:**
  - Using `StartupCard` in the wizard pulled a `server-only` module into the browser bundle, so every local page returned 500.
  - `logoUrl` now lives in a browser-safe `lib/supabase/logo-url.ts`, re-exported from `public.ts`.
  - The production build confirms it.

**Files:** `src/components/wizard/{StartupWizard,fields}.tsx`, `src/app/[locale]/new/page.tsx`, `src/components/profile-edit/{OnboardingFlow,ProvinceField}.tsx`, `src/app/[locale]/onboarding/page.tsx`, `src/components/profile/Owner.tsx`, `src/components/StartupCard.tsx`, `src/components/share/ShareStudio.tsx`, `src/app/[locale]/startup/[slug]/page.tsx`, `src/lib/supabase/{logo-url,public}.ts`, `messages/*.json`, `Design.md`
**Verified:**

- typecheck ✓ · lint ✓ · unit tests 365 ✓ · local e2e 64 passed / 10 skipped · production build ✓.
- The new screens are signed-in only, and the local preview has no session, so they get checked on production right after the push (view only, nothing submitted).

**Next:** push, check `/new`, the onboarding code path and the JaoPor owner panel on production. Then Phase 3 (save in place, one logo field, one completeness model, editable slug).

## 2026-10-08 — Audit Phase 1: numbers first on phones, MRR / revenue explained, no overclaiming

**Done:**

- **M-6, numbers first:** on the project page the stat tiles (or the traction tiles) come right under the header at every width; links, the "กำลังหา" banner and the demo strip follow them. At 375 px the first screen now shows ฿1,980 / ฿2,310 (before: no number). Long descriptions show 4 lines on phones with "อ่านต่อ". The "ก่อตั้ง" value wraps instead of cutting to "กันยายน 25…".
- **M-3, MetricHelp:** an ⓘ button on "รายได้ทั้งหมด" and "MRR" opens a full-width note:
  - **revenue** = money received since the first sale, minus refunds, read from the source;
  - **MRR** = the monthly value of subscriptions active now (yearly ÷ 12), expected not received, so it can differ from revenue;
  - for Stripe also: "counted from plan prices, includes overdue subscriptions, coupons not deducted yet". That is literally what `metrics.ts` does.
- **M-4:** the leaderboard says "● อัปเดตทุกวัน" instead of "LIVE".
- **M-5, counted ≠ verified:**
  - analytics connections toast "เชื่อมแล้ว! จำนวนผู้เข้าชมที่นับโดย {source} …";
  - the trust box says "ชื่อระบบที่นับ";
  - after Add-project, the "Verified!" share dialog opens only for revenue or build proof;
  - ShareStudio's own title is "แชร์ผลงานนี้" when nothing is verified.
- **Found, not changed:**
  - **MRR ignores Stripe coupons** (`stripe.ts` reads the plan's `unit_amount`), so a discounted subscription is counted at full price. The note now says so; deducting discounts is a metrics change for the owner to approve.
  - The currency button and the chart show "$" for a moment while a ฿ page loads (audit C-5).

**Files:** `src/app/[locale]/startup/[slug]/page.tsx`, `src/components/core/MetricHelp.tsx` (new), `src/components/profile/ClampedText.tsx` (new), `src/components/ProfileBlocks.tsx`, `src/components/LeaderboardCard.tsx`, `src/components/share/ShareStudio.tsx`, `src/components/wizard/{StartupWizard,VerifyPanel}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- typecheck ✓ · lint ✓ · unit tests 365 ✓ · local e2e 64 passed / 10 skipped.
- Browser, local, live DB:
  - 375 px: tiles in the first screen, the MRR note opens full width (339 px) and closes, no horizontal scroll;
  - 1280 px: header → 4 tiles with ⓘ → GitHub → looking-for → chart;
  - home leaderboard "อัปเดตทุกวัน".
- The wizard and toast paths need a signed-in account and real keys, so they were checked by code review.

**Next:** push; then the owner decides on deducting coupons from MRR, and Phase 2 (Add-project: shorter onboarding, no default category, province in step 1, card preview, the "3 ขั้นต่อไป" panel).

## 2026-10-08 — Voice rewrite from the launch philosophy ("สถานีขนส่งฝัน")

**Done:**

- **Design.md §3 Voice:** four principles from the owner's launch post:
  - start with one;
  - Thai builders from every province;
  - honest about every number;
  - we build it together.

  Warmth goes in welcome moments, empty states, intros and story prompts; never on buttons, numbers, errors or legal pages.

- **17 strings rewritten in th + en:**
  - the footer tagline: "สถานีขนส่งฝันของคนไทยที่สร้างด้วย AI…" replaces "ดินแดนมาเฟีย…";
  - the home subline, which no longer claims verified users;
  - the login subtitle (first 100 projects get the founding badge);
  - the welcome banner;
  - the Add-project intro, which now says the page goes live and can be edited or deleted;
  - the CTA "เผยแพร่และไปต่อ" / "Publish & continue";
  - "ยังไม่พร้อมก็ไม่เป็นไร…";
  - the listed share title;
  - the owner bar;
  - the unverified prompt as "ขั้นต่อไป…";
  - Olympics / province empty states ("ส่งผลงานแทนจังหวัดของคุณ", no "ขึ้นกระดานทันที");
  - the dashboard setup hint (no "ถูกค้นเจอบ่อยกว่า" without data).
- **A new hint in the founder-message box:** "ทำไมคุณถึงสร้างสิ่งนี้ และสร้างให้ใคร? เล่าแบบที่คุณเล่าให้เพื่อนฟัง".

**Files:** `messages/th.json`, `messages/en.json`, `Design.md`, `src/components/wizard/StartupEditForm.tsx`
**Verified:**

- unit tests 365 ✓ · typecheck ✓ · lint ✓ · local e2e 64 passed / 10 skipped.
- Browser `/th` at 375 px: the new footer and hero line render, no horizontal scroll.

**Next:** the owner reviews the wording, then push. Then Phase 1 (M-3, M-4, M-5, M-6).

## 2026-10-08 — Owner decisions from the audit: demos deleted, `/startup/jaopor` back, one word "ผลงาน / project"

**Done:**

- **Production database** (owner-approved, one transaction):
  - deleted the 5 demo projects, with their sample snapshots, member rows and one test post by the owner's second account;
  - renamed project 105's slug from `jaopor-pdt0` to `jaopor`. The visitor snippet uses the permanent id, so counting is unaffected; the old `jaopor-pdt0` link now returns 404 (it existed for one day).
- **Glossary (audit M-7):** the listed thing is **ผลงาน** in Thai and **project** in English: 32 Thai and 76 English strings. Examples:
  - nav "ผลงาน" and "+ เพิ่มผลงาน";
  - "ผลงานทั้งหมด", "ชื่อผลงาน", "แก้ไขผลงาน", "ผลงานอื่น ๆ", "ผลงานจากจังหวัด{name}";
  - English "My projects", "Project updates".
  - Left as they are: past-job "โปรเจกต์" in work experience, the "Product" role, the owner-approved legal pages, and URLs.
  - Design.md §3 has the glossary, and the old labels in Design.md are updated.

**Files:** `messages/th.json`, `messages/en.json`, `Design.md`
**Verified:**

- unit tests 365 ✓ (incl. the message parity and ICU check) · typecheck ✓ · lint ✓ · local e2e 64 passed / 10 skipped.
- Browser, local, 1280 and 375 px: "ผลงานทั้งหมด", "พบ 1 ผลงาน", header "เพิ่มผลงาน", no "สตาร์ทอัพ" / "Startup" left on the project page, no horizontal scroll.
- Production: `/th/startup/jaopor` 200, `/api/badge/jaopor` 200, `jaopor-pdt0` and the demo pages 404, home without demos.

**Next:** push (the wording is local until then). Then Phase 1 of the audit: honest proof wording (M-4, M-5), MRR definitions (M-3), numbers-first on phones (M-6).

## 2026-10-08 — UX/UI product audit (Add Startup first) + one false-success fix

**Done:**

- **`docs/UX_UI_PRODUCT_AUDIT.md`:** a whole-product audit, deepest on Add Startup → verification → publishing → public profile → editing.
  - Based on the code, production at 1280 and 375 px (signed-in screens viewed only, nothing submitted) and read-only database counts: 1 real project, 5 demos, 6 profiles.
  - MUST / SHOULD / COULD / NOT NOW items with impact, frequency, importance and complexity scores; the Add Startup journey, friction map and field-by-field table; a glossary proposal; scores; a 6-phase roadmap.
  - Main findings:
    - demo numbers dominate the real ones;
    - Add Startup publishes without saying so;
    - project pages on phones show no number in the first screen;
    - MRR above all-time revenue without a definition;
    - "LIVE" on daily data and "verified" left on counted visitors;
    - one object with four names.
- **Fixed (M-0):** pressing "เริ่มนับ" when the code wasn't on the site showed "ยืนยันแล้ว! ตัวเลขขึ้นบนโปรไฟล์ของคุณแล้ว", and the wizard then opened the profile with the "Verified!" share dialog. Now:
  - the toast says found / not found, using the existing strings;
  - the wizard counts the snippet as verified only once the code is found, including after "ตรวจอีกครั้ง".
- **Correction:** the edit page has **no slug field**, so last entry's owner step "rename the link back to `jaopor`" isn't possible in the product. The options are a one-off DB update with owner approval, or the editable slug (audit S-9).

**Files:** `docs/UX_UI_PRODUCT_AUDIT.md`, `src/components/wizard/VerifyPanel.tsx`, `Design.md` (§5 Owner verified: no false success)
**Verified:**

- typecheck ✓ · lint ✓ · unit tests 365 ✓ · prettier ✓.
- The "เริ่มนับ" click needs a signed-in account and a real website, so the fix was checked by code review, not clicked through.
- Not pushed.

**Next:** the owner reviews the audit and picks the Phase 1 items (demos, honest proof wording, MRR definitions, numbers-first on phones, glossary).

## 2026-10-07 — Owner feedback: full-size live map, Add next to the bottom search, Back in Add Startup

**Done:**

- **Live visitors map:** back to full height (`h-[420px] sm:h-[460px]`) at every count. The round C compact height for 3 or fewer viewers made the map too small to see the pins, and the 4-row activity list covered the stats box.
- **Bottom search on home:** "+ เพิ่ม Startup" next to it again, so a visitor at the end of the page can add without scrolling back up. The `add` prop of `QuickSearchSection` is removed (every page shows it now).
- **Add Startup Back button:** step 2 has "← ย้อนกลับ". It returns to step 1 with every field kept, and the button there becomes "บันทึกและไปต่อ". That saves the changes to the same project instead of creating a second one:
  - link (clearing the old link column when the link type changed), name, one-liner and category;
  - the logo only when it changed.
    The verify step stays mounted while hidden, so sources already connected stay marked. The "Already listed" note ignores the project itself.
- Design.md: LiveVisitorsSection, the Home CTA rule and Add-startup wizard v2 (Step 2 + Back) updated first.

**Files:** `src/components/live/LiveVisitorsSection.tsx`, `src/components/search/QuickSearchSection.tsx`, `src/app/[locale]/page.tsx`, `src/components/wizard/StartupWizard.tsx`, `messages/*.json` (`Wizard.saveAndContinue`), `Design.md`
**Verified:**

- typecheck ✓ · lint ✓ · unit tests 365 ✓ · local e2e 64 passed / 10 skipped.
- Browser, `/th` at 1280 and 375 px:
  - the live body is 460 / 420 px and the map 424 / 384 px tall;
  - the stats box and the activity list don't overlap;
  - Add sits beside the bottom search;
  - no horizontal scroll.
- The wizard's Back flow needs a signed-in user, so it was not clicked through; checked by code review (the same columns the edit page updates, all granted to the owner).

**Next:** the owner tries Back in Add Startup on production after the push.

## 2026-10-07 — End-to-end tests (Playwright) and a messages check

**Why:** several bugs this week were only caught by clicking around: messages that rendered as raw keys in production, sign-in losing the page, numbers cut off on phones. These checks now run before a push.

**Done:**

- **`src/lib/messages.test.ts` (Vitest):**
  - Every th / en string is parsed with the same ICU parser next-intl uses (`intl-messageformat` 11.2.15, pinned to next-intl's version). A stray `</head>` or `<ID>` now fails the tests; checked against the two strings that broke production.
  - th and en have exactly the same keys.
  - Every message uses the same placeholders and tags in both languages.
- **Playwright** (`@playwright/test`, `playwright.config.ts`, `e2e/`, `npm run test:e2e`): uses the installed Chrome, so no browser download. Two projects: desktop 1280 and mobile 375. Signed-out flows only (OAuth can't be automated).
  - `pages.spec.ts`: home, startups, categories, olympics, builders, feed, security, privacy, terms, login, a project page and a builder profile, in th and en. Each must answer with no raw message key on screen, no next-intl / page errors, no Western year after a Thai month on Thai pages, and no horizontal scroll.
  - `sign-in.spec.ts`: `/new`, dashboard pages and an edit page go to `/login?next=` with the exact path; the header's sign-in link carries the current page; `/new` streams its skeleton.
  - `numbers.spec.ts`: home card values never cut off; the Thai tab title in ฿; the chart axis in round steps.
- Local runs reuse the dev server with 2 workers. Builder pages are skipped locally unless the test run has `SUPABASE_SECRET_KEY`. `E2E_BASE_URL=https://jaopor.vercel.app` runs the same checks against production (read-only).
- CLAUDE.md: commands, a testing note, and a warning not to run `next build` while the dev server runs (it corrupted the dev cache once today: every local page 500).

**Files:** `playwright.config.ts`, `e2e/{helpers,pages.spec,sign-in.spec,numbers.spec}.ts`, `src/lib/messages.test.ts`, `package.json` (+ lock), `.gitignore`, `CLAUDE.md`, `Project.md`
**Verified:**

- Production: 74 / 74 passed (37 checks × desktop / 375 px).
- Local dev server: 64 passed, 10 skipped (builder pages without the key; checks that need data the page lacks).
- Unit tests 365 ✓ · lint ✓ · typecheck ✓ · build ✓.

**Next:** signed-in flows (Add Startup, verify) need a test-account strategy (e.g. a Supabase test user with a session cookie for a preview environment); not set up.

## 2026-10-07 — The remaining JaoPor listing becomes the real one (owner decision)

**Why:** the original JaoPor listing (id 29, `jaopor`) was deleted instead of the copy. The copy (id 105, `jaopor-pdt0`) is now the JaoPor listing. Its revenue comes back in full from Stripe.

**Done:** the site's own visitor snippet names project **105** (`SELF_PROJECT` in `[locale]/layout.tsx`). The live SSRF test now expects 105 found on jaopor.vercel.app and 29 missing.

**Owner to do:**

- Rename the listing's link back to `jaopor` on its edit page, so old links (`/startup/jaopor`, now 404) work again.
- Press "เริ่มนับ" for the website snippet (the owner check will find `data-project="105"`), and reconnect GitHub for build proof.
- Re-add what was on the old listing (screenshots, founder message, insights) if wanted.

**Lost with the deletion (not recoverable from here):** the founding number #2, visitor history counted by the snippet, posts and milestones of id 29.
**Verified:** typecheck ✓ · lint ✓ · tests 361 ✓ · build ✓; production after deploy renders `data-project="105"`.

## 2026-10-07 — Chart back to the smooth area (owner preference), /security and /privacy wording approved

**Done:**

- **Revenue chart:** the owner preferred the earlier look, so the smooth area chart is back for every metric (the bar version from round B is reverted, and trend smooths the line again). The **round axis ticks stay** (฿0 / 250 / 500 / 750 / 1,000, computed in the displayed currency; integers for visitors). They don't change the look and fix the uneven ฿252 / 504 / 755. Design.md §5 RevenueChartCard updated.
- **Owner-approved wording:**
  - `/security` intro: "JaoPor แสดงรายได้และผลงานบน GitHub ที่ยืนยันจากระบบที่คุณใช้อยู่ และจำนวนผู้เข้าชมที่นับโดยสคริปต์ของเราหรือ analytics ของคุณ …".
  - `/privacy` §3 title: "ตัวเลขจากระบบที่เชื่อมต่อ (รายได้ ผลงานบน GitHub และจำนวนผู้เข้าชม)".
  - English versions to match.
  - "Last updated" set to 7 ต.ค. 2569 / October 7, 2026 on both.
  - `/terms` keeps its date with the Thai year (2569, §3 Dates).
- **Found while checking (not changed):** the original JaoPor listing (id 29, `jaopor`) was deleted; the copy (id 105, `jaopor-pdt0`) remains. `/startup/jaopor` is now a 404. The site's own snippet still names project 29, so JaoPor's visitor counting stops until the owner decides how to continue.

**Files:** `src/components/MetricChart.tsx`, `messages/*.json`, `Design.md`
**Verified:** typecheck ✓ · lint ✓ · tests 361 ✓ · build ✓. Browser on the live DB (`/th/startup/jaopor-pdt0`): smooth area, ticks ฿0 / ฿250 / ฿500 / ฿750 / ฿1,000, stamp "ยืนยันผ่าน Stripe".

## 2026-10-07 — Visitor counts say "counted", not "verified" (owner decision)

**Why:** anyone can send events to a snippet or an analytics endpoint, so visitor numbers can be inflated. Revenue read from Stripe / RevenueCat and GitHub build proof can't be faked that way. Owner decision: say "counted" for visitors and keep them on the leaderboard and Olympics.

**Done (Design.md §3 Verified vs counted):**

- **Captions:** visitor tiles say "นับโดย {source}" (JaoPor script, Plausible, Umami, "นับโดย Cloudflare · การเข้าชม (visits)"). Build proof keeps "ยืนยันผ่าน GitHub".
- **Section heading** over visitors + build proof: "ตัวเลขจากระบบที่เชื่อมต่อ" / "Numbers from connected sources".
- **Chart stamp:** revenue / MRR keep the check icon and "ยืนยันผ่าน"; visitors get a chart icon and "นับโดย {source}".
- **Card "✓ ยืนยันแล้ว"** only for verified revenue (visitor counts alone no longer earn it). The dashboard's "ยืนยันแล้ว" status means revenue or build proof.
- **Share / OG image** "ยืนยันผ่าน …" lists revenue and build sources only.
- **Footnotes:**
  - Leaderboard: "รายได้ยืนยันผ่าน Stripe / RevenueCat · commits ผ่าน GitHub · ผู้เข้าชมนับโดยสคริปต์ JaoPor หรือ analytics ของผลงาน".
  - Olympics subtitle and "how it works" in the same terms.
  - Province subtitle: "ตัวเลขจากระบบจริง".
  - Hero label: "ตัวเลขจาก:".
- **Not changed (owner-approved pages):** `/security` intro and `/privacy` §3 title still say "verified numbers (revenue, visitors, …)". New wording proposed to the owner.

**Files:** `messages/*.json`, `src/components/{profile/ProjectBlocks,ProfileBlocks,StartupCard}.tsx`, `src/lib/share{,.test}.ts`, `src/app/[locale]/dashboard/startups/page.tsx`, `Design.md`
**Verified:**

- typecheck ✓ · lint ✓ · tests 361 ✓ (share test updated) · build ✓.
- Local server on the live DB, JaoPor page: heading "ตัวเลขจากระบบที่เชื่อมต่อ", visitors "นับโดย JaoPor (สคริปต์ของเรา)", build "ยืนยันผ่าน GitHub", revenue "ยืนยันผ่าน Stripe", visitors chart stamp "นับโดย JaoPor · อัปเดตล่าสุด 7 ต.ค. 2569" with a chart icon. Home: "ตัวเลขจาก:" and the new leaderboard footnote.

**Next:** owner approves the /security and /privacy lines.

## 2026-10-07 — UX review round C: an early-stage site that still looks alive

**Done:**

- **Real projects before demos** on the home rows (`getRecent`, `getTopTraction`). A row shows at most 6 cards, so demos leave the home page by themselves once there are 6 real projects.
- **Empty categories fold away:** `/categories` gives cards only to categories with projects. The empty ones (36 today) become one chip row, "ยังว่าง {n} หมวด · ลงผลงานเป็นคนแรกในหมวดเหล่านี้ เพิ่ม Startup →". With no projects anywhere, the grid stays as before.
- **Only working sources on the heroes:** the provider strip shows the 6 connectable sources. The faded "coming soon" logos (Polar, Lemon Squeezy, Paddle, App Store) read as supported; they now sit behind an `upcoming` prop.
- **Compact live map** (280 / 320 px) while 3 or fewer people are viewing (it was 420 / 460 px for one viewer).
- **Olympics left as is:** it already invites empty provinces ("ยังไม่มีผลงานจาก {n} จังหวัด").

**Files:** `src/lib/data/startups.ts`, `src/app/[locale]/categories/page.tsx`, `src/components/{ProviderStrip,live/LiveVisitorsSection}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- typecheck ✓ · lint ✓ · tests 361 ✓ · build ✓.
- Browser on the live DB:
  - `/categories`: one card + 36 chips at 1100 px and 375 px, no horizontal scroll.
  - Home: 6 provider tiles; the recent row lists both JaoPor listings before the demos; live map 320 px with 1 viewer.

**Next:** owner review, then push rounds A–C together; owner deletes `jaopor-pdt0`; the visitor-wording decision (Project.md §7) is still open.

## 2026-10-07 — UX review round B: readable paragraphs, project header on phones, an honest revenue chart, no repeated home rows

**Done:**

- **Paragraph font (owner-approved):** new `font-prose` token (IBM Plex Sans Thai, already loaded with Latin + Thai). It's used for long-form text people write: startup tagline + description on the profile, founder message, build story, insight paragraphs, post and comment bodies, chat messages, builder bio, request messages. Numbers, labels, chips, headings and cards stay monospace. `cn()` registers `font-prose` as a font family, so it's never dropped next to `font-bold` (test added). Design.md §3 Prose.
- **Project header on phones:** below `sm` the logo sits above the name, so the name and description use the full width (they were squeezed beside a 72 px logo).
- **Revenue chart:**
  - Daily revenue and daily visitors are **bars** (a one-day payment stays on its day; the smoothed area drew bell curves over empty days).
  - MRR is an area with straight segments.
  - Trend is an overlay line on the real values, never a replacement.
  - Y ticks are round numbers in the displayed currency (`niceTicks`: ฿0 / 250 / 500 / 750 instead of ฿252 / 504 / 755 from converted dollar ticks; integers for visitors).
  - The legend swatch matches the mark.
- **Home rows:** "ตัวเลขแรงสุด" skips projects already shown in "เพิ่มล่าสุด" and hides itself when fewer than 3 remain (both rows showed the same cards).

**Files:** `src/app/globals.css`, `src/lib/utils{,.test}.ts`, `src/lib/chart-window{,.test}.ts`, `src/components/MetricChart.tsx`, `src/app/[locale]/{page,startup/[slug]/page,u/[username]/page,dashboard/requests/page}.tsx`, `src/components/{ProfileBlocks,profile/ProjectBlocks,posts/PostCard,posts/CommentThread,chat/ChatThread}.tsx`, `Design.md`
**Verified:**

- typecheck ✓ · lint ✓ · tests 361 ✓ (new: 4 `niceTicks`, 2 `cn` cases) · build ✓.
- Browser on the live DB:
  - JaoPor page: description in IBM Plex Sans Thai, 2 bars on 3 and 6 Oct with axis ฿0 / ฿250 / ฿500 / ฿750.
  - At 375 px the logo stacks above the name; no horizontal scroll.
  - Home shows "เพิ่มล่าสุด" without the repeated "ตัวเลขแรงสุด" row.

**Next:** round C (cold start).

## 2026-10-07 — UX review round A: trust fixes (no double counting, real ranks, full numbers on phones, one calendar)

**Why (UX review, owner-approved plan):** places where the site undercut "ตัวเลขจริง": one business listed twice (same website and Stripe account, so leaderboard #1 and #2, and ฿4.6k on the builder card), a rank counting demo projects ("#4"), numbers cut to "฿119…" on phones, "2026" next to "2569", a "$69 MRR" tab title over a ฿ page, the X handle as the founder's name.

**Done:**

- **One business, one listing:**
  - Wizard step 1 warns when the website is already one of the owner's projects ("คุณลงเว็บนี้ไว้แล้วในชื่อ … → ไปที่ผลงานเดิม", the oldest listing) and disables create.
  - `connectSource` refuses revenue or visitors when another of the owner's projects with the same website already has that kind connected (`duplicate_listing`, th / en message naming that project).
  - New pure `sameWebsite()` (`www`, case, scheme, trailing slash and language roots ignored; specific paths stay separate, e.g. two github.io projects).
  - The existing duplicate `jaopor-pdt0` is left for the owner to delete (owner decision).
- **Rank:** `getRank()` ignores demo projects (JaoPor now #1, was #4).
- **Phone cards:** home rows go to one column below 420 px. Values never truncate, and compact cards size their three columns to the content (no overflow at 5-across).
- **Dates:** Thai pages use the Thai year everywhere. The three forced Western calendars are gone (Olympics season, profile experience, profile revenue chart). Design.md §3 Dates.
- **Tab / share title** in the page's currency: "JaoPor(เจ้าพ่อ) — ฿2,310 MRR".
- **Leaderboard founder:** JaoPor name (fallback @handle) linking to the profile, not the X handle.
- **Milestone copy:** "{name} ยืนยันรายได้แล้ว" / "{name} verified its revenue" (was "JaoPor ยืนยันตัวเลขกับ JaoPor แล้ว").

**Files:** `src/lib/links{,.test}.ts`, `src/lib/sources/sync.ts`, `src/lib/revenue/types.ts`, `src/lib/data/startups.ts`, `src/components/{StartupCard,LeaderboardCard}.tsx`, `src/components/wizard/StartupWizard.tsx`, `src/components/builder/ProfileRevenueChart.tsx`, `src/app/[locale]/{page,olympics/page,u/[username]/page,startup/[slug]/page}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- typecheck ✓ · lint ✓ · tests 355 ✓ (new: 3 `sameWebsite` cases) · build ✓.
- Local server on the live DB: title "฿2,310 MRR", "อันดับ #1", "ฤดูกาล ตุลาคม 2569" / "Season October 2026", the leaderboard links `/th/u/gxcb06` and no X handle appears.
- Browser:
  - Wizard (temporary page, deleted): typing `jaopor.vercel.app` shows the note and disables create.
  - Home: one column at 375 px with all 36 values in full; no value overflows at 768 or 1024 px; no horizontal scroll.

**Not verified:** the server-side `duplicate_listing` refusal in a real connect (needs a signed-in owner).
**Next:** owner deletes `jaopor-pdt0`; round B (paragraph font, project header on phones, honest revenue chart, home rows).

## 2026-10-07 — "Add startup" opens faster: instant skeleton, one Auth round trip

**Why (owner):** going to "เพิ่ม Startup" took noticeably long. Measured: the page's JavaScript was not the cause (209 KB gzip, about 15 KB more than `/startups`, mostly shared and cached). The wait was the server: two Auth round trips one after the other (`getClaims`, then `getUser` for the GitHub login), and no loading state, so a click showed nothing until both finished.

**Done:**

- **`/new/loading.tsx`:** a skeleton shaped like step 1 (Design.md §7 Loading) appears immediately on click. Next can also prefetch this shell. Signed-out visitors see it briefly, then go to `/login?next=/th/new` (streamed redirect).
- **One Auth round trip:** `requireUser()` (lib/auth) returns the user and `githubLoginOf(user)` reads the GitHub login from it. It runs in parallel with loading the messages.
- **Verify step code loads in the background** after step 1 shows (`next/dynamic` + preload). The first screen's JS is 202 KB gzip, down from 209 KB.

**Files:** `src/app/[locale]/new/{page,loading}.tsx`, `src/lib/auth.ts`, `src/lib/data/connections.ts`, `src/components/wizard/StartupWizard.tsx`, `Design.md`
**Verified:**

- typecheck ✓ · lint ✓ · tests 352 ✓ · build ✓.
- Signed out on the local server: the redirect to `/th/login?next=%2Fth%2Fnew` is intact (client redirect plus meta-refresh fallback).
- Browser (temporary page, deleted): the skeleton at desktop and 375 px, no horizontal scroll.

**Not verified:** signed-in timing on production (no session in the pane). The owner should compare after deploy.

## 2026-10-07 — Round 3 deployed; sign-in links return to the exact page (dashboard, profiles, feed)

**Done:**

- **Round 3 pushed and deployed** (`07a849d`). Production renders the id-based snippet (`data-project="29"`), and all main pages answer 200. With this deploy the two live message bugs are fixed too (the snippet step showed the raw key `Sources.jaopor.howTo1`; RevenueCat's step 3 had the same problem).
- **Sign-in from any dashboard page returned to `/dashboard`:** the dashboard layout gated with a fixed path, which beat each page's own gate. Signed out, the layout now renders only the page, and every dashboard page gates itself with its exact path (`saved` was the one without a gate; added).
- **Sign-in links without a locale** (follow, contact on a profile, the feed's "following" prompt) brought English users back in Thai. They now carry the locale, and the profile's contact link reopens the request form (`?contact=1`).

**Files:** `src/lib/auth.ts`, `src/app/[locale]/dashboard/{layout.tsx,saved/page.tsx}`, `src/components/builder/{FollowButton,ProfileActions}.tsx`, `src/app/[locale]/{feed,u/[username]}/page.tsx`
**Verified:**

- typecheck ✓ · lint ✓ · tests 352 ✓ · build ✓.
- Local, signed out: `/th/dashboard/29/edit` → `/th/login?next=/th/dashboard/29/edit`; `/en/dashboard/saved` → `/en/login?next=/en/dashboard/saved`; `/th/dashboard/messages` and `/th/new` keep their paths.
- Production after the round 3 deploy: pages 200; unauthenticated auto-fill → 401; the old slug-based beacon is ignored (204).

**Not verified:** JaoPor's first owner check on production (needs the owner signed in: "รีเฟรช" on JaoPor's visitor source, or the 03:00 cron).
**Next:** owner presses "รีเฟรช" on JaoPor; the visitor-wording decision (Project.md §7).

## 2026-10-06 — First-user fixes, round 3: verified first, "Owner verified", and a security pass on every server-side fetch

**Why:** listings without any proof looked the same as verified ones, and a review before applying the migration found that the snippet's visitor counting and the SSRF guard could be abused.

**Done:**

- **Migration `owner_verified`** (owner-approved and applied 2026-10-06):
  - `startups.owner_verified_at`: server-written only, no client grant. A trigger clears it on any change to `website_url`.
  - `startups.proof_level`, generated: 3 verified revenue · 2 GitHub build proof · 1 site proof (owner verified, or an analytics account for the site connected) · 0 nothing. Demos are always 0.
  - Index on `(proof_level desc, created_at desc)`.
  - Visitor counts never rank above 1: anyone can send events to a snippet or an analytics endpoint, so they are counted, not verified.
- **Verified first:** `/startups` and category pages sort by proof level, except "ใหม่ล่าสุด". Cards with no proof are muted (dashed, no fill). Leaderboards no longer rank the demo projects.
- **Owner verified:**
  - Our server reads the listed website and looks for the snippet with the project's **permanent id**.
  - The page it ends on must be on the listed domain, not a redirect elsewhere.
  - It runs on "เริ่มนับ", on "ตรวจอีกครั้ง" and nightly (the cron now includes pending snippets). It is limited to once per 20 s per project, claimed atomically on the connection row so the limit holds across instances.
  - The neutral `ShieldCheck` badge appears on the startup header and on cards.
  - The VerifyPanel shows "พบโค้ดบน {host} แล้ว" or "ยังไม่พบโค้ด …" with "ตรวจอีกครั้ง".
- **Security fixes:**
  - **DNS rebinding (critical, existed before this round):** every fetch of a user URL (link previews, both auto-fills, the snippet check, Umami) now goes through `guardedGet`. It checks the IP inside the socket's own DNS lookup, re-checks every redirect (https:443, no IP literals in any numeric form, no local suffixes, at most 3 redirects), caps the body after decompression and sets a deadline.
  - **Wider private-address list:** test ranges, IPv6 link-local/site-local/multicast, and IPv4 hidden in IPv6 (mapped, compatible, NAT64, 6to4).
  - **Snippet hijack through slug reuse (critical):** the snippet now names its project by the permanent startup id (JaoPor: 29), not the slug. The collect route only counts visits for owner-verified projects.
  - **Edit-page auto-fill** no longer reads unbounded pages.
- **Messages broken in production (existed before this round):** `Sources.jaopor.howTo1` and `Sources.revenuecat.howTo3` contained a literal `</head>` / `<ID>`. next-intl parses those as tags, so production showed the raw key `Sources.jaopor.howTo1`. They are now passed in as values.

**Files:**

- `supabase/migrations/20261005162816_owner_verified.sql`, `supabase/tests/rls_smoke.sql` (T120–T126)
- `src/lib/net/{public-url,link-preview}.ts` (+ `public-url.test.ts`, `ssrf.live.test.ts`)
- `src/lib/traffic/pixel.ts` (+ `owner-snippet.test.ts`)
- `src/lib/sources/sync.ts`, `src/lib/data/{startups,connections}.ts`
- `src/app/api/{collect,cron/sync,startups/[id]/sources/[source],startups/[id]/autofill}/route.ts`, `src/app/[locale]/{layout,startup/[slug]/page}.tsx`
- `src/components/{StartupCard,core/VerifiedBadge,wizard/VerifyPanel,wizard/StartupWizard,wizard/StartupEditForm}.tsx`
- `src/lib/supabase/database.types.ts`, `messages/*.json`, `Design.md`

**Verified:**

- Rolled-back dry runs on the live DB before applying.
- After applying: full RLS smoke test T1–T126, every line good. Advisors: no new warning. Live values: JaoPor at level 3, demos at 0. Types regenerated.
- typecheck ✓ · lint ✓ · tests 352 passed (+17 opt-in live-network SSRF tests passed with `LIVE_NET=1`) · build ✓.
- Browser (temporary page, deleted), desktop and 375 px: badges, the owner-verified and muted cards, both snippet states, the fixed messages; no horizontal scroll.

**Not verified:**

- A real owner check on production. It needs this deploy: JaoPor's own snippet changes to `data-project="29"`, and counting for JaoPor pauses until the first check ("รีเฟรช" or the 03:00 cron).
- The 20 s throttle's conditional update through PostgREST (the JSON-field filter) in a live request.

**Next:** push and deploy, press "รีเฟรช" on JaoPor's visitor source, then the owner decisions in Project.md §7 (visitor wording, visitors on leaderboards).

## 2026-10-05 — First-user fixes, round 2: Add Startup people finish (auto-fill, "What do you have?", Stripe guide, trust box)

**Why (first-user test):** listing a startup asked for six things at once, verification showed three groups of providers on one screen, the Stripe key page opened blank, and 2 of 3 real startups were never verified.

**Done:**

- **Step 1 "ลงผลงาน" (List it):** link first; for a website link the server reads the page ~600 ms after typing stops and fills name, one-liner (new field, ≤ 140) and logo. Only empty fields or ones still holding the last auto value are replaced; typed values never are. Then category. AI tools, looking-for and screenshots moved to the edit page (the profile's "+ เพิ่ม…" cards already lead there). The auto logo is uploaded as a PNG on submit; "อัปโหลดเอง" / "ลบโลโก้" next to a 48 px preview tile.
- **Auto-fill server** (`POST /api/startups/preview`, signed-in only, 20 calls / minute / user): website links only, same SSRF guard as link previews (public https, every redirect re-checked, max 3), 3 s for the page (512 KB) and 3 s for icons (1 MB each). Icon order: apple-touch-icon, then the largest PNG / SVG / WebP / JPEG icon, then `/apple-touch-icon.png`; `.ico` and icons under 48 px are skipped; SVGs only when self-contained (no DOCTYPE / entities / scripts / images / external references). sharp → 256 px PNG data URL. Nothing is stored.
- **Step 2 "ยืนยันตัวเลข": VerifyPanel chooser** while nothing is connected (wizard and edit page): one question, five tiles (มีเว็บไซต์ → snippet, shown only with a website · Stripe · RevenueCat · GitHub · analytics: Plausible / Umami / Cloudflare), "ไม่ต้องใช้คีย์" / "คีย์อ่านอย่างเดียว" chips. Only the chosen connector shows, with "← เปลี่ยนวิธี"; connected tiles get ✓ and "เพิ่มอีกแหล่ง". Tiles keep the `#verify-revenue / -traffic / -build` ids for the profile's deep links. With a connection, the grouped manage view is unchanged.
- **Stripe permission guide:** Stripe has no pre-filled key link, so a mock of its permission table shows exactly Charges: Read, Subscriptions: Read, everything else: None (what the connector reads).
- **Trust box** beside every key field: what we store and show (totals, daily chart figures, the verifying service) and what we never store or do (customer names / emails / cards; create, change or refund; show the key), "disconnect deletes the key and that source's numbers", link to `/security`. Wording checked against /security and the Stripe connector.
- **Owner "not verified yet" prompt:** on the startup page, an owner whose project has no verified revenue, visitors or build proof sees the owner bar in warning tone with "ยืนยันตัวเลข" (→ edit page `#verify`). The dashboard's unverified-row banner already existed.

**Files:** `src/components/wizard/{StartupWizard,VerifyPanel}.tsx`, `src/app/api/startups/preview/route.ts`, `src/lib/net/link-preview.ts`, `src/lib/og-parse{,.test}.ts`, `src/components/profile/Owner.tsx`, `src/app/[locale]/startup/[slug]/page.tsx`, `messages/*.json`, `Design.md`
**Verified:** typecheck ✓ · lint ✓ · tests 289/289 (new: 6 site-identity cases: site name, title part matching the domain, "Name: one-liner", 140 clip, icon order without .ico / mask-icon / http, SVG) · build ✓. Live run of the server function (temporary test, deleted): jaopor.vercel.app, vercel.com, stripe.com, wongnai.com, github.com all gave name + one-liner + logo in 0.3–0.6 s; `https://localhost` and `https://127.0.0.1` refused. Unauthenticated `POST /api/startups/preview` → 401. Browser (temporary page, deleted): auto-fill fills name / one-liner / logo, a typed name survives a link change, chooser → Stripe guide + trust box; desktop and 375 px, no horizontal scroll.
**Not verified:** the owner prompt on a real startup page (needs a signed-in owner; sign-in on localhost goes to production) and a real auto-fill through the signed-in route (the client was checked with a stubbed response).
**Next:** owner review on production (add a project from a website link, verify with Stripe), then round 3 (verified first in lists, "Owner verified" badge; migration SQL shown before applying).

## 2026-10-05 — First-user fixes, round 1: province search + sign-in returns people to the product

**Why (first-user test):** people scrolled a 77-item province list and gave up, and every sign-in landed on an empty dashboard (the header's "เข้าสู่ระบบ" link had no return path, so `next` defaulted to `/dashboard`).

**Done:**

- **Province picker** (onboarding + profile editor, shared `ProvinceField`): the existing searchable `VocabCombobox` instead of a `<select>`; "ไม่ระบุ" first, then a pinned "จังหวัดยอดนิยม" group (Bangkok, Chiang Mai, Khon Kaen, Chon Buri, Phuket, Nonthaburi; new `pinned` prop, shown only before typing, never duplicated), then the regions. Search also matches aliases (`PROVINCE_ALIASES`: กทม / bkk, โคราช / korat, หาดใหญ่, pattaya…). Onboarding pre-fills an empty field from the live map's `/api/live/whoami` (nearest province, Thailand only) with the hint "เดาจากตำแหน่งโดยประมาณ เปลี่ยนได้".
- **Sign-in routing** (`lib/next-path`, pure + tested): every sign-in link carries the current page (`HeaderAuth` uses the full pathname). The callback sends users without a username to onboarding, which then continues to that page; others go back where they were, else `/dashboard` if they have a startup, else `/startups?welcome=1`. `next` is internal-only (no `//` or `\`, ≤ 500 chars) and never `/login` or `/onboarding`. Onboarding keeps its 4 steps (owner decision). The login page no longer defaults to the dashboard and passes the locale to the callback.
- **Welcome banner** on `/startups?welcome=1` (dismissible): explore first, "เพิ่มผลงานของฉัน →" when ready.

**Files:** `src/components/profile-edit/{ProvinceField,OnboardingFlow,ProfileEditor}.tsx`, `src/components/wizard/{VocabCombobox.tsx,vocab-options.ts,vocab-options.test.ts}`, `src/lib/config/provinces.ts`, `src/lib/next-path{,.test}.ts`, `src/app/api/auth/callback/route.ts`, `src/app/[locale]/{login,onboarding,startups}/page.tsx`, `src/components/{HeaderAuth,LoginButtons,WelcomeBanner}.tsx`, `messages/*.json`, `Design.md`
**Verified:** typecheck ✓ · lint ✓ (project) · tests 283/283 (new: 12 province-search cases in th / en incl. กทม / bkk / โคราช / หาดใหญ่ / pattaya, alias and popular slugs exist, 77 options; 7 sign-in routing cases incl. open-redirect and loop refusals) · build ✓. Browser (temporary page, deleted): "ไม่ระบุ" → popular → regions; typing "กทม" leaves only กรุงเทพมหานคร and Enter stores `bangkok`; fits 375 px. `/th/startups?welcome=1`: banner fits 375 px, no horizontal scroll; header sign-in link = `/th/login?next=%2Fth%2Fstartups`.
**Not verified:** a real OAuth sign-in through the new callback (needs a real Google / GitHub sign-in on production), and the location pre-fill (Vercel geo headers exist only in production).
**Privacy note for the owner:** the pre-fill reuses the approximate location already described for the live map (/privacy §5) for a new purpose (suggesting a province); nothing is stored unless the user continues. Consider one line in /privacy (owner-approved wording, so not changed here).

## 2026-10-04 — Landed the iPhone upload fix and the share-image ฿ fix; trust pages shipped (/security approved, /terms as a labelled draft)

**Done:**

- **iPhone / Safari uploads (`49ca189`, deployed):** the parallel session's uncommitted work (screenshots and post images fall back to JPEG; migration `upload_images_jpeg`, applied 2026-10-02) was committed, rebased onto master (one PROGRESS.md conflict; its RLS tests renumbered T108–T112 → T115–T119 to avoid the avatar tests), and deployed. Database and code were out of step until then (buckets accepted JPEG, the app still uploaded WebP only).
- **Transparent PNG on Safari (item from the avatar close-out):** fixed by the same change: the shared encoder paints transparent pixels white before JPEG, for avatars too.
- **Share-image "฿" box (`1c5b7f7`, deployed):** the baht session's uncommitted work (`lib/og-fonts`: each font subset its own family, used by all 7 next/og routes) applied as a patch on master and deployed. Production builder card now shows "฿2k" and bold Thai.
- **`/security` and `/terms`** (footer links that 404): built with a shared `DocPage` (the Privacy page's frame), content in `messages/*.json` (`Security`, `Terms`). The security page states only what the code does (verified against the connectors, `crypto/keys.ts`, `sync.ts`, the cron schedule and the live DB: key table has no client grants, cascade on project delete). Terms is a plain-language draft.
- **Owner approval (2026-10-05):** `/security` as written; `/terms` published as a clearly labelled draft: "(ฉบับร่าง)" in the title and a warning-tone note under the date ("ยังไม่ผ่านการตรวจทานทางกฎหมาย และอาจมีการปรับปรุง"), rendered by `DocPage` from an optional `note` key. Not described as legally reviewed.
- **Claims re-audited against code and DB before shipping, two corrected:** "disconnect deletes that source's numbers _and history_" now says revenue / traffic only (GitHub's daily commit history in `build_activity` is kept); "the _project_ shows the connection failed" now says the dashboard (the connection shows "!" there). Terms §5 limited to what exists (hide / remove content, delete accounts; no "remove verification / suspend"). Confirmed: last 4 characters shown (`keyHint`), only error names logged (connect / disconnect / sync), keys cascade with the project, no client grants on the key table, cron 20:00 UTC = 03:00 ICT, "รีเฟรช" / "รายงาน" match the real labels. TH / EN structure identical (Security 5 sections, Terms 8, same items and ids).

**Files:** `src/components/DocPage.tsx`, `src/app/[locale]/{security,terms}/page.tsx`, `messages/*.json`, `Design.md`, `Project.md`, `PROGRESS.md` (+ the two landed commits)
**Verified:**

- Upload fix: typecheck ✓ · lint ✓ · tests 261/261 · build ✓; live DB (rolled back): `.jpg` screenshot / post image accepted, `.png` refused, another startup's folder refused, hide queues both files, both buckets exactly WebP + JPEG at 3 MB. Production: pages 200, existing WebP screenshots still served.
- ฿ fix: tests 264/264 (incl. font coverage) · build ✓; production OG images 200 (builder th / en, startup, home, olympics), builder card shows "฿2k".
- Trust pages: typecheck ✓ · lint ✓ · tests 264/264 · build ✓ (both prerendered in th / en; H1, 5 / 8 sections, contact link checked in the built HTML). Not viewed in the browser pane (the preview server runs the main checkout, not this worktree); same frame as the verified Privacy page.

**Next:** formal legal review of `/terms`, then remove the draft note. Owner-only pre-launch items remain in Project.md §7 (publish the Google consent screen, decide on the email provider, delete demo projects at launch).

## 2026-10-04 — OG images: "฿" missing-glyph box fixed (shared OG fonts)

**Done:**

- **Builder OG image** showed the verified revenue as "□2k". The amount is drawn in `Mono` (Inconsolata, Latin only), and "฿" (U+0E3F) exists only in the Thai subset of IBM Plex Sans Thai.
- **Root cause, every next/og route:** the renderer (Satori) keeps one file per family name and weight. The Latin and Thai Plex subsets were both registered as `Plex`, so the Latin file always won. "฿" became a box (builder card, post bodies, axis labels), and Thai text never used Plex Thai: it fell back to a font the renderer downloads at render time, at regular weight even where the card asks for bold (names, titles, badges).
- **Fix:** new `lib/og-fonts` (`ogFonts()`, `OG_SANS` = "Plex, PlexThai", `OG_MONO` = "Mono, PlexThai"). Each subset has its own family. All 7 renderers use it: builder, startup, post, home, olympics and province OG, plus `/api/share-card`. Removed the per-route "Baht" family workarounds (share-card calendar, olympics amounts). `lib/share-card.ts` has no fonts and needed no change.
- Side effects: bold Thai now renders bold, and the olympics podium amount takes the row's bold weight. Layout, palette and sizes are unchanged (Design.md §9).

**Files:** `src/lib/og-fonts{,.test}.ts`, `src/app/[locale]/{u/[username],startup/[slug],post/[id],province/[slug],olympics,}/opengraph-image.tsx`, `src/app/api/share-card/[slug]/route.tsx`, `Design.md`
**Verified:**

- Reproduced "□2k" by rendering the real builder route (temporary Vitest harness with mocked data, deleted). After the fix, rendered PNGs of builder th/en, startup, post (body with "฿10,000" and "$300"), share-card badge dark/light, chart and calendar were all inspected: "฿" renders, digits are still Inconsolata, Thai is Plex Thai at the right weights.
- Dev server PNGs of olympics, province and home inspected.
- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm test` 264/264 ✓. New test: no duplicate family + weight, and both stacks cover ฿ / Thai / $ / digits.
- `npm run build` ✓. All 7 routes' `.nft.json` still trace the font files.

**Not verified:** the live builder route locally (it needs `SUPABASE_SECRET_KEY`, not available here); production after deploy.
**Next:** owner review → push → re-check https://jaopor.vercel.app/th/u/gxcb06/opengraph-image after deploy (it is cached for up to 300 s).

## 2026-10-04 — Profile photo (avatar) work closed: production-complete

**Done:**

- **Security migration** `profile_avatars_v2` applied 2026-10-02 after the owner's security review; full RLS smoke T1–T114 passed on the live database (client writes to `avatar_url` and to the `avatars` bucket refused, URL source constraint, own-folder cleanup, fail-closed bucket, 20 changes a day).
- **UX / reliability fixes deployed:** `7d74768` (initials fallback for every person photo, header updates without a reload, share images use uploaded photos, result-specific Thai / English wording) and `7d06f3d` (the owner's cached product, home and directory pages refresh after a photo change; founder-message photo fallback).
- **Production deployment completed:** `7d06f3d` live on jaopor.vercel.app (deployment `dpl_EqCQsHE4HF8fSWjoev2Y7tLs4H8d`, READY).
- **Manual production verification passed** (owner, 2026-10-04): upload, replace, sign-in photo, remove, invalid files, persistence, consistency across the product, share image, cached pages.
- **Real-device / iPhone verification passed** (owner, 2026-10-04).
- Server-side evidence from the same day: every replaced upload deleted (empty folder, empty cleanup queue, deleted URLs answer 400), no profile with a disallowed photo URL, product page / home / builders / feed / profile and the share image show the current photo.

**Status:** profile photo is **production-complete**.
**Known non-blocking items** (Project.md §7): transparent PNG from Safari gets a black background; very large phone photos decode at full size (monitor only). Separate, not avatar work: the share image's baht sign renders as a missing-glyph box (own session).
**Files:** `PROGRESS.md`, `Project.md` (docs only; no code or migration change)

## 2026-10-04 — Fix: product page kept the old founder photo after a photo change

**Root cause (owner report):** the product page (and home / directory) are ISR pages (60 s) that show the owner's photo, but the avatar actions only refreshed the dashboard and `/u/[username]`. ISR is stale-while-revalidate: after a change the product page kept serving the old photo until 60 s had passed _and_ a visit triggered a rebuild (production: `/th/startup/jaopor` served `STALE` at age 304–305 s with an old uploaded photo, then rebuilt on the next visit). The old file was already deleted, but the browser's image cache (1 year) kept showing it, so it looked unchanged rather than broken. Second, smaller cause: the founder-message photo (`ProfileBlocks`, 80 px) was missed by the `PersonPhoto` pass, so without a cached copy it would have been a broken image.

**Done:** after a successful photo change the actions refresh the owner's projects' pages in every locale (`/{locale}/startup/{slug}`, `/{locale}`, `/{locale}/startups`, the same set as `revalidateStartup`), read with the user's own client (RLS) and not exported as an action. Founder-message photo now uses `PersonPhoto` (initials fallback). No database change.

**Files:** `src/app/actions/profile.ts`, `src/components/ProfileBlocks.tsx`
**Verified:** typecheck ✓ · lint ✓ · tests 261/261 · build ✓. No other person-photo renderer outside `PersonPhoto` remains (sweep of `<img>` / `<Image>`).
**Not verified:** the immediate refresh on production (needs a signed-in photo change after deploy).

## 2026-10-04 — Profile photo review fixes (fallback, header refresh, share image, wording)

**Done (owner review, category "fix before public launch"):**

- **Photo fallback everywhere** (`PersonPhoto`): 11 hand-rolled avatar renderers (shared Avatar for posts / comments / chat / feed, builder cards, profile, dashboard, requests, connections, sidebar, header, quick search, leaderboard, startup founder) now show the frame's initials when a photo is missing, not https, deleted or fails to load, including images that fail before hydration. Fixes the blank circle on cached home / startup pages (60 s ISR) after a photo change deleted the old file, without giving up caching.
- **Header updates at once:** the editor announces the confirmed stored URL (`lib/avatar-events.ts`, a same-page event) and the header listens; no global store, no reload. The editor now shows the stored URL instead of a local blob preview (the actions return `{ ok, url }`).
- **Share images used to drop uploaded photos:** the OG renderer only fetched `lh3.googleusercontent.com` / GitHub; it now uses `shareablePhoto` (Google `lhN` / GitHub, or a uuid file in our own avatars bucket, nothing else).
- **Wording:** toasts name the result ("อัปเดตรูปโปรไฟล์แล้ว" / "เปลี่ยนเป็นรูปจาก {provider} แล้ว" / "ลบรูปโปรไฟล์แล้ว"); the button names the provider ("ใช้รูปจาก Google"); the hint keeps formats, centre-square crop and location removal, drops "512 px" and processing details.

**Files:** `src/components/PersonPhoto.tsx`, `src/lib/avatar-events.ts`, `src/lib/avatar{,.test}.ts`, `src/lib/avatar-flow{,.test}.ts`, `src/lib/og-images.ts`, `src/app/actions/profile.ts`, `src/components/profile-edit/{AvatarField,ProfileEditor}.tsx`, `src/components/{HeaderAuth,LeaderboardCard,posts/bits,builder/BuilderCard,dashboard/DashboardSidebar,search/QuickSearch}.tsx`, `src/app/[locale]/{u/[username],startup/[slug],dashboard,dashboard/{profile,requests,connections}}/page.tsx`, `messages/*.json`, `Design.md`
**Verified:** typecheck ✓ · lint ✓ (project; worktrees excluded) · tests 261/261 (new: stored URL returned by the flow, provider name, share-image allowlist) · build ✓ · browser (temporary page, deleted): live Google photo loads; deleted Storage file, non-https URL and no photo all show initials in both the shared Avatar and a bare frame. No database change: live check confirms avatar_url not client-writable, 3 restrictive storage policies, bucket 1 MB webp/jpeg, constraint + cleanup trigger present, rate function not callable by anon.
**Not verified:** header update and toasts while signed in (needs the owner's session), share image with the uploaded photo (after deploy), any iPhone / Safari behaviour.
**Next:** owner review → push → owner signed-in check + real iPhone test.

## 2026-10-02 — Screenshot and post image uploads on iPhone / Safari (JPEG fallback; migration applied, not deployed)

**Done:**

- **Bug:** Safari (macOS, and every browser on iOS, since they all run WebKit) can't encode WebP from a canvas. `toBlob("image/webp")` returns a PNG, so `toWebp` threw `no-webp`. Every screenshot upload (wizard / edit) and every post image (Composer) failed on iPhone. Confirmed on caniuse (`toBlob` WebP: not supported in any Safari or iOS version up to 27.2) and in WebKit bug 183257 (still open).
- `src/lib/webp.ts`: `toUploadImage()` replaces `toWebp()`. Encoding goes WebP → JPEG, shared with `toAvatarImage()`. For JPEG, transparent pixels are painted white (they used to turn black). It returns `{ blob, type, ext, width, height }`. ScreenshotsManager and Composer upload `{id}/{uuid}.webp|jpg` with the matching content type. `cleanupPostUpload` accepts `.jpg`. The "this browser can't convert to WebP" toast and its `noWebp` keys are removed.
- **Migration `20261001180710_upload_images_jpeg`** (applied 2026-10-02 after owner review; remote version `20261001181333`): the `screenshots` and `post-images` buckets accept `image/jpeg` too, and the `startup_screenshots.path` / `post_images.path` checks accept `.webp|.jpg`. Storage policies check only the folder, so they are unchanged (confirmed on the live DB: no policy or function mentions `.webp`). RLS smoke T108–T112 added (renumbered T115–T119 when merged after the avatar tests; T119 checks that both buckets accept exactly WebP and JPEG; the Storage API enforces the type, not SQL), and T86 now expects 2 queued files.
- **Avatar migration not applied (coordination check):** the owner chose to apply `20261001175557_profile_avatars` first. In the main checkout another session has replaced it with `20261001181036_profile_avatars_v2` (uncommitted and still being edited: identity-data provider photo, a URL source CHECK, cleanup tied to the profile's own folder, restrictive storage policies, rate limit) and staged the old file for deletion. Applying the old draft would have shipped the weaker version and broken v2 (duplicate trigger), so neither avatar migration was applied from here.

**Files:** `src/lib/webp.ts`, `src/components/wizard/ScreenshotsManager.tsx`, `src/components/posts/Composer.tsx`, `src/app/actions/posts.ts`, `supabase/migrations/20261001180710_upload_images_jpeg.sql`, `supabase/tests/rls_smoke.sql`, `messages/*.json`, `docs/SPEC.md`, `Design.md`
**Verified:**

- `npm test` 247/247 · typecheck ✓ · lint ✓.
- The `encode()` logic in the browser pane (Chromium), with `toBlob` patched to answer WebP requests with PNG like Safari does: the output is `image/jpeg`, the transparent half is white and the red half is unchanged. Unpatched, it stays `image/webp` with alpha kept.
- Live DB after applying: `screenshots` and `post-images` = `image/webp,image/jpeg`, 3 MB; both path checks = `\.(webp|jpg)$`. Advisors: nothing new (the only WARN, leaked-password protection, is an existing Auth setting). RLS smoke: every test good, including T108–T112 (now T115–T119), **except T105–T107** (avatar tests, expected to fail until an avatar migration is applied; T105 "client sets avatar_url: ALLOWED" is the existing production gap that v2 closes). Types: unchanged (bucket rows and CHECK constraints aren't in the generated types).
- `npm run build` ✓ (after `npm ci` in the worktree, which had no `node_modules` of its own).
- **Not done:** commit, push, deploy and the production checks (iPhone upload, existing WebP uploads, cleanup). This branch sits on the unpushed avatar commit `953954b`, so pushing it would ship the avatar UI without its migration while another session is reworking that code on `master`.

**Next:** the avatar session lands v2 (apply, smoke T105–T107 against its own tests); then merge this branch (expect conflicts in `rls_smoke.sql`, PROGRESS.md and Project.md), deploy, and test uploads from an iPhone.

## 2026-10-02 — Profile photo upload (migration applied after owner security review; not pushed yet)

**Done:**

- **Profile photo** in the editor (ข้อมูลพื้นฐาน, first row): "เปลี่ยนรูป" (centre-cropped to a 512 px square on the device, WebP or JPEG on Safari, metadata removed), "ใช้รูปจากบัญชีที่ใช้เข้าสู่ระบบ", "ลบรูป". Saved immediately, outside the form's save bar. The header avatar now uses the profile photo too.
- **Server action** `uploadAvatar` / `resetAvatar`: the file type is decided by its first bytes (WebP / JPEG), ≤ 1 MB, uploaded with the service role to `avatars/{user}/{uuid}.webp|jpg`; the previous photo is deleted right away.
- **Migration** (NOT applied; superseded by `_v2`, see the review below): `avatars` bucket (public read, no client policies), `profiles.avatar_url` no longer client-writable (closes a gap: any user could point it at any URL that every visitor's browser would load), replaced / removed / deleted-account photos queued in `storage_cleanup`. RLS smoke T105–T107 added.

**Files:** `supabase/migrations/20261001175557_profile_avatars.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/avatar{,.test}.ts`, `src/lib/webp.ts`, `src/app/actions/profile.ts`, `src/components/profile-edit/{AvatarField,ProfileEditor}.tsx`, `src/app/[locale]/dashboard/profile/page.tsx`, `src/components/HeaderAuth.tsx`, `messages/*.json`, `Design.md`
**Verified:** `npm test` 247/247 · typecheck ✓ · lint ✓ · build ✓ · AvatarField at 375px (both states) on a temporary preview page (deleted).
**Next:** owner reviews the migration → apply, advisors, RLS smoke, regenerate types → push → test an upload on production.

**Security review (owner checklist, same day), before approval:** the draft migration was replaced by `20261001181036_profile_avatars_v2.sql` (draft never applied or pushed). Found and fixed: (1) "use my sign-in photo" read user_metadata, which users can edit through the Auth API → arbitrary URL, or a look-alike of another user's file that a later change would have queued for deletion; now read from `auth.identities` + a Google / GitHub host allowlist; (2) sign-up copied metadata unchecked → filtered in `handle_new_user`; (3) avatar_url now has a CHECK constraint (Google / GitHub hosts, or this profile's own folder of our bucket) binding the service role too; (4) cleanup trigger limited to the profile's own folder; (5) restrictive storage policies (no client writes to avatars, ever); (6) fail closed on a misconfigured existing bucket; (7) 20 photo changes a day; (8) orphan handling (failed update deletes or queues the new file, interrupted uploads swept on the next change, the drain never deletes a photo in use); (9) a `{1,440}` regex that Postgres rejects (limit 255) was caught by the dry run. Dry run of migration + T104a–T114 on production inside one rolled-back statement: all 25 checks good; fail-closed bucket check good; production verified unchanged afterwards. Unit: 258/258.

**Applied 2026-10-02 (owner: "Approve … Apply"), verification gate on the live database:** full `rls_smoke.sql` T1–T114 all good (T104a–T114: sign-up filter, privileges, client avatar_url update denied, own name / headline still editable, no client insert / update / move / copy / delete in `avatars` incl. anon, constraint refuses other folders / look-alikes / fake hosts, refused update queues nothing, replaced / deleted-account photos queued, provider URLs never queued, 21st change limited, bucket `public / 1 MB / webp+jpeg`, 3 restrictive policies, definer functions with `search_path=""`). Service-role path (rolled back): writes an avatar object, sets an own-folder URL, resets to a provider photo, is refused an arbitrary URL. No test data left. Security advisors: no new findings (existing leaked-password WARN + INFO). Types regenerated: identical to the committed file. typecheck ✓ · tests 258/258 ✓ · build ✓ · lint: 0 problems in the project; `npm run lint` also scans the parallel iPhone-upload task's worktree under `.claude/worktrees/` (15,061 problems, all there). The migration file still says "NOT APPLIED" in its header: it was committed before applying and committed migrations are protected from edits.

## 2026-10-02 — Profile revenue dashboard (Figma 160-2); chat unblock

**Done:**

- **Profile "รายได้รวม" dashboard** (owner request: follow the Figma / HTML mockup, Design.md §6 "Profile revenue dashboard"): replaces the startup page's MetricChart on profiles. Toolbar with the tabs and 7 วัน / 30 วัน / 12 เดือน (year buttons on the activity tab, same style); range total in the visitor's currency, growth vs the previous period (complete days only), legend with the works included; brand area + line, the previous period dashed behind it, today (this month on 12 เดือน) as a dashed partial segment ending in a ring; hover / touch / arrow-key tooltip; a screen-reader table; footer "ยืนยันผ่าน {sources} · อัปเดตล่าสุด {time} · ไม่รวมผลงานที่ยังไม่ยืนยัน". Verified, non-demo works only (the owner's own profile has only demo works, so it shows the owner prompt instead). Pure windowing in `lib/profile-revenue.ts`.
- **Unblock** (owner question): the person who blocked sees "คุณบล็อกแชทนี้ไว้ · เลิกบล็อก" in the chat. Unblocking reopens the chat and undoes only what that block changed (the opening request is accepted again so LINE / email are shared as before; other requests it closed become declined; anything blocked earlier stays blocked; the accept trigger's notifications are removed). The block dialog no longer says "ถาวร".
- **Gap closed:** blocking a contact request from คำขอคุย now also closes an existing chat with that person.

**Files:** `src/lib/profile-revenue{,.test}.ts`, `src/lib/data/builder.ts` (`getBuilderRevenue`), `src/components/builder/{ProfileRevenueChart,ProfileChartTabs,toolbar}.tsx|ts`, `src/app/[locale]/u/[username]/page.tsx`, `src/app/actions/{chat,profile}.ts`, `src/lib/data/chat.ts`, `src/components/chat/ChatThread.tsx`, `src/app/[locale]/dashboard/messages/[id]/page.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 244/244 (new: 30-day window with today partial, 7 days without today, growth on complete days only, nulls before the first data, 12-month buckets, nice axis max, works label) · typecheck ✓ · lint ✓ · build ✓ · all new keys in th and en.
- Temporary preview with sample data (deleted): 900px (tooltip, legend, partial ring, axis, footer), 12 เดือน, 375px (no horizontal scroll; x labels first / middle / "วันนี้" only after a label collision was found and fixed), owner empty state (en), chat "You blocked this chat · Unblock".
- Production: @gxcb06 (JaoPor, Stripe-verified, ฿0) shows the tabs, ranges, legend, partial month and footer. Fix found there: with all-zero revenue the y axis read "฿1 / ฿1 / ฿0"; it now shows only "฿0".
- **Not verified yet:** unblocking on production with the owner's accounts.

**Next:** owner unblocks the test chat (jaopor_dev → chawankorn_bouraphan) and checks the profile dashboard on a profile with verified, non-demo revenue.

## 2026-10-02 — Phase 11: in-app 1:1 chat

**Done:**

- **Migration `20261001160319_chat`** (applied after owner review): `conversations` (one per pair, opened by an accepted contact request + backfill of the 2 existing accepted pairs), `chat_messages` (text 1–2,000, no edits, 200 a day via `rate_events`), `conversation_reads`, report target `message` (participants only), Realtime publication. Participants only (RLS); clients never create or block conversations.
- **`/dashboard/messages`** (Design.md §5 Chat): conversation list with unread counts, and a conversation pane with day and sender grouping, live messages over Supabase Realtime (RLS applies) with 10s polling while the live channel is down, an Enter-to-send composer (counter after 1,800), block (closes the chat for good and blocks the contact request so LINE / email stop being shared), and report a message. On phones only the list or the conversation shows.
- **Entry points:** header message icon with unread badge (from `sm`), "ข้อความ" in the avatar menu, sidebar item with badge, "ส่งข้อความ" on a profile once a request is accepted, "เปิดแชท" on accepted rows in คำขอคุย (`?with=<user>` resolves to the conversation).
- **/privacy** (owner-approved wording): posts item in §2, new §7 "ข้อความ (แชท)" (not end-to-end encrypted, read only when reported, block, 200 a day), deletion section covers posts, comments and messages; renumbered; date updated.

**Files:** `supabase/migrations/20261001160319_chat.sql`, `supabase/tests/rls_smoke.sql` (T91–T104), `docs/SPEC.md` §13, `src/lib/{chat,chat.test}.ts`, `src/lib/data/chat.ts`, `src/app/actions/{chat,posts}.ts`, `src/components/chat/*`, `src/app/[locale]/dashboard/messages/**`, `src/components/{HeaderAuth,builder/ProfileActions,builder/ReportDialog,dashboard/DashboardSidebar}.tsx`, `src/app/[locale]/dashboard/{layout,requests/page}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- RLS smoke 104/104 good (T91–T104 chat: outsider can't read or write, no message without an accepted request, blocked conversation refuses messages, daily limit, message reports participants only). Advisors: no new WARN.
- `npm test` 237/237 · typecheck ✓ · lint ✓ · build ✓ · every Chat / nav / privacy key present in th and en.
- Layout with sample data (temporary preview page, deleted): 1280 two panes, 375 list-only and conversation-only, no horizontal scroll, long links wrap. Fix found while checking: the thread's auto-scroll used `scrollIntoView`, which also scrolled the page; it now scrolls only the message list.
- /privacy (en) shows sections 1–10, "Messages (chat)" as §7, date October 2, 2026.
- **Not verified yet:** signed-in chat between two real accounts (Realtime, unread badges, block) — needs the owner's sessions.

**Next:** owner tests chat with two accounts that have an accepted request.

## 2026-10-01 — Phase 10e: builder profile v2 + startup page "อัปเดตล่าสุด"; feed rail status fix

**Done:**

- **Profile v2** (Figma "Founder Prfile 2nd" 160-2, Design.md §6): breadcrumb; proof line under the handle ("{n} ผลงาน · {v} ยืนยันแล้ว · สร้างมา {m} เดือน"); followers with the 30-day gain ("+12"); superpower skills as large chips; 4 stat tiles (MRR รวม, รายได้ทั้งหมด, GitHub ★ + commits, อัปเดตผลงาน in 6 months; zero tiles hidden); one card with tabs "รายได้รวม | กิจกรรมการสร้าง" (the startup page's chart fed with the sum of the verified, non-demo works via `getBuilderChart` + pure `sumSeries`; the heatmap with its year switcher; no verified revenue → heatmap only); pinned works (4 + "ดูทั้งหมด n ›" in place); "อัปเดตผลงาน" (latest 4 PostCards, 2-column masonry, "ดูฟีดทั้งหมด →"); experience as a 3-column grid at the bottom. "กิจกรรมล่าสุด" removed (the updates replace it).
- **Edit in place (option C):** for the owner each section title has "✎ แก้ไข" opening the editor on exactly that section (`/dashboard/profile#basics|status|skills|pinned|experience`).
- **Startup page "อัปเดตล่าสุด":** the latest 3 posts as compact PostPreview cards from a cookie-free query, so the page stays ISR-cached.
- Demo projects no longer count toward GitHub stars, commits or "สร้างมา n เดือน" on a profile (sample data).
- **Feed rail (owner screenshot):** "คนสร้างที่น่าติดตาม" wrapped the status pill into a blob in the ~240px rail → a one-line "● หา Co-founder" label.

**Files:** `src/app/[locale]/u/[username]/page.tsx`, `src/components/builder/ProfileChartTabs.tsx`, `src/components/posts/PostPreview.tsx`, `src/lib/builder{,.test}.ts` (`sumSeries`), `src/lib/data/{builder,posts}.ts`, `src/app/[locale]/startup/[slug]/page.tsx`, `src/app/[locale]/feed/page.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 235/235 · typecheck ✓ · lint ✓ · build ✓
- Local: the startup page shows "อัปเดตล่าสุด" with the owner's test post (RaanDee POS), no overflow.
- Production (viewed signed in as another account): breadcrumb, proof line, GitHub + updates tiles, "ดูทั้งหมด 5 ›", the updates section with the test post, experience grid; no horizontal scroll at 1193px. The revenue / activity card is correctly hidden for visitors (no verified non-demo revenue, no activity yet).
- Deviation from the spec (Design.md): the revenue chart ends yesterday like the startup chart, so there is no dashed "วันนี้ (ยังไม่ครบวัน)" point.

**Next:** owner review of Phase 10 as a whole; then Phase 11 (in-app chat).

## 2026-10-01 — Phase 10d: automatic milestone posts; profile editor "unsaved" fix

**Done:**

- **Bug (owner report):** after saving the profile editor it still said "มีการเปลี่ยนแปลงที่ยังไม่บันทึก". The form was compared with the page's `initial` data, which the server stores differently (public visibility omitted, links normalised, new experience rows get ids), so they never matched after the refresh. Both the editor and the Settings visibility form now compare with a snapshot of what was last saved.
- **Milestones** (`lib/milestones.ts`, pure): per startup, verified data only (demo / unpublished never qualify): first verification, MRR ฿1k / 10k / 100k, total revenue ฿100k / ฿1M (THB from the daily rate), GitHub ★100 / ★1k (only once the GitHub source has synced). In each family only the highest level reached is posted, and never a level at or below one already in the ledger (no backlog on the first run; a drop and recovery or a deleted post never brings one back). No Olympics podium milestone (owner decision).
- **Job** (`lib/milestones-job.ts` + `lib/milestones-store.ts`, in the daily cron after the syncs): claims the ledger key first (`on conflict do nothing`), posts only when this run claimed it, links the post; a failed post releases the claim for the next run. Auto posts are authored by the startup owner.
- **Cards** render the milestone headline from its key in the visitor's language (the stored Thai body is the fallback), with a ฿ / ★ / ✓ badge and "ยืนยันผ่าน {source}" (GitHub for stars).

**Files:** `src/lib/milestones{,-job,-store}.ts`, `src/lib/milestones.test.ts`, `src/app/api/cron/sync/route.ts`, `src/lib/data/posts.ts`, `src/components/posts/PostCard.tsx`, `src/components/profile-edit/ProfileEditor.tsx`, `src/components/dashboard/SettingsForm.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 234/234 — new: highest level only on the first run; no re-post after a drop and recovery; verified-only (unverified, demo, hidden, unsynced stars skipped); no money milestones without a rate; key round-trip; **job idempotent** (two runs in a row and two runs at once each post every milestone exactly once, against an in-memory store with the database's uniqueness rules); a failed post is retried on the next run.
- typecheck ✓ · lint ✓ · build ✓
- Dry run on production data (read-only): one published non-demo startup (JaoPor, verified, ฿0 MRR, ★0), so the next cron posts one milestone: first verification.
- **Not verified yet:** the editor fix on production (needs the owner's session) and the first real cron run.

**Next:** owner re-checks saving the profile; Phase 10e (profile v2 + startup page "อัปเดตล่าสุด").

## 2026-10-01 — Phase 10c: /feed, header nav, notification bell

**Done:**

- **`/feed`** (Figma 160-555): views ล่าสุด / กำลังติดตาม / ยอดนิยมสัปดาห์นี้, type chips, province and category, all in the URL; composer on top; PostCards with "โหลดเพิ่ม" appending pages in place (`/api/feed`, cursor = last post time; popular and "waiting" page by offset). Right rail: builders to follow (not me, not already followed; FollowButton), most active startups this week, and "รอ Feedback จากคุณ" (feedback posts from the last 14 days that aren't mine and I haven't commented on; signed out: those with no comments) linking to `?waiting=1`.
- "ยอดนิยมสัปดาห์นี้" = last 7 days ranked by (likes + 2 × comments) / (hours + 2)^1.5 (pure `lib/feed.ts`, tested).
- **Header** follows the Figma nav: สตาร์ทอัพ · คนสร้าง · ฟีด · หมวดหมู่ · โอลิมปิก (owner decision). The leaderboard link moved to the Olympics page ("ดูกระดานผู้นำสตาร์ทอัพ →"), the footer and the mobile menu; ฟีด added to the mobile menu and footer.
- **NotificationBell** next to the avatar: unread count (polled every minute while the tab is visible), the latest 15 (likes, comments, requests) linking to the post or the requests page; opening marks them read. The dashboard "คำขอคุย" badge now counts pending incoming requests (it used unread notifications, which the bell now clears).
- Fix found while checking: PostCard renders inside the client feed list, so the startup logo URL is now resolved on the server (`lib/supabase/public` is server-only).

**Files:** `src/app/[locale]/feed/page.tsx`, `src/app/api/feed/route.ts`, `src/lib/feed{,.test}.ts`, `src/lib/data/{feed,posts,me}.ts`, `src/components/posts/{FeedList,PostCard}.tsx`, `src/components/builder/FollowButton.tsx`, `src/components/{NotificationBell,HeaderAuth,SiteHeader,MobileNav,SiteFooter}.tsx`, `src/app/[locale]/{olympics/page,dashboard/layout}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 226/226 · typecheck ✓ · lint ✓ · build ✓
- Local against live data (the owner's two test posts): every view and filter (popular 2, following signed-out prompt, lesson / saas empty, feature 1, Bangkok 1, waiting empty), `/api/feed` 200, cursor paging (older than newest → the second post; popular offset 1 → the second post).
- Layout: 1440 three columns; 1024 first overflowed by 63px (rail squeezed to 0) → three columns only from `xl`, rail under the posts at `lg`, re-checked with no overflow; header fits at 1024; 375 no horizontal scroll, view tabs moved out of the folded filters so they stay visible on phones.
- **Not verified locally:** "who to follow" (needs the service-role key; it fails soft) and the bell (needs a session) — checked on production next.

**Next:** owner checks the bell and the feed on production; then Phase 10d (automatic milestone posts).

## 2026-10-01 — Phase 10b: posting (composer, PostCard, post page, comments, reports, link previews, image cleanup)

**Done:**

- **Server actions** (`actions/posts.ts`, all writes through the user's own RLS client): create / edit (15 min) / delete post, like / unlike, comment + reply, soft-delete comment, report a post / comment / user (`reportTarget`, which replaces `reportUser`). Database errors map to friendly messages (daily limit, not a team member / edit window closed, invalid).
- **Link previews** (`lib/net/link-preview.ts` + pure `lib/og-parse.ts`): server-side only, same SSRF guard as provider URLs re-checked on every redirect (max 3), 3 s timeout, 512 KB cap, https images only, kept on the post (service role writes `link_preview`, only if the link didn't change meanwhile) and memoised for a day.
- **Images**: the browser converts to WebP and drops EXIF (shared `lib/webp.ts`, screenshots use it too), uploads into `post-images/{post_id}/`, then records the row; a file whose row fails is removed (`cleanupPostUpload`). **Storage cleanup worker** (`lib/storage-cleanup.ts`): deletes queued files right after deleting a post and in the daily cron for the rest.
- **UI** (Design.md §5 PostCard / Composer / Post page): PostCard (type chips incl. the new `--info` teal token, gold milestone card, link card, image grid, ♥ with optimistic count, comments link, LINE / X share, ⋯ edit / delete / report; feedback posts show their first comment and "ให้ Feedback"), Composer on the dashboard overview (startup + type pickers, ≤ 4 images, link, counter, rules line), `/post/[id]` with the comment thread (one level of replies, tombstones, delete own, report others) and an OG image.
- The "คำขอคุย" badge and "mark read" now only count request notifications (likes / comments get the bell in 10c).

**Files:** `src/app/actions/posts.ts`, `src/lib/{posts,og-parse,storage-cleanup,webp}.ts` (+ tests), `src/lib/net/link-preview.ts`, `src/lib/data/posts.ts`, `src/components/posts/*`, `src/components/builder/ReportDialog.tsx`, `src/app/[locale]/post/[id]/{page,opengraph-image}.tsx`, `src/app/[locale]/dashboard/page.tsx`, `src/app/api/cron/sync/route.ts`, `src/lib/data/me.ts`, `src/app/actions/profile.ts`, `src/app/globals.css`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 221/221 (new: post helpers, Open Graph parser) · typecheck ✓ · lint ✓ · build ✓
- Embeds checked against the live REST API (posts → author / startup / images, comments → author, members → startup: all 200). `/th/post/999999` and `/th/post/abc` → 404.
- Browser (local, sample data on a temporary dev-only page, deleted afterwards): composer, milestone / feature / feedback / lesson cards, link card, liked state, comment thread with reply and tombstone; 375px: no horizontal scroll, every card footer on one line after moving "ให้ Feedback" to its own row and shortening "แชร์ไป LINE" to "LINE" on phones.
- **Not verified yet (needs the owner's session on production):** posting with an image and a link, likes, comments, delete, report.

**Next:** owner tests posting on production; then Phase 10c (`/feed`, header "ฟีด", notification bell).

## 2026-10-01 — Phase 10a: feed_posts migration applied (after two review rounds)

**Done:**

- **Applied (owner: "apply") `20261001092434_feed_posts`**, which replaced the unapplied draft `20261001084406` after the owner's review: posts (confirmed members only, 5/day, text edits for 15 minutes, province / category copied from the startup), `milestones` ledger (a milestone is never posted twice, even after its post is deleted), post_images + public `post-images` bucket, `storage_cleanup` queue (every removed / cascaded / hidden-post image queues its file for server deletion), likes and comments (one level of replies, soft delete; deleting an account turns that person's comments into tombstones so other people's replies stay), counters, `reports` for users / posts / comments (copies `user_reports`), post_like / post_comment notifications, and posts in the activity heatmap (published, non-demo startups only).
- **Review fixes before applying:** daily limits kept in `private.rate_events` with a per-user advisory lock (deleting or hiding no longer resets them, concurrent requests can't slip past); likes and comments only on publicly visible posts (explicit hidden / published check); replies to deleted comments blocked; case-insensitive link check; notification kind ↔ post / comment reference check; redundant 4-image trigger and the feedback index dropped.
- `reportUser` now writes to `reports` (target_type user). Types regenerated.

**Files:** `supabase/migrations/20261001092434_feed_posts.sql` (old draft removed), `supabase/tests/rls_smoke.sql` (T64–T90), `src/lib/supabase/database.types.ts`, `src/app/actions/profile.ts`, `src/components/builder/ReportDialog.tsx`
**Verified:**

- Live checks before applying: no preview branches, migration not applied anywhere, the activity view had no dependents or grants, `user_reports` empty with the same reasons and no status column, clients can't insert notifications.
- RLS smoke **90/90** (new: member posts and the province is copied; non-member, milestone and link_preview writes refused; 6th post refused and still refused after deleting 4; author edits; image upload while editable; milestones / storage_cleanup / rate_events unreadable; others can't edit or delete a post or delete a comment; like → unlike → like notifies once; comment notifies the author; reply to a reply refused; likers private; forged notification refused; report filed but unreadable; deleted account tombstones the comment, keeps the reply and fixes the count; heatmap counts posts; hiding drops images and queues the file; hidden post invisible, can't be liked or commented on, still visible to its author). The first run showed a test bug (the 4 posts were inside the exception block that rolled them back); fixed and re-run.
- Advisors: no new WARN (INFO only: the server-only tables have no client policies by design; new indexes unused yet).
- typecheck ✓ · lint ✓ · `npm test` 212/212 · build ✓

**Next:** Phase 10b (posting: server actions, link previews, image upload, PostCard, composer, `/post/[id]`, reports for posts and comments, storage cleanup worker). Later migration: copy any new `user_reports` rows into `reports`, then drop `user_reports`.

## 2026-10-01 — Profile editor fix (one section at a time + per-field visibility), footer tagline, decisions

**Done:**

- **Owner decisions recorded** (Project.md §6): editor A+B now, edit-in-place with Phase 10; Phase 10 in order 10a → 10e; chat after Phase 10; follower counts GitHub + YouTube first, no LINE OA (its token can send messages); no Olympics podium milestone; pricing card = image; the five Phase 10 rules approved. The `feed_posts` migration stays unapplied until 10a.
- **Profile editor** (`/dashboard/profile`): six sections behind a tab row (✓ / "1/3" per tab), "โปรไฟล์ครบ {pct}%" bar with "ถัดไป: {section}", ← / → between sections, one sticky save bar. Links and private contacts share one section; social links show the filled ones plus "+ GitHub", "+ LinkedIn"… chips; experience starts as a single "+ เพิ่มประสบการณ์" button. Deep links (`#province`, `#skills`, `#experience`) still open the right section.
- **VisibilityMenu**: who can see bio, province, looking-for, skills, experience and social links is set next to each one (สาธารณะ / สมาชิก / ซ่อน, with a one-line explanation); non-public shows in amber. Saved with the profile; Settings shows the same values (activity graph stays there).
- **Footer tagline** (user): "ดินแดนมาเฟียของเหล่า Startup และผลงานที่สร้างด้วย AI ในไทยและเอเชีย ผลงานจริง รายได้จริง ตัวเลขจริง" (EN equivalent).
- **BizModel.md**: removed the old summary (former lines 1–68); only the current version remains.

**Files:** `src/components/profile-edit/{ProfileEditor,VisibilityMenu}.tsx`, `src/components/wizard/fields.tsx` (Field `action` slot), `src/app/[locale]/dashboard/profile/page.tsx`, `messages/*.json`, `Design.md`, `Project.md`, `BizModel.md`
**Verified:**

- typecheck ✓ · lint ✓ · `npm test` 212/212 · build ✓
- Browser (local, editor rendered with sample data on a temporary dev-only page, deleted afterwards; the real page needs a signed-in session): tabs switch sections, the visibility menu changes the value and marks the form unsaved, link chips reveal inputs, `#province` opens Basics and focuses the field; 375px has no horizontal scroll and the tab row scrolls sideways. Footer text checked on /th/categories.
- **Not verified:** saving from the real page (needs the owner's session on production after a push).

**Next:** owner review; then Phase 10a (review + apply `feed_posts`, RLS smoke tests). Nothing pushed yet (owner: keep `2bbfb1a` local until the editor fix and 10a are settled).

## 2026-10-01 — Phase 9c: /builders directory + people in QuickSearch; startup owner-bar copy

**Done:**

- **Copy (user):** the startup page's owner bar now reads "นี่คือโปรไฟล์ Startup ของคุณ — …" and its button "แก้ไข Startup" (EN "This is your startup's profile", "Edit startup"), so it isn't confused with the builder profile.
- **`/builders`** (spec 9c): hero with a people search, filter sidebar (skill · area = region or province · status · สร้างด้วย · verified only; same no-JS GET form and mobile toggle as /startups), BuilderCard grid (avatar, name, @handle, headline, status, top 3 skills with superpowers first, "n ผลงาน", verified ฿/month, province), ordered by verified revenue → verified works → works → newest, 24 per page.
- **Privacy:** rows come from the anonymous view only. Only `show_in_directory` profiles are listed, and a province or skills set to members / hidden are dropped before filtering, so filters can't reveal them. Works = confirmed memberships of published startups; revenue = verified, non-demo.
- **QuickSearch "คน" group** (up to 4, handle prefix first; a failure there can't break startup search); placeholder mentions people.
- **Navigation:** header "คนสร้าง" (the home-anchor leaderboard link now shows from 1280px only, so 1024px still fits), mobile menu, footer; the dashboard sidebar's คนสร้าง / หา Co-founder links are live (no more "เร็ว ๆ นี้").
- Shared **StatusPill** (tone by status); the profile page's pill was always green, now busy is neutral and networking is brand.

**Files:** `src/app/[locale]/builders/page.tsx`, `src/components/builder/{BuilderCard,StatusPill}.tsx`, `src/lib/builders{,.test}.ts`, `src/lib/data/builder.ts` (`listBuilders`, OG card counts published works only), `src/app/api/search/route.ts`, `src/components/search/QuickSearch.tsx`, `src/components/{SiteHeader,MobileNav,SiteFooter}.tsx`, `src/components/dashboard/DashboardSidebar.tsx`, `src/app/[locale]/u/[username]/page.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 212/212 (filters per facet + combined, hidden province never matches, ordering, skill order, people search ranking) · typecheck ✓ · lint ✓ · build ✓
- Production: /th/builders lists 3 builders; filters checked by URL (northeast + fullstack 3, north 0, verified 1, open_to_work 0, q=jaopor 1, claude-code 2); QuickSearch "chaw" shows the คน group with highlight and ↓ + Enter opens the profile; /en/builders at 375px has no horizontal scroll and the filter toggle opens the form; the header fits at 1024px.

**Next:** owner review of Phase 9. Follow-up when the directory grows past a few hundred profiles: move filtering/search into SQL (an RPC over the anonymous view) instead of loading every directory profile per request.

## 2026-10-01 — Phase 9b: public builder profile, founder link, contact email

**Done:**

- **Founder card → profile (user request):** the startup page's Founder tile (`FounderCard`) and the founder-message name link to `/u/{handle}`. The subtext under the name is the project's `founder_role` (e.g. "Founder, CEO"), else the profile headline (e.g. "cu109"), else the 𝕏 handle.
- **Contact email changed to jaopordev@gmail.com** (/privacy TH + EN, settings delete-account mail).
- **`/u/[username]` + `/@username`** (proxy rewrite, `lib/at-path.ts`): sidebar (avatar + status dot, headline, bio, follow / contact / edit, followers, province + Olympics rank, current role, links, contacts once a request is accepted, else "ขอ LINE / อีเมล"), computed badges (pioneer, verified, MRR milestone, 7-day streak), skills + superpowers, built-with tools, report; main column: looking-for card, proof strip (verified numbers only), pinned works, a GitHub-style activity heatmap with year switcher, experience, recent activity. Owners see "+ เพิ่ม…" prompts where visitors would see nothing.
- **Social actions** (`actions/social.ts`): follow / unfollow, contact request (topic + 500-char message; DB limits surface as "pending" / "5 a day" / "blocked"); report dialog. **Profile views** (`/api/profile-view`): one row per browser per day, stored as an HMAC under a daily key; no IP; the owner isn't counted.
- **Activity data:** the sync now stores GitHub weekly commit activity per day in `build_activity`; the cron refreshes `refresh_activity` and prunes `live_pings`.
- **Builder OG image** (anonymous view only; avatar fetched from Google/GitHub avatar hosts only).

**Files:** `src/app/[locale]/u/[username]/{page,opengraph-image}.tsx`, `src/components/builder/*`, `src/app/actions/social.ts`, `src/app/api/profile-view/route.ts`, `src/lib/{builder,at-path}{,.test}.ts`, `src/lib/data/builder.ts`, `src/lib/og-images.ts`, `src/proxy.ts`, `src/components/ProfileBlocks.tsx`, `src/app/[locale]/startup/[slug]/page.tsx`, `src/lib/data/startups.ts`, `src/lib/build/github.ts`, `src/lib/sources/sync.ts`, `src/app/api/cron/sync/route.ts`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 207/207 (badges, streak, heatmap grid / month labels, /@ path parsing, commit-activity parsing) · typecheck ✓ · lint ✓ · build ✓ · every `Builder.*` key used by the page and dialogs exists in TH + EN (script check).
- Local render isn't possible (no service-role key in the local env), so it was checked on production: `/@chawankorn_bouraphan` rewrites to `/th/u/…` (200, owner view: edit button, pioneer #1 badge, skills, built-with, proof strip 5 works / 54 stars / 11 months, pinned works, empty heatmap with the owner hint, recent launches). The demo project's Founder tile links to the profile and shows the headline as subtext. Fixed after that check: thousands separators in work stats, a "ตัวอย่าง" tag on demo works, and the ✓ provider only next to a verified revenue number. The heatmap fills after the next daily sync writes `build_activity`.
- 375px (production): the work grid first overflowed by 22px (implicit `auto` grid track); fixed with explicit `grid-cols-1`, re-checked: no horizontal scroll, cards wrap correctly.

**Next:** Phase 9c (`/builders` directory + QuickSearch "คน" group, enable the sidebar community links)

## 2026-10-01 — Phase 9d: dashboard, profile editor, requests, onboarding

**Done:**

- **DashboardShell** (docs/design/dashboard.png): sidebar (ภาพรวม, ผลงานของฉัน + count, โปรไฟล์ของฉัน, คำขอคุย + unread badge, ที่บันทึกไว้, การเชื่อมต่อ, ตั้งค่า; คอมมูนิตี้: คนสร้าง / หา Co-founder marked "เร็ว ๆ นี้" until 9c), user card with theme / language / sign-out; a scroll row below `lg`. A user without a username is sent to /onboarding.
- **Overview:** greeting + weekly visits, "ดูโปรไฟล์สาธารณะ ↗", "+ เพิ่มผลงาน"; setup checklist (6 items computed from data, next item highlighted, hidden when done); "ผลงานของฉัน" table (visitors 7 days, MRR rank, MRR, edit / copy link / view) with the amber "เชื่อมต่อเพื่อขึ้นกระดาน…" banner on unverified rows; add / claim tiles (claim = "เร็ว ๆ นี้"); requests preview (accept / skip) + profile 7-day stats (views, requests; no search-impressions stat).
- **Profile editor** (/dashboard/profile): basics with live username check, status + looking-for, SkillPicker (≤ 20, ≤ 3 superpowers), experience, pinned works (≤ 6), social links (https only), private contacts; ↑/↓ reordering instead of drag; one sticky save bar.
- **Requests inbox** (accept / skip / block, withdraw sent, contacts revealed after accept, marks notifications read), **Connections** (followers / following), **Settings** (per-field visibility, directory opt-out, delete-account by email), **Saved** (honest placeholder: no bookmarks table yet), **Onboarding** (username → headline + province → status → skills, skippable).
- Server actions validate input against the same vocabularies as the DB trigger (`lib/profile.ts`, `lib/config/skills.ts`) and write through the user's own RLS client; the owner's full profile row is read with the service role filtered by the session's user id. The old startup cards moved to /dashboard/startups.

**Files:** `src/app/[locale]/dashboard/{layout,page}.tsx`, `src/app/[locale]/dashboard/{startups,profile,requests,saved,connections,settings}/page.tsx`, `src/app/[locale]/onboarding/page.tsx`, `src/components/dashboard/*`, `src/components/profile-edit/*`, `src/app/actions/profile.ts`, `src/lib/data/me.ts`, `src/lib/profile{,.test}.ts`, `src/lib/config/{skills.ts,config.test.ts}`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 200/200 (skills / reserved handles / looking-for vocabularies match the migration; handle rules, social link normalising, looking-for cleaning, checklist) · typecheck ✓ · lint ✓ · build ✓
- Production (owner's session, read-only): /th/dashboard redirects to /th/onboarding; the username step suggests "chawankorn_bouraphan" and the live check says it's available. Signed out, /th/dashboard → /th/login?next=…
- **Not verified:** the dashboard pages after onboarding, the editor's saves, the requests flow in the UI (local sign-in isn't possible here; the owner completes onboarding first). The DB side of every write is covered by RLS smoke 63/63.

**Next:** owner completes onboarding and tries the dashboard; then Phase 9b (public profile /u/[username] + /@username rewrite, profile views, follow, contact modal, report)

## 2026-10-01 — /privacy published, live visitors on in production, notifications + heartbeat applied

**Done:**

- **/privacy (owner approved the wording, contact chawankornbouraphan@gmail.com, dated October 1, 2026):** TH + EN from `docs/privacy-draft.md`, content in `messages/*.json` (Privacy.sections), §5 carries the live-map opt-out switch; the home map's "ไม่ระบุตัวตน" note links to `/privacy#live`. Footer "นโยบายความเป็นส่วนตัว" no longer 404s.
- **Phase 8 switched on in production:** `LIVE_ENABLED` now defaults to on; `NEXT_PUBLIC_LIVE_VISITORS=0` in Vercel turns it off without a deploy.
- **Applied (user: "apply"):** `notifications_live_pings`: in-app notifications written by contact-request triggers (received → recipient; accepted → both), owner-only RLS (mark read / delete); `live_pings` heartbeat table, server-only, pruned after 10 minutes. Types regenerated.
- **BizModel.md** (owner's business model) committed; its pre-launch checklist added to Project.md §7.

**Files:** `src/app/[locale]/privacy/page.tsx`, `src/components/live/{LiveOptOutControl,LiveVisitorsSection}.tsx`, `src/lib/live/identity.ts`, `messages/*.json`, `supabase/migrations/20261001024252_notifications_live_pings.sql`, `supabase/tests/rls_smoke.sql` (T58–T63), `src/lib/supabase/database.types.ts`, `Design.md`, `Project.md`, `BizModel.md`
**Verified:**

- RLS smoke **63/63** (new: recipient notified on request, both sides on accept, B can't read A's notifications, B marks own read, B can't change a notification's kind, clients can't read live_pings). Advisors: nothing new.
- Browser: /th/privacy (9 sections, mailto link) at desktop; /en/privacy#live at 375 (no horizontal scroll), opt-out switch toggles both ways.
- typecheck ✓ · lint ✓ · tests ✓ · build ✓ (see the deploy check below for production).

**Next:** Phase 9d (dashboard, profile editor, onboarding)

## 2026-10-01 — Phase 9a applied; production outage fixed; Olympics v3 (Claude Design); Phase 8 live visitors (off in prod)

**Done:**

- **Phase 9a applied (user: "apply"):** `builder_profiles`. The first attempt failed safely (PL/pgSQL ends an IF condition at the first THEN inside a CASE; fixed by assigning the CASE to a variable; nothing had been applied). Advisors then flagged the masked-read functions as browser-callable SECURITY DEFINER (WARN 0028/0029) → `profile_rpc_hardening`: get_profile / profile_activity are server-only (service role + explicit viewer id), get_my_profile dropped, handle_available is SECURITY INVOKER, 3 FK indexes. Types regenerated with the Supabase CLI.
- **Production outage (caused by the migration, fixed):** `startup_members` added a second startups↔profiles path, so the `owner:profiles(...)` embed became ambiguous (PGRST201) and `/startups` returned 500 (ISR pages kept serving cached copies). Fix: name the FK (`profiles!startups_owner_id_fkey`); deployed; all key pages 200. Lesson: a migration that adds a join table between two embedded tables must re-check every PostgREST embed.
- **Olympics v3 (user: review Claude Design frame 149:7635 as PM/marketer/designer):** adopted its structure: season metric รายได้ 30 วัน, ▲/▼ rank movement and growth vs the previous 30 days, "จังหวัดของคุณ" bar with the gap to the next rank, podium cards with the top project, dense expandable table with province search, "มาแรงเดือนนี้", share card (download image + copy link), "นับคะแนนยังไง". Kept open-spot podium places and the region map (now in the region card). Ranking is computed in TypeScript (the v1 SQL function has no 30-day metric).
- **Phase 8 live visitors (user decisions applied):** one Supabase Realtime presence channel, connected only while the tab is visible; identities from fixed word lists (EN/TH) + DiceBear notionists avatars (CC0) generated locally; Vercel edge geo → country, nearest province (77 capital-city centre points added to config), coordinates rounded + jittered; every received payload validated; home section (Thailand pins, world map via MapLibre + OpenFreeMap on demand, count + countries/devices/pages, 4-event feed, ×, opt-out "ไม่แสดงตัวฉัน"); "n คนกำลังดูผลงานนี้" pill; heartbeat `/api/live/ping` + cached `/api/live/count` fallback. **Off in production** (`LIVE_ENABLED`) until /privacy is approved.
- **Drafted, not applied:** `notifications_live_pings` (notifications written by contact-request triggers, email-ready via `email_sent_at`; live_pings server-only with 10-minute pruning). **Privacy wording** drafted in `docs/privacy-draft.md` (TH + EN) for the user's review.

**Files:** `supabase/migrations/{20260930155147_builder_profiles,20261001021524_profile_rpc_hardening,20261001024252_notifications_live_pings}.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/supabase/database.types.ts`, `src/lib/data/startups.ts`, `src/lib/olympics{,.test}.ts`, `src/lib/my-province.ts`, `src/components/olympics/{OlympicsBoard,Podium,ShareRankCard}.tsx`, `src/app/[locale]/olympics/page.tsx`, `src/lib/live/*`, `src/components/live/*`, `src/app/api/live/*`, `src/lib/config/provinces.ts`, `src/app/[locale]/{layout,page,startup/[slug]/page}.tsx`, `messages/*.json`, `Design.md`, `docs/privacy-draft.md`
**Verified:**

- RLS smoke **57/57** (new: owner auto-founder, 4th superpower refused, bad social link refused, B can't select A's bio column / edit A's profile / read A's contacts until accepted, 1 pending per pair, sender can't accept, member can't self-confirm, owner can, owner's founder row stays, 6th request/day refused, anon can't call get_profile, server get_profile masks the hidden bio unless the viewer is the owner). Advisors: only the old leaked-password dashboard WARN.
- `npm test` 193/193 (olympics movement/gap/climbers; live identity, payload validation, geo rounding + nearest province) · typecheck ✓ · lint ✓ · build ✓
- Browser (local): Olympics v3 at 1280 dark and 375 (pick province → "#1 ใหม่ กำลังนำ", search, expand row, no horizontal scroll). Live: status live; a Node test client joined as a second visitor → count 2, pin in Chiang Mai, feed "แพนด้าสีม่วง เปิดหน้าผลงาน · เมื่อสักครู่", pill "2 คนกำลังดูผลงานนี้"; world map loads OpenFreeMap tiles; opt-out removes me (count 0) and restores. Production after the fix: /th, /th/startups, /th/olympics, /th/startup/jaopor, /th/category/ai, /th/province/mukdahan all 200.
- **Not verified:** live visitors on production (off until privacy approval); Vercel geo (no headers locally); the fallback count (needs the live_pings migration).

**Next:** user approves the privacy wording + `notifications_live_pings` SQL; then Phase 9d (dashboard, profile editor, onboarding)

## 2026-09-30 — Phase 8 + 9 briefs recorded; Phase 9a migration drafted (not applied)

**Done:**

- Appended the user's Phase 8 (live visitors) and Phase 9 (builder profiles & dashboard) briefs to `docs/SPEC.md` §10–11, as the Phase 9 brief asks.
- **Drafted, NOT applied:** `supabase/migrations/20260930155147_builder_profiles.sql`:
  - profiles: headline, bio, province, status, looking_for, social_links, show_in_directory, field_visibility (jsonb shapes checked by a trigger); `handle` = username (+ reserved words). Clients can no longer select the visibility-controlled columns: `get_profile(handle)` masks them, `get_my_profile()` returns the owner's row, `handle_available()` for the username check.
  - New tables private_contacts, profile_skills (50-skill vocabulary, ≤ 20, ≤ 3 superpowers), positions, startup_members (two-sided, owners back-filled as confirmed founders + trigger for new startups), follows, contact_requests (5/day, 1 pending per pair, block), profile_views, user_reports, build_activity; activity rollup as a private materialized view (`refresh_activity()` for the cron, `profile_activity()` to read).
  - Review fix: the two guard triggers are SECURITY INVOKER (a definer function sees `current_user` = owner, which would have skipped every client check).
- Checked Phase 8 dependencies: DiceBear notionists art is CC0 1.0 (code MIT, needs `@dicebear/core` 9), unique-names-generator MIT, maplibre-gl BSD-3, @vercel/functions Apache-2.0; OpenFreeMap `dark` style answers without a key.
- Gemini key pasted in chat again: not stored or set anywhere (user adds it in Vercel).

**Files:** `docs/SPEC.md`, `supabase/migrations/20260930155147_builder_profiles.sql` (draft)
**Verified:** SQL reviewed by hand only (not run: the user approves first). After "apply": advisors, RLS smoke with new cases (B can't read A's contacts or edit A's profile; accepted request reveals contacts; request limits; two-sided membership; hidden fields masked for anon).

**Next:** user approves the Phase 8 plan choices and the Phase 9a SQL

## 2026-09-30 — Compact categories + category pages; Olympics redesign

**Done:**

- **Categories (user: "cards too big to scan", follow TrustMRR):** one-line cards (40px icon · name + "{n} ผลงาน" · one-line description), 4/2/1 columns, centred header.
- **`/category/[slug]` (user: "mark the category topic"):** the category is the page title ("ผลงานหมวด {name}" + icon tile + "พบ {n} ผลงาน"), search + Add, 3-column cards, other categories. Every category link (categories page, footer, QuickSearch, home teaser) now opens it.
- **Olympics redesign (user: "one of our selling points"):**
  - Event hero: eyebrow "JaoPor Olympics · ฤดูกาล 2026", live stats (provinces n/77, projects, metric total), "ส่งผลงานแทนจังหวัดคุณ", "แชร์อันดับ" (share sheet or copy), big clickable map (regions lit in their colour; click filters).
  - Podium for the top 3; empty places are "ที่ว่าง" invitations.
  - Standings table from #4 (rows link to the province); open provinces grouped by region.
  - Side panel "ภาคไหนนำ" (all 6 regions, bars, n/of coverage; filters) + "จังหวัดของคุณอยู่อันดับไหน?" finder.
  - OG image for shared links: podium + map. ProvinceCard removed.
- SegmentedControl segments no longer wrap.

**Files:** `src/app/[locale]/{categories/page,category/[slug]/page,olympics/page,olympics/opengraph-image}.tsx`, `src/components/olympics/{OlympicsMap,Podium,StandingsTable,RegionStandings,ProvinceFinder,ShareBoardButton,OlympicValue}.tsx`, `src/lib/olympics{,.test}.ts`, `src/components/{SiteFooter,core/SegmentedControl,home/HomeTeasers}.tsx`, `src/components/search/*`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 182/182 (region standings + board summary) · typecheck ✓ · lint ✓ · build ✓
- Browser pane: categories 1280 dark; `/category/ecommerce` 1280, `/category/ai` 375; Olympics 1280 + 375 (no horizontal scroll, podium 2-1-3 with open places, map, region panel); OG image renders. Fixed a hydration mismatch in the map's `<title>` found during the check.
- **Not verified:** the standings table with ≥ 4 ranked provinces (only มุกดาหาร has numbers today).

**Next:** Phase 8 plan + Phase 9 plan/SQL for approval

## 2026-09-30 — Migrations applied + deployed; JaoPor counts its own visitors; spec Phase 7 home polish

**Done:**

- **Applied (user: "apply"):** `category_counts`, `stack_vocab_v2`, `province_leaderboard`. Fix before applying: the IN parameter `region` and the OUT column `region` can't share a name, so the output column is `region_slug` (types regenerated and identical to the hand edits).
- **Deployed** Phase 6 + tech stack v2 (commit 0a5972e). Production `/th/olympics` and `/th/province/mukdahan` answer 200.
- **JaoPor snippet on jaopor.vercel.app (user: "Yes"):** `<script defer src="/v.js" data-project="jaopor">` in the locale layout, production builds only (confirmed in the production HTML). Counting starts when the owner presses "เริ่มนับ" in the dashboard's traffic section (no `jaopor` connection exists yet; /api/collect ignores hits until then).
- **Phase 7 (spec 6.2):**
  - "ดูผลงานทั้งหมด {n} ชิ้น" shows the number only from 20 projects.
  - "+ เพิ่ม Startup" only in the nav and the hero. Hero sub-links are now หมวดหมู่ · โอลิมปิก · กระดานผู้นำ; the empty "recent" state and the bottom QuickSearch lost their Add buttons.
  - New HomeTeasers: "สำรวจหมวดหมู่" (8 busiest categories with counts) and "โอลิมปิกจังหวัด" (top 3 provinces, hidden while none is ranked).
  - Leaderboard empty state gets "ยืนยันตัวเลขของคุณ →".

**Files:** `supabase/migrations/20260930144541_province_leaderboard.sql`, `supabase/tests/rls_smoke.sql` (T36–T38), `src/lib/olympics{,.test}.ts`, `src/lib/supabase/database.types.ts`, `src/app/[locale]/{layout,page}.tsx`, `src/components/home/HomeTeasers.tsx`, `src/components/search/QuickSearchSection.tsx`, `src/components/LeaderboardCard.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- As anon: `province_leaderboard('revenue')` → mukdahan 0, `('commits')` → mukdahan 46, `('commits','north')` and an invalid metric → no rows; `category_counts()` → ai 1.
- Stack trigger: language/services/nocode accepted, `javascriptx` rejected (rolled back). RLS smoke **38/38** (new T36 new stack groups, T37/T38 anon calls the RPCs). Advisors: nothing new (the old leaked-password WARN is a dashboard setting).
- `npm test` 180/180 · typecheck ✓ · lint ✓ · build ✓
- Browser pane (local) home at 1280 and 375: no horizontal scroll; visible Add links = header + hero (+ footer text link); teasers render (categories chips; มุกดาหาร #1 ฿0).
- **Not verified:** home with 200 projects (layout caps: 6 cards per row, leaderboard 10 → 50, 8 chips, 3 provinces; the count appears from 20).

**Next:** user presses "เริ่มนับ" for JaoPor's own traffic; Phase 8/9 plans (parked) when the user says go

## 2026-09-30 — Spec Phase 6: Province Olympics; tech stack v2 + "ดึงจาก GitHub"

**Done:**

- **`/[locale]/olympics`** (spec 6.7):
  - Metric SegmentedControl (รายได้รวม · MRR · ผู้เข้าชม 30 วัน · Commits) + region chips. Both live in the URL (`?metric=&region=`).
  - Ranked ProvinceCards: medal/rank, 56×40 badge (hand-simplified Thailand map with the region lit; no seals), names, region chip, count, total, top 5 with share % + bar.
  - Provinces with no number collapse into "ยังไม่มีผลงานจาก {n} จังหวัด — เป็นคนแรกของจังหวัดคุณ" with chips + CTA.
- **`/[locale]/province/[slug]`:** badge + title/subtitle, Olympics rank link, 3-column cards (รายได้ 30 วัน · MRR · รวมทั้งหมด), back link, nearby provinces, 404 for unknown slugs, OG image "{จังหวัด} อันดับ #X ในโอลิมปิกจังหวัด".
- **Links:** profile stat card "📍 จังหวัด · อันดับ #X ในโอลิมปิก" (MapPin) → province page; header/footer/MobileNav "โอลิมปิก"; QuickSearch chip "โอลิมปิกจังหวัด →"; QuickSearch province results now open the province page.
- **Header:** the 5th link overflowed at 1024–1045px. Links are nowrap, แดชบอร์ด shows from `xl` (it is also in the avatar menu), tighter lg gaps.
- **Tech stack (user: "can't find JavaScript"):** +104 items (languages, more frameworks, services, no-code), grouped headers in the picker, max 20 per group. **"ดึงจาก GitHub"** button reads a **public** repo (languages, root files like vercel.json/Dockerfile/fly.toml, manifests package.json/requirements.txt/pyproject/composer/Gemfile/pubspec/go.mod) and offers the matches.
- **SQL drafted, NOT applied:** `province_leaderboard(metric, region)` and `stack_vocab_v2` (trigger allow-list for the new slugs). Until applied, the olympics use the identical TS ranking; the stack expansion must not be deployed before its migration (the trigger would reject new slugs).

**Files:** `supabase/migrations/{20260930144541_province_leaderboard,20260930143523_stack_vocab_v2}.sql` (drafts), `src/lib/olympics.ts` (+ test), `src/lib/data/startups.ts`, `src/lib/supabase/database.types.ts`, `src/app/[locale]/olympics/page.tsx`, `src/app/[locale]/province/[slug]/{page,opengraph-image}.tsx`, `src/components/olympics/*`, `src/components/{SiteHeader,SiteFooter,MobileNav,StartupCard}.tsx`, `src/components/search/*`, `src/app/[locale]/startup/[slug]/page.tsx`, `src/lib/build/github.ts`, `src/app/api/startups/[id]/detect-stack/route.ts`, `src/lib/config/{stack,glyphs}.ts`, `src/components/wizard/{StartupEditForm,vocab-options}.ts*`, `src/lib/share-palette.ts`, `messages/*.json`, `Design.md`
**Verified:**

- SQL dry run (read-only select of the function body) matches the TS ranking: revenue → มุกดาหาร #1 (JaoPor ฿0); commits incl. demo → Bangkok 2900, Chiang Mai 2140…
- Live GitHub detection: GXCB06/jaopor → Next.js, React, Tailwind CSS, Supabase, Vercel, TypeScript, JavaScript; django/djangoproject.com → Django, PostgreSQL, Redis, Stripe, Sentry, Docker, Heroku, Python…; missing repo → not public.
- `npm test` 180/180 · typecheck ✓ · lint ✓ · build ✓
- Browser pane (local): olympics at 1280 (dark + light) and 375 (no horizontal scroll); region chip → `?metric=commits&region=north` (9 provinces collapsed); metric switch keeps the region; `/province/bangkok` at 375; `/province/atlantis` → 404; profile rank link wraps at 375; OG image renders. Header row fits 1024 + 1280 in th/en.
- **Not verified:** the "ดึงจาก GitHub" button in the edit form (needs sign-in; the route and detection are tested).

**Next:** user approves `province_leaderboard`, `stack_vocab_v2` and `category_counts` SQL → apply, then deploy; Phase 7 (home polish)

## 2026-09-30 — Spec Phase 5: categories page; header fits every width; fresh pages after delete

**Done:**

- **Deleted projects still showing on home (user report):** home, leaderboard and directory are ISR pages, so after an idle period the first visitor gets the old copy (production had a 495 s-old STALE page that refreshed on the next request). Deleting now calls `revalidateDeleted(slug)`, which purges profile + home + directory in both locales. It only acts when the slug no longer exists publicly.
- **`/[locale]/categories`** (spec 6.6):
  - Breadcrumb, "สำรวจหมวดหมู่", "สำรวจผลงานใน 37 หมวดหมู่".
  - 4/2/1-column grid of all 37 categories: 48px icon box + count pill, then name + 2-line description. Cards link to `/startups?category=`.
  - Sorted by count, then config order. Zero-count cards come last and are dimmed without losing text contrast.
  - Bottom QuickSearch section.
- **Counts:** `getCategoryCounts()` uses the `category_counts()` RPC (listed, non-demo projects). Migration **drafted, not applied**; until it exists the page counts the category column (same result).
- **Nav:** "หมวดหมู่" in the header and footer + "ดูทุกหมวดหมู่ →" under the footer category list.
- **Header rework** (the new link made it overflow at 768px; EN at 360px was 8px over):
  - Nav links from `lg`.
  - New **MobileNav** menu below `lg` (สตาร์ทอัพ · หมวดหมู่ · กระดานผู้นำ · แดชบอร์ด, plus language + theme below `sm`).
  - Sign-in is an icon below `sm`; THB/USD and the language's full name only from `lg`.
- **a11y:** ProviderStrip logo tiles get `role="img"` (aria-label on a plain span was flagged).

**Files:** `supabase/migrations/20260930133313_category_counts.sql` (draft), `src/lib/supabase/database.types.ts`, `src/lib/data/startups.ts`, `src/app/[locale]/categories/page.tsx`, `src/app/actions/revalidate.ts`, `src/components/{SiteHeader,SiteFooter,MobileNav,HeaderAuth,LocaleSwitch,CurrencyToggle,ProviderStrip,DashboardActions}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- Counts equal the SQL grouped count (ai = 1, 36 × 0).
- **Lighthouse accessibility 100** on `/th/categories` and `/th`.
- Widths 360/375/640/768/1024/1280: `scrollWidth == clientWidth` everywhere (menu below lg, nav from lg). The phone menu lists 6 items.
- `npm test` 170/170 · typecheck ✓ · lint ✓ · build ✓ (categories prerendered th/en).
- Production home refreshed to the 6 remaining projects.

**Next:** user approves `category_counts` SQL; Phase 6 (province Olympics)

## 2026-09-30 — Spec Phase 4: QuickSearch + search_startups; delete/disconnect confirm fix

**Done:**

- **Delete project did nothing (user report):** `window.confirm` is blocked in the Claude app's browser and silently returned "cancel", so no request was ever sent (logs showed no DELETE). Replaced it with an in-page `useConfirm` dialog for **delete project** and **disconnect source**. Screenshot-file cleanup can no longer block the delete.
- **Migration `search_startups` applied (user-approved):** ILIKE on name/slug/tagline/description + trigram similarity on the name, wildcards escaped, security invoker (published only). Ranking: exact → prefix → verified → MRR → similarity.
- **`GET /api/search?q=&locale=`:** startups (RPC) + categories and provinces matched from `lib/config` (Thai tone marks ignored, slugs match: "mukda" → มุกดาหาร). Empty q → "ยอดนิยม". Edge-cached 30 s.
- **`QuickSearch`** (spec 6.8), in the hero (home, directory) and a new **bottom section "หาผลงานอื่นต่อ"** on home, directory and startup detail:
  - 200 ms debounce with aborted stale requests.
  - Grouped results (startups with logo, highlighted match, verified source; categories; provinces with region), plus "ดูผลลัพธ์ทั้งหมด".
  - Skeletons and a no-results line linking to /new.
  - ↑/↓/Enter/Esc/click-outside, ARIA combobox/listbox.
  - Opens upward when less than 440px is below.
  - Phones: the same element becomes a full-screen sheet (no remount, so the keyboard stays open) with scroll lock.
- **Directory:** province filter (grouped by region) + `?province=`. Text search now also matches slug and description, the same as QuickSearch.
- `SearchBar` removed; VocabCombobox shares `normalizeSearch`.
- **Gemini key:** the user pasted it in chat. I did not store it anywhere (I can't set Vercel env and don't enter keys). The user adds `GEMINI_API_KEY` in Vercel.

**Files:** `supabase/migrations/20260930102108_search_startups.sql`, `src/lib/supabase/database.types.ts`, `src/lib/data/startups.ts`, `src/lib/search-text.ts` (+ test), `src/app/api/search/route.ts`, `src/components/search/{QuickSearch,QuickSearchSection}.tsx`, `src/components/core/useConfirm.tsx`, `src/components/{DashboardActions}.tsx`, `src/components/wizard/{VerifyPanel,VocabCombobox}.tsx`, `src/app/[locale]/{page,startups/page,startup/[slug]/page}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- SQL as anon: "raan"→RaanDee POS, "saa"→MRRMafia, "%"/blank → none, max_rows respected. Advisors: nothing new.
- `npm test` 170/170 (new: normalizer, category/province matching, highlight split) · typecheck ✓ · lint ✓ · build ✓
- Browser pane (local):
  - Hero "ร้าน" → RaanDee POS / RaakaDee + category "อาหารและร้านอาหาร" with the match highlighted; ↓ + Enter opened RaanDee.
  - 375px bottom section → full-screen sheet; typing "mukda" → มุกดาหาร; tapping it → `/startups?province=mukdahan` (2 projects, filter preselected); scroll lock released; no horizontal scroll.
- **Not verified:** "พ่อ" → "เจ้าพ่อ" (no project text contains it yet; substring matching is proven by "ร้าน"); the delete dialog end-to-end (the user tries it; only the dialog/cancel path is checked).

**Next:** user adds `GEMINI_API_KEY` in Vercel and redeploys; Phase 5 (categories page)

## 2026-09-30 — Edit page redesign (user feedback), free "fill from website" helper, avatar menu; Phase 4 SQL drafted

**Done:**

- **Edit page** (user: "overwhelming, too many sections at once"):
  - Seven sections shown one at a time: ข้อมูลหลัก · ลิงก์และที่ตั้ง · เล่าเรื่องผลงาน · เทคโนโลยีและการตลาด · ภาพและวิดีโอ · ผู้ก่อตั้ง · ยืนยันตัวเลข.
  - Section nav: sticky column on desktop, scrolling chips on mobile, with completion ticks / counts.
  - "ข้อมูลครบ {pct}%" bar + next-missing link, prev/next buttons.
  - Sticky save bar showing unsaved vs saved; it saves from any section.
  - Validation errors jump to their section. Deep links (`#pricing`, `#verify-revenue`, `#screenshots`…) open the right section on load and on hash change.
- **"✨ ช่วยเติมจากเว็บไซต์"** (user wants a free API):
  - `POST /api/startups/[id]/autofill`, owner-only: reads the project's website with the SSRF guard (redirects re-checked, 1.5MB cap) + the public GitHub README.
  - Fills only **empty** fields, with a "เติมให้ n ช่อง · เลิกทำ" notice; nothing is saved until the owner saves.
  - Works with **no AI** from the page's own metadata / JSON-LD price.
  - With a **free Gemini key** (`GEMINI_API_KEY`, optional `GEMINI_MODEL`, default `gemini-2.5-flash`) it drafts tagline, description, value, problem, audience, category, stack and pricing. The prompt fences website text as untrusted data; the output is validated against the enums and DB limits.
- **Signed-in header:** one avatar button → menu (email, แดชบอร์ด, ออกจากระบบ). It used to wrap into 4 lines at 375px.
- **Phase 4 SQL drafted, NOT applied:** `supabase/migrations/20260930102108_search_startups.sql` (`search_startups(q, max_rows)`, ILIKE + pg_trgm, security invoker). Read-only dry run: "saa"→MRRMafia, "raan"/"pos"→RaanDee POS, "ร้าน"→2 hits, "%" → none (wildcards escaped).

**Files:** `src/components/wizard/{StartupEditForm,ScreenshotsManager}.tsx`, `src/components/HeaderAuth.tsx`, `src/lib/{autofill,autofill.test}.ts`, `src/lib/ai/gemini.ts`, `src/lib/env.ts`, `src/app/api/startups/[id]/autofill/route.ts`, `src/app/[locale]/dashboard/[id]/edit/page.tsx`, `.env.example`, `messages/*.json`, `Design.md`, `supabase/migrations/20260930102108_search_startups.sql` (draft)
**Verified:**

- `npm test` 166/166 (new autofill: page extraction, JSON-LD price, no-AI draft, strict model-output parsing, clamping, prompt fencing) · typecheck ✓ · lint ✓ · build ✓
- Production (browser pane, the user's session, nothing saved):
  - Sectioned edit page renders.
  - "ช่วยเติมจากเว็บไซต์" filled 2 fields from jaopor.vercel.app (no-AI mode); undo restored everything.
  - `#pricing` opens "เล่าเรื่องผลงาน"; `#founder_message` works on hash change.
  - 375px: scrollWidth = 375 (was 1126 before `min-w-0`).
  - Avatar menu shows email / dashboard / sign out.
- **Not verified:** the Gemini path (no key yet); saving from the new layout (DB path unchanged, covered by RLS smoke).

**Next:** user approves the `search_startups` SQL → Phase 4 QuickSearch UI; user optionally adds a free `GEMINI_API_KEY`

## 2026-09-30 — Spec Phase 3: share modal (6.5) + SVG badge endpoint

**Done:**

- **ShareStudio:**
  - Title "แชร์ตัวเลขที่ยืนยันแล้ว". The link copy button turns into "คัดลอกแล้ว ✓" for 2 s.
  - `SegmentedControl` tabs Badge / กราฟรายได้ / ปฏิทิน / โพสต์.
  - Colour label per tab ("สีเส้น" / "สี ฿"); calendar periods shown 12 / 6 / 3.
  - Downloads are named `{slug}-{tab}.png`.
  - The Badge tab has the embeddable SVG badge + **คัดลอกโค้ด README** (Markdown) + HTML.
- **Swatches:** the spec's 12 colours in order (blue, purple, indigo, sky, cyan, teal, emerald, lime, amber, orange, rose, pink). Old ids fall back to indigo.
- **Chart periods:** 7 / 30 days / 12 months (monthly points).
- **Card renderer:**
  - Real startup logos: `lib/og-images.ts` converts any logo, WebP included, and the cover to PNG/JPEG data URIs. This also fixes WebP logos on the OG card.
  - Badge headline: **TOTAL REVENUE** first, else the strongest verified metric.
  - The calendar is a heatmap of **"฿"/"$" glyphs** with month labels, จ./พ./ศ./อา. rows and a glyph legend. THB projects (priced in THB, or Thai without a price) show ฿ glyphs and ฿ amounts at the site's rate.
  - Chart and share series end yesterday. The chart fits the card.
- **`/api/badge/{slug}.svg`** alias (plain `/api/badge/{slug}` still works).
- **Dev-only `?demo=1`** on the share-card route to design-check with sample data (ignored in production).
- Server rendering kept instead of `html-to-image` (agreed in the Phase 0 conflict list): the download is byte-identical to the preview.

**Files:** `src/components/share/ShareStudio.tsx`, `src/app/api/share-card/[slug]/route.tsx`, `src/app/api/badge/[slug]/route.ts`, `src/lib/{share,share-card,share-palette,og-images}.ts`, `src/lib/{share,share-card}.test.ts`, `src/lib/data/startups.ts`, `src/app/[locale]/startup/[slug]/{page,opengraph-image}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 159/159 (new: README Markdown, badge headline order, currency glyph rule, swatch fallback, periods) · typecheck ✓ · lint ✓ · build ✓
- Rendered cards checked visually: badge (dark + light, ฿717.2k), chart 7/30 days (rose/purple), calendar 3/6/12 months (฿ glyphs, labels aligned).
- `/api/badge/jaopor.svg` → 200 SVG; `bad.svg.svg` and `.png` → 404.
- Browser pane: the modal shows title, 4 tabs, 12 swatches in spec order; "สี ฿" on the calendar tab; download names `demo-raandee-pos-badge.png` / `-calendar.png`; copied ✓ state for 2 s.
- **Not verified:** a README on GitHub (camo) showing the SVG badge; the clipboard in a focused real tab (the test tab was in the background).

**Next:** user checks the modal on a real project; Phase 4 (QuickSearch + `search_all` RPC, SQL shown first)

## 2026-09-30 — Phase 2 fixes from user testing: screenshot upload, drafts across language switch, custom + GitHub stack

**Done:**

- **Screenshot upload failed (user report):**
  - Cause: the storage policies' unqualified `name` inside `exists (select … from startups s …)` resolved to `startups.name`, so every upload got Storage 400.
  - Fixed by migration `fix_screenshot_storage_policies` (`objects.name`).
  - RLS smoke gained T34/T35 (owner uploads into own folder ✓, another startup's folder ✗).
- **Unsaved form lost on language switch (user report):**
  - `useSessionDraft` keeps the edit form and the wizard in sessionStorage. The key includes `updated_at` and only real changes are stored, so a draft never shows as "restored" when nothing changed.
  - A "restored · discard" notice appears.
  - The wizard also keeps step 2 + the created project, so a switch can't create a duplicate.
- **Custom tech-stack entries:** migration `stack_custom_entries` applied (user-approved); `other` group of `custom:` values. RLS smoke T32/T33.
- **Tech stack from GitHub (user idea):** the edit form offers "ตรวจพบจาก GitHub: … · เพิ่มทั้งหมด" from `build_stack` (known tools → slugs, others → custom). Without a repo there's a hint to connect GitHub.
- **Fresh pages after edits:** `revalidateStartup` server action (owner-checked) revalidates the profile in both locales + home + directory after saves and screenshot changes.

**Files:** `supabase/migrations/20260930082846_stack_custom_entries.sql`, `supabase/migrations/20260930085756_fix_screenshot_storage_policies.sql`, `supabase/tests/rls_smoke.sql`, `src/app/actions/revalidate.ts`, `src/lib/use-session-draft.ts`, `src/lib/config/{stack,display}.ts`, `src/components/wizard/{StartupEditForm,StartupWizard,ScreenshotsManager,vocab-options}.tsx`, `messages/*.json`
**Verified:**

- **RLS smoke 35/35.**
- `npm test` 155/155 · typecheck ✓ · lint ✓ · build ✓
- Production (browser pane, the user's session, test data removed afterwards):
  - A pasted 1600×1000 PNG was stored as a 12KB WebP in `45/`, kind desktop.
  - The profile shows it full width in the browser frame; the lightbox opens.
  - The OG image shows the darkened cover.
  - The TH → EN switch keeps the typed tagline with the notice; discard works.
  - Deleting the screenshot removed both the row and the file.

**Next:** Phase 3 (share modal 6.5)

## 2026-09-30 — Spec Phase 2: detail page (chart, screenshots, founder message, logo-chip insights) + form 6.9

**Done:**

- **Chart card (spec 6.4 step 3, `MetricChart` + pure `lib/chart-window.ts`):**
  - Metric (revenue / MRR / visitors, only those with data) × period (7 days / 30 days / 12 months, weekly points).
  - Period total or latest MRR, growth vs the previous period, compare (dashed) and Trend switches.
  - Per-metric source stamp ("ยืนยันผ่าน {Source} · อัปเดตล่าสุด").
  - The series ends yesterday (today is partial), days before the first snapshot are empty (not 0), and today's MRR snapshot is folded in.
  - Nothing verified → hidden for visitors, owner prompt "+ เชื่อมต่อ Stripe เพื่อแสดงกราฟ".
  - No profit-margin pill: there is no cost data.
- **Screenshots (spec 6.4 step 4, `ScreenshotGallery`):**
  - Scroll-snap carousel; desktop shots in a browser frame (16:10, 720px / 88vw), mobile/LINE in a 9:19.5 phone frame; a single desktop shot is full width.
  - Counter, ← → buttons, arrow keys, fade edges.
  - Demo video as the first slide (click → YouTube-nocookie / Loom / TikTok embed).
  - Lightbox (`<dialog>`: Esc/×/backdrop, ← → keys, swipe, caption, counter).
  - Lazy loading after 2 images. A skeleton instead of blur (no blur data stored).
- **Founder message card** (80px avatar, 18px/1.8 quote, name + role).
- **Insights bento:**
  - Value proposition full width, then 2 columns (market facts / product facts).
  - **Logo chips** from a generated glyph map (`scripts/gen-glyphs.mts` → `lib/config/glyphs.ts`, 51 Simple Icons): brand colour when it reads at 3:1, a neutral otherwise (X, Vercel, Next.js, TikTok).
  - Audience shows "~N ผู้ใช้".
- **More startups:** same category, then same province, then newest.
- **OG image:** the cover screenshot (WebP → JPEG via `sharp`, now a direct dependency) darkened behind the card.
- **Form (spec 6.9):**
  - `VocabCombobox` (searchable, keyboard, logo chips with ×): tech stack (grouped), channels (custom entries allowed), province (single, grouped by region, required when the country is Thailand).
  - Founder message counter (≤600) + role.
  - Demo video link (validated like the DB).
  - `ScreenshotsManager` in the edit page and the wizard's step 2: drag & drop / paste / click, PNG/JPG/WebP ≤ 5MB, max 8; browser resize ≤ 2400px + WebP re-encode (drops EXIF/GPS); kind auto from aspect ratio (switchable to LINE); caption; reorder by drag or ← → buttons; the first is the cover.
  - Deleting a project removes its screenshot files first.
- **a11y:** the language switch's accessible name now includes its visible text (+ `lang`). The header fits at 360px.
- **Drafted, NOT applied:** migration `stack_custom_entries` (custom tech-stack entries in an `other` group). Waiting for SQL approval.

**Files:** `src/components/{MetricChart,ProfileBlocks,LocaleSwitch,SiteHeader,DashboardActions}.tsx`, `src/components/core/LogoChip.tsx`, `src/components/profile/ScreenshotGallery.tsx`, `src/components/wizard/{VocabCombobox,ScreenshotsManager,vocab-options,StartupEditForm,StartupWizard,fields}.tsx`, `src/lib/{chart-window,media,og-cover}.ts`, `src/lib/config/{glyphs,display}.ts`, `src/lib/data/startups.ts`, `src/app/[locale]/startup/[slug]/{page,opengraph-image}.tsx`, `src/app/[locale]/dashboard/[id]/edit/page.tsx`, `scripts/gen-glyphs.mts`, `supabase/migrations/20260930082846_stack_custom_entries.sql` (draft), `messages/*.json`, `Design.md`, `tsconfig.json`; removed `RevenueChart.tsx`
**Verified:**

- `npm test` 153/153 (new: chart window math, video embeds, kind detection, resize, drift check over every vocab-trigger migration) · typecheck ✓ · lint ✓ · build ✓
- **Lighthouse accessibility 100** on `/th/startup/demo-raandee-pos`, `/th/startup/jaopor` and `/en/startup/mrrmafia`.
- Browser pane:
  - RaanDee chart: revenue 30 days, switches to visitors / 12 months ("ผู้เข้าชม · 12 เดือน").
  - RaakaDee bento with brand-coloured logo chips (light theme).
  - 360/375px: no horizontal scroll on profiles, home and directory.
- **Not verified:**
  - Owner flows need a signed-in session: uploading/reordering screenshots, the comboboxes, saving the edit form, the gallery/lightbox with real images and the OG cover.
  - Safari may not encode WebP from canvas; the form then shows a "use Chrome/Edge/Firefox" message.

**Next:** user approves `stack_custom_entries` SQL; user signs in (browser pane or own browser) to test uploads + form

## 2026-09-30 — Spec Phase 1 (part 2): migration applied, app moved to the shared configs

**Done:**

- **Migration `spec_phase1_vocab` applied (user-approved SQL).** The back-fill matched the dry run:
  - Provinces: 6/6 → slugs.
  - Stack: to jsonb (`Prisma` and `LINE Messaging API` dropped, demo rows).
  - Channels: to slugs (`custom:App Store optimization`).
  - Pricing: MRRMafia → ฿990/month.
- **Types:** `database.types.ts` updated with `provinces`, `fx_rates`, `startup_screenshots`, structured pricing, `demo_video_url`, `founder_role` and jsonb `tech_stack`.
- **One source of truth:**
  - `lib/catalog.ts` re-exports categories and AI tools from `lib/config`.
  - Category and tool names come from config, so `messages Catalog.category|tool` were removed.
  - Updated: directory filters (37 categories), footer, cards, profile, `/new` wizard and `AiToolChips`.
- **Edit form:**
  - Province select grouped by region (Thailand only).
  - Structured pricing (period → amount + currency) plus a note.
  - Tech stack as grouped toggle chips.
  - Channel chips plus custom channels.
  - Founder message up to 600.
- **Profile:** province name (not the slug), "฿990 / เดือน" + note, grouped stack chips, channel labels. The dashboard completeness count uses the new fields.
- **Other:**
  - `lib/config/display.ts` (read-side helpers) and `lib/pricing.ts`.
  - `supabase/demo_projects.sql` uses the new column shapes.

**Files:** `supabase/migrations/20260930052136_spec_phase1_vocab.sql` (applied), `supabase/tests/rls_smoke.sql`, `supabase/demo_projects.sql`, `src/lib/supabase/database.types.ts`, `src/lib/{catalog,pricing}.ts`, `src/lib/config/display.ts`, `src/components/wizard/{StartupEditForm,StartupWizard,fields}.tsx`, `src/components/{ProfileBlocks,StartupCard,SiteFooter,AiToolChips}.tsx`, `src/app/[locale]/{startups,dashboard,startup/[slug]}/page.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- Advisors: nothing new (known leaked-password WARN; INFO: new indexes unused yet).
- **RLS smoke 31/31**, new checks:
  - T19 an owner saves stack/province/channels/pricing through the private-schema trigger.
  - T20 unknown stack slug, T21 unknown channel and T22 unknown province are rejected.
  - T23–T25: 8 screenshots OK, a 9th and a foreign-folder path are rejected.
  - T26/T27: `fx_rates` and `provinces` are read-only.
  - T28/T29: another user can't add to or edit someone's screenshots.
  - T30/T31: anon reads screenshots and 77 provinces.
- `npm test` 143/143 · `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓
- Browser pane (local):
  - Demo profile: "กรุงเทพมหานคร, ไทย", stack grouped (Frontend / แอป: Swift, SwiftUI · รับชำระเงิน: RevenueCat), channel labels.
  - `/en/startup/mrrmafia`: "฿990 / month", "Mukdahan, Thailand".
  - `/th/startups`: 37 categories, `?category=mobile` finds 1, footer categories from config.
- **Not verified:** the edit form in a browser (needs a signed-in owner) and saving from it; the DB side is covered by T19–T22.

**Next:** user signs in and edits a project (province, pricing, stack, channels); then Phase 2 (detail page: chart card, screenshots, founder message, logo chips; form 6.9)

## 2026-09-30 — Spec Phase 1 (part 1): shared configs + migration drafted, waiting for SQL approval

**Done:**

- **`src/lib/config/`:**
  - `categories.ts`: 37 categories with Thai/English names, descriptions and lucide icons. The existing `mobile` slug is kept; the spec says `mobile-apps`.
  - `provinces.ts`: 77 provinces and 6 regions with region colour tokens, plus `matchProvince()`.
  - `stack.ts`: 6 stored groups plus built_with (= `AI_TOOLS`), `isValidTechStack()` and `matchStackLabel()`.
  - `channels.ts`: 26 channels plus `custom:` entries.
  - `localized.ts`.
  - Brand logos use Simple Icons slugs, from the new `simple-icons` dependency (CC0). Missing brands (AWS, OpenAI, Lovable, LinkedIn, Omise, 2C2P, PromptPay, Pantip, Blockdit, Codex, Bolt) fall back to lucide icons.
- **Migration file `20260930052136_spec_phase1_vocab.sql` (NOT applied):**
  - Changes: categories to 37; `provinces` table with the `startups.province` slug FK; `tech_stack` to jsonb; channel slugs; structured pricing; `demo_video_url`/`founder_role`/`founder_message ≤ 600`; `startup_screenshots` + `screenshots` bucket; `fx_rates`; `pg_trgm` indexes.
  - The value lists are generated from the config files. `config.test.ts` fails if they drift.
- **Region colours:** `--region-*` tokens are in `globals.css` and Design.md, validated for every pair of bordering regions.
- **Back-fill dry run** (read-only SQL on live data):
  - Provinces: 6/6 matched.
  - Stack labels: all mapped except `Prisma` and `LINE Messaging API` (demo rows).
  - Channels: all mapped except `App Store optimization` → `custom:`.
  - Pricing: `mrrmafia` "990" → ฿990/month.
  - Postgres strips Thai tone marks when normalizing, so the TypeScript now does too.

**Files:** `src/lib/config/*`, `supabase/migrations/20260930052136_spec_phase1_vocab.sql`, `src/app/globals.css`, `Design.md`, `package.json`
**Verified:** `npm test` 143/143 (new: 77 provinces, region counts 9/20/22/7/5/14, unique slugs, Simple Icons slugs exist, matchers, migration ↔ config drift checks) · `npm run typecheck` ✓ · `npm run lint` ✓
**Next:** user approves the SQL → apply via MCP, advisors, RLS smoke (+ screenshots/fx/provinces checks), regenerate types, then move the app to the new columns (form, profile, filters, footer from config)

## 2026-09-30 — Phase 0 follow-ups: Facebook preview, blue-tile logo everywhere, Supabase URLs

**Done:**

- **Facebook showed no preview:**
  - The home page (and every page except profiles) had no Open Graph tags at all.
  - Added a site-wide OG card (`[locale]/opengraph-image.tsx`: tile, JaoPor, headline, host) and layout `openGraph` + `twitter:card`.
  - Profiles now send `og:description` (tagline, or the start of the description), `og:url`, `og:site_name`, `og:locale` and a canonical URL.
  - Removed an inherited `og:url` that would have made every page share as the home page.
  - Demo projects no longer put sample MRR in the page title.
- **Logo (user decision):**
  - The blue app tile is the mark everywhere again: tab icon (`icon.png`/`favicon.ico`/`apple-icon.png` restored), header, footer, login, OG card, share cards and SVG badge.
  - `<Logo>` renders the tile. The renderers inline it as a data URI (`lib/logo.ts`); the badge CSP allows `img-src data:`.
  - Removed the spec SVG mark and its files.
- **Supabase Auth URL configuration** (browser pane, with the user signed in):
  - The Site URL was set to the callback path; it's now `https://jaopor.vercel.app`.
  - Added `https://jaopor.vercel.app/api/auth/callback` to the redirect allow-list.
  - The GitHub OAuth app was updated by the user.

**Files:** `src/app/[locale]/{layout,opengraph-image}.tsx`, `src/app/[locale]/startup/[slug]/{page,opengraph-image}.tsx`, `src/app/api/{badge,share-card}/[slug]/*`, `src/components/{Logo,BrandLogo}.tsx`, `src/lib/{logo,share-palette}.ts`, `src/app/{icon.png,apple-icon.png,favicon.ico}`, `public/icon-{192,512}.png`, `src/assets/jaopor-tile-64.png`, `Design.md`
**Verified:**

- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm test` 129/129 ✓ · `npm run build` ✓
- Local, with the Facebook user agent: `/th`, `/en/startups` and profiles all return og:title/description/image/site_name/type.
- The home OG card, profile OG card, share card and badge render with the tile.
- Browser pane: the header shows the tile; the icon links point to `icon.png`/`favicon.ico`/`apple-icon.png`.
- Supabase dashboard shows the new Site URL and 3 redirect URLs.
- **Not verified:** sign-in end-to-end on production; Facebook's own scrape (it caches the first scrape, so the user re-scrapes via the Sharing Debugger).

**Next:** the user re-scrapes in the Facebook Sharing Debugger and tries sign-in; Phase 1 (configs + migration SQL for approval)

## 2026-09-30 — Spec Phase 0: fixes & foundation (theme bug, domain, tokens, core components, empty states, Rising Fedora logo)

**Done:**

- **Spec:** `docs/SPEC.md` is the source of truth. `docs/design/{profile,dashboard}.png` are rendered from the user's HTML mockups (for Phase 9).
- **Theme reset on language switch (user bug):**
  - The theme is now `<html data-theme>`, set by the head script. Dark is the CSS default, via `:root:not([data-theme="light"])` and the `dark:` variant.
  - `PrefsSync` re-applies theme and currency in a layout effect when the `[locale]` layout remounts.
- **Domain (spec 6.1):**
  - `publicEnv.siteUrl` now prefers Vercel's `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` over the hand-set, stale `NEXT_PUBLIC_SITE_URL`.
  - This fixes `metadataBase`, OG/share URLs and the JaoPor snippet code shown in VerifyPanel, which pointed at the dead `mrr-mafia.vercel.app`.
- **Tokens (spec 2.1):**
  - Dark values adopted: bg `#0a0a0b`, text `#ededed`, muted `#a1a1a6`, subtle `#8a8a8f`, accent `#6e6cf3`, positive/negative/warning `#22c55e`/`#ef4444`/`#f59e0b`, popover `#1e1e20`, input `#3a3a40`.
  - New tokens: `surface-2`, `border-strong`, and `brand-text` (`#8280f6`, because `#6e6cf3` text is 4.47:1 on cards, under AA).
  - The chart pair was re-validated.
  - The image renderers' palette was synced.
- **Core components (spec 2.2, `src/components/core/`):** Card, SegmentedControl (ShareStudio uses it), InsightCard (40px icon box), VerifiedBadge (next to the profile name) and Medal (replaces the 🥇🥈🥉 emoji). StatTile → StatCard on Card.
- **Format utils (spec 2.3):** `formatMoney` / `formatCompact` (`$1.2k`, `3.6M`) / `formatPct` (`↑ 19%`) / `formatMultiple` (`1.9x`). The existing `money*` helpers now build on them, and GrowthValue uses `formatPct`.
- **Empty-state rule (spec 2.4) on the detail page:**
  - Visitors see only data. There are no "–" or "ยังไม่ได้เพิ่ม" walls.
  - Unverified revenue/MRR collapse into one muted `UnverifiedLine`.
  - "Founded" without a date is labelled as the location.
  - The owner sees dashed `EmptyOwnerCard` prompts that deep-link to the editor. Fully empty sections are owner-only.
- **Rising Fedora logo (spec §3):**
  - `<Logo size variant="full|mark|mono">` with paths in `lib/logo.ts`, used by the header, footer, login, OG, share cards and badge.
  - Generated `public/logo.svg`, `logo-mono.svg`, `icon-192/512.png`, `logo-mono-512.png`, `src/app/icon.svg`, `favicon.ico` (16/32/48) and `apple-icon.png`. The mascot stays in the hero pill.
- **Duplicate filter panel (spec 6.3):** `/startups` renders one form. A CSS-only checkbox opens it below `lg`, with no JS.
- **375px:** the header gaps are tighter on mobile, and the provider-strip tooltips are `hidden` until hover. Together these removed 25px/15px of horizontal overflow on every page.

**Files:** `docs/SPEC.md`, `docs/design/*.png`, `src/app/globals.css`, `src/lib/{theme,theme-script,public-env,format,logo,share-palette}.ts`, `src/lib/{public-env,format}.test.ts`, `src/components/{PrefsSync,Logo,BrandLogo,SiteHeader,ProviderStrip,ProfileBlocks,StartupBits,LeaderboardCard}.tsx`, `src/components/core/*`, `src/components/profile/{Owner,ProjectBlocks}.tsx`, `src/components/share/ShareStudio.tsx`, `src/app/[locale]/{layout,startup/[slug]/page,startup/[slug]/opengraph-image,startups/page,dashboard/page}.tsx`, `src/app/api/{badge,share-card}/[slug]/*`, `src/app/{icon.svg,favicon.ico,apple-icon.png}`, `public/{logo,logo-mono}.svg`, `public/icon-*.png`, `messages/*.json`, `Design.md`
**Verified:**

- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm test` ✓ (new: `resolveSiteUrl` prefers the production domain; `formatCompact`/`formatMoney`/`formatPct`/`formatMultiple`) · `npm run build` ✓ (the first run hit a transient Supabase 500 while prerendering `/th`; the rerun passed)
- Browser pane:
  - With the light theme stored, TH → EN → TH keeps `data-theme=light` and a white background; the currency is kept too.
  - `/startups` has 1 filter form and 1 Apply button; the mobile toggle opens it.
  - `/th/startup/jaopor` as a visitor shows no "–"; the unverified line and "ที่ตั้ง ไทย" are correct.
  - The demo profile shows all data and InsightCards with icon boxes.
  - Leaderboard medals show in light mode.
- 375px: `scrollWidth` = 375 on `/th`, `/th/startups`, `/en/startups`, `/th/login`, `/th/dashboard` and both profiles.
- The icons are served (`icon.svg`, `favicon.ico` 16/32/48, `apple-icon.png`). The OG image and badge render the new mark.
- **Not verified:** owner-side `EmptyOwnerCard`s while signed in (login is still blocked on the Supabase URL config).
- **Production after deploy:** `og:image` on `jaopor.vercel.app` now points at `https://jaopor.vercel.app/...` (was `mrr-mafia.vercel.app`); `/icon.svg` is served.

**Next:** the user checks Phase 0, then Phase 1 (shared configs + migrations, SQL shown first)

## 2026-09-30 — Visitors without Plausible: JaoPor snippet + Cloudflare; GitHub stack detection

**Done:**

- **JaoPor snippet** (visitors for any host: Vercel, Netlify, GitHub Pages…):
  - `public/v.js` sends one `sendBeacon` per page load to `POST /api/collect`.
  - A visit counts only if it comes from the project's own website (Origin/Referer must match the website domain) and isn't a bot.
  - Visitors are stored as two day-scoped HMACs in `pixel_visitors`: no cookie, no IP. There's a cap of 20 visitors per network per project per day.
  - The first accepted visit turns the connection from `pending` into `active` and records the "since" date.
  - The daily cron (or Refresh) rolls the hashes up into `traffic_snapshots`, then deletes finished days.
- **Cloudflare Web Analytics connector** (`src/lib/traffic/cloudflare.ts`):
  - Needs a token with only _Account Analytics: Read_. It must be active, and its probes for zones, Workers and account settings must not succeed; unexpected answers fail closed.
  - The GraphQL query is filtered to the project's host, which proves the numbers belong to the project.
  - Numbers are labelled "visits".
- **GitHub tech-stack detection:** `detectStack` reads languages + `package.json` and fills a new server-only `build_stack`. The profile's Tech stack card shows it as "Detected from GitHub" only when the owner's own list is empty.
- **UI:**
  - VerifyPanel Visitors group: JaoPor snippet (default; copy box + waiting/counting status) | Plausible | Umami | Cloudflare.
  - Profile captions "Counted by JaoPor" / "Verified via Cloudflare · counted as visits".
  - Cloudflare logo added to the provider strip.
  - The header "+ Add Startup" no longer wraps.
- **Migration `traffic_snippet_cloudflare_stack`:** new provider ids, `pending` status, one-traffic index, `build_stack`, `pixel_visitors` (RLS on, no client grants).

**Files:** `supabase/migrations/20260930025711_traffic_snippet_cloudflare_stack.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/traffic/{pixel,cloudflare,traffic-sources.test}.ts`, `src/lib/build/github.ts`, `src/lib/sources/{catalog,sync}.ts`, `src/app/api/collect/route.ts`, `public/v.js`, `src/components/wizard/VerifyPanel.tsx`, `src/components/{ProfileBlocks,ProviderStrip,SiteHeader}.tsx`, `src/components/profile/ProjectBlocks.tsx`, `src/lib/{brand-icons,data/connections}.ts`, `messages/*.json`, `Design.md`
**Verified:**

- RLS smoke **18/18**: T17 founders can't write `pixel_visitors`; T18 can't write `build_stack`.
- Advisors show INFO only (plus the known leaked-password WARN). Types updated.
- `npm test` 124/124. New tests: bot filter, origin match, network prefix, day-scoped hashes, Cloudflare (accept analytics-only, reject zones/Workers access, fail closed, inactive token, host-filtered query, no data, permission error), `stackFrom`, rollup math.
- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓
- Browser pane (local): the QA profile shows detected stack chips with "Detected from GitHub".
- `/v.js` is served. `/api/collect` always answers 204.
- **Production (jaopor.vercel.app), temporary QA project deleted afterwards:** beacons from the project origin recorded 20 visitors (all from one network, so capped at 20). Duplicates, a wrong origin and a bot user agent were ignored. The connection went pending → active with `since` set and `traffic_provider` = jaopor. Only 32-byte hashes are stored.
- **Not verified yet:** the daily rollup into `visitors_30d` (needs the cron secret; runs with the next Vercel cron; the math is unit-tested), a real Cloudflare token, and the VerifyPanel while signed in.

**Next:** the user adds the snippet to a real site from the edit page and checks the Visitors tile after the next daily sync

## 2026-09-30 — THB/USD switch, grid card rows, demo logos, login 404 diagnosis

**Done:**

- **Currency switch ฿ THB / $ USD:**
  - Header toggle, remembered in `localStorage`. Thai pages default to THB, English pages to USD.
  - The server renders both values (`<Money>`) and a `<head>` script + CSS shows one, so there's no flash and pages stay ISR.
  - The rate is the ECB rate via Frankfurter, cached 6 h. If the rate is unavailable, only USD is shown.
  - Covers cards, leaderboard, profile tiles, chart (headline, axis, tooltip) and dashboard. Share images, OG and the badge stay USD.
- **Home "Recently added" / "Top traction"** are a plain grid now (2 → 3 → 5 columns), no horizontal sliding.
- **Each demo project has its own logo:** Lucide icons (ISC) on coloured tiles, bundled in `public/demo-logos/`. `logoUrl()` accepts only `demo-logos/<name>.png` besides Storage paths; the OG card gets the absolute URL.
- **Login 404 diagnosed:** the site now runs at `https://jaopor.vercel.app`, but Supabase's Site URL/redirect allow-list and Vercel's `NEXT_PUBLIC_SITE_URL` still point at the deleted `mrr-mafia.vercel.app`, so OAuth falls back to the dead domain. The fix is in the dashboards (steps given to the user); OG/share URLs are wrong for the same reason.

**Files:** `src/lib/{currency,currency-script,format}.ts`, `src/lib/data/fx.ts`, `src/components/{CurrencyToggle,StartupBits,StartupCard,LeaderboardCard,RevenueChart,SiteHeader}.tsx`, `src/app/[locale]/{layout,page}.tsx`, `src/app/[locale]/{startup/[slug],startups,dashboard}/page.tsx`, `src/lib/supabase/public.ts`, `public/demo-logos/*`, `supabase/demo_projects.sql`, `Design.md`, `messages/*.json`
**Verified:**

- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm test` 108/108 ✓ (new `format.test.ts`: USD compact/full, THB conversion, no-rate fallback)
- Headless Chrome, 1280px dark: `/th` shows ฿ everywhere (e.g. ฿62,003 MRR, ฿114,621) with the grid rows and demo logos; `/en` demo profile shows $ with the chart and the sample-data line.
- Production checks: `jaopor.vercel.app` serves the app and `/api/health` is ok; og:image still points at `mrr-mafia.vercel.app`.
- **Not verified:** the switch clicked in a real browser (the pane was closed) and a true 375px pass.

**Next:** user updates the Supabase URL configuration + Vercel `NEXT_PUBLIC_SITE_URL` to `https://jaopor.vercel.app` and redeploys, then retries sign-in

## 2026-09-30 — Real provider logos, new header/hero logos, 5 demo projects

**Done:**

- **"Numbers verified by" strip:** real logo tiles in each brand's colour, with the name on hover/focus. Stripe, RevenueCat, Plausible, Umami and GitHub are live. Lemon Squeezy, Paddle and App Store are dimmed as "coming soon", and Polar is a letter tile because it has no Simple Icons entry. Paths come from Simple Icons (CC0) in `src/lib/brand-icons.ts`.
- **Logos:**
  - Header and footer use the blue app tile + "JaoPor".
  - The hero now has a small mascot + "JaoPor" pill that links home (home and directory).
- **5 demo projects** (fictional, modelled on the project types in the Claude Thailand thread): a shop POS, a LINE calorie bot, a guesthouse system, a construction takeoff tool and a price-history app.
  - Numbers and snapshots are sample data.
  - Links go to example.com.
  - Owner is the user.
- **Demo flag (migration `demo_projects`):**
  - Adds a server-only `startups.is_demo`. Demo rows take no founding number and don't count toward the 5-per-founder limit.
  - The UI labels them "Demo" on cards and the leaderboard. Profiles show a sample-data notice and "Sample data" in place of "verified via…".
  - Share images, the badge and the OG metrics show no numbers for demo rows.
  - Seed file: `supabase/demo_projects.sql`. Removal: `delete from startups where is_demo`.

**Files:** `supabase/migrations/20260929171152_demo_projects.sql`, `supabase/demo_projects.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/brand-icons.ts`, `src/components/{ProviderStrip,BrandLogo,StartupCard,StartupBits,LeaderboardCard,ProfileBlocks}.tsx`, `src/components/profile/ProjectBlocks.tsx`, `src/lib/share.ts`, `src/app/api/share-card/[slug]/route.tsx`, `public/brand/*`, `messages/*.json`, `Design.md`
**Verified:**

- Migration applied via MCP. RLS smoke **16/16**; new T16 checks that a founder can't set `is_demo`. Advisors show only the 2 known items. Types updated.
- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm test` 104/104 ✓ (new: a demo project shows no share numbers)
- Seed inserted 5 projects, 240 revenue days and 480 traffic days.
- Headless Chrome, 1280px dark, TH + EN: home (logos, demo tags, leaderboard) and a demo profile (notice, chart, sample captions).
- `/api/badge/demo-raandee-pos` shows "On JaoPor: listed".
- **Not verified:** a true 375px check. The browser pane was closed and headless Chrome's minimum width is ~500px.

**Next:** user reviews; delete the demo rows before or soon after launch (`delete from public.startups where is_demo;`); production domain still to be re-added in Vercel

## 2026-09-30 — New JaoPor mascot logo (hero) + blue app tile (tab icon)

**Done:**

- The user's mascot (a winking fedora with a rising chart line, a star and a thumbs-up; the image has no name text) replaces the small brand pill above the home headline. It's trimmed and saved at 512px: `public/brand/jaopor-mascot.webp`.
- The blue app tile is now the browser tab and home-screen icon (`src/app/icon.png` 512, `apple-icon.png` 180, `favicon.ico` 16–64). The source had a painted-in checkerboard, so it was cropped to the tile and its corners made transparent.

**Files:** `src/app/[locale]/page.tsx`, `src/app/{icon.png,apple-icon.png,favicon.ico}`, `public/brand/*`, `Design.md`
**Verified:**

- `npm run typecheck` ✓, eslint ✓
- The page `<head>` links the icon, favicon and apple-touch-icon.
- Hero screenshots: 1280px dark (headless Chrome) and 375px light (pane).
- In light theme the white hat is low-contrast on the white page.

**Next:** decide whether the header/footer/OG should switch from the fedora `BrandMark` to the new tile; maybe an outlined mascot for the light theme; re-add a production domain in Vercel (the user removed `mrr-mafia.vercel.app`)

## 2026-09-29 — UI v2: Figma redesign + ledgerly functional patterns

**Done:**

- **Design system v2 from the user's Figma file** (Homescreen, Marketplace, Startup profile, Share button). Changes:
  - zinc palette measured from Figma (`#09090b` page, `#141416` cards, `#26262a` borders) plus a new `--faint` token
  - **JetBrains Mono** and the Figma type steps (`text-3xs/2xs/caption/body`)
  - indigo accent (was crimson)
  - chart colours re-validated with the dataviz validator: all checks pass on dark (`#141416`) and on light (`#ffffff`)
  - Design.md rewritten first
- **Functional patterns from ledgerly-4156.ai.studio:**
  - sticky header: Startups · Leaderboard · Dashboard, a search trigger with a global `/` shortcut, primary "+ Add"
  - leaderboard card with a metric switch (MRR · Revenue 30d · Visitors · Commits): 10 rows, then "Show all"
  - directory filter sidebar (category, AI tool, project type, looking for, verified) and sort (Top MRR, Most visitors, Most commits, Newest)
- **Pages rebuilt:**
  - Home: brand-pill hero, provider tiles, search, "Recently added" and "Top traction" rows (5 across), leaderboard.
  - Profile: breadcrumb; header with 72px logo, Share and Visit; 4 stat tiles incl. founder and founded; revenue chart card (7/30/60-day range, compare and trend switches); centred verified line; insights bento with icons; "More startups" grid.
  - `/startups`
- **ShareStudio** (the Figma share dialog) replaces the old share dialog and dropdown:
  - link + Copy; tabs Badge / Chart / Calendar / Post; theme, period, 12 colour swatches; server-rendered preview + Download
  - new image route `/api/share-card/[slug]` (next/og): verified numbers only; every query parameter is checked against a fixed list, and colours are swatch ids, never caller-supplied values
  - OG card and SVG badge moved to the shared indigo/zinc palette (`src/lib/share-palette.ts`)
- Footer credit is now "สร้างด้วย JaoPor.dev ในประเทศไทย" / "Built with JaoPor.dev in Thailand".
- Fixed `cn()`: the custom font-size steps were being dropped when merged with colour classes.

**Files:** `Design.md`, `src/app/globals.css`, `src/app/[locale]/{layout,page}.tsx`, `src/app/[locale]/startup/[slug]/page.tsx`, `src/app/[locale]/startups/page.tsx`, `src/app/api/share-card/[slug]/route.tsx`, `src/components/{SiteHeader,SearchShortcut,SearchBar,ProviderStrip,StartupCard,StartupBits,LeaderboardCard,ProfileBlocks,RevenueChart,SiteFooter}.tsx`, `src/components/share/ShareStudio.tsx`, `src/lib/{share-card,share-palette,utils}.ts`, `src/lib/data/startups.ts`, `messages/*.json`
**Verified:**

- Automated checks, all passing:
  - `npm run typecheck`, `npm run lint`
  - `npm test` 103/103; the new `share-card.test.ts` covers query validation (incl. rejected raw colours), monthly buckets, chart paths, heat levels and week columns
  - `npm run build`; the fonts are traced into the share-card route
  - TH/EN keys identical
- Desktop 1280px, dark (headless Chrome screenshots): home, profile and directory, compared against the Figma frames.
- Pane at 375px, light theme: home, profile and directory, with no horizontal scroll.
- ShareStudio: opens, switches tabs, the chart preview loads (1200px PNG), the Download link is set. All three card kinds render (badge light; chart dark/teal/90d; calendar light/12 months).
- Checked with a temporary QA project inserted into the remote DB (verified Stripe revenue, Plausible and GitHub numbers, 365 days of snapshots) and **deleted afterwards**.
- **Not verified:** owner-only views (edit page, VerifyPanel, dashboard) in the new style while signed in. The wizard and editor were only restyled through tokens.

**Next:**

- User reviews the redesign.
- The Figma MCP hit its Starter-plan call limit, so the Marketplace frame's details came from its screenshot.
- Decide whether to vendor JetBrains Mono for the OG and share images (they still use Inconsolata).
- Then block F (trust pages) + `/security-review`.

## 2026-09-29 — JaoPor: repositioning, light/dark, any project type, verified traction, share kit

**Done:**

- **Research:** re-studied the Claude Thailand "อวดโปรเจค 1 คน + claude" thread logged in (102 threads, names never recorded). Findings: traction told in users/visitors/commits more than MRR; many LINE OA bots and mobile apps; many "ขอ feedback / อยากได้ผู้ใช้" asks. The community already hand-builds indexes of the thread; saasthai.com has no verified numbers. → `docs/research/fb-showoff-thread-and-metrics.md` §2b; direction adopted (Project.md §1, §6).
- **Rename to JaoPor (เจ้าพ่อ)** + headline "1 คน + AI พีคได้แค่ไหน / ดูผลงานจริง ตัวเลขจริง", showcase-first copy, founding badge "เจ้าพ่อรุ่นบุกเบิก #n". Infra keeps the `mrrmafia` names.
- **Light/dark theme:** dark default, header ThemeToggle, no-flash head script + localStorage (no next-themes); semantic `positive/negative/warning` tokens replace raw emerald/red/amber; chart colours validated on light (dataviz validator: all pass).
- **Any project type** (migration `projects_links_traction`): website OR App Store / Play / LINE OA (`@id` works) / GitHub, auto-detected from one pasted link; `looking_for` asks; `build_story`; "Claude (chat)" tool.
- **Verified traction sources** (`src/lib/sources`): RevenueCat (charts-only v2 key; customers/apps probes must be 403), Plausible (Stats key; Sites API refused; domain must match the website), Umami (view-only share link via an SSRF-guarded fetch), GitHub build proof (public repo owned by the signed-in GitHub login; commits, first commit, % co-authored by Claude, stars). One source per kind; new generic API `/api/startups/:id/sources/:source`; cron syncs every source. VerifyPanel replaces the Stripe-only form.
- **Profile/cards:** ProjectLinks, LookingForBanner, "ตัวเลขที่ยืนยันแล้ว" tiles (lead the page when revenue is unverified), build story; cards show visitors/commits and the first ask.
- **Share kit (block E):** per-project OG image (Thai font vendored, verified numbers only), SVG badge `/api/badge/:slug` (dark/light), ShareMenu, post-listing/verify ShareDialog with a ready-to-paste post for the thread.
- Docs: Design.md (theme, tokens, ProjectLinks, LookingForBanner, VerifyPanel, TractionTiles, §9 share kit), CLAUDE.md, launch plan (new post + consent-only seeding), `/add-payment-provider` skill rewritten for the sources engine, `.env.example` (optional `GITHUB_TOKEN`).

**Files:** `supabase/migrations/20260929125125_projects_links_traction.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/{links,share,theme,theme-script}.ts`, `src/lib/{sources,traffic,build,net}/*`, `src/lib/revenue/providers/revenuecat.ts`, `src/app/api/startups/[id]/sources/[source]/route.ts`, `src/app/api/badge/[slug]/route.ts`, `src/app/[locale]/startup/[slug]/{page,opengraph-image}.tsx`, `src/components/{wizard/VerifyPanel,profile/ProjectBlocks,share/*,ThemeToggle}.tsx`, `src/assets/fonts/*`, `messages/*.json`, docs
**Verified:**

- `npm test` 95/95 (connectors with mocked fetch, links, SSRF guard, share); typecheck ✓; lint ✓; `npm run build` ✓ and the OG route's trace includes the fonts; TH/EN keys identical (315+)
- RLS smoke **15/15** (new: LINE-only project, no-link denied, visitors_30d write denied, traffic snapshot insert denied); advisors: only the known INFO/WARN
- Browser (local, temporary QA LINE-bot project, deleted afterwards): dark + light theme persist; profile at 375px and 1280px; card on home; OG image renders Thai; badge dark/light; share dialog opens with `?new=1` and strips it on close; share menu; no console errors
- **Not verified:** live connects with real RevenueCat / Plausible / Umami credentials and GitHub (needs a signed-in user); owner views of VerifyPanel/edit page; Facebook/LINE preview of the deployed OG card

**Next:** user signs in on the deployed site, tries "เพิ่ม Startup" with one link + GitHub build proof and a Plausible/Umami/RevenueCat source; rename the GitHub OAuth app and Google consent screen to JaoPor; pick a domain; then block F (trust pages) + `/security-review`

## 2026-09-29 — User feedback round 1: Stripe key bug + UX rework

**Done:**

- **Bug: genuine read-only Stripe keys were rejected** ("คีย์นี้เขียนข้อมูลใน Stripe ได้"):
  - Cause: the write probes POSTed an unknown parameter and expected 403, but Stripe validates parameters _before_ permissions, so read-only keys got 400.
  - Fix: empty-body updates of object ids that cannot exist. 403 = no write, 404 = can write; anything else is an upstream error, never a pass.
  - Rejections now name the resources (`ProviderError.detail` → API `detail` → UI "สิทธิ์เขียนที่ …").
  - Regression test emulates Stripe's param-first validation.
- **Add flow cut to 2 short steps** (name · website · category · built with + optional logo → Stripe or skip). No slug field (auto, retries on clash); website without `https://` is accepted.
  - `StripeConnect` component: shorter 3-line instructions + "Open Stripe key page" (live/test). Stripe removed permission-prefill links (Marc Lou, Dec 2025).
- **Edit page** `/dashboard/[id]/edit`: every field on one page with `id` anchors; `#field` deep links scroll, focus and highlight
- **Profile = TrustMRR pattern**: every section always shown as a card. Empty → owner sees `+ เพิ่ม` (deep link) / "เชื่อม Stripe"; visitors see "ยังไม่ได้เพิ่ม" / "ยังไม่ยืนยัน". Owner bar at the top. Owner detection is client-side (`profile/Owner.tsx`), so the page stays ISR.
- **Dashboard redesign**: per-startup card with status chip, MRR / 30-day / last-sync tiles, a profile-completeness bar ("เพิ่มอีก N ข้อมูล"), one primary action (Connect Stripe → View profile), everything else in a `⋯` menu
- **Home**: two-line H1 (รายได้จริงของสตาร์ทอัพ / ที่สร้างด้วย AI); TrustMRR-style `ProviderStrip` ("ยืนยันรายได้ผ่าน: Stripe ✓ · Polar · Lemon Squeezy · Paddle · RevenueCat · เร็ว ๆ นี้")
- Copy: "ลงสตาร์ทอัพ" → **"เพิ่ม Startup"** everywhere (plus related phrases)
- **Readability**: `html { font-size: 112.5% }` (18px root); `color-scheme: dark` + dark `<option>` fixes white-on-white select menus
- **Founding numbers without gaps**: migration `founding_number_no_gaps` = max+1 under an advisory lock (the sequence burned #2–#4 on failed inserts); sequence dropped; RLS smoke test gained T11
- Design.md: §4 scale/controls, §5 Hero headline, ProviderStrip, InfoCard, Dashboard startup card; §6 wizard/dashboard rows

**Files:** `src/lib/revenue/{types.ts,providers/stripe.ts,providers/stripe.test.ts,sync.ts}`, `src/app/api/startups/[id]/stripe/route.ts`, `src/components/wizard/{StartupWizard,StartupEditForm,StripeConnect,fields}.tsx`, `src/components/profile/Owner.tsx`, `src/components/{ProfileBlocks,ProviderStrip,DashboardActions}.tsx`, `src/app/[locale]/{page,dashboard/page,dashboard/[id]/edit/page,startup/[slug]/page}.tsx`, `src/app/globals.css`, `messages/*.json`, `supabase/migrations/20260929114738_founding_number_no_gaps.sql`, `supabase/tests/rls_smoke.sql`, `Design.md`, `CLAUDE.md`
**Verified:**

- `npm test` 29/29 ✓; typecheck ✓; lint ✓; TH/EN message keys identical
- RLS smoke 11/11 ✓; security advisor: only the known INFO plus a WARN for leaked-password protection (email auth only → covered by the "disable Email provider" open item)
- Browser (local, TH): home hero + provider strip + "เพิ่ม Startup" + larger text ✓; sparse profile as visitor (all cards, "ยังไม่ได้เพิ่ม", tiles "— / ยังไม่ยืนยัน") ✓; 375px no horizontal scroll, root 18px, color-scheme dark ✓. Temporary QA startup inserted and deleted.
- **Not verified (needs a signed-in user):** owner `+ เพิ่ม` links, the new dashboard, the wizard/edit form, the live Stripe connect with the fixed probe

**Next:** user retests the Stripe key on the live site + reviews the dashboard/wizard; block E share kit

## 2026-09-29 — Auth providers + env configured; encryption-key parser hardened

**Done:**

- Vercel (via MCP):
  - `NEXT_PUBLIC_SITE_URL` = `https://mrr-mafia.vercel.app`
  - Created a correctly named `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Sensitive vars can't be renamed, so the typo `…_KE` stays and is harmless.
- GitHub OAuth app: checked, homepage + Supabase callback already correct
- Supabase (dashboard, browser pane): Site URL `https://mrr-mafia.vercel.app`; redirect URLs `https://mrr-mafia.vercel.app/api/auth/callback` + `http://localhost:3000/api/auth/callback`; GitHub provider enabled with Client ID
- User entered all secrets themselves (GitHub client secret, Google client ID/secret, `KEY_ENCRYPTION_SECRET`, `CRON_SECRET`) and redeployed. Claude never typed a secret.
- `/api/health` showed `encryptionKeyValid: false`, meaning the key isn't 32-byte base64. Added `parseKeySecret()` in `src/lib/crypto/keys.ts`:
  - accepts base64, base64url or 64 hex chars
  - ignores surrounding quotes/whitespace
  - requires exactly 32 bytes
  - used by both the encryption code and the health check

**Files:** `src/lib/crypto/keys.ts`, `src/lib/crypto/keys.test.ts`, `src/app/api/health/route.ts`
**Verified:**

- Live: Supabase `/auth/v1/settings` → github ✓ google ✓; `/api/health` → all 3 secrets set, region `sin1`, site URL set; `/api/cron/sync` without bearer → 401 ✓
- `npm test` 27/27 ✓ (4 new parser tests); typecheck ✓ lint ✓
- After redeploy (`b6bff69`): `/api/health` → **`ok: true`**, `encryptionKeyValid: true`
- Live `/th/login` → "Continue with GitHub" → GitHub shows "Sign in to GitHub to continue to **MRRMafia**" with the app logo (Supabase provider, client ID and callback all wired). Stopped there: signing in and authorizing the app is the user's step.
- **Pending:** the user's first real sign-in, then the wizard and a Stripe test-key connect

**Next:** user signs in on https://mrr-mafia.vercel.app/th/login and adds a startup; publish the Google consent screen; block E (share kit)

## 2026-09-29 — First Vercel deploy: build fix + Singapore region

**Done:**

- Found the Vercel project `mrr-mafia` (it had 0 deployments) and triggered the first production build via Vercel MCP. The repo is Git-linked, so pushes to `master` now auto-deploy.
- **Fixed the build failure the user reported:**
  - `TypeError: Invalid URL` at `new URL(publicEnv.siteUrl)` in `[locale]/layout.tsx` metadata. `NEXT_PUBLIC_SITE_URL` on Vercel is empty or malformed, and `??` only covered _undefined_.
  - `src/lib/public-env.ts` → `toOrigin()`: trims, adds `https://`, returns undefined when unparseable. `siteUrl` then falls back to `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`, then localhost. Unit tests added.
- `vercel.json` `regions: ["sin1"]`: functions were building in `iad1` (US) while Supabase is in Singapore
- Found the env var typo `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KE` (missing Y); harmless thanks to the default, user asked to rename

**Files:** `src/lib/public-env.ts`, `src/lib/public-env.test.ts`, `vercel.json`
**Verified:** `npm test` 23/23 ✓; `NEXT_PUBLIC_SITE_URL="" npm run build` ✓ (reproduces the Vercel failure and shows it's fixed); lint ✓; pushed `a231b45`, Vercel build started
**Live:** production is **https://mrr-mafia.vercel.app**. Public (the team `…-gxcb06s-projects.vercel.app` URLs are behind Vercel SSO, expected). `/th`, `/en`, `/th/startups`, `/th/login` return 200 in 0.26–1.05 s from `sin1`.
**Follow-up (commit f2b6165):**

- The cron route fails closed with 503 `not_configured` instead of a 500 when `CRON_SECRET` is unset
- New `/api/health` reports only whether each secret is set
- Health result: `SUPABASE_SECRET_KEY` ✓, `KEY_ENCRYPTION_SECRET` ✗, `CRON_SECRET` ✗, `NEXT_PUBLIC_SITE_URL` ✗ (empty on Vercel)

**Next:** user fills the 3 empty env values in Vercel and redeploys, then re-checks `/api/health` (expect `ok: true`); OAuth setup

## 2026-09-29 — GitHub repo (private) for Vercel deploy

**Done:**

- Installed GitHub CLI 2.101 (winget); user signed in as `GXCB06` (device flow, scopes `repo`, `workflow`)
- Created private repo **https://github.com/GXCB06/mrrmafia** and pushed `master` (tracking `origin/master`)
- Before pushing: scanned tracked files for secrets (only `.env.example` with public values); test fixtures now build fake Stripe keys at runtime so no key-shaped literals live in the code

**Files:** `src/lib/crypto/keys.test.ts`, `src/lib/revenue/providers/stripe.test.ts`
**Verified:** `gh repo view` → PRIVATE, default branch `master`; `git status` → in sync with `origin/master`; `npm test` 20/20
**Next:** user imports the repo in Vercel + adds env vars; GitHub OAuth app → Supabase provider; Supabase Auth URL config

## 2026-09-29 — Block D: UI (built + visually checked; sign-in end-to-end pending OAuth)

**Done:**

- Auth:
  - Google/GitHub buttons (`/login`), `/api/auth/callback` with open-redirect guard, `/api/auth/signout`
  - `src/proxy.ts` now does next-intl + Supabase session refresh
  - `requireUserId()` for protected pages
- Layout: `SiteHeader` (client auth widget + TH/EN switch), `SiteFooter`, `BrandLogo` (crimson fedora mark), toasts
- Pages:
  - **Home**: hero, stats line, search, "Built with" AI-tool chips, recently added row, top-50 leaderboard, empty states
  - **`/startups`**: search, category / AI-tool / verified filters, grid, pagination
  - **`/startup/[slug]`**: header, Founding Mafia badge, 4 stat tiles, 30-day chart with previous-period compare, verified stamp, insights, founder message, unverified state
  - **`/new`**: 3-step wizard (basics + logo upload → Stripe key → insights)
  - **`/dashboard`**: list, edit, connect, refresh, delete; `/dashboard/[id]/edit`
- Components: `StartupCard`, `LeaderboardTable`, `SearchBar`, `AiToolChips`, `CopyLinkButton`, `StartupBits`, `ProfileBlocks`, `RevenueChart`, `wizard/*`; shadcn primitives added
- Data layer `src/lib/data/startups.ts` (cookie-free anon reads, ISR 60 s); `src/lib/format.ts`; `src/lib/catalog.ts`; full TH/EN messages
- Chart palette validated with the dataviz validator; `--chart-1/2` updated (Design.md too)
- Sync stores 60 days of daily rows (for the compare line)
- `localeDetection: false`
- Harness: the quality hook runs `next typegen` for route files

**Files:** `src/app/[locale]/**`, `src/app/api/auth/**`, `src/components/**`, `src/lib/{data,auth,catalog,format,public-env}.ts`, `src/proxy.ts`, `messages/*.json`, `src/app/globals.css`, `Design.md`, `.claude/hooks/quality.mjs`
**Verified:**

- `npm run typecheck` ✓, `npm run lint` ✓, `npm test` 20/20 ✓
- Browser pane, TH + EN: home (empty and with data), directory, login, `/new` → login redirect, profile with **temporary QA data** (inserted, checked, then deleted; founding counter reset to 1; DB back to 0 users/startups)
- Widths: 375 (no horizontal scroll: scrollWidth = 375), 500, 1280
- No server errors. Console 404s are the not-yet-built `/security`, `/privacy`, `/terms` footer links (block F).
- **Not verified:** real OAuth sign-in → wizard insert → Stripe connect → dashboard (needs the user's Google/GitHub OAuth apps and a Stripe test key)

**Next:** block E (share kit + OG image), block F (trust pages); user sets up OAuth + `.env.local` for the end-to-end test

## 2026-09-29 — Block C: Stripe verification (code + unit tests; live key test pending)

**Done:**

- `src/lib/revenue/`:
  - `types.ts`: `RevenueProvider`, normalized charge/subscription types, `ProviderError`
  - `providers/stripe.ts`: REST over `fetch`. Accepts `rk_` keys only (rejects `sk_`), checks Charges/Subscriptions read, proves the key can't write (invalid-param POST must get 403), paginates with retry.
  - `metrics.ts`: MRR normalized by interval, excludes trials; 30-day / previous 30-day / all-time revenue net of refunds; subscriptions; customers; zero-filled 30-day series
  - `fx.ts`: USD via ECB/Frankfurter; zero-decimal currencies handled; missing rates flagged, never guessed
  - `sync.ts`: sync + connect, writes to the DB with the admin client
- `src/lib/crypto/keys.ts`: AES-256-GCM envelope plus key hint. `src/lib/supabase/{admin,server}.ts`, `src/lib/env.ts`, `src/lib/http.ts` (CSRF guard, constant-time compare).
- Routes: `POST/PATCH /api/startups/[id]/stripe` (connect / refresh, 10-minute cooldown), `GET /api/cron/sync` (bearer `CRON_SECRET`); `vercel.json` cron runs daily at 20:00 UTC (03:00 ICT)
- Vitest set up (`vitest.config.mts`, `npm test`); `@types/node` bumped 20 → 24 (Vitest 5 peer requirement); `server-only` added
- Docs: CLAUDE.md test commands + revenue architecture; add-payment-provider skill paths fixed (`src/lib/revenue/…`)

**Files:** `src/lib/revenue/**`, `src/lib/crypto/keys.ts`, `src/lib/supabase/{admin,server}.ts`, `src/lib/env.ts`, `src/lib/http.ts`, `src/app/api/**`, `vercel.json`, `vitest.config.mts`, `package.json`, `CLAUDE.md`, `.claude/skills/add-payment-provider/SKILL.md`
**Verified:** `npm test` 20/20 ✓ (metrics 7, crypto 5, stripe 8); `npm run typecheck` ✓; `npm run lint` ✓; `npm run build` ✓ (both API routes are dynamic). **Not verified:** a live run with a Stripe test-mode restricted key; the write-probe behaviour still needs confirming against the real API.
**Next:** block D (UI + connect form), then the live key test

## 2026-09-29 — Block B: schema v1 + RLS (live on `mrrmafia`)

**Done:**

- Migration `schema_v1`:
  - `profiles` (auto-created on sign-up), `startups` (listing, insights, `ai_tools[]`, Founding Mafia number for the first 100, 5-per-founder cap, cached verified metrics), `provider_connections` (encrypted key; no client access), `revenue_snapshots` (daily)
  - private schema for triggers/helpers; `logos` storage bucket (PNG/JPEG/WebP ≤ 1 MB, own-folder only)
- Explicit grants, since new projects don't expose tables to the API. Founders can't write metric columns (column-level privileges).
- Migration `merge_select_policies`: one read policy per role (fixes the performance advisor warning)
- Reusable `supabase/tests/rls_smoke.sql`; generated `src/lib/supabase/database.types.ts`
- CLAUDE.md: remote database workflow. Project.md: live data model table, 4 decisions, block B ticked.

**Files:** `supabase/migrations/20260929050526_schema_v1.sql`, `supabase/migrations/20260929055857_merge_select_policies.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/supabase/database.types.ts`, `CLAUDE.md`, `Project.md`
**Verified:**

- RLS smoke test 10/10, including: founder can't write `mrr_cents` (denied), can't insert as another user (42501), `provider_connections` unreadable, other users edit/delete 0 rows, anon can read but not insert
- Test rolled back (0 leftover users/startups); founding sequence reset to 1
- Security advisors: only INFO for `provider_connections` having no policies (intended). Performance advisors: only INFO for unused indexes (empty DB).

**Next:** block C — `RevenueProvider` + Stripe connector + metrics engine + encryption (needs `KEY_ENCRYPTION_SECRET` in `.env.local` to run locally)

## 2026-09-29 — Block A (part 1): Supabase project + env template

**Done:**

- Paused `ar-vocab-kids` (user's choice) to free a free-tier slot; created Supabase project **`mrrmafia`** (`letfxefyqxxrfujpwtri`, ap-southeast-1, $0/mo)
- `.env.example` with public URL + publishable key and placeholders for server secrets; `.gitignore` now allows `.env.example`
- Narrowed `.claude/settings.json` `.env` deny rules to real secret files (`.env`, `.env.local`, `.env.*.local`, `.env.production`, `.env.development`) — the old `.env.*` rule also blocked `.env.example`
- Launch plan: hard 18:00 cut-off replaced by a quality launch gate (user: timing flexible, make it effective)

**Files:** `.env.example`, `.gitignore`, `.claude/settings.json`, `docs/launch-plan.md`, `Project.md`
**Verified:** `create_project` → ACTIVE_HEALTHY; `get_project_url` / `get_publishable_keys` OK
**Next:** user: `.env.local` secrets + Google/GitHub OAuth apps + Vercel project; Claude: block B schema + RLS

## 2026-09-29 — v1 launch plan (Claude Thailand FB, today)

**Done:**

- `docs/launch-plan.md`: v1 scope (11 must-haves around the add → verify → profile → share → leaderboard loop), blocks A–H schedule with 18:00 ICT cut-off, user-only tasks, Thai launch post draft, launch-day playbook, follow-ups, metrics, risks
- Project.md roadmap: Phase 1 split into **1a v1 launch (today)** and **1b hardening (weeks 1–4)**; Founder Town stays Phase 4
- Design.md §9: share menu, post-verify share dialog, card copy-link, Founding Mafia badge
- Checked infra: Supabase org has 2 active free projects (new project $0/mo but may need one paused); Vercel account ready

**Files:** `docs/launch-plan.md`, `Project.md`, `Design.md`
**Verified:** Supabase `get_cost` → $0/month; `list_projects` shows 2 ACTIVE_HEALTHY projects; Vercel `list_projects` OK
**Next:** user approves scope and Supabase project creation → start block A

## 2026-09-29 — TrustMRR UX/UI study (incl. Founder Town chat)

**Done:**

- Studied trustmrr.com live: homepage, `/acquire` (13 sort options, full filter sidebar, card anatomy), profile, `/feed`, `/chat` (Founder Town), `/game`, `/championship`, `/compete`, `/compare`, `/cofounders`, `/search`
- Wrote `docs/research/trustmrr-ux-study.md`: the 3 patterns behind every feature, Founder Town mechanics (MRR-tier houses, open town square, MRR badge on every message, in-world ads), feed/streak mechanics, engagement features, MRRMafia proposals
- Project.md parity matrix: added tier-locked chat (list mode, Phase 2), Founder Town (Phase 4), mini-game + compare pages, card social-proof items

**Files:** `docs/research/trustmrr-ux-study.md`, `Project.md`
**Verified:** observations from browser-pane screenshots, DOM reads and page text. Founder Town crashed at ~800×600 and loaded at 1440×900. Top-tier house not confirmed.
**Next:** user decides on chat tiers for pre-revenue founders and list-mode-first; then fold the chosen patterns into Design.md

## 2026-09-27 — VS Code workspace settings

**Done:**

- `.vscode/settings.json`: Prettier format-on-save, ESLint fix-on-save, workspace TypeScript, Tailwind IntelliSense for `cn()`, i18n-ally pointed at `messages/` (th source, en display), logs/.next excluded from search
- `.vscode/extensions.json`: recommends Prettier, ESLint, Tailwind CSS, i18n Ally, Supabase, Claude Code
- Opened the project in VS Code

**Files:** `.vscode/settings.json`, `.vscode/extensions.json`
**Verified:** `npx prettier --check .vscode` ✓; `code C:\Users\ACER\MRRMafia` launched
**Next:** restart the Claude session in this folder so hooks go live (still no hook logs this session), then review Project.md + Design.md

## 2026-09-27 — Phase 0: docs + Claude Code harness (5 layers)

**Done:**

- Docs: `Project.md` (vision, TrustMRR parity matrix, roadmap, architecture, decisions, open items), `Design.md` (tokens measured live from trustmrr.com, typography incl. Thai, layout, component specs, page templates), `CLAUDE.md` (rules, commands, architecture, harness map), this log, short `README.md`
- **Memory:** CLAUDE.md with `@AGENTS.md @Project.md @Design.md` imports; SessionStart hook injects current phase open tasks + latest PROGRESS entries
- **Tools (MCP):** Supabase + Vercel MCP read tools pre-allowed, write tools set to ask; built-in browser preview config `.claude/launch.json` ("web")
- **Permissions:** `.claude/settings.json` allow / ask / deny (secrets, force-push, hard reset, remote DB reset denied)
- **Hooks:** `protect-files` (.env, lockfile, logs, committed migrations), `guard-shell` (destructive git/rm/SQL, secret printing), `quality` (prettier + eslint --fix + tsc, feeds problems back), `log-tool`, `progress-gate` (Stop, one-shot nudge), `session-context`
- **Observability:** redacted JSONL per session in `.claude/logs/<date>/`, `npm run harness:report`
- Project skills: `/log-progress`, `/ui-component`, `/add-payment-provider`; installed Supabase agent skills (`supabase`, `supabase-postgres-best-practices`, markdown only, reviewed)

**Files:** `CLAUDE.md`, `Project.md`, `Design.md`, `.claude/settings.json`, `.claude/hooks/*.mjs`, `.claude/skills/*`, `scripts/log-summary.mjs`, `.gitignore`, `.prettierignore`
**Verified:**

- Pipe-tested every hook: 19 guard/protect cases correct (e.g. `rm -rf src` denied, `rm -rf .next` allowed)
- `quality` formatted a bad file and reported a type error
- `progress-gate` blocks once, then stays silent when `stop_hook_active` is set
- `session-context` output checked; secret redaction fixed and retested
- `harness:report` prints the summary
- `npm run format:check` ✓ `typecheck` ✓ `lint` ✓ `build` ✓; pre-rendered `/th` has `lang="th"`, Thai H1/title, and both font families
- ⚠ Hooks are **not live in this session**: the settings file was created mid-session. They activate on the next session start, or after opening `/hooks`. Browser-pane visual check is pending for the same reason (the preview tool still resolves the old scratch folder).

**Next:** user reviews Project.md + Design.md (brand accent, open items), then Phase 1 — decide local Docker vs remote Supabase dev project

## 2026-09-27 — Phase 0: scaffold

**Done:**

- Next.js 16.3 + React 19.2 + TypeScript + Tailwind v4 + ESLint scaffold (npm)
- shadcn/ui init (`radix-vega`, neutral, CSS variables); dark tokens aligned with Design.md; brand accent `--brand`; charts `--chart-1/2`
- next-intl 4: `th` (default) / `en`, `src/proxy.ts`, `messages/{th,en}.json`; Inconsolata + IBM Plex Sans Thai
- Supabase CLI 2.118 as a dev dependency; `supabase init`
- Prettier + tailwind plugin; scripts `typecheck`, `format`, `format:check`, `harness:report`

**Files:** `src/app/[locale]/{layout,page}.tsx`, `src/i18n/*`, `src/proxy.ts`, `src/app/globals.css`, `messages/*`, `next.config.ts`, `supabase/config.toml`, `package.json`
**Verified:** `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓ (static `/th`, `/en` + proxy)
**Next:** docs + harness setup

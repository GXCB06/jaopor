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

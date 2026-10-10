# Session handoff

> Last updated **2026-10-11**. A start-here brief for a new session. Read this first, then
> [CLAUDE.md](../CLAUDE.md) (rules + commands), [Project.md](../Project.md) (state map),
> [Design.md](../Design.md) (UI spec) and [PROGRESS.md](../PROGRESS.md) (completion log).

**JaoPor** (เจ้าพ่อ) is the permanent, searchable home for things people build with AI
(web apps, mobile apps, LINE OA bots, repos), Thailand/Asia first, where every project can
show **verified numbers**: revenue, visitors, active users, build proof. Later it becomes a
marketplace. UX/features follow TrustMRR. Tagline: "1 คน + AI พีคได้แค่ไหน / ดูผลงานจริง ตัวเลขจริง".

## State right now

- `HEAD = 93a013a`, **working tree clean**.
- **4 commits ahead of `origin/master`, nothing pushed, no deploy.**
  - `1cd8466` feat(ux A1)
  - `81d160e` feat(ux A2)
  - `4a9bbc5` feat(ux A3+B1)
  - `93a013a` feat(measurement)
- Infra/Supabase/Vercel names are still `mrrmafia`; the product is **JaoPor**.
  - Prod: https://jaopor.vercel.app/th · Remote: `https://github.com/GXCB06/jaopor.git`
  - Supabase project ref: `letfxefyqxxrfujpwtri`.
- No `.env.local` / `.env` on this machine — only `.env.example`. Server env
  (`src/lib/env.ts`, `serverEnv`) requires `SUPABASE_SECRET_KEY`, `KEY_ENCRYPTION_SECRET`,
  `CRON_SECRET`. `src/lib/public-env.ts` hardcodes the public Supabase URL + publishable key.

## What changed this session

### `1cd8466` — UX A1
- Co-founder request opens the founder contact flow; correctable link types; platform pages
  are never treated as a project's own website; leaderboard rules with periods and shared
  ranks for ties.

### `81d160e` — UX A2
- Metric-first verify chooser (asks _what to prove_ — `revenue | traffic | build` — not which
  tool); step-1 "next: verify" hint, "what you get" strip, Stripe read-only note;
  owner-stated vs verified line. New projects stay **public by default**.

### `4a9bbc5` — UX A3 (item 1) + B1
- **A3 item 1 — 12px type floor:** `text-3xs`/`text-2xs` pinned at `0.6667rem` (12px), chart
  ticks 10→12px; new `e2e/readability.spec.ts` fails any visible text in `<main>` under 12px
  (skips `aria-hidden` and the live map's scaled SVG). `Design.md` §3 updated.
- **B1:** founder profile reorder on phones (identity in the sidebar; bio/links/badges/skills/
  tools/report move below the main column at `#profile-extras`; experience above the feed);
  new `src/components/builder/ProfileShareButton.tsx` (native Web Share, else copy
  `/{locale}/@handle`); project page split into a **Proof** container ("ตัวเลขที่ยืนยัน / นับได้":
  chart + traction tiles) and a **Story** container ("เรื่องราวของผลงาน": why → build story →
  facts), replacing `InsightsGrid`.

### `93a013a` — launch measurement
- **Option 2 — Vercel Web Analytics:** `@vercel/analytics@2.0.1`, `<Analytics/>` in
  `src/app/[locale]/layout.tsx`. Cookie-free pageviews; **Hobby plan = no custom events**, so
  the funnel carries all custom instrumentation. Fires on **all localized routes** (confirmed
  intended). Enable it in the Vercel dashboard → Web Analytics.
- **GA4 — on by default:** `src/lib/analytics/ga.ts` uses a built-in `DEFAULT_MEASUREMENT_ID`
  (`G-JYPJ2RFH4N`), so production renders the tag with **no env var set**. `NEXT_PUBLIC_GA_ID`
  overrides the ID; empty / `"off"` / `"false"` / `"0"` / `"no"` disables it without a code change.
  Production-only (dev/e2e never send hits). (Old `src/lib/analytics.ts` deleted.) **Re-enabled
  2026-10-11** after a brief same-day off-by-default — see `ga.ts` / `PROGRESS.md`.
- **Option 3 — first-party add-project funnel** (migration **not applied**):
  `supabase/migrations/20261011120000_add_funnel_events.sql` creates `analytics.funnel_events`;
  client events `add_opened → add_created → verify_chose → add_failed → add_finished` via a thin
  `public.log_add_event` invoker; server-only `public.log_verify_result` (called from the
  sources POST inside `after()`) and `public.prune_funnel_events` (nightly cron,
  **180-day retention**). Caps: 100 client events/user/day + 50 verify results/project/day; all
  functions fail closed. RLS smoke **T137–T145** appended to `supabase/tests/rls_smoke.sql`.
- **/privacy (th + en):** §2 adds the funnel bullet; §6/§8 **restore** the GA `_ga` cookies /
  Google Analytics disclosure (the same-day off-by-default edit briefly dropped them; re-enabled
  2026-10-11) alongside Vercel's cookie-free Web Analytics; date → 2026-10-11.
- **Docs:** `PROGRESS.md` new measurement entry + new GA4 re-enable entry (the 2026-10-10 GA4
  entry is marked **superseded**); `Project.md` open items + §6 decision rows updated.

## Verification baseline (all green before the last commits)

- `npx vitest run` → **445 passed / 17 skipped**
- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓
- `npx playwright test` → **108 passed / 16 skipped / 0 failed**
- `.next/server/app/th.html` contains **no** `googletagmanager`.

## Not done — owner-gated next steps

1. **Apply** `supabase/migrations/20261011120000_add_funnel_events.sql` (reviewed, never applied
   anywhere). Per `CLAUDE.md`: `npx supabase migration new` → apply via Supabase MCP
   `apply_migration`.
2. Run security + performance **advisors**, then RLS smoke **T137–T145** (only valid *after*
   apply — they reference the new schema).
3. **Regenerate `src/lib/supabase/database.types.ts`** via MCP `generate_typescript_types`. Its
   three new RPC entries (`log_add_event`, `log_verify_result`, `prune_funnel_events`) are
   currently **hand-added** and will be replaced.
4. Enable **Web Analytics** in the Vercel dashboard.
5. Push / review the 4 unpushed commits.

## Gotchas & conventions

- **Windows shell:** `Start-Process` / `Start-Job` wrapping `npx` / `next start` fails here —
  use the Playwright `webServer` config instead. No `start` script usage in scripts; smoke via
  `npx next start -p <port>`.
- **Never `npm run build` while the dev server runs** — both write `.next` and the build
  corrupts the dev cache (every page 500s).
- **`/u/[username]` can't render locally** without `SUPABASE_SECRET_KEY` (profiles read through a
  service-role-only admin RPC). e2e gates builder-profile specs on that secret.
- `NEXT_PUBLIC_*` values must be literal `process.env.X` (statically inlined by Next).
- **Thai PDPA:** analytics cookies are non-essential → they must be opt-in (prior consent) or
  cookie-free. That's why the launch stack is GA-off + cookie-free Vercel + first-party funnel.
- **Migration review fixes** vs `docs/ADD_STARTUP_ANALYTICS_MIGRATION.md`: `verify_chose.choice`
  is metric-first (`revenue | traffic | build`, matching `METRICS` in `src/lib/sources/catalog.ts`),
  and the `analytics` schema/table are **also revoked from `service_role`**.
- `next dev` re-adds a rules block to `AGENTS.md`; don't comment it out — committing it keeps the
  tree clean.
- All UI must come from `Design.md`; no hard-coded user-facing strings (add both `messages/th.json`
  and `messages/en.json`). Every completed task is logged via `/log-progress`.

## Blocked / open

- **A3 item 2** (card v2 + compact directory header on phones) — **blocked** pending the two
  TrustMRR reference screenshots (audit Q8).
- Carried minor A1 findings (unfixed): `sameWebsite` platform-URL shape gap (`src/lib/links.ts`);
  stale comment in `src/lib/data/startups.ts`; inverted `VisitorOnly` comment
  (`src/components/profile/Owner.tsx`); double `linkPlatform(url)` call in
  `src/components/profile/ProjectBlocks.tsx`.
- Audit phase order after A3/B1: **B2** (charts / settings) → **C1** (multi-select filters +
  leaderboard page) → **C2** (onboarding) → **C3** (badges + copy).

## Quick file map

| Area | Where |
| --- | --- |
| Pages / routing | `src/app/[locale]/…`, `src/proxy.ts` (middleware), `src/i18n/` |
| Verified numbers | `src/lib/sources/{catalog,sync}.ts`, `src/lib/revenue/`, `src/lib/traffic/`, `src/lib/build/` |
| Keys & crypto | `src/lib/crypto/keys.ts`, `src/lib/net/public-url.ts` (SSRF guard) |
| Analytics | `src/lib/analytics/{ga,add-funnel,funnel-types}.ts` |
| Supabase | `src/lib/supabase/{client,admin,database.types}.ts` |
| DB schema / tests | `supabase/migrations/*`, `supabase/tests/rls_smoke.sql` |
| UI components | `src/components/**` (shadcn primitives in `src/components/ui/`) |
| Strings | `messages/th.json`, `messages/en.json` (th default) |
| Unit / e2e tests | `src/**/*.test.ts` (vitest), `e2e/*.spec.ts` (playwright) |

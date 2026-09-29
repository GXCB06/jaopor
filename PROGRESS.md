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

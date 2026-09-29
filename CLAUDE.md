# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**MRRMafia** is a database of verified startup revenue, and a marketplace, for AI-built startups (Thailand/Asia first). Its UX and features follow TrustMRR. Product scope and status: @Project.md. UI spec: @Design.md. Completion log: [PROGRESS.md](PROGRESS.md).

## Working rules (non-negotiable)

1. **Log every completed task.** Add an entry at the top of `PROGRESS.md` (format is at the top of that file) and tick the matching checkbox or status in `Project.md` (roadmap + parity matrix). New decisions go in Project.md §6 and new open questions in §7. Use `/log-progress`. The Stop hook nudges if code changed without a log entry.
2. **UI comes only from Design.md.** Use tokens, never raw hex. Monospace font, dark theme, `tabular-nums` on numbers. If you need a new pattern, add it to Design.md _before_ building it. Use `/ui-component`.
3. **No hard-coded user-facing strings.** Add keys to both `messages/th.json` and `messages/en.json`. `th` is the default locale.
4. **Payment provider keys:**
   - Accept only restricted/read-only keys. Reject any key that can write.
   - Encrypt at rest and decrypt only in server code (route handlers, cron, server actions). Never send them to the client or log them.
   - Store aggregate metrics only, never customer personal data.
5. **Database:** change schema only through `supabase/migrations/*`, with row-level security enabled and policies on every table. Never edit an applied migration; write a new one.
6. **No TrustMRR assets, copy or data.** Copy layout and patterns only. Never scrape or consume their API to fill our database.
7. **Definition of done:** `npm run typecheck && npm run lint` pass, and UI changes are checked visually in the browser pane (desktop + 375px).

## Commands

```bash
npm run dev            # Next dev server (Turbopack) → http://localhost:3000 (redirects to /th)
npm run build          # production build
npm run typecheck      # next typegen && tsc --noEmit (typegen is needed after adding/removing routes)
npm run lint           # eslint
npm run format         # prettier --write . (sorts Tailwind classes)
npm run harness:report # summarize tool-call logs in .claude/logs (observability)
npm test               # vitest run (unit tests: src/**/*.test.ts)
npx vitest run src/lib/revenue/metrics.test.ts   # one file; add -t "<test name>" for one test
npx supabase migration new <name>   # new SQL migration in supabase/migrations
npx shadcn@latest add <component>   # add a shadcn/ui primitive into src/components/ui
```

**Database workflow** (remote project `mrrmafia`, ref `letfxefyqxxrfujpwtri`, no local Docker):

1. `npx supabase migration new <name>`, then write the SQL in that file.
2. Apply it with Supabase MCP `apply_migration`, passing the same SQL (you'll be asked to approve).
3. Run `get_advisors` for security and performance, and fix any WARN.
4. Run [supabase/tests/rls_smoke.sql](supabase/tests/rls_smoke.sql) via `execute_sql`. Every line must read good/expected. It rolls itself back, so nothing needs resetting.
5. Regenerate `src/lib/supabase/database.types.ts` (MCP `generate_typescript_types`).

Unit tests use **Vitest** (`vitest.config.mts`; `server-only` is stubbed in tests). Playwright end-to-end tests arrive in Phase 1b.

**Revenue verification** (`src/lib/revenue/`):

- `providers/*.ts` fetch and normalize, `metrics.ts` computes everything (pure, tested), `fx.ts` converts to USD, `sync.ts` writes to the DB with the admin client.
- Routes: `POST/PATCH /api/startups/[id]/stripe` (connect / refresh) and `GET /api/cron/sync` (Vercel Cron, bearer `CRON_SECRET`).
- Keys are encrypted in `src/lib/crypto/keys.ts`.

## Architecture

- **Next.js 16 App Router.** Breaking changes from older Next: see AGENTS.md and `node_modules/next/dist/docs/`.
  - Middleware is now **`src/proxy.ts`**.
  - Route props use the global `PageProps<"/[locale]">` / `LayoutProps<...>` helpers, and `params` is a Promise.
- **i18n (next-intl 4).**
  - Every page lives under `src/app/[locale]/`. `[locale]/layout.tsx` is the root layout (it renders `<html>`); there is no `src/app/layout.tsx`.
  - Config: `src/i18n/routing.ts` (locales), `request.ts` (loads messages), `navigation.ts` (use its `Link`/`redirect`/`useRouter` instead of Next's, so locale prefixes are kept).
  - Static pages call `setRequestLocale(locale)` and export `generateStaticParams`.
- **Styling.**
  - Tailwind v4 is configured in CSS: `src/app/globals.css` holds the shadcn variables plus `--brand`, and the `@theme inline` block maps them to utilities (`bg-brand`, `text-muted-foreground`, …).
  - The `dark` class is always set on `<html>`.
  - Fonts: Inconsolata + IBM Plex Sans Thai via `next/font` variables.
  - shadcn config is in `components.json` (style `radix-vega`, lucide icons, `@/components/ui`). `cn()` lives in `src/lib/utils.ts`.
- **Planned (Phase 1, see Project.md §5):**
  - Supabase: Postgres + row-level security, Auth, Storage.
  - A `RevenueProvider` interface per payment provider feeds a provider-agnostic metrics engine, which writes `revenue_snapshots`, synced by Vercel Cron.

## Harness (how Claude Code is set up here)

| Layer            | Where                                  | What it does                                                                                                                                                                 |
| ---------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Memory        | `CLAUDE.md` (+ imports), `PROGRESS.md` | The SessionStart hook `session-context.mjs` injects the latest PROGRESS entries and open Project.md tasks                                                                    |
| 2. Tools (MCP)   | Connected at the account level         | **Supabase MCP**: SQL, migrations, advisors, TS types. **Vercel MCP**: deploys, logs, env. **Built-in browser**: visual QA via `preview_start` "web" (`.claude/launch.json`) |
| 3. Permissions   | `.claude/settings.json`                | Allow routine npm/git/supabase-local commands. Ask before push, prod deploy, remote DB writes. Deny `.env*` and destructive git/rm                                           |
| 4. Hooks         | `.claude/hooks/*.mjs`                  | PreToolUse: `protect-files`, `guard-shell`. PostToolUse: `quality` (prettier + eslint on the edited file), `log-tool`. Stop: `progress-gate`                                 |
| 5. Observability | `.claude/logs/<date>/<session>.jsonl`  | One redacted JSON line per tool call. `npm run harness:report` summarizes it                                                                                                 |

- Personal overrides go in `.claude/settings.local.json` (gitignored).
- If a hook blocks you, fix the cause. Don't work around it.
- Project skills are in `.claude/skills/`: `/log-progress`, `/ui-component`, `/add-payment-provider`.
- Built-in skills to reach for: `security-review` (before each phase ships), `code-review`, `simplify`, `dataviz` (charts), `claude-api` (AI search and matching), `mcp-server-dev:build-mcp-server` (Phase 4).

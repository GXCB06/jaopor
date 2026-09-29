# MRRMafia — Project

> Source of truth for **what** we build and **where we are**. UI rules live in [Design.md](Design.md); agent rules in [CLAUDE.md](CLAUDE.md); the completion log in [PROGRESS.md](PROGRESS.md).

## 1. Vision

**MRRMafia is the database of verified startup revenue for AI-built startups, Thailand/Asia first.**
Founders connect a payment provider with a read-only key → get a public, verified profile → share it → buyers discover and acquire.

- Reference architecture: **TrustMRR** (trustmrr.com). We match its UX, features and flows.
- We do **not** copy its name, logo, marketing copy, assets or data (their API terms forbid rebuilding their dataset). Every listing on MRRMafia is created by our own users.
- Go-to-market: launch posts in the Claude Thailand Facebook group and other Thai AI/indie communities. Each founder's share card is the marketing.

### Differentiators on top of parity

1. **Thai + English** everywhere (`/th`, `/en`), THB display next to USD.
2. **AI build tools** on every profile (Claude Code, OpenCode, Cursor, Codex…) and a "Built with Claude" leaderboard.
3. **Asian payment providers** (Omise/Opn, 2C2P) — only once read-only keys are confirmed.
4. Later: **build proof** (GitHub, % of commits co-authored by Claude) and **traffic proof** (our snippet).

## 2. Users

| Persona               | Wants                                    | Gets from MRRMafia                                   |
| --------------------- | ---------------------------------------- | ---------------------------------------------------- |
| Thai AI builder       | Credibility, visibility, bragging rights | Verified profile, rank, share card, embeddable badge |
| Founder ready to exit | Buyers, fair price, safe close           | Listing, buyer messages, deal flow                   |
| Buyer / investor      | Trustworthy small startups in Asia       | Filters, verified numbers, alerts                    |
| Curious visitor       | "How much do startups like mine make?"   | Leaderboards, stats, categories                      |

## 3. TrustMRR feature parity matrix

Status: ☐ not started · ◐ in progress · ☑ done

| Area           | Feature                                                                                 | Phase | Status |
| -------------- | --------------------------------------------------------------------------------------- | ----- | ------ |
| Foundation     | Next.js + shadcn + Supabase + i18n scaffold                                             | 0     | ☑      |
| Foundation     | Harness (memory, MCP, permissions, hooks, observability)                                | 0     | ☑      |
| Auth           | Sign in (Google, GitHub) — code done, OAuth apps pending                                | 1     | ◐      |
| Verification   | `RevenueProvider` abstraction                                                           | 1     | ☑      |
| Verification   | Stripe restricted-key connector                                                         | 1     | ◐      |
| Verification   | Metrics engine (MRR, 30d, all-time, subscriptions, customers, growth)                   | 1     | ☑      |
| Verification   | Scheduled sync + "Verified with X · last updated" stamp                                 | 1     | ◐      |
| Verification   | LemonSqueezy / Polar / Paddle / Creem / Dodo / RevenueCat / Superwall / Whop            | 1–2   | ☐      |
| Profile        | Add-startup wizard (basics → connect provider → insights)                               | 1     | ◐      |
| Profile        | `/startup/[slug]` stat tiles, revenue chart, insights grid, screenshot, founder message | 1     | ◐      |
| Discovery      | Homepage: hero, search, recently listed, best deals, leaderboard                        | 1     | ◐      |
| Discovery      | `/startups` directory + category / country / tech-stack / channel pages                 | 1     | ◐      |
| Distribution   | OG share cards (Facebook/LINE), embeddable verified badge                               | 1     | ☐      |
| Distribution   | `llms.txt` + AI-readable Markdown per startup                                           | 1     | ☐      |
| Monetization   | Sponsor rails (left/right) + Advertise page                                             | 1     | ☐      |
| Admin          | Moderation, reports, badge revoke                                                       | 1     | ☐      |
| Marketplace    | Listing (asking price, margin, reason), auto multiple                                   | 2     | ☐      |
| Marketplace    | `/acquire` filters + "best deals" ranking                                               | 2     | ☐      |
| Marketplace    | Save, view counter, price-drop alerts                                                   | 2     | ☐      |
| Marketplace    | Contact seller → offer → realtime chat; buyer & seller dashboards                       | 2     | ☐      |
| Monetization   | Listing tiers Starter / Growth / Scale (visibility, card color, pin, newsletter)        | 2     | ☐      |
| Deal flow      | NDA → LOI → APA (TH/EN, THB), escrow (Thai option; Escrow.com has no THB)               | 3     | ☐      |
| Monetization   | 3% closing fee, affiliate program, add-ons, buyer alerts (filters + AI)                 | 3     | ☐      |
| Distribution   | Newsletter, LINE / Telegram alerts                                                      | 3     | ☐      |
| Data           | Stats page, Revenue/LOC, Domain Rating, Olympics, Top 100, compare startups             | 4     | ☐      |
| Community      | Feed + posting streaks, founder chats, co-founder finder                                | 4     | ☐      |
| Community      | Tier-locked founder chat rooms, list mode (mobile) — see docs/research §1               | 2     | ☐      |
| Community      | "Founder Town" pixel-town chat (desktop), in-world sponsor billboards                   | 4     | ☐      |
| Engagement     | "$1 vs $1M" guessing game, startup-vs-startup compare pages                             | 4     | ☐      |
| Marketplace    | Card social proof (views, saves), struck-through price drop, copy link, stealth mode    | 2     | ☐      |
| AI layer       | Public API, MRRMafia MCP server                                                         | 4     | ☐      |
| Differentiator | Build proof (GitHub) + traffic proof (snippet)                                          | 4     | ☐      |

## 4. Roadmap

### Phase 0 — Scaffold + harness ✅

- [x] Next.js 16 + TypeScript + Tailwind v4 + shadcn (radix-vega, neutral) scaffold
- [x] next-intl (`/th` default, `/en`), Inconsolata + IBM Plex Sans Thai, dark theme tokens
- [x] Supabase CLI init (`supabase/config.toml`)
- [x] Project.md, Design.md, PROGRESS.md, CLAUDE.md
- [x] Harness: permissions, hooks, observability logs, project skills
- [ ] User review of Project.md + Design.md ← **next**

### Phase 1a — v1 launch (Claude Thailand FB post, flexible date) — plan: [docs/launch-plan.md](docs/launch-plan.md)

- [ ] A · Supabase project (remote, `ap-southeast-1`) + Vercel project + Google/GitHub OAuth + env vars
- [x] B · Schema v1 + RLS (`profiles`, `startups` incl. `ai_tools[]`, `provider_connections`, `revenue_snapshots`, `logos` bucket) — 10/10 RLS checks pass
- [ ] C · `RevenueProvider` + Stripe restricted-key connector + metrics engine + encrypted keys + daily cron + refresh — ◐ code + 20 unit tests done; **live Stripe test-key run pending** (done during D)
- [ ] D · UI: header/footer, homepage (hero, search, recently added, leaderboard, AI-tool chips), profile, `/startups`, add-startup wizard, dashboard — ◐ all built + visually checked (375 / 500 / 1280, TH + EN) with temporary demo data; **sign-in → wizard → Stripe → dashboard end-to-end pending OAuth apps + test key**
- [ ] E · Share kit: share menu (copy/FB/LINE/X), OG image, embeddable badge, Founding Mafia badge (first 100)
- [ ] F · Trust pages (privacy/PDPA, terms, "How we handle your key") + `/security-review` + rate limits
- [ ] G · Production deploy + seed 5–10 real startups
- [ ] H · Launch post in Claude Thailand at the first 19:30–21:00 ICT slot after the launch gate passes

### Phase 1b — v1.x hardening (weeks 1–4 after launch)

- [ ] Metrics engine unit tests (Vitest) + Playwright happy path
- [ ] More providers: Polar, LemonSqueezy, RevenueCat (after read-only scope check)
- [ ] Traction proof: MRRMafia visitor snippet + GitHub build proof (see §7)
- [ ] Category/country/stack pages, `llms.txt` + Markdown pages (if not shipped in 1a)
- [ ] Sponsor rails (house ads → first paid sponsor)
- [ ] Admin moderation UI
- [ ] Day+1 / Day+7 leaderboard posts (see launch plan §4)

### Phase 2 — Marketplace (weeks 5–8)

- [ ] Listings + tiers (Stripe Checkout)
- [ ] `/acquire` + filters + best-deals ranking
- [ ] Save / views / price-drop alerts
- [ ] Contact seller → offers → realtime chat → dashboards

### Phase 3 — Deal flow + monetization (weeks 9–12)

- [ ] NDA / LOI / APA editor (lawyer-reviewed templates)
- [ ] Escrow partner decision + integration
- [ ] Fees, affiliates, add-ons, buyer alerts, newsletter, LINE/Telegram alerts

### Phase 4 — Data, community, AI (weeks 13+)

- [ ] Stats, Revenue/LOC, Domain Rating, Olympics, Top 100
- [ ] Feed, founder chats, co-founder finder
- [ ] Public API + MCP server
- [ ] Build proof + traffic proof
- [ ] Omise/Opn, 2C2P

## 5. Architecture

- **Web:** Next.js 16 App Router on Vercel. Server Components + ISR for public pages (SEO). Route handlers for API, webhooks, OG images, Markdown. `src/proxy.ts` (Next 16's renamed middleware) handles locale routing.
- **UI:** Tailwind v4 + shadcn/ui (radix-vega), dark by default. See Design.md.
- **i18n:** next-intl; messages in `messages/{th,en}.json`; `th` is the default locale.
- **Data:** Supabase — Postgres + RLS, Auth, Storage (logos/screenshots), Realtime (chat, Phase 2), Vault/AES-GCM for provider keys.
- **Jobs:** Vercel Cron → `/api/cron/sync` → per-provider sync → `revenue_snapshots`.

### Payment provider abstraction

```ts
interface RevenueProvider {
  id: "stripe" | "lemonsqueezy" | "polar" | "paddle" | "creem" | "dodo" | "omise" | …;
  validateKey(key: string): Promise<{ ok: boolean; readOnly: boolean; accountName?: string }>;
  fetchTransactions(key: string, since: Date): AsyncIterable<NormalizedTxn>;
  fetchSubscriptions(key: string): AsyncIterable<NormalizedSub>;
}
// metrics engine is provider-agnostic: NormalizedTxn/Sub → MRR, 30d, all-time, subs, customers, growth
```

Rules: reject keys that are not read-only/restricted; aggregate data only (no customer PII); normalize to USD, display THB.

### Data model v1 (live, migrations `schema_v1` + `merge_select_policies`)

| Table                  | Holds                                                                                                                                                                                                                 | Who can do what                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `profiles`             | One per auth user (auto-created by trigger): handle, display name, avatar, X handle                                                                                                                                   | Everyone reads; owner updates 4 columns                                                                 |
| `startups`             | Listing + insights + `ai_tools[]` / `tech_stack[]` / `marketing_channels[]`, `founding_number` (first 100), **cached verified metrics** (MRR, 30-day, previous 30-day, all-time, subscriptions, customers, last sync) | Everyone reads published; owner inserts/updates **only non-metric columns**, deletes; max 5 per founder |
| `provider_connections` | Encrypted read-only key, key hint, account name, sync status                                                                                                                                                          | **No client access** (RLS with no policies); server secret key only                                     |
| `revenue_snapshots`    | Daily revenue + MRR per startup (the 30-day chart)                                                                                                                                                                    | Everyone reads published; server writes                                                                 |
| Storage `logos`        | Public bucket, PNG/JPEG/WebP ≤ 1 MB, path `<user id>/…`                                                                                                                                                               | Founders manage only their own folder; no public listing                                                |

Later: `sponsors`, `reports`, and a stealth-mode public view.
Phase 2+: `listings` · `listing_views` · `saves` · `conversations` · `messages` · `offers` · `deal_documents` · `affiliates` · `feed_posts`

## 6. Decisions log

| Date       | Decision                                                                                                                                                                            | Why                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-27 | Name: **MRRMafia**                                                                                                                                                                  | User choice                                                                                                                 |
| 2026-09-27 | Match TrustMRR UX/features; own brand, copy, data                                                                                                                                   | User wants TrustMRR's style; copying brand/data is a legal + ToS risk                                                       |
| 2026-09-27 | Stack: Next.js + Supabase + Vercel                                                                                                                                                  | Same class of stack as TrustMRR (Next + shadcn); Supabase/Vercel MCP connected                                              |
| 2026-09-27 | **npm** instead of pnpm                                                                                                                                                             | pnpm not installed; npm ships with Node 26 — no global installs needed                                                      |
| 2026-09-27 | shadcn preset `radix-vega`, neutral base                                                                                                                                            | Its dark tokens equal TrustMRR's measured tokens                                                                            |
| 2026-09-27 | Fonts: Inconsolata + IBM Plex Sans Thai                                                                                                                                             | Match TrustMRR's mono look; Inconsolata has no Thai glyphs                                                                  |
| 2026-09-27 | Default locale `th`                                                                                                                                                                 | Launch audience is Thai                                                                                                     |
| 2026-09-27 | Brand accent: crimson (`--brand`)                                                                                                                                                   | "Mafia" identity; single swap point in globals.css — revisit with user                                                      |
| 2026-09-27 | Hooks written as Node `.mjs`                                                                                                                                                        | Windows + bash + PowerShell all run Node identically                                                                        |
| 2026-09-27 | Quality hook runs whole-project `tsc` per TS edit                                                                                                                                   | ~8s per edit (eslint startup dominates); catches cross-file breakage. Revisit if it grows slow                              |
| 2026-09-27 | Supabase agent skills vendored in `.claude/skills`                                                                                                                                  | Official Postgres/RLS guidance for schema work; markdown only, reviewed; excluded from prettier                             |
| 2026-09-29 | Remote Supabase project (no local Docker)                                                                                                                                           | Fastest path to launch; free tier; Singapore region is closest to Thai users                                                |
| 2026-09-29 | Auth: Google + GitHub OAuth only at launch                                                                                                                                          | Supabase's default email sender is heavily rate-limited → magic links would fail under launch traffic                       |
| 2026-09-29 | Launch timing: quality gate, not a date                                                                                                                                             | User: "make it effective" → post at the first evening slot after QA + seeding                                               |
| 2026-09-29 | Verified metrics cached on `startups`, protected by column grants                                                                                                                   | Leaderboard is one indexed query; founders can't write metric columns (only server sync can)                                |
| 2026-09-29 | `ai_tools` as a checked `text[]` + GIN index (no join table)                                                                                                                        | Fixed small vocabulary; "Built with Claude Code" filter is one `@>` query                                                   |
| 2026-09-29 | No stealth mode and no SVG logos in v1                                                                                                                                              | `owner_id` is publicly readable (stealth needs a view first); SVG can carry scripts                                         |
| 2026-09-29 | Remote DB workflow: migration file → MCP `apply_migration` → advisors → `rls_smoke.sql`                                                                                             | No Docker; keeps a migration history plus a repeatable security test                                                        |
| 2026-09-29 | Stripe via REST `fetch`, not the SDK                                                                                                                                                | Tiny dependency surface; `fetchImpl` injection makes every error path unit-testable                                         |
| 2026-09-29 | Read-only proof: `rk_` only + invalid-param POST probes must return 403                                                                                                             | A restricted key can still carry write permissions; probes never create anything (the invalid param is rejected either way) |
| 2026-09-29 | Revenue = successful charges minus refunds (gross of Stripe fees); MRR = active + past_due subscriptions, interval-normalized; trials, discounts and tiered/metered prices excluded | Simple, explainable numbers; like TrustMRR, may differ from Stripe's own MRR — document on the "how we calculate" page      |
| 2026-09-29 | FX: ECB rates (Frankfurter) at sync-day rate; missing currencies excluded and flagged                                                                                               | Free, no key; never show a guessed number                                                                                   |
| 2026-09-29 | Vitest 5 (+ `@types/node` 24)                                                                                                                                                       | Unit tests for metrics, crypto and provider logic; Node 26 runtime                                                          |
| 2026-09-29 | `localeDetection: false` — `/` always goes to `/th`                                                                                                                                 | Thai-first audience; many Thai users run English browsers                                                                   |
| 2026-09-29 | Header auth is a client widget; public pages read with a cookie-free anon client + `revalidate = 60`                                                                                | Keeps home, directory and profiles static/ISR-cached (fast, cheap) while signed-in UI still works                           |
| 2026-09-29 | Chart colours `--chart-2 #00a86b` / `--chart-1 #2b7fff` (not TrustMRR's measured values)                                                                                            | TrustMRR's values failed the dataviz validator (lightness band, contrast < 3:1) on our dark surface                         |
| 2026-09-29 | `src/lib/public-env.ts` defaults for the public Supabase URL + publishable key                                                                                                      | Site runs before `.env.local` exists; both values are public by design. Secrets stay in `env.ts`                            |
| 2026-09-29 | Wizard writes directly with the user session (browser Supabase client)                                                                                                              | RLS + column grants already enforce ownership and protect metric columns; no extra API needed                               |
| 2026-09-29 | Quality hook runs `next typegen` when a page/layout/route file changes                                                                                                              | New routes otherwise always fail tsc (missing `PageProps`/`RouteContext` types)                                             |

## 7. Open items

- [x] ~~Restart the Claude Code session so hooks go live~~ → hooks confirmed live 2026-09-29 (quality + progress-gate fired)
- [ ] Confirm with a real Stripe **test-mode** restricted key that the write probes return 403 (the read-only proof depends on it)
- [ ] Browser-pane visual check of `/th` and `/en` (first real UI in block D)
- [x] ~~Docker not installed~~ → resolved 2026-09-29: using remote Supabase project `mrrmafia` (`letfxefyqxxrfujpwtri`, ap-southeast-1); migrations applied via Supabase MCP. Local Docker optional later.
- [ ] `ar-vocab-kids` Supabase project was paused to free a free-tier slot — restore it from the dashboard when needed (or upgrade the org).
- [ ] Confirm brand accent colour (crimson proposed) and logo.
- [ ] Domain name (mrrmafia.com / .co / .asia?).
- [ ] URL of the Thai "Product Hunt for Claude projects" competitor, to study.
- [ ] Omise/Opn: do read-only keys exist? If not, don't support it.

## 8. Success metrics (first 30 days after launch)

- ≥ 20 startups seeded before launch, ≥ 10 with verified revenue
- Profile completion ≥ 60% of sign-ups
- Payment provider connected ≥ 30%
- Share-card share rate ≥ 30%
- Sign-ups per shared card (viral signal); week-4 founder return rate

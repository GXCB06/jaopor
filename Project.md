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
| Auth           | Sign in (magic link, Google, GitHub/X)                                                  | 1     | ☐      |
| Verification   | `RevenueProvider` abstraction                                                           | 1     | ☐      |
| Verification   | Stripe restricted-key connector                                                         | 1     | ☐      |
| Verification   | Metrics engine (MRR, 30d, all-time, subscriptions, customers, growth)                   | 1     | ☐      |
| Verification   | Scheduled sync + "Verified with X · last updated" stamp                                 | 1     | ☐      |
| Verification   | LemonSqueezy / Polar / Paddle / Creem / Dodo / RevenueCat / Superwall / Whop            | 1–2   | ☐      |
| Profile        | Add-startup wizard (basics → connect provider → insights)                               | 1     | ☐      |
| Profile        | `/startup/[slug]` stat tiles, revenue chart, insights grid, screenshot, founder message | 1     | ☐      |
| Discovery      | Homepage: hero, search, recently listed, best deals, leaderboard                        | 1     | ☐      |
| Discovery      | `/startups` directory + category / country / tech-stack / channel pages                 | 1     | ☐      |
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

### Phase 1 — Verified revenue database (weeks 1–4, launch version)

- [ ] Supabase project (remote dev) + schema v1 + RLS
- [ ] Auth
- [ ] `RevenueProvider` + Stripe connector + encrypted key storage
- [ ] Metrics engine + unit tests (Stripe test mode)
- [ ] Sync job (Vercel Cron) + verified stamp
- [ ] Add-startup wizard
- [ ] Design-system components (StartupCard, LeaderboardRow, StatTile, RevenueChart, InsightsGrid, SponsorCard, SearchBar, VerifiedStamp)
- [ ] Homepage
- [ ] Startup profile page
- [ ] Directory + category/country/stack pages
- [ ] OG share cards + embeddable badge
- [ ] Sponsor rails
- [ ] `llms.txt` + Markdown pages
- [ ] Admin moderation
- [ ] Security review
- [ ] Seed 20–30 Thai startups → launch post

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

### Data model v1 (draft)

`profiles` · `startups` · `startup_insights` · `categories` · `tools` (AI build tools) · `tech_stack` · `marketing_channels` · `provider_connections` (encrypted key, status, last_synced_at) · `revenue_snapshots` (startup_id, date, mrr, revenue_30d, revenue_all_time, active_subs, customers) · `sponsors` · `reports`
Phase 2+: `listings` · `listing_views` · `saves` · `conversations` · `messages` · `offers` · `deal_documents` · `affiliates` · `feed_posts`

## 6. Decisions log

| Date       | Decision                                           | Why                                                                                             |
| ---------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 2026-09-27 | Name: **MRRMafia**                                 | User choice                                                                                     |
| 2026-09-27 | Match TrustMRR UX/features; own brand, copy, data  | User wants TrustMRR's style; copying brand/data is a legal + ToS risk                           |
| 2026-09-27 | Stack: Next.js + Supabase + Vercel                 | Same class of stack as TrustMRR (Next + shadcn); Supabase/Vercel MCP connected                  |
| 2026-09-27 | **npm** instead of pnpm                            | pnpm not installed; npm ships with Node 26 — no global installs needed                          |
| 2026-09-27 | shadcn preset `radix-vega`, neutral base           | Its dark tokens equal TrustMRR's measured tokens                                                |
| 2026-09-27 | Fonts: Inconsolata + IBM Plex Sans Thai            | Match TrustMRR's mono look; Inconsolata has no Thai glyphs                                      |
| 2026-09-27 | Default locale `th`                                | Launch audience is Thai                                                                         |
| 2026-09-27 | Brand accent: crimson (`--brand`)                  | "Mafia" identity; single swap point in globals.css — revisit with user                          |
| 2026-09-27 | Hooks written as Node `.mjs`                       | Windows + bash + PowerShell all run Node identically                                            |
| 2026-09-27 | Quality hook runs whole-project `tsc` per TS edit  | ~8s per edit (eslint startup dominates); catches cross-file breakage. Revisit if it grows slow  |
| 2026-09-27 | Supabase agent skills vendored in `.claude/skills` | Official Postgres/RLS guidance for schema work; markdown only, reviewed; excluded from prettier |

## 7. Open items

- [ ] Restart the Claude Code session in `C:\Users\ACER\MRRMafia` so hooks, permissions and the browser-pane preview (`web`) go live; then run a visual check of `/th` and `/en`.
- [ ] **Docker not installed** → `supabase start` (local DB) unavailable. Options: install Docker Desktop, or use a remote Supabase dev project/branch via Supabase MCP. Decide before Phase 1 schema work.
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

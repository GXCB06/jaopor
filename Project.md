# JaoPor — Project

> Source of truth for **what** we build and **where we are**. UI rules live in [Design.md](Design.md); agent rules in [CLAUDE.md](CLAUDE.md); the completion log in [PROGRESS.md](PROGRESS.md). (Renamed from MRRMafia on 2026-09-29; repo, Supabase project and Vercel project keep the `mrrmafia` name.)

## 1. Vision

**JaoPor (เจ้าพ่อ) is the permanent, searchable home for things people build with AI (Thailand/Asia first), where every project can show verified numbers.**
Headline: **"1 คน + AI พีคได้แค่ไหน / ดูผลงานจริง ตัวเลขจริง"**.

Loop: paste one link (web, App Store/Play, LINE OA, GitHub) → public profile → connect read-only sources to verify numbers → share the card back into the community → others list theirs. Later: buyers discover and acquire (marketplace).

- **Why this direction** (research: [docs/research/fb-showoff-thread-and-metrics.md](docs/research/fb-showoff-thread-and-metrics.md)): the Claude Thailand "อวดโปรเจค 1 คน + claude" thread drew ~28K reactions and thousands of comments. Builders brag with users, visitors and commits far more than MRR; many ship LINE bots and mobile apps; many ask for users/feedback. The community already hand-builds indexes of the thread, but nobody offers owner-managed profiles + **verified** numbers + share cards.
- **Proof ladder** (each step raises trust and ranking): Listed → Built with AI (claimed) → Build proof (GitHub) → Traction verified (visitors / active users) → Revenue verified (MRR).
- Reference architecture: **TrustMRR** (trustmrr.com). We match its UX, features and flows. We do **not** copy its name, logo, marketing copy, assets or data. Every listing is created by its owner (never scraped, including from Facebook).
- Go-to-market: Claude Thailand Facebook group first; each founder's share card (posted back into the next "อวดโปรเจค" thread) is the marketing.

### Differentiators on top of parity

1. **Any AI-built project**, not only SaaS with Stripe: LINE OA, mobile apps, repos, free tools.
2. **Verified traction, not only revenue:** RevenueCat (apps), Plausible/Umami (visitors), GitHub build proof (commits, first commit, % co-authored by Claude).
3. **Community asks:** "looking for users / feedback / testers / co-founder / buyer / investor".
4. **Thai + English** everywhere (`/th`, `/en`), light/dark theme, THB display next to USD (later).
5. **AI build tools** on every profile (Claude Code, Claude, OpenCode, Cursor, Codex…).
6. Later: **Asian payment providers** (Omise/Opn, 2C2P) only once read-only keys are confirmed; App Store Connect downloads.

## 2. Users

| Persona                                              | Wants                                    | Gets from JaoPor                                                                 |
| ---------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| Solo AI builder (pre-revenue, LINE bot / app / tool) | Show the work, get users and feedback    | Profile from one link, verified visitors/commits, "looking for" asks, share card |
| Thai AI builder                                      | Credibility, visibility, bragging rights | Verified profile, rank, share card, embeddable badge                             |
| Founder ready to exit                                | Buyers, fair price, safe close           | Listing, buyer messages, deal flow                                               |
| Buyer / investor                                     | Trustworthy small startups in Asia       | Filters, verified numbers, alerts                                                |
| Curious visitor                                      | "How much do startups like mine make?"   | Leaderboards, stats, categories                                                  |

## 3. TrustMRR feature parity matrix

Status: ☐ not started · ◐ in progress · ☑ done

| Area           | Feature                                                                                                | Phase | Status |
| -------------- | ------------------------------------------------------------------------------------------------------ | ----- | ------ |
| Foundation     | Next.js + shadcn + Supabase + i18n scaffold                                                            | 0     | ☑      |
| Foundation     | Harness (memory, MCP, permissions, hooks, observability)                                               | 0     | ☑      |
| Auth           | Sign in (Google, GitHub) — code done, OAuth apps pending                                               | 1     | ◐      |
| Verification   | `RevenueProvider` abstraction                                                                          | 1     | ☑      |
| Verification   | Stripe restricted-key connector                                                                        | 1     | ◐      |
| Verification   | Metrics engine (MRR, 30d, all-time, subscriptions, customers, growth)                                  | 1     | ☑      |
| Verification   | Scheduled sync + "Verified with X · last updated" stamp                                                | 1     | ◐      |
| Verification   | RevenueCat (apps: MRR, revenue, active users; charts-only key) — pending a real-key check              | 1     | ◐      |
| Verification   | LemonSqueezy / Polar / Paddle / Creem / Dodo / Superwall / Whop / App Store Connect                    | 1–2   | ☐      |
| Profile        | Add wizard: one auto-detected link (web / App Store / Play / LINE OA / GitHub) → VerifyPanel           | 1     | ◐      |
| Profile        | "Looking for" asks (users, feedback, testers, co-founder, buyer, investor) + build story               | 1     | ☑      |
| Profile        | `/startup/[slug]` stat tiles, revenue chart, insights grid, screenshot, founder message                | 1     | ◐      |
| Discovery      | Homepage: hero, search, recently listed, best deals, leaderboard                                       | 1     | ◐      |
| Discovery      | `/startups` directory + category / country / tech-stack / channel pages                                | 1     | ◐      |
| Distribution   | OG share cards (Facebook/LINE, Thai font), embeddable SVG badge, share menu, post-listing share dialog | 1     | ☑      |
| Distribution   | `llms.txt` + AI-readable Markdown per startup                                                          | 1     | ☐      |
| Monetization   | Sponsor rails (left/right) + Advertise page                                                            | 1     | ☐      |
| Admin          | Moderation, reports, badge revoke                                                                      | 1     | ☐      |
| Marketplace    | Listing (asking price, margin, reason), auto multiple                                                  | 2     | ☐      |
| Marketplace    | `/acquire` filters + "best deals" ranking                                                              | 2     | ☐      |
| Marketplace    | Save, view counter, price-drop alerts                                                                  | 2     | ☐      |
| Marketplace    | Contact seller → offer → realtime chat; buyer & seller dashboards                                      | 2     | ☐      |
| Monetization   | Listing tiers Starter / Growth / Scale (visibility, card color, pin, newsletter)                       | 2     | ☐      |
| Deal flow      | NDA → LOI → APA (TH/EN, THB), escrow (Thai option; Escrow.com has no THB)                              | 3     | ☐      |
| Monetization   | 3% closing fee, affiliate program, add-ons, buyer alerts (filters + AI)                                | 3     | ☐      |
| Distribution   | Newsletter, LINE / Telegram alerts                                                                     | 3     | ☐      |
| Data           | Stats page, Revenue/LOC, Domain Rating, Olympics, Top 100, compare startups                            | 4     | ☐      |
| Community      | Feed + posting streaks, founder chats, co-founder finder                                               | 4     | ☐      |
| Community      | Tier-locked founder chat rooms, list mode (mobile) — see docs/research §1                              | 2     | ☐      |
| Community      | "Founder Town" pixel-town chat (desktop), in-world sponsor billboards                                  | 4     | ☐      |
| Engagement     | "$1 vs $1M" guessing game, startup-vs-startup compare pages                                            | 4     | ☐      |
| Marketplace    | Card social proof (views, saves), struck-through price drop, copy link, stealth mode                   | 2     | ☐      |
| AI layer       | Public API, JaoPor MCP server                                                                          | 4     | ☐      |
| Differentiator | Build proof (GitHub public repos) + traffic proof (Plausible, Umami) — pending real-key checks         | 1     | ◐      |
| Differentiator | Traffic proof without an analytics tool (our own snippet), PostHog, GA4                                | 2     | ☐      |
| Foundation     | Light / dark theme (dark default, header toggle)                                                       | 1     | ☑      |

## 4. Roadmap

### Phase 0 — Scaffold + harness ✅

- [x] Next.js 16 + TypeScript + Tailwind v4 + shadcn (radix-vega, neutral) scaffold
- [x] next-intl (`/th` default, `/en`), Inconsolata + IBM Plex Sans Thai, dark theme tokens
- [x] Supabase CLI init (`supabase/config.toml`)
- [x] Project.md, Design.md, PROGRESS.md, CLAUDE.md
- [x] Harness: permissions, hooks, observability logs, project skills
- [ ] User review of Project.md + Design.md ← **next**

### Phase 1a — v1 launch (Claude Thailand FB post, flexible date) — plan: [docs/launch-plan.md](docs/launch-plan.md)

- [x] A · Supabase project (remote, `ap-southeast-1`) + Vercel project + Google/GitHub OAuth + env vars — live at https://mrr-mafia.vercel.app (`sin1`), private repo `GXCB06/mrrmafia` auto-deploys, `/api/health` ok, GitHub + Google providers on
- [x] B · Schema v1 + RLS (`profiles`, `startups` incl. `ai_tools[]`, `provider_connections`, `revenue_snapshots`, `logos` bucket) — 10/10 RLS checks pass
- [ ] C · `RevenueProvider` + Stripe restricted-key connector + metrics engine + encrypted keys + daily cron + refresh — ◐ code + 20 unit tests done; **live Stripe test-key run pending** (done during D)
- [ ] D · UI: header/footer, homepage (hero, search, recently added, leaderboard, AI-tool chips), profile, `/startups`, add-startup wizard, dashboard — ◐ all built + visually checked (375 / 500 / 1280, TH + EN) with temporary demo data; **sign-in → wizard → Stripe → dashboard end-to-end pending OAuth apps + test key**
- [x] E · Share kit: share menu (native/copy/FB/LINE/X/badge HTML), OG image (Thai font, verified numbers), embeddable SVG badge, post-listing share dialog with a ready-to-paste post, founding badge "เจ้าพ่อรุ่นบุกเบิก #n" (first 100) — Facebook Sharing Debugger + LINE preview check pending deploy
- [x] E2 · **Repositioning to JaoPor** (2026-09-29): rename, headline "1 คน + AI พีคได้แค่ไหน / ดูผลงานจริง ตัวเลขจริง", light/dark theme, any project type (one auto-detected link), looking-for asks + build story, verified traction sources (RevenueCat, Plausible, Umami, GitHub) — ◐ live real-key checks pending (see §7)
- [ ] F · Trust pages (privacy/PDPA, terms, "How we handle your key") + `/security-review` + rate limits
- [ ] G · Production deploy + seed 5–10 real startups
- [ ] H · Launch post in Claude Thailand at the first 19:30–21:00 ICT slot after the launch gate passes

### Phase 1b — v1.x hardening (weeks 1–4 after launch)

- [ ] Metrics engine unit tests (Vitest) + Playwright happy path
- [ ] More providers: Polar, LemonSqueezy (after read-only scope check); App Store Connect downloads; PostHog
- [ ] Traction proof without an analytics tool: JaoPor visitor snippet
- [ ] Traffic leaderboard ("most visited", "most commits with Claude") next to the MRR leaderboard; directory filter "looking for users/feedback"
- [ ] Visitors chart on the profile (data already stored in `traffic_snapshots`); RevenueCat chart once 14+ daily snapshots exist
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
- [ ] Build proof for private repos (GitHub App, read-only metadata)
- [ ] Omise/Opn, 2C2P

## 5. Architecture

- **Web:** Next.js 16 App Router on Vercel. Server Components + ISR for public pages (SEO). Route handlers for API, webhooks, OG images, Markdown. `src/proxy.ts` (Next 16's renamed middleware) handles locale routing.
- **UI:** Tailwind v4 + shadcn/ui (radix-vega), dark by default + light theme. See Design.md.
- **i18n:** next-intl; messages in `messages/{th,en}.json`; `th` is the default locale.
- **Data:** Supabase — Postgres + RLS, Auth, Storage (logos/screenshots), Realtime (chat, Phase 2), AES-GCM for provider credentials.
- **Jobs:** Vercel Cron → `/api/cron/sync` → `syncSource` for every active connection → `startups` + `revenue_snapshots` / `traffic_snapshots`.

### Sources of verified numbers (`src/lib/sources`)

| Kind    | Source     | Credential (read-only proof)                                              | Belongs-to-project proof                                | Writes                                                   |
| ------- | ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| revenue | Stripe     | `rk_` restricted key; empty-body update probes must be 403                | owner connects it                                       | MRR, 30d, prev 30d, all-time, subs, customers + daily    |
| revenue | RevenueCat | v2 `sk_` key + project id; customers/apps reads must be 403 (charts-only) | owner connects it                                       | MRR, 30d, prev, all-time, subs, active users + 1 row/day |
| traffic | Plausible  | Stats API key; Sites API must refuse it                                   | site domain = website host (or subdomain)               | visitors 30d / prev 30d + daily                          |
| traffic | Umami      | public share link (view-only token); SSRF-guarded fetch                   | website domain in Umami = website host                  | visitors 30d / prev 30d + daily                          |
| build   | GitHub     | none (public repo, our optional no-permission token)                      | repo owner = founder's GitHub login / public org member | commits, first commit, Claude co-authored, stars         |

Rules: reject anything that can write; one source per kind per startup (connecting another replaces it and clears its numbers); aggregate data only (no customer PII); revenue normalized to USD; self-typed numbers are never shown as verified.

### Data model (live, migrations `schema_v1` + `merge_select_policies` + `founding_number_no_gaps` + `projects_links_traction`)

- `startups` v2 adds: `app_store_url`, `play_store_url`, `line_url`, `github_url` (website now optional; ≥ 1 link required), `looking_for[]`, `build_story`; server-only `active_users`, `traffic_provider`, `visitors_30d`, `visitors_prev_30d`, `traffic_synced_at`, `github_repo`, `build_first_commit_at`, `build_commits`, `build_ai_commits`, `build_stars`, `build_synced_at`.
- `provider_connections` v2: providers stripe/revenuecat/plausible/umami/github, nullable `encrypted_key` (GitHub has none), non-secret `config` jsonb (project id / site / repo), partial unique indexes = one revenue + one traffic source per startup.
- New `traffic_snapshots` (startup, day, visitors): public read for published startups, server writes.

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

| Date       | Decision                                                                                                                                                                            | Why                                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-27 | Name: **MRRMafia**                                                                                                                                                                  | User choice                                                                                                                                                                             |
| 2026-09-27 | Match TrustMRR UX/features; own brand, copy, data                                                                                                                                   | User wants TrustMRR's style; copying brand/data is a legal + ToS risk                                                                                                                   |
| 2026-09-27 | Stack: Next.js + Supabase + Vercel                                                                                                                                                  | Same class of stack as TrustMRR (Next + shadcn); Supabase/Vercel MCP connected                                                                                                          |
| 2026-09-27 | **npm** instead of pnpm                                                                                                                                                             | pnpm not installed; npm ships with Node 26 — no global installs needed                                                                                                                  |
| 2026-09-27 | shadcn preset `radix-vega`, neutral base                                                                                                                                            | Its dark tokens equal TrustMRR's measured tokens                                                                                                                                        |
| 2026-09-27 | Fonts: Inconsolata + IBM Plex Sans Thai                                                                                                                                             | Match TrustMRR's mono look; Inconsolata has no Thai glyphs                                                                                                                              |
| 2026-09-27 | Default locale `th`                                                                                                                                                                 | Launch audience is Thai                                                                                                                                                                 |
| 2026-09-27 | Brand accent: crimson (`--brand`)                                                                                                                                                   | "Mafia" identity; single swap point in globals.css — revisit with user                                                                                                                  |
| 2026-09-27 | Hooks written as Node `.mjs`                                                                                                                                                        | Windows + bash + PowerShell all run Node identically                                                                                                                                    |
| 2026-09-27 | Quality hook runs whole-project `tsc` per TS edit                                                                                                                                   | ~8s per edit (eslint startup dominates); catches cross-file breakage. Revisit if it grows slow                                                                                          |
| 2026-09-27 | Supabase agent skills vendored in `.claude/skills`                                                                                                                                  | Official Postgres/RLS guidance for schema work; markdown only, reviewed; excluded from prettier                                                                                         |
| 2026-09-29 | Remote Supabase project (no local Docker)                                                                                                                                           | Fastest path to launch; free tier; Singapore region is closest to Thai users                                                                                                            |
| 2026-09-29 | Auth: Google + GitHub OAuth only at launch                                                                                                                                          | Supabase's default email sender is heavily rate-limited → magic links would fail under launch traffic                                                                                   |
| 2026-09-29 | Launch timing: quality gate, not a date                                                                                                                                             | User: "make it effective" → post at the first evening slot after QA + seeding                                                                                                           |
| 2026-09-29 | Verified metrics cached on `startups`, protected by column grants                                                                                                                   | Leaderboard is one indexed query; founders can't write metric columns (only server sync can)                                                                                            |
| 2026-09-29 | `ai_tools` as a checked `text[]` + GIN index (no join table)                                                                                                                        | Fixed small vocabulary; "Built with Claude Code" filter is one `@>` query                                                                                                               |
| 2026-09-29 | No stealth mode and no SVG logos in v1                                                                                                                                              | `owner_id` is publicly readable (stealth needs a view first); SVG can carry scripts                                                                                                     |
| 2026-09-29 | Remote DB workflow: migration file → MCP `apply_migration` → advisors → `rls_smoke.sql`                                                                                             | No Docker; keeps a migration history plus a repeatable security test                                                                                                                    |
| 2026-09-29 | Stripe via REST `fetch`, not the SDK                                                                                                                                                | Tiny dependency surface; `fetchImpl` injection makes every error path unit-testable                                                                                                     |
| 2026-09-29 | Read-only proof: `rk_` only + invalid-param POST probes must return 403                                                                                                             | A restricted key can still carry write permissions; probes never create anything (the invalid param is rejected either way)                                                             |
| 2026-09-29 | Revenue = successful charges minus refunds (gross of Stripe fees); MRR = active + past_due subscriptions, interval-normalized; trials, discounts and tiered/metered prices excluded | Simple, explainable numbers; like TrustMRR, may differ from Stripe's own MRR — document on the "how we calculate" page                                                                  |
| 2026-09-29 | FX: ECB rates (Frankfurter) at sync-day rate; missing currencies excluded and flagged                                                                                               | Free, no key; never show a guessed number                                                                                                                                               |
| 2026-09-29 | Vitest 5 (+ `@types/node` 24)                                                                                                                                                       | Unit tests for metrics, crypto and provider logic; Node 26 runtime                                                                                                                      |
| 2026-09-29 | `localeDetection: false` — `/` always goes to `/th`                                                                                                                                 | Thai-first audience; many Thai users run English browsers                                                                                                                               |
| 2026-09-29 | Header auth is a client widget; public pages read with a cookie-free anon client + `revalidate = 60`                                                                                | Keeps home, directory and profiles static/ISR-cached (fast, cheap) while signed-in UI still works                                                                                       |
| 2026-09-29 | Chart colours `--chart-2 #00a86b` / `--chart-1 #2b7fff` (not TrustMRR's measured values)                                                                                            | TrustMRR's values failed the dataviz validator (lightness band, contrast < 3:1) on our dark surface                                                                                     |
| 2026-09-29 | `src/lib/public-env.ts` defaults for the public Supabase URL + publishable key                                                                                                      | Site runs before `.env.local` exists; both values are public by design. Secrets stay in `env.ts`                                                                                        |
| 2026-09-29 | Wizard writes directly with the user session (browser Supabase client)                                                                                                              | RLS + column grants already enforce ownership and protect metric columns; no extra API needed                                                                                           |
| 2026-09-29 | Quality hook runs `next typegen` when a page/layout/route file changes                                                                                                              | New routes otherwise always fail tsc (missing `PageProps`/`RouteContext` types)                                                                                                         |
| 2026-09-29 | Stripe write probe = empty-body update of a nonexistent id (403 ok / 404 reject / else error)                                                                                       | Stripe checks params before permissions: the old invalid-param probe rejected real read-only keys                                                                                       |
| 2026-09-29 | Add flow = 2 steps; insights live on the profile as always-visible `+ Add` / "Not added" cards                                                                                      | User feedback: too much to fill in; TrustMRR shows every section even when empty                                                                                                        |
| 2026-09-29 | Root font 112.5% (18px) + `color-scheme: dark`                                                                                                                                      | User feedback: site too small at 100%; native select menus were white on white                                                                                                          |
| 2026-09-29 | Founding number = max+1 under an advisory lock (no sequence)                                                                                                                        | Sequences burn numbers on failed inserts; badges must be contiguous                                                                                                                     |
| 2026-09-29 | **Rename to JaoPor (เจ้าพ่อ)**; infra names (repo, Supabase, Vercel) stay `mrrmafia`; fedora mark + crimson kept                                                                    | User request; "เจ้าพ่อ" is the Thai "godfather", so the identity carries over. Renaming infra would break OAuth callbacks and deploys for no user benefit                               |
| 2026-09-29 | **Showcase-first positioning** ("permanent home of the อวดโปรเจค thread") with a proof ladder; revenue stays the top rung                                                           | FB thread study (logged in, 102 threads): traction is told in users/visitors/commits, many LINE bots and apps, many ask for users/feedback; MRR-only would exclude most of the audience |
| 2026-09-29 | Headline "1 คน + AI พีคได้แค่ไหน / ดูผลงานจริง ตัวเลขจริง"                                                                                                                          | User choice; echoes the thread the community already knows                                                                                                                              |
| 2026-09-29 | One project link is enough (website OR App Store/Play/LINE OA/GitHub), auto-detected; DB CHECK requires ≥ 1                                                                         | LINE bots and apps often have no website; one field keeps the add flow under a minute                                                                                                   |
| 2026-09-29 | Traffic/build numbers must prove they belong to the project (domain match; repo owner = GitHub login)                                                                               | Otherwise anyone could attach a big site or famous repo to a small project                                                                                                              |
| 2026-09-29 | Umami via **share link**, not API key; every founder-supplied URL goes through an SSRF guard (https, public DNS only, no redirects)                                                 | Umami API keys have full account access; share links are view-only. Self-hosted Umami means fetching arbitrary hosts                                                                    |
| 2026-09-29 | RevenueCat read-only proof = customers + apps reads must return 403 (charts-only key); anything else fails closed                                                                   | v2 keys have per-area permissions; without read there is no write, and we never see customer data                                                                                       |
| 2026-09-29 | GitHub build proof reads public repos with no founder credential (optional no-permission `GITHUB_TOKEN`)                                                                            | Zero secrets to store; private repos wait for a GitHub App                                                                                                                              |
| 2026-09-29 | Light/dark theme without next-themes: inline head script + `localStorage`, dark default                                                                                             | No provider, no hydration warnings, ISR pages stay static; semantic tokens positive/negative/warning replace raw palette colours                                                        |
| 2026-09-29 | Share assets use **verified numbers only**; OG fonts vendored as woff (satori can't read woff2); OG/badge keep a mirrored hex palette                                               | Share cards are the growth loop and must be trustworthy; the OG renderer has no CSS variables                                                                                           |
| 2026-09-29 | Seed from the FB thread **by invitation only** (no scraping/importing comments)                                                                                                     | Consent + PDPA; profiles must be owner-managed to stay current                                                                                                                          |

## 7. Open items

- [x] ~~Restart the Claude Code session so hooks go live~~ → hooks confirmed live 2026-09-29 (quality + progress-gate fired)
- [ ] Confirm with a real Stripe **test-mode** restricted key that the write probes return 403 (the read-only proof depends on it)
- [ ] **Publish the Google OAuth consent screen** (Google Auth Platform → Audience → Publish app); until then only listed test users can use Google sign-in
- [ ] User should **reset the Google client secret** (it was pasted into chat on 2026-09-29) and update it in Supabase → Providers → Google
- [ ] Consider disabling the Supabase **Email** provider for v1 (UI only offers Google/GitHub; email sign-up via the API is still open)
- [ ] Browser-pane visual check of `/th` and `/en` (first real UI in block D)
- [x] ~~Docker not installed~~ → resolved 2026-09-29: using remote Supabase project `mrrmafia` (`letfxefyqxxrfujpwtri`, ap-southeast-1); migrations applied via Supabase MCP. Local Docker optional later.
- [ ] `ar-vocab-kids` Supabase project was paused to free a free-tier slot — restore it from the dashboard when needed (or upgrade the org).
- [ ] Confirm brand accent colour (crimson kept for JaoPor) and logo.
- [ ] Domain name for **JaoPor** (jaopor.com / .co / .app?) and rename the Vercel project URL (`mrr-mafia.vercel.app` today); then update `NEXT_PUBLIC_SITE_URL`, Supabase Site URL/redirects, OAuth app homepages.
- [ ] Rename the **GitHub OAuth app** ("MRRMafia") and the **Google consent screen** app name to JaoPor (user; both shown on sign-in).
- [x] ~~URL of the Thai "Product Hunt for Claude projects" competitor~~ → studied 2026-09-29: a community-made static index of the showoff thread (open.thaith.ai/1claude, harvested from comments, unverified links) and saasthai.com (~190 Thai SaaS, votes/reviews, no verified numbers). See docs/research §2b.
- [ ] Verify with real credentials (user pastes them in the UI): **RevenueCat** (value units: dollars vs cents; `customers`/`apps` probe paths return 403 for a charts-only key), **Plausible** (Sites API answer for a Stats key; error body for a foreign site), **Umami Cloud** share-link API base path.
- [ ] Optional `GITHUB_TOKEN` in Vercel (fine-grained, no permissions) so build proof isn't limited to 60 GitHub requests/hour.
- [ ] After deploy: Facebook Sharing Debugger + LINE preview of a profile URL (OG card).
- [ ] Traffic leaderboard + "looking for" directory filter (Phase 1b).
- [ ] Omise/Opn: do read-only keys exist? If not, don't support it.

## 8. Success metrics (first 30 days after launch)

- ≥ 20 projects seeded before launch, ≥ 10 with at least one verified number (revenue, visitors or build proof)
- Profile completion ≥ 60% of sign-ups
- Any source connected ≥ 40% (revenue ≥ 15%)
- Share-card share rate ≥ 30%
- Sign-ups per shared card (viral signal); week-4 founder return rate

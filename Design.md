# JaoPor — Design System

> Based on TrustMRR's UI (measured live on 2026-09-27): dark, monospaced, data-dense, calm. **We copy the style and patterns, not the brand**: no TrustMRR logo, star mark, copy or screenshots.
> Rule: build every screen from the tokens and components below. If a screen needs a new pattern, **add it here first**, then build it.

## 1. Principles

1. **Numbers are the hero.** Revenue, MRR, price and multiple are the most prominent things on every card and page. Decoration stays minimal.
2. **Dense but quiet.** Small uppercase labels, big numbers, thin borders, no shadows, no gradients.
3. **Monospace everywhere.** Gives a "terminal/ledger" feel that signals data and honesty.
4. **Dark by default, light on request.** Neutral greys in both themes. Colour appears only for meaning: green = growth/revenue, red = decline, amber = for sale/warning, brand crimson = JaoPor identity/verified.
5. **Trust is visible.** Every verified number sits near a "Verified with {provider} · updated {time}" stamp.
6. **Bilingual-first.** Every string comes from `messages/{th,en}.json`. Layouts must survive Thai text, which is ~20–30% longer and taller.

## 2. Color tokens

Defined in `src/app/globals.css` (shadcn variables). `.dark` (default) equals TrustMRR's measured values; `:root` is the light theme (shadcn neutral light). See **Theme** below.

| Token                                  | Dark value                  | Use                                                                 |
| -------------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| `--background`                         | `oklch(0.145 0 0)`          | Page background                                                     |
| `--foreground`                         | `oklch(0.985 0 0)`          | Primary text, numbers                                               |
| `--card` / `--popover`                 | `oklch(0.205 0 0)`          | Raised surfaces, dialogs                                            |
| `--secondary` / `--accent` / `--muted` | `oklch(0.269 0 0)`          | Hover fills, secondary buttons, chips                               |
| `--muted-foreground`                   | `oklch(0.708 0 0)`          | Labels, captions, secondary text                                    |
| `--primary`                            | `oklch(0.922 0 0)`          | Primary button background (light on dark)                           |
| `--primary-foreground`                 | `oklch(0.205 0 0)`          | Primary button text                                                 |
| `--border`                             | `oklch(1 0 0 / 10%)`        | All borders and dividers                                            |
| `--input`                              | `oklch(1 0 0 / 15%)`        | Input borders; input fill is `bg-input/30`                          |
| `--ring`                               | `oklch(0.556 0 0)`          | Focus ring                                                          |
| `--destructive`                        | `oklch(0.704 0.191 22.216)` | Errors, negative growth                                             |
| `--chart-1`                            | `#2b7fff`                   | Secondary series (previous period, **dashed**), links in charts     |
| `--chart-2`                            | `#00a86b`                   | **Revenue line** (green)                                            |
| `--brand` ★                            | `oklch(0.637 0.237 25.3)`   | JaoPor accent: logo, verified stamp, active nav. **Use sparingly.** |

Semantic tokens (added with the light theme; never use raw `emerald-*`/`red-*`/`amber-*` again, they fail contrast on white):

| Token        | Dark                        | Light                       | Utility / use                                                   |
| ------------ | --------------------------- | --------------------------- | --------------------------------------------------------------- |
| `--positive` | `oklch(0.765 0.177 163.2)`  | `oklch(0.508 0.118 165.6)`  | `text-positive`: growth up, "verified" ticks                    |
| `--negative` | `oklch(0.704 0.191 22.216)` | `oklch(0.505 0.213 27.518)` | `text-negative`: growth down                                    |
| `--warning`  | `oklch(0.828 0.189 84.429)` | `oklch(0.555 0.163 48.998)` | `text-warning`, `border-warning/40`: sync pending, FOR SALE tag |

- FOR SALE tag: `bg-warning/15 text-warning`
- Medals: 🥇🥈🥉 emoji (ranks 1–3), plain `#n` after that

★ The brand accent is the one place we intentionally differ from TrustMRR. Crimson is the working choice; change it only in `globals.css`. Light value: `oklch(0.577 0.215 27.3)`.

### Theme (light / dark)

- **Default dark** (the TrustMRR look); the visitor can switch to light with the header **ThemeToggle** (sun/moon icon button, `size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent`, `aria-label` from messages). The choice is stored in `localStorage.theme`.
- No flash: an inline script in `<head>` sets `class="dark"`/removes it and `color-scheme` before paint; the server renders `dark`.
- Both themes use the **same chart colours** (`#00a86b` / `#2b7fff`): dataviz validator passes on light (`#fcfcfb`, contrast ≥ 3:1, CVD ΔE 26) and dark.
- Every component must be built from tokens so it works in both; check each UI change in both themes.

## 3. Typography

- **Font:** `Inconsolata` (Latin, via `next/font`) → fallback `IBM Plex Sans Thai` (Thai glyphs) → `ui-monospace`. Set as `--font-sans` and `--font-mono`.
- `:lang(th)` sets `line-height: 1.6`, because Thai has stacked vowels and tone marks.

| Role                | Classes                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| Hero H1             | `text-3xl md:text-5xl font-bold tracking-tight mb-3`                             |
| Hero subline        | `text-sm md:text-base text-muted-foreground max-w-2xl mx-auto`                   |
| Page H1 (profile)   | `text-2xl md:text-3xl font-bold tracking-tight`                                  |
| Section H2          | `text-sm font-semibold` + optional "View all ›" link on the right                |
| Card title (H3)     | `text-sm font-semibold truncate`                                                 |
| Metric label        | `text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5` |
| Metric value (card) | `text-sm font-bold tabular-nums`                                                 |
| Big stat (tile)     | `text-2xl md:text-3xl font-bold tabular-nums`                                    |
| Body                | `text-sm` (14/20)                                                                |
| Caption / meta      | `text-xs text-muted-foreground`                                                  |
| Tag                 | `text-[9px] font-bold uppercase`                                                 |

Numbers are always `tabular-nums`. Money is formatted compactly on cards (`$4.3k`, `$300k`, `$1.2M`) and in full on the profile (`$14,903`). THB is secondary, shown as `≈ ฿154k` in muted text.

## 4. Layout

- **Global scale (user feedback 2026-09-29, "too small at 100%"):** `html { font-size: 112.5% }`, so 1rem = 18px. Every rem-based size (text, spacing, controls) scales up proportionally; the class names in this doc stay the same.
- **Native controls:** `color-scheme: dark` on `<html>`, so `<select>` popups, date/month pickers and scrollbars render dark (feedback: select options were white on white).
- **Container:** hero and leaderboard use `max-w-2xl` (~672px) centered. Directory and marketplace grids use `max-w-6xl`.
- **Sponsor rails:** at `xl` (≥1280px), a fixed-width column (~180px) of stacked `SponsorCard`s on each side of the main column. The last item is an "Advertise" link. Hidden below `xl`; on mobile, sponsors appear inline every N rows.
- **Gutter:** `px-4` (16px) on mobile; no horizontal scroll at 375px.
- **Spacing rhythm:** 4px base. Cards `p-3`; sections `mt-10`; card grids `gap-3`.
- **Radius:** `--radius: 0.625rem`. Cards `rounded-lg`, buttons and inputs `rounded-md` (8px), tags `rounded-bl-lg` on the corner only.
- **Elevation:** none. Separation comes from borders (`border`) and background steps (`bg-background/60` → `hover:bg-background`).

## 5. Components

Each component lives in `src/components/` (shadcn primitives in `src/components/ui/`).

### Header / Nav

- A minimal top bar: logo (brand mark + "JaoPor" wordmark) on the left.
- Links: Buy/Sell · Stats · Dashboard, then TH/EN switch and ThemeToggle.
- The homepage hero repeats the logo centred above the H1.

### SearchBar

- shadcn `Input`, `h-9 rounded-md border-input bg-input/30 px-10 text-sm`
- Leading search icon (lucide `Search`, muted)
- Placeholder is an example query in quotes, e.g. `"SaaS over $10K/mo"` / `"SaaS รายได้เกิน $10K/เดือน"`
- To the right, a secondary button: `+ Add startup`

### Buttons

- **Primary:** `bg-primary text-primary-foreground h-9 px-4 rounded-md text-sm font-medium` (light on dark)
- **Outline:** `border border-input bg-background hover:bg-accent px-6 py-2 rounded-md text-sm font-medium`
- **Text link:** `text-xs font-medium text-muted-foreground hover:text-foreground` with a trailing `›` (e.g. "View all ›")

### StartupCard (listing / grid)

```
┌───────────────────────────────┬─FOR SALE┐
│ [logo 32] Name                          │
│           Category                      │
│ REVENUE     PRICE       MULTIPLE        │
│ $4.3k       $300k       5.8x            │
└─────────────────────────────────────────┘
```

- `relative flex flex-col overflow-hidden rounded-lg border p-3 bg-background/60 hover:border-primary/30 hover:bg-background transition-all`
- FOR SALE tag: `absolute top-0 right-0 rounded-bl-lg bg-amber-900/30 px-2 py-0.5 text-[9px] font-bold text-amber-400`
- Metric row: 3 equal columns, each a _metric label_ over a _metric value_. When the startup is not for sale, the row is Revenue (30d) · MRR · Growth.
- The **large variant** (marketplace grid) adds a 2–3 line description (`text-xs text-muted-foreground line-clamp-3`) and a growth % beside the revenue.
- A horizontal-scroll row of cards is used for "Recently listed" and "Best deals this week".

### LeaderboardTable

- shadcn `Table`; rows `border-b hover:bg-muted/50 transition-colors`
- Columns: `#` (🥇🥈🥉 or number) · logo + name · founder (avatar 20px + handle) · MRR (right-aligned, bold) · MoM growth (emerald or red, right-aligned)
- Shows 50 rows, then a "Show more" outline button

### StatTile (profile)

- A bordered box: _metric label_ → _big stat_ → caption (`text-xs text-muted-foreground`, e.g. "Ranked #1460", "25 active subscriptions", "180 followers on 𝕏")
- Laid out in a 2×2 grid on mobile and 4-across on desktop: All-time revenue · MRR · Founder · Founded (with country flag)

### RevenueChart

- Chart colours were changed from TrustMRR's measured values (which failed the lightness and contrast checks on our dark surface) to validated ones; re-run the dataviz validator if they change.
- Recharts area/line, last 30 days, `--chart-2` 2px line with a subtle area fill. The previous period is a dashed `--chart-1` line when "Compare" is on; then a small legend appears (a single series needs none).
- Hover: crosshair + tooltip (date, revenue in text colours, not series colours). Grid and axes recessive (`--border`, `text-muted-foreground`, 10px).
- Header: 30d total (big) + `▲ 9% vs. prev period` + profit margin
- Toggles (shadcn `ToggleGroup`, `text-xs`): Compare previous period · Trend / Classic
- Footer: `VerifiedStamp`

### VerifiedStamp

- `text-xs text-muted-foreground`: "Revenue is verified with **Stripe** API key. Last updated: {datetime}"
- The provider name is in `text-foreground font-medium`, preceded by a small brand-coloured check icon
- If the last sync failed or is older than 48h: show amber "Sync pending"

### InsightsGrid (profile "Startup insights")

- Label/value blocks in 2 columns (1 on mobile). Each: _metric label_ → content.
- Order: Value proposition · Problem solved · Audience (B2B/B2C chip + user count) · Pricing · Team size · Funding · Domain Rating (`48 /100` + domain + helper text) · Marketing channels (chips) · Market (chips) · Tech stack (grouped Frontend/Backend chips) · **AI build tools** (chips with tool icons; JaoPor-specific) · Additional info
- Chips: `rounded-md border px-2 py-0.5 text-xs`

### ForSaleBanner (profile top)

- A full-width bar above the header: "This startup is for sale. Asking price: **$300,000**" · `5.8x revenue` · "👁 111 people saw this"
- Actions: Earn (affiliate) · Save (outline) · **Contact Seller** (primary)

### ScreenshotViewer

- A bordered frame of the startup's site screenshot at fixed height, scrollable inside, with a "View full page" link

### FounderMessage

- A quote card: `"…message…"`, then the founder avatar, name, and "Founder of {startup}"

### SponsorCard

- `rounded-lg border p-3 text-center` with a **tinted background colour chosen by the sponsor** (e.g. `bg-emerald-950/60`, `bg-purple-950/60`), a logo 24px, `text-xs font-bold` name, and a 2-line `text-[10px] text-muted-foreground` tagline

### Footer

- A multi-column link list: Navigation · Browse startups (categories) · API · About/legal. Tagline, then "Add startup" and "Browse N verified startups".

### Hero headline (home)

- Two lines on purpose: line 1 **"1 คน + AI พีคได้แค่ไหน"**, line 2 **"ดูผลงานจริง ตัวเลขจริง"** (EN: "How far can 1 person + AI go?" / "Real work. Real numbers."). Line 1 echoes the Claude Thailand "อวดโปรเจค" thread the community already knows. Each is a `block` span in the H1, so the break never falls mid-phrase.

### ProviderStrip ("Numbers verified by")

- Follows TrustMRR's "Revenue metrics are verified by: [logos]" line, under the hero subline.
- Label (`text-xs text-muted-foreground`), then chips: live providers as bordered chips with a brand check (`Stripe ✓`); upcoming providers as muted, dashed chips with a "coming soon" suffix.
- Adding a provider (skill `/add-payment-provider`) moves it from upcoming to live.

### InfoCard (profile field that may be empty)

- TrustMRR shows every insight section even when empty. Every profile field renders as a card: _metric label_, then value.
- **Empty + viewer is the owner:** a dashed-border inline link `+ Add` (`text-xs text-brand`) that opens the edit page at that field (`/dashboard/[id]/edit#<field>`).
- **Empty + viewer is a visitor:** muted "Not added" (`ยังไม่ได้เพิ่ม`).
- Owner detection is client-side (session user id vs `owner_id`), so the profile stays ISR-cached.
- Applies to stat tiles too: an unverified startup shows the revenue tiles with "—". The owner sees "Connect Stripe"; visitors see "Not verified yet".

### Dashboard startup card (replaces the plain list)

- `rounded-lg border p-4`. Header: logo 40, name, status chip (✓ Verified / Not verified / Sync error), Founding badge.
- A 3-tile row: MRR · Revenue (30d) · Last sync (muted when unverified).
- **Profile completeness bar:** filled fields out of total, `h-1.5 rounded bg-muted` with a `bg-brand` fill, plus "Add N more to stand out".
- **One primary action**, by state: `Connect Stripe` (unverified) → `View profile` (verified). Everything else (Edit, Refresh revenue, Copy link, Delete) goes in an overflow `DropdownMenu` (`⋯`).

### ProjectLinks (profile header)

- One pasted link is enough to list a project (website, App Store, Google Play, LINE OA or GitHub). The add form has a single **"Project link"** field that detects the kind and shows a muted chip under it (`ตรวจพบ: LINE OA`). A LINE ID like `@myshop` becomes an add-friend link.
- On the profile, links render as a row of outline buttons (`size="sm"`) with a lucide icon each: `Globe` (Website), `Smartphone` (App Store / Google Play, the label says which), `MessageCircle` (LINE OA), `Github` (GitHub). The first link is the primary "Visit".

### LookingForBanner ("กำลังหา…")

- The community's most common ask ("อยากได้ผู้ใช้", "ขอ feedback", "หา tester"). Owner picks any of: users · feedback · testers · co-founder · buyer · investor.
- Profile: a bordered strip under the header, `rounded-lg border border-brand/30 bg-brand/5 p-3 text-sm`, with a `HandHelping` icon, "กำลังหา:", the asks as chips, and the primary link button ("ลองใช้เลย").
- Card: a tiny `text-[9px] font-bold uppercase text-brand` tag with the first ask.
- Directory: filter chip "กำลังหาผู้ใช้ / feedback".

### VerifyPanel (connect verified numbers)

- Replaces the Stripe-only block on wizard step 2 and on the edit page (`#verify`). Three groups, each a bordered card: **Revenue** (Stripe | RevenueCat), **Visitors** (Plausible | Umami), **Build proof** (GitHub).
- Inside a group: the source switcher as small toggle buttons (`rounded-md border px-3 py-1 text-xs`, active = `bg-accent text-foreground`), then 2–3 numbered how-to lines, an outline "Open … settings" link when the provider has a deep link, the input(s), and one primary button "ยืนยัน".
- Connected state: `✓ {Source}` (`text-positive`), key hint / site / repo in muted mono, last sync, and Refresh · Disconnect text buttons. Errors are `text-destructive text-sm` with the provider-specific detail.
- One source per group: connecting RevenueCat replaces Stripe (confirm text says so).

### TractionTiles + BuildProof (profile)

- A second StatTile row titled **"ตัวเลขที่ยืนยันแล้ว"** under the revenue tiles: Visitors (30d) with growth vs previous 30d · Active users (28d, RevenueCat) · Build proof.
- Build proof tile: big number = commits; caption "{n}% co-authored by Claude · first commit {date}" and ★ stars. The build story (owner text, ≤ 280 chars) sits under it as a quote line.
- Each verified tile shows its source in the caption ("ยืนยันผ่าน Plausible"). Unconnected tiles: "—" + owner `+ เชื่อม` / visitor "ยังไม่ยืนยัน" (InfoCard rule).
- Never mix: visitors are never converted into revenue; self-typed numbers never appear in these tiles.

## 6. Page templates

| Route              | Structure (top → bottom)                                                                                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` Home           | Sponsor rails · logo · H1 · subline (visitor count + marketplace link) · SearchBar + Add startup · nav links · **Recently listed** row · **Best deals this week** row · **Leaderboard** (top 50) · Footer                                                                                               |
| `/startups`        | H1 + count · filter chips (category, country, provider, AI tool) · grid of StartupCards · pagination                                                                                                                                                                                                    |
| `/acquire`         | H1 + count · filter bar (revenue, MRR, growth, price, max multiple, margin, audience, mobile app, listing age, founded, country) · sort (Best deals default) · large StartupCard grid                                                                                                                   |
| `/startup/[slug]`  | ForSaleBanner (if listed) · header (logo, name, Share, Visit) · description · StatTiles · RevenueChart · InsightsGrid · ScreenshotViewer · FounderMessage · affiliate CTA · "More startups for sale" grid · "AI-readable Markdown" link                                                                 |
| `/stats`           | Headline totals · chart sections (see Project.md Phase 4)                                                                                                                                                                                                                                               |
| `/dashboard`       | Title + "+ Add Startup" · one **Dashboard startup card** per startup (v1). Later tabs: Saved · Conversations · Settings                                                                                                                                                                                 |
| Add-startup wizard | **2 short steps** (feedback: "too much to fill in"): 1) Name · **Project link** (auto-detected kind) · Category · Built with · Looking for (optional chips) · logo optional → 2) **VerifyPanel** (revenue / visitors / build proof) or skip. Insights are added later from the profile's `+ Add` cards. |

## 7. States

- **Loading:** skeletons shaped like the final component (`bg-muted animate-pulse rounded`). No spinners in content areas.
- **Empty:** muted one-liner + a primary action (e.g. "No startups in this category yet — Add yours").
- **Error:** `text-destructive text-sm` inline, plus a retry. Never show raw errors or stack traces.
- **Unverified:** numbers the founder typed themselves (not synced) are never shown as revenue. Show "Not verified yet" in muted text.

## 8. Responsive

- Breakpoints: Tailwind defaults. Test at **375**, 768, 1024 and 1440.
- The leaderboard hides the founder column below `sm` and keeps rank, name, MRR and growth.
- Card rows scroll horizontally on mobile with `snap-x`.
- Sponsor rails only at `xl`.

## 9. Share assets

- **OG image** (`/startup/[slug]/opengraph-image`): 1200×630, dark background, logo + name, big MRR / 30-day revenue, "Verified with Stripe", MRRMafia mark. Uses the Thai font for Thai names. Checked in the Facebook Sharing Debugger and the LINE preview.
- **Embeddable badge** (SVG): `Verified on MRRMafia · $2.9k MRR`, dark and light variants, linking to the profile.
- **Share menu** (profile header "Share" button → shadcn `DropdownMenu`): Copy link (toast "Link copied"), Facebook, LINE, X, "Copy badge HTML". Mobile uses `navigator.share` when available, then falls back to the menu.
- **Post-verify moment:** right after a successful Stripe verification, show a dialog with the OG card preview, the new rank ("#12 in Thailand"), and big Facebook / LINE / Copy-link buttons. This is the main share trigger.
- **Card "Copy link"**: a small icon button on every StartupCard (TrustMRR has it on every marketplace card).
- **Founding Mafia badge**: a chip `Founding Mafia #n` (`border-brand/40 text-brand text-[10px] font-bold`) on the profile header and card, for the first 100 startups.

## 10. Do / Don't

- ✅ Use tokens (`bg-background`, `text-muted-foreground`, `border`), never raw hex
- ✅ `tabular-nums` on every number; compact money on cards
- ✅ Every string goes through next-intl
- ❌ No shadows, gradients or glassmorphism, and no more than one accent colour per view
- ❌ No TrustMRR logo, star mark, wording or screenshots
- ✅ Check every UI change in dark **and** light

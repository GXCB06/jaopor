# JaoPor — Design System

> **v2 (2026-09-29): follows the user's Figma file** ("JaoPor", frames _Homescreen_ 129:3744, _Marketplace_ 124:1532, _Startup Public Profile_ 124:882, _Share button_ 129:3745) **and the functional reference** `ledgerly-4156.ai.studio` (sticky header with `/` search, leaderboard metric switch, filter sidebar, watchlist-style dashboard). Both are TrustMRR-style: zinc-dark, JetBrains Mono, dense, calm.
> **We copy layout and patterns, not the brand:** no TrustMRR/Ledgerly name, star mark, copy, screenshots or data. Our mark is the JaoPor fedora tile.
> Rule: build every screen from the tokens and components below. If a screen needs a new pattern, **add it here first**, then build it.

## 1. Principles

1. **Numbers are the hero.** Verified revenue, visitors and commits are the most prominent things on every card and page.
2. **Dense but quiet.** Tiny uppercase labels, bold numbers, 1px zinc borders, no shadows, no gradients (the chart's faint area fill is the one exception).
3. **Monospace everywhere** (JetBrains Mono): a "ledger" feel that signals data and honesty.
4. **Dark by default, light on request.** Zinc greys in both themes. Colour only for meaning: indigo = JaoPor / verified / chart, green = growth, red = decline, amber = "looking for" (later: for sale).
5. **Trust is visible.** Every verified number sits near "Verified with {source} · updated {time}".
6. **Bilingual-first.** Every string comes from `messages/{th,en}.json`. Layouts must survive Thai (~20–30% longer and taller).

## 2. Color tokens

Defined in `src/app/globals.css` (shadcn variables). Values measured from the Figma file (zinc scale). `.dark` is the default; `:root` is light.

| Token                                  | Dark (spec 2.1)       | Light                 | Use                                                                  |
| -------------------------------------- | --------------------- | --------------------- | -------------------------------------------------------------------- |
| `--background`                         | `#0a0a0b`             | `#ffffff`             | Page                                                                 |
| `--card`                               | `#141416`             | `#fafafa`             | Cards, tiles, leaderboard, chart, filter sidebar                     |
| `--popover` (spec `surface-2`)         | `#1e1e20`             | `#ffffff`             | Dialogs, menus                                                       |
| `--secondary` / `--muted` / `--accent` | `#18181b`             | `#f4f4f5`             | Chips, dropdown buttons, hover fills, segmented controls             |
| `--foreground`                         | `#ededed`             | `#09090b`             | Headings, numbers                                                    |
| `--muted-foreground`                   | `#a1a1a6`             | `#52525b`             | Descriptions, captions, body secondary                               |
| `--faint` (spec `text-subtle`)         | `#8a8a8f`             | `#71717a`             | Metric labels, table headers, placeholders, dot separators           |
| `--primary` / `--primary-foreground`   | `#f4f4f5` / `#09090b` | `#18181b` / `#fafafa` | Primary button (light on dark)                                       |
| `--border`                             | `#26262a`             | `#e4e4e7`             | All borders and dividers                                             |
| `--input`                              | `#3a3a40`             | `#e4e4e7`             | Input borders; input fill `bg-card`                                  |
| `--ring`                               | `#52525b`             | `#a1a1aa`             | Focus ring                                                           |
| `--brand` ★ (spec `accent`)            | `#6e6cf3`             | `#4f46e5`             | Fills: logo tile, selected, bars, borders (`border-brand/40`)        |
| `--brand-text`                         | `#8280f6`             | `#4f46e5`             | Indigo **text/icons/links** (`#6e6cf3` is 4.47:1 on cards, under AA) |
| `--surface-2`                          | `#1e1e20`             | `#ffffff`             | Modals, dropdowns (= popover)                                        |
| `--border-strong`                      | `#3a3a40`             | `#d4d4d8`             | Hover border on interactive cards, inputs                            |
| `--chart-1`                            | `#6e6cf3`             | `#4f46e5`             | **Revenue line** + faint area fill                                   |
| `--chart-2`                            | `#0d9488`             | `#0d9488`             | Previous period (**dashed**) when "Compare" is on                    |

Chart pair validated with the dataviz validator (2026-09-29; dark re-run 2026-09-30 with `#6e6cf3`): all checks pass. Re-run it if they change.

Spec 2.1 name map (2026-09-30): `bg`→`--background`, `surface`→`--card`, `surface-2`→`--surface-2`/`--popover`, `border`→`--border`, `border-strong`→`--border-strong`, `text`→`--foreground`, `text-muted`→`--muted-foreground`, `text-subtle`→`--faint`, `accent`→`--brand` (shadcn's `--accent` stays the hover fill), `paper`→`--primary`.

Semantic tokens (never raw `emerald-*`/`red-*`/`amber-*`):

| Token        | Dark      | Light     | Use                                                                                    |
| ------------ | --------- | --------- | -------------------------------------------------------------------------------------- |
| `--positive` | `#22c55e` | `#047857` | Growth up. Growth pill: `border-positive/30 bg-positive/10 text-positive rounded-full` |
| `--negative` | `#ef4444` | `#b91c1c` | Growth down                                                                            |
| `--warning`  | `#f59e0b` | `#b45309` | Corner tag (`border-warning/30 bg-warning/10 text-warning`), sync pending              |

★ The Figma accent is indigo; JaoPor adopted it on 2026-09-29 (was crimson). Change it only in `globals.css`.

### Theme (light / dark)

- Default dark; header **ThemeToggle** (sun/moon, `size-8 rounded-md`) switches, stored in `localStorage.theme`.
- The theme is **`<html data-theme="light|dark">`**, never a React-owned class: dark is the CSS default (`:root:not([data-theme="light"])`, `dark:` variant likewise). The inline `<head>` script sets it before paint; `PrefsSync` re-applies theme + currency in a layout effect when the `[locale]` layout remounts (a language switch used to reset a light theme to dark).
- Every component is built from tokens so it works in both; check each UI change in both themes.

## 3. Typography

- **Font:** `JetBrains Mono` (Latin, `next/font`, `--font-jetbrains`) → `IBM Plex Sans Thai` (Thai glyphs) → `ui-monospace`. `:lang(th)` line-height 1.6.
- **Scale:** `html { font-size: 112.5% }` (1rem = 18px; user feedback "too small at 100%"). Figma px sizes are written as rem (px ÷ 16), so the whole Figma layout renders 12.5% larger and stays proportional. Custom steps in `@theme`: `text-3xs` 9px · `text-2xs` 10px · `text-caption` 11px · `text-body` 13px (plus Tailwind `text-xs` 12px, `text-sm` 14px).

| Role                      | Classes (Figma px)                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Brand pill (hero)         | mark `size-4` + `text-xs font-semibold tracking-wide` (12)                                                       |
| Hero H1                   | `text-2xl md:text-[2.125rem] font-bold tracking-tight leading-tight` (34)                                        |
| Hero subline              | `text-body text-muted-foreground` (13); inline link `text-foreground underline`                                  |
| Page H1 (profile)         | `text-2xl font-bold tracking-tight` (24)                                                                         |
| Section H2                | `text-sm font-bold` (14) + "View all ›" `text-caption text-faint` on the right                                   |
| Card title                | `text-xs font-semibold truncate` (12); large card `text-body font-bold` (13)                                     |
| Metric label              | `text-3xs font-semibold uppercase tracking-wider text-faint` (9)                                                 |
| Metric value (card)       | `text-2xs font-bold tabular-nums` (10) — large card same                                                         |
| Table header              | `text-2xs font-bold uppercase tracking-wider text-faint` (10)                                                    |
| Tile label / value / note | `text-caption uppercase tracking-wider text-faint` · `text-2xl font-bold` · `text-caption text-muted-foreground` |
| Chart headline            | `text-3xl font-bold tabular-nums` (30)                                                                           |
| Body                      | `text-xs` (12) in cards/insights, `text-body` (13) for descriptions                                              |

Numbers are always `tabular-nums`. Money is compact on cards (`$4.3k`) and full on the profile (`$14,903`).

### Currency (USD / THB)

- Verified revenue is stored in USD cents. Visitors choose **฿ THB** or **$ USD** with the header **CurrencyToggle** (`h-8 rounded-md border bg-card px-2 text-xs font-semibold`, shows the active symbol; `aria-label` from messages). The choice lives in `localStorage.currency`. With nothing stored, `th` pages default to THB and `en` to USD.
- No flash, ISR-safe: the server renders **both** values (`<Money>` → `.cur-usd` + `.cur-thb` spans), an inline `<head>` script sets `html[data-currency]`, and CSS hides the other one. Client charts read the same attribute (`useCurrency()`).
- THB = USD × the day's ECB rate (Frankfurter, cached 6 h). The THB span has a `title` "≈ at 1 USD = {rate} THB". If the rate can't be fetched, only USD is rendered.
- Formats: `฿62K` compact, `฿62,350` full (Latin digits, no decimals).
- Share images, the OG card and the badge stay in USD (one canonical number when posted outside).

## 4. Layout

- **Container:** `max-w-5xl` (Figma 1040/1000) for home, profile, dashboard; `max-w-6xl` for the directory (sidebar + grid). Gutter `px-4`; no horizontal scroll at 375px.
- **Radius:** `--radius: 0.5rem`. Compact cards and dropdown buttons `rounded-lg` (8); profile tiles, insight cards, chart card, leaderboard, large cards `rounded-xl` (12); buttons/inputs `rounded-md` (6); pills `rounded-full`; tags `rounded-sm` (4).
- **Spacing:** compact card `p-3`, large card / tile `p-4`, chart card `p-6`; section gap `mt-9` (36); grids `gap-3`.
- **Elevation:** none. Separation from `bg-card` + `border`.
- **Native controls:** `color-scheme` follows the theme (dark `<select>` popups).

## 5. Components

Each lives in `src/components/` (shadcn primitives in `src/components/ui/`).

### Core components (spec 2.2, `src/components/core/`, 2026-09-30)

- **Card** `rounded-xl border bg-card`; `interactive` → `hover:border-border-strong hover:-translate-y-px`.
- **SegmentedControl** radiogroup: container `rounded-lg border bg-background p-0.5` (`dark:bg-black/40`); selected segment `border-foreground/10 bg-secondary shadow-xs` (`dark:bg-black`), others `text-muted-foreground`.
- **StatCard** (was StatTile): Card + UPPERCASE `text-caption text-faint` label, `text-2xl font-bold tabular-nums` value, muted caption.
- **InsightCard**: Card with a 40px `size-10 rounded-lg border bg-background` icon box, `text-2xs` UPPERCASE label, content.
- **VerifiedBadge**: `rounded-full` pill, `border-positive/30 bg-positive/10 text-positive` "ยืนยันแล้ว · Stripe" or muted `bg-secondary` "ยังไม่ยืนยัน". Shown next to the profile name (not on demo projects).
- **EmptyOwnerCard** (`profile/Owner.tsx`): dashed `border-brand/50 text-brand-text rounded-xl` "+ เพิ่ม{label}" / "+ เชื่อมต่อ{label}" link to the editor anchor; renders **nothing for visitors**. `OwnerOnly` wraps a section that is entirely empty.
- **UnverifiedLine**: one centered `text-caption text-faint` line "ยังไม่ยืนยัน: รายได้ทั้งหมด, MRR" (+ owner link to connect).
- **Medal**: ranks 1–3 as a `size-6 rounded-full border-2` numbered ring (gold `warning`, silver `muted-foreground`, bronze `warning/60`); replaces the emoji medals.
- **Logo** (`components/Logo.tsx`): `<Logo size variant="full|mark" />` = the user's **blue app tile** (winking fedora mascot on JaoPor blue; `public/brand/jaopor-tile.png`, 128px) + "JaoPor" wordmark (`font-extrabold tracking-[-0.02em]`). User decision 2026-09-30, replacing the spec's SVG "Rising Fedora". Same tile as the tab icon (`src/app/icon.png` 512, `apple-icon.png`, `favicon.ico`, `public/icon-192/512.png`). Image renderers (OG, share cards, badge) inline it as a data URI via `lib/logo.ts` (badge: 64px copy in `src/assets/`).

### SiteHeader (sticky, ledgerly pattern)

- `sticky top-0 z-40 border-b bg-background`, `h-14`, inner `max-w-6xl`.
- Left: `BrandLogo` = `<Logo>` (blue app tile 28px + "JaoPor" `font-extrabold tracking-[-0.02em]`); links home. Gaps `gap-3` below md so the header fits 375px. Nav links `text-xs text-muted-foreground hover:text-foreground` (active `text-foreground`): **Startups · Leaderboard (`/#leaderboard`) · Dashboard**. Hidden below `md`.
- Right: **CurrencyToggle** (฿/$, §3 Currency), **search trigger** (`h-8 rounded-md border bg-card px-2.5 text-xs text-faint` with a search icon, "ค้นหา", and a `kbd` "/"; pressing `/` anywhere focuses the page search or opens `/startups`), primary **"+ เพิ่ม Startup"** (`h-8`, icon-only below `sm`), HeaderAuth (`whitespace-nowrap`), TH/EN (short code `EN`/`TH` below `sm`), ThemeToggle.

### Hero (home and directory)

- Centered, `pt-10`: **brand pill** = a link home: the mascot (`public/brand/jaopor-mascot.webp`, the winking fedora with a rising chart line, `size-9`) + "JaoPor" (`text-sm font-bold`), same on home and directory → H1 → subline → ProviderStrip → **SearchBar row** (`max-w-xl`) → secondary links row (`text-caption text-faint`, dot separated: เพิ่ม Startup · กระดานผู้นำ · Dashboard).
- Home H1 is two deliberate lines: **"1 คน + AI พีคได้แค่ไหน"** / **"ดูผลงานจริง ตัวเลขจริง"** (EN "How far can 1 person + AI go?" / "Real work. Real numbers."), each a `block` span.

### ProviderStrip ("Numbers verified by")

- Label `text-caption text-muted-foreground`, then one row of **real provider logos** (user request 2026-09-30): `size-8 rounded-lg` tiles in the brand's own colour with the glyph in white (dark glyph on yellow brands), `ring-1 ring-border` so black tiles show on the dark page. Hover/focus shows a tooltip with the name (`bg-popover border rounded-md text-xs`). Upcoming sources are the same tiles at `opacity-40` with "coming soon" in the tooltip.
- Logos: Simple Icons SVG paths (CC0) in `src/lib/brand-icons.ts`, used only to say which service verifies a number (no endorsement implied). Polar has no Simple Icons entry, so it's a letter tile. Brand colours are the second hex exception after the image renderers.

### SearchBar

- Input `h-9 rounded-md border-input bg-card pl-9 text-xs placeholder:text-faint`, leading search icon, trailing `kbd` "/" (hidden on mobile). Placeholder is an example query in quotes.
- Right: primary button `+ เพิ่ม Startup` (`bg-primary text-primary-foreground h-9 rounded-md px-3.5 text-xs font-semibold`; icon-only below `sm` so the input keeps its width).

### Buttons

- **Primary:** `bg-primary text-primary-foreground rounded-md text-xs font-semibold`
- **Outline/ghost-card:** `border bg-card hover:bg-accent rounded-md text-xs font-medium` (profile Share)
- **Dropdown button:** `h-7 rounded-lg border bg-secondary px-2.5 text-xs` + chevron (leaderboard metric, chart range)
- **Text link:** `text-caption text-faint hover:text-foreground` with trailing `›`

### StartupCard — compact (home rows)

```
┌──────────────────────────────┐
│[24] Name            [TAG]    │   tag = corner tag (see below)
│     Category                 │
│──────────────────────────────│   border-t
│ REVENUE   MRR      GROWTH    │   3 metrics
│ $4.3k     $1.2k    ▲ 9%      │
└──────────────────────────────┘
```

- `relative rounded-lg border bg-card p-3 hover:border-foreground/20`; logo 24 `rounded-sm`; title 12 semibold; category 10 muted.
- Metric row `mt-3 border-t pt-2 grid grid-cols-3 gap-1`: label 9 / value 10 bold.
- **Corner tag** `absolute top-2 right-2 rounded-sm border px-1.5 py-0.5 text-3xs font-bold uppercase tracking-wider`: `✓ Verified` (positive tone; **check only** on compact cards so the name stays readable, label kept for screen readers) when revenue or traffic is verified, else the first **looking-for** ask in amber (Figma's FOR SALE slot until the marketplace ships), else none.
- Metrics by state (compact cards use the short labels "Revenue" / "Visitors"): verified revenue → Revenue (30d) · MRR · Growth; else traction → Visitors · Growth · Commits; else one muted "Not verified yet" line.
- Home rows are a **plain grid, no horizontal scrolling** (user feedback 2026-09-30): `grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3`. Show 6 cards below `lg` (2×3 / 3×2) and 5 at `lg`.

### StartupCard — large (directory grid, "More startups")

- `rounded-xl border bg-card p-4 flex flex-col justify-between`. Header: logo 36 `rounded-lg`, name 13 bold, category chip (`rounded-sm border bg-secondary px-1.5 text-3xs text-muted-foreground`), corner tag on the right; then 2-line tagline `text-caption text-muted-foreground line-clamp-2`; footer `mt-4 border-t pt-4` 3 metrics (label 10 / value 10 bold, revenue shows growth inline in positive/negative).
- Copy-link icon button stays (top right, next to the tag, `opacity-0 group-hover:opacity-100` on desktop).

### LeaderboardCard

- One `rounded-xl border bg-card` container with `id="leaderboard"`.
- Header row `px-5 py-3.5 border-b`: "Leaderboard" (`text-sm font-bold`) + a **LIVE dot** (`size-1.5 rounded-full bg-positive`) + right-side **metric dropdown**: MRR · Revenue (30d) · Visitors (30d) · Commits. Switching is client-side (lists are fetched server-side, page stays ISR).
- Table (shadcn `Table`): header `text-2xs uppercase text-faint`; rows `border-b hover:bg-accent/40`, `py-3`:
  - `#` (`Medal` rings 1–3, then number, `text-faint`) · logo 24 + name (`text-xs font-semibold`) over tagline (`text-2xs text-faint truncate`) · founder (avatar 16 round + name `text-xs text-muted-foreground`, hidden below `sm`) · value (right, `text-xs font-bold`) · growth (right, `text-xs`, hidden below `sm` for commits).
- Shows 10 rows, then "Show all (n) ↓" text button reveals up to 50. Footer line centered `text-2xs text-faint`: "Only verified numbers · synced from Stripe, RevenueCat, Plausible, Umami, GitHub".

### Profile header

- Breadcrumb `text-2xs text-faint`: `JaoPor › Startups › {name}` (last item `text-foreground`).
- Row: logo 72 `rounded-2xl border` · name (`text-2xl font-bold`) + founding badge + `VerifiedBadge` · description paragraph `text-body text-muted-foreground max-w-2xl` (tagline, then the long description); right side actions: **Share** (outline-card button, opens ShareStudio) and **Visit ↗** (primary; the first project link).
- Under it: other ProjectLinks (small outline buttons) and the LookingForBanner.

### StatCard (profile quick stats)

- `rounded-xl border bg-card p-4 space-y-2`: label (`text-caption uppercase tracking-wider text-faint font-semibold`) → value (`text-2xl font-bold tabular-nums`) → note (`text-caption text-muted-foreground`).
- Row (`grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3`), **only tiles with data**: **All-time revenue** (note: "Ranked #n on JaoPor") · **MRR** (note: "n active subscriptions") · **Founder** (avatar 20 + name as value at `text-base`; note: 𝕏 handle) · **Founded** (month year; note: province + localized country name via `Intl.DisplayNames`; no flag emoji, Windows renders them as letters).
- **Empty-state rule (spec 2.4):** unverified revenue/MRR tiles are dropped and replaced by one `UnverifiedLine`; Founded without a date shows as **Location** (ที่ตั้ง); nothing at all → owner-only `EmptyOwnerCard`. Visitors never see "–".

### RevenueChartCard

- `rounded-xl border bg-card p-6`.
- Header: 30-day total (`text-3xl font-bold`) + growth pill ("↑ 42% vs. prev period") on the left; right: range dropdown (**7 days · 30 days · 60 days**).
- Plot `h-64`: Recharts area, `--chart-1` 2px line, faint area fill (0.25 → 0), grid `--border` horizontal only, axes `text-2xs` `--faint`. Hover: crosshair + tooltip (text tokens, never series colours).
- Footer `mt-4 flex justify-between`: switches (shadcn-style 28×16 track) **Compare previous period** (adds dashed `--chart-2` line + mini legend) and **Trend view** (7-day moving average); right: nothing for now.
- Below the card, centered: **VerifiedStamp**.

### VerifiedStamp

- `text-caption text-muted-foreground`, centered line: brand check icon · "Revenue is verified with **{Source}** API key. Last updated: {datetime}". Stale (> 48h) or error → amber text.

### InsightsGrid ("Startup insights" bento)

- H2 then `grid sm:grid-cols-2 gap-3.5`. Each card `rounded-xl border bg-card p-4 space-y-3`: header = lucide icon `size-3.5 text-faint` + label (`text-2xs font-bold uppercase tracking-wider text-faint`); body `text-xs text-muted-foreground leading-relaxed`; chips `rounded-full border bg-secondary px-2.5 py-0.5 text-caption`.
- Order and icons: Value proposition (`Lightbulb`) · Problem solved (`ShieldCheck`) · Audience (`Users`, chip B2B/B2C) · Market / category (`Tag`) · Pricing (`DollarSign`) · Tech stack (`Code2`, chips) · Team size (`User`) · **AI build tools** (`Sparkles`, JaoPor-specific) · Funding (`Landmark`) · Marketing channels (`Megaphone`) · Founder message (`Quote`, wide).
- InfoCard rule applies: empty → owner `+ Add` (deep link to the editor field) / visitor "Not added".

### More startups (profile bottom)

- H2 "More startups" + "View all →" link; `grid sm:grid-cols-2 lg:grid-cols-3 gap-3` of large StartupCards (same category first, then newest; 6 max).

### ShareStudio (Figma "Share button")

Dialog `sm:max-w-xl rounded-xl bg-popover`, title "Share verified numbers":

1. **Startup link**: read-only input (`bg-card`) + `Copy` outline button.
2. **Segmented tabs** (`rounded-lg border bg-card p-0.5`, active `bg-secondary text-foreground`): **Badge · Chart · Calendar · Post**.
3. Options row (image tabs only): **Theme** segmented Light/Dark; **Period** segmented (Chart: 7d / 30d / 60d; Calendar: 3 / 6 / 12 months) ; **Colour** row of 12 round swatches (`size-6 rounded-full`, selected shows a check), label shows the colour name ("JaoPor indigo" default).
4. **Preview**: the server-rendered PNG in a `rounded-xl border bg-card p-4` frame.
5. Footer: **Download image** (outline, `download` attribute) and for Post: the ready-to-paste thread post with Copy text (primary), Facebook, LINE, Copy link, plus badge HTML copy.

- Images come from `GET /api/share-card/[slug]?kind=badge|chart|calendar&theme=light|dark&color=<id>&period=<n>` (next/og, 1200×630 for chart/calendar, 800×300 for badge), **verified numbers only**; unverified revenue → the card uses the strongest verified metric or says "Not verified yet". Colours come from a fixed server-side swatch list (ids, never raw user hex).
- Opens from the profile **Share** button and automatically after listing/verifying (`?new=1` / `?verified=1`, stripped on close).

### Directory (`/startups`, Figma "Marketplace")

- Hero (brand pill, H1, subline, ProviderStrip, SearchBar) then `grid lg:grid-cols-[15rem_1fr] gap-4`.
- **FilterSidebar** (`rounded-xl border bg-card p-4 space-y-4`, title "FILTERS" `text-3xs text-faint` above it): Category (select) · AI tool (select) · Verified only (checkbox) · Project type (Website / App / LINE OA / GitHub select) · Looking for (select) · Reset link. GET form, works without JS; on mobile it collapses into a `<details>` "Filters" disclosure.
- Results header: "{n} startups found" (`text-caption text-muted-foreground`) + sort select (Top MRR · Most visitors · Newest · Most commits).
- Grid `sm:grid-cols-2 gap-3` of large StartupCards; pagination below.

### Demo projects (`startups.is_demo`)

- Sample projects that fill the site before launch. Card: corner tag `Demo` (neutral: `border bg-secondary text-muted-foreground`), which replaces the verified/ask tag. Profile: a strip above the stat tiles (`rounded-xl border border-dashed bg-card p-3 text-xs text-muted-foreground`, `FlaskConical` icon): "Demo project: sample numbers for illustration, not a real business." The verified stamp says "Sample data" instead of naming a provider.
- Demo rows are excluded from share images and the badge (they render "not verified").
- Remove them all with `delete from startups where is_demo`.

### ProjectLinks, LookingForBanner, TractionTiles, VerifyPanel, Dashboard card, InfoCard

Unchanged behaviour (see git history of this file for the full spec); restyle only through tokens:

- **ProjectLinks:** one link lists a project (website / App Store / Play / LINE OA / GitHub); outline `size="sm"` buttons with lucide `Globe`/`Smartphone`/`MessageCircle`/`Code`.
- **LookingForBanner:** `rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs` with `HandHelping` icon, asks as chips, primary "Try it" link.
- **TractionTiles:** StatCard row (only metrics with data; owner sees EmptyOwnerCards) "Verified traction": Visitors (30d) · Active users · Build proof (commits, % co-authored by Claude, first commit). Never convert users into revenue; self-typed numbers never appear.
- **VerifyPanel:** three bordered groups (Revenue: Stripe | RevenueCat · Visitors: **JaoPor snippet** | Plausible | Umami | Cloudflare · Build proof: GitHub), segmented source switch, numbered how-to, one primary "Verify". One source per group.
  - **JaoPor snippet** (no analytics account needed; listed first): a read-only code box (`rounded-lg border bg-card p-3 font-mono text-caption`) with the one-line `<script>` and a Copy button, then the install status: "รอการเข้าชมครั้งแรก" / "Waiting for the first visit" (muted, pulsing dot) → "นับตั้งแต่ {date}" / "Counting since {date}" (positive).
  - **Cloudflare:** API token (Account Analytics: Read only) + account ID. Numbers are **visits** (sessions), labelled so.
- **TractionTiles source captions:** "นับโดย JaoPor ตั้งแต่ {date}" / "Counted by JaoPor since {date}" for the snippet; "ยืนยันผ่าน Cloudflare · visits" for Cloudflare.
- **Tech stack card (InsightsGrid):** the owner's list; if empty, the stack detected from the connected GitHub repo, captioned "ตรวจพบจาก GitHub" / "Detected from GitHub" (`text-2xs text-faint`). Detection never overwrites the owner's list.
- **Dashboard startup card:** `rounded-xl border bg-card p-4`, status chip, 3 tiles, completeness bar (`bg-brand`), one primary action + `⋯` menu.
- **Empty fields (spec 2.4, replaces InfoCard's "always render" rule 2026-09-30):** visitors see only fields with data (InsightsGrid, TractionTiles, build story, tagline/description); the owner sees each empty slot as an `EmptyOwnerCard`; a section with no data at all is owner-only. Owner detection is client-side so the profile stays ISR.

### Footer

- `border-t mt-16`: 4 columns (brand + tagline · Navigation · Browse startups by category · About/legal), headings `text-3xs uppercase text-faint`, links `text-caption text-faint`; bottom line centered `text-2xs text-faint`: "© 2026 JaoPor · Built with JaoPor.dev in Thailand".

## 6. Page templates

| Route              | Structure (top → bottom)                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/` Home           | Header · Hero (pill, H1, subline, ProviderStrip, SearchBar, links) · **Recently listed** (5 compact cards) · **Top traction** (5 compact cards, by verified visitors/commits) · **LeaderboardCard** · Footer |
| `/startups`        | Header · Hero · FilterSidebar + results header + large card grid + pagination                                                                                                                                |
| `/startup/[slug]`  | Breadcrumb · Profile header (logo, name, description, Share, Visit) · links + LookingFor · StatCards (data only) · RevenueChartCard (Stripe) · VerifiedStamp · TractionTiles · InsightsGrid · More startups  |
| `/dashboard`       | Title + "+ Add Startup" · Dashboard startup cards                                                                                                                                                            |
| Add-startup wizard | 2 steps: 1) name · project link (auto-detected) · category · built with · looking for · logo → 2) VerifyPanel or skip                                                                                        |
| `/acquire`         | Phase 2: Directory layout + price/multiple filters and FOR SALE tags                                                                                                                                         |

## 7. States

- **Loading:** skeletons shaped like the final component (`bg-muted animate-pulse rounded`). No spinners in content areas.
- **Empty:** muted one-liner + a primary action.
- **Error:** `text-destructive text-sm` inline, plus a retry. Never raw errors.
- **Unverified:** founder-typed numbers are never shown as revenue; show "Not verified yet".

## 8. Responsive

- Test at **375**, 768, 1024, 1440, in dark and light.
- Header nav links hide below `md`; "+ Add" becomes icon-only below `sm`.
- Home card rows wrap as a 2- or 3-column grid below `lg`; the leaderboard hides founder + growth below `sm`.
- Directory sidebar collapses into a disclosure below `lg`.

## 9. Share assets

- **Brand assets (2026-09-29, from the user):** mascot without background → home hero (`public/brand/jaopor-mascot.webp`, 512px, trimmed). Blue app tile → browser tab / home-screen icons (`src/app/icon.png` 512, `apple-icon.png` 180, `favicon.ico` 16–64; the source's painted checkerboard was cropped away and the corners made transparent). **2026-09-30 (final, user):** the blue app tile is the mark everywhere: tab icon, header, footer, login, OG, share cards, badge. The spec's SVG "Rising Fedora" was tried and dropped. The mascot without background stays in the hero pill.

- **Which numbers:** `lib/share.ts → shareMetrics()` picks up to 3 **verified** numbers, strongest first: MRR → revenue 30d → visitors 30d → active users → commits.
- **OG image** (`/[locale]/startup/[slug]/opengraph-image`): 1200×630 dark card (mark, name, tagline, up to 3 metric boxes, "✓ verified via …", URL). Fonts vendored in `src/assets/fonts` (OFL). The OG renderer has no CSS variables, so it keeps one `C` palette mirroring the `.dark` tokens (exception to "no raw hex"); the share-card route shares that palette.
- **Site OG card** (`/[locale]/opengraph-image`, 2026-09-30): tile + "JaoPor" + the two headline lines (second in brand) + host, on `bg`. Used by every page without its own image. Layout metadata sets `og:title/description/site_name/locale/type` and `twitter:card`; **no `og:url` in the layout** (children would inherit the home URL). Profiles repeat the full `openGraph` object (Next merges it shallowly) with their own `url` + description (tagline, else the first 200 chars of the description). Demo projects never put numbers in the title.
- **Embeddable badge** (`/api/badge/[slug]`, SVG, 28px high, `?theme=light`) + HTML snippet.
- **ShareStudio** (§5) replaces the old share dialog and dropdown; the profile Share button opens it.
- **Card "Copy link"** icon button on every StartupCard.
- **Founding badge** `เจ้าพ่อรุ่นบุกเบิก #n` / `Founding JaoPor #n` (`border-brand/40 text-brand-text text-2xs font-bold rounded-sm`) for the first 100 projects.

## 10. Do / Don't

- ✅ Tokens only (`bg-card`, `text-faint`, `border`), never raw hex (OG/share-card renderers and ShareStudio swatch dots excepted: `src/lib/share-palette.ts`)
- ✅ `cn()` (`src/lib/utils.ts`) registers the custom font-size steps; add new `--text-*` steps there too, or class merging drops them
- ✅ `tabular-nums` on every number; compact money on cards
- ✅ Every string goes through next-intl
- ❌ No shadows, gradients or glassmorphism; one accent colour per view
- ❌ No TrustMRR/Ledgerly name, star mark, wording, screenshots or data
- ✅ Check every UI change in dark **and** light, desktop **and** 375px

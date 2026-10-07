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

**Region colours** (spec 4.2, `--region-*`, 2026-09-30), from the dataviz reference palette: north blue `#3987e5`/`#2a78d6`, northeast orange `#d95926`/`#eb6834`, central aqua `#199e70`/`#1baf7a`, east violet `#9085e9`/`#4a3aa7`, west yellow `#c98500`/`#eda100`, south magenta `#d55181`/`#e87ba4` (dark/light). Six hues can't pass an all-pairs check, so they were validated for the **8 pairs of bordering regions** in both themes (all pass). Several light values are under 3:1 on white: a region colour is always paired with its name (legend or label), never colour alone.

Spec 2.1 name map (2026-09-30): `bg`→`--background`, `surface`→`--card`, `surface-2`→`--surface-2`/`--popover`, `border`→`--border`, `border-strong`→`--border-strong`, `text`→`--foreground`, `text-muted`→`--muted-foreground`, `text-subtle`→`--faint`, `accent`→`--brand` (shadcn's `--accent` stays the hover fill), `paper`→`--primary`.

Semantic tokens (never raw `emerald-*`/`red-*`/`amber-*`):

| Token        | Dark      | Light     | Use                                                                                                                                      |
| ------------ | --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `--positive` | `#22c55e` | `#047857` | Growth up. Growth pill: `border-positive/30 bg-positive/10 text-positive rounded-full`                                                   |
| `--negative` | `#ef4444` | `#b91c1c` | Growth down                                                                                                                              |
| `--warning`  | `#f59e0b` | `#b45309` | Corner tag (`border-warning/30 bg-warning/10 text-warning`), sync pending                                                                |
| `--info`     | `#2dd4bf` | `#0f766e` | Feedback posts (teal, Phase 10): type chip, "ให้ Feedback" button, the feed's "รอ Feedback" card (`border-info/40 bg-info/10 text-info`) |

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

### Edit form vocab fields (spec Phase 1, 2026-09-30; Phase 2 upgrades them to searchable logo multi-selects)

- **Province:** native `<select>` (`ProvinceSelect`) with one `<optgroup>` per region (6), provinces sorted by the page language; only shown when the country is Thailand.
- **Pricing:** fieldset of billing period (month / year / one-time / free) → amount + currency (฿ THB / $ USD) when paid → free-text details. Profile shows "฿990 / เดือน" (`text-sm font-semibold tabular-nums`) above the note.
- **Tech stack:** one `ToggleChips` row per stored group under a `text-2xs text-muted-foreground` group label. Profile groups chips under muted sub-labels and skips empty groups.
- **Marketing channels:** `ToggleChips` of the config list + one "other channels" text input (comma separated → `custom:` values, max 10 in total).

### SiteHeader (sticky, ledgerly pattern)

- `sticky top-0 z-40 border-b bg-background`, `h-14`, inner `max-w-6xl`, gaps `gap-3` (`md:gap-6`).
- Left: `BrandLogo` = `<Logo>` (blue app tile 28px + "JaoPor"). **Nav links from `lg`** (`text-xs text-muted-foreground hover:text-foreground`): สตาร์ทอัพ · หมวดหมู่ · โอลิมปิก · กระดานผู้นำ · แดชบอร์ด (`whitespace-nowrap`, `gap-4`/`xl:gap-5`; แดชบอร์ด only from `xl` because five links don't fit at 1024px and it is also in the avatar menu). Right-side gaps `lg:gap-2 xl:gap-3`.
- Right: **CurrencyToggle** (฿/$; "THB/USD" text from `lg`), **search trigger** (`/` shortcut), primary **"+ เพิ่ม Startup"** (icon-only below `sm`), **HeaderAuth** (signed out: "เข้าสู่ระบบ" from `sm`, a `LogIn` icon button below; signed in: avatar menu), TH/EN (full name from `lg`) and ThemeToggle (both from `sm`), then **MobileNav** below `lg`: a `size-8` `Menu` icon button opening a DropdownMenu with the nav links, and below `sm` also the language switch and the theme switch.
- Must fit 360px (no horizontal scroll), 768px and 1024px in both languages.

### Hero (home and directory)

- Centered, `pt-10`: **brand pill** = a link home: the mascot (`public/brand/jaopor-mascot.webp`, the winking fedora with a rising chart line, `size-9`) + "JaoPor" (`text-sm font-bold`), same on home and directory → H1 → subline → ProviderStrip → **SearchBar row** (`max-w-xl`) → secondary links row (`text-caption text-faint`, dot separated: เพิ่ม Startup · กระดานผู้นำ · Dashboard).
- Home H1 is two deliberate lines: **"1 คน + AI พีคได้แค่ไหน"** / **"ดูผลงานจริง ตัวเลขจริง"** (EN "How far can 1 person + AI go?" / "Real work. Real numbers."), each a `block` span.

### ProviderStrip ("Numbers verified by")

- Label `text-caption text-muted-foreground`, then one row of **real provider logos** (user request 2026-09-30): `size-8 rounded-lg` tiles in the brand's own colour with the glyph in white (dark glyph on yellow brands), `ring-1 ring-border` so black tiles show on the dark page. Hover/focus shows a tooltip with the name (`bg-popover border rounded-md text-xs`). Upcoming sources are the same tiles at `opacity-40` with "coming soon" in the tooltip.
- Logos: Simple Icons SVG paths (CC0) in `src/lib/brand-icons.ts`, used only to say which service verifies a number (no endorsement implied). Polar has no Simple Icons entry, so it's a letter tile. Brand colours are the second hex exception after the image renderers.

### QuickSearch (spec 6.8, Phase 4 — replaces SearchBar)

- One client component, used in the **hero** (home, directory) and the **bottom section** (home, directory, startup detail; later categories / olympics / province). Input = `h-9 rounded-md border border-input bg-card pl-9 text-xs` + search icon + `kbd "/"` (sm+), inside a GET `form role="search"` to `/startups?q=` (works without JS); "+ เพิ่ม Startup" primary button next to it.
- Search starts at 1 character, 200 ms debounce, stale requests aborted. `GET /api/search?q=&locale=`.
- **Panel:** `absolute z-30 w-full rounded-xl border bg-popover shadow-lg max-h-[420px] overflow-y-auto p-1.5`; opens **upward** when less than 440px is left below the input; never off-screen. Groups with `text-3xs uppercase text-faint` headers: **สตาร์ทอัพ** (≤ 6: logo 28 · name with the match in `<mark class="bg-brand/20 text-foreground rounded-sm">` · verified check + source · 1-line tagline) · **หมวดหมู่** (icon + name) · **จังหวัด** (name + region). Empty groups hidden. Last row: "ดูผลลัพธ์ทั้งหมดสำหรับ “{q}” →".
- Focused + empty: "ยอดนิยม" (5 startups) + 8 category chips. Loading: 3 skeleton rows. No results: "ไม่พบ “{q}” · เพิ่มผลงานของคุณเป็นคนแรก" (link to /new).
- Keyboard: ↑/↓ (scrolls into view), Enter opens, Esc closes, click outside closes. ARIA combobox + listbox, options have ids for `aria-activedescendant`.
- **Mobile (< 640px):** focusing opens a full-screen sheet (`fixed inset-0 z-50 bg-background`) with the input pinned at the top, a close button and the same results.
- **Bottom section:** `border-t pt-12 mt-16`, centered `max-w-[640px]`: muted heading "หาผลงานอื่นต่อ" (`text-sm text-muted-foreground`), the QuickSearch row, then chips (top 8 categories).

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
- **Corner tag** `absolute top-2 right-2 rounded-sm border px-1.5 py-0.5 text-3xs font-bold uppercase tracking-wider`: `✓ Verified` (positive tone; **check only** on compact cards so the name stays readable, label kept for screen readers) when revenue is verified or visitors are counted by a connected source (unchanged rule); else `ShieldCheck` **Owner verified** (neutral tone, icon only on compact cards) when the snippet was found on the site; else the first **looking-for** ask in amber (Figma's FOR SALE slot until the marketplace ships), else none.
- Metrics by state (compact cards use the short labels "Revenue" / "Visitors"): verified revenue → Revenue (30d) · MRR · Growth; else traction → Visitors · Growth · Commits; else one muted "Not verified yet" line.
- **Nothing verified** (`proof_level = 0`, not a demo): the card is muted, `border-dashed bg-transparent` instead of `bg-card`; text keeps its normal tokens (no opacity, contrast stays). Round 3, 2026-10-05.
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
- Row (`grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3`), **only tiles with data**: **All-time revenue** (note: "Ranked #n on JaoPor") · **MRR** (note: "n active subscriptions") · **Founder** (`FounderCard`: avatar 20 + name as value at `text-base`; note = the founder's role on this project (`startups.founder_role`, e.g. "Founder, CEO"), else their profile headline (e.g. "cu109"), else the 𝕏 handle; the whole tile links to `/u/{handle}` with the hover lift, and the FounderMessage name links there too) · **Founded** (month year; note: province + localized country name via `Intl.DisplayNames`; no flag emoji, Windows renders them as letters).
- **Empty-state rule (spec 2.4):** unverified revenue/MRR tiles are dropped and replaced by one `UnverifiedLine`; Founded without a date shows as **Location** (ที่ตั้ง); nothing at all → owner-only `EmptyOwnerCard`. Visitors never see "–".

### RevenueChartCard (spec 6.4 step 3, Phase 2)

- `Card p-4 sm:p-6`. Header left: period total (`text-3xl font-bold tabular-nums`; for **MRR** the latest value) + GrowthPill vs the previous period. Right: two compact selects (`h-7 rounded-lg border bg-secondary text-caption`): **metric** (รายได้ · MRR · ผู้เข้าชม, only those with data) and **period** (7 วัน · 30 วัน · 12 เดือน). 12 months plots weekly points.
- Plot `h-64`: Recharts area, `--chart-1` 2px line, gradient fill (0.25 → 0), horizontal grid `--border`, axes `text-2xs --faint`. Hover: crosshair + tooltip in text tokens.
- Footer switches: **เทียบช่วงก่อนหน้า** (dashed `--chart-2` + mini legend) and **Trend** (7-point moving average).
- Under the plot, inside the card: `text-caption text-muted-foreground` stamp for the **selected metric's** source: check icon (`text-brand-text`) "ยืนยันผ่าน {Source} · อัปเดตล่าสุด {time}" (demo: "ข้อมูลตัวอย่าง").
- No profit-margin pill: we have no cost data (spec item skipped until a source exists).
- Nothing verified: the card is hidden for visitors; the owner sees an `EmptyOwnerCard` "+ เชื่อมต่อ Stripe เพื่อแสดงกราฟ".

### VerifiedStamp

- `text-caption text-muted-foreground`, centered line: brand check icon · "Revenue is verified with **{Source}** API key. Last updated: {datetime}". Stale (> 48h) or error → amber text.

### InsightsGrid ("ข้อมูลเชิงลึก" bento, spec 6.4 step 6, Phase 2)

- H2, then **Value proposition** full width, then `grid lg:grid-cols-2 gap-3.5` of two stacked columns (1 column below `lg`):
  - Left: กลุ่มลูกค้า (B2B/B2C chip + "~N ผู้ใช้" when active users are known) · ราคา · ขนาดทีม · เงินทุน · ช่องทางการตลาด (**logo chips**).
  - Right: ปัญหาที่แก้ · ตลาด (category chip with its lucide icon) · เทคโนโลยีที่ใช้ (**logo chips grouped under muted sub-labels**, empty groups skipped) · สร้างด้วย (AI tool logo chips).
- Cards are `InsightCard` (40px icon box). Empty-state rule: visitors see only cards with data; the owner sees `EmptyOwnerCard` prompts in the same slots.
- **LogoChip:** `inline-flex items-center gap-1.5 rounded-full border bg-secondary px-2.5 py-0.5 text-caption` + 14px glyph. Glyph = Simple Icons path in the brand colour, or `--foreground`-ish fallback when the brand colour has < 3:1 contrast on that theme's card (precomputed `fgDark`/`fgLight` in `lib/config/glyphs.ts`); brands without a Simple Icon use their lucide icon in `text-muted-foreground`; custom entries use `Tag`.

### FounderMessage (spec 6.4 step 5)

- `Card p-5 sm:p-6 flex gap-5` (stacks below `sm`): 80px round avatar (letter avatar without a photo) · quote `text-base leading-[1.8] whitespace-pre-line` (paragraphs kept) · then name `font-bold` + role `text-muted-foreground` (`text-sm`). Hidden when empty; owner sees an `EmptyOwnerCard`.

### ScreenshotGallery (spec 6.4 step 4)

- Header row: "ภาพผลงาน" (`text-sm font-bold`) + domain link (`text-caption text-faint`) · right: counter "1 / 6" (`text-caption tabular-nums`) + ←/→ icon buttons (`size-8 rounded-md border`, desktop only).
- Track: `flex gap-4 overflow-x-auto snap-x snap-mandatory` with a fade mask on the side that has more to scroll; focusable (`tabIndex=0`, ←/→ keys scroll one slide).
- **Desktop shot:** 16:10 card `w-[88vw] sm:w-[720px] rounded-xl border bg-card overflow-hidden`, thin browser bar (`h-7 border-b px-3`: three `size-2 rounded-full bg-muted-foreground/30` dots + domain `text-2xs text-faint`). A single desktop shot is full width, no carousel.
- **Mobile / LINE shot:** phone frame 9:19.5 `w-[260px] rounded-[28px] border-4 border-border bg-card overflow-hidden`.
- Caption under each (`text-caption text-muted-foreground`). Images lazy after the first 2; `bg-muted` skeleton behind (no blur data stored).
- **Demo video** (if set) is the first slide: dark 16:9 card with a centered play button (`size-14 rounded-full bg-background/80`); click swaps in the provider's embed iframe (YouTube nocookie / Loom / TikTok).
- **Lightbox:** native `<dialog>` (`bg-background/95`, full screen): image `max-h-[85vh] object-contain`, caption + "n / N", ←/→ buttons + keys + swipe, × button; Esc / backdrop click close; focus stays inside (modal dialog).

### ConfirmDialog (`useConfirm`, 2026-09-30)

- Every destructive confirm (delete project, disconnect a source) is an in-page `Dialog sm:max-w-sm`: bold title question ("ลบ {name}?"), one consequence line (`text-caption`), Cancel (outline) + destructive button (autofocus). Never `window.confirm` (embedded browsers block it; it silently returned "cancel" in the Claude app browser).

### Edit page (`/dashboard/[id]/edit`, redesign 2026-09-30, user feedback "too much at once")

- **One section at a time.** Seven sections, each a `Card p-5 space-y-4` with a title (`text-sm font-bold`) and one helper line (`text-caption text-muted-foreground`): 1 ข้อมูลหลัก (name, tagline, description, category, logo) · 2 ลิงก์และที่ตั้ง (links, country, province, founded) · 3 เล่าเรื่องผลงาน (value, problem, audience, pricing, team, funding) · 4 เทคโนโลยีและการตลาด (built with, stack, channels, looking for) · 5 ภาพและวิดีโอ (screenshots, demo video) · 6 ผู้ก่อตั้ง (message, role, build story) · 7 ยืนยันตัวเลข (VerifyPanel).
- **Section nav:** `lg` = sticky left column (`w-56`), each item icon + name + state (`CheckCircle2` positive when complete, else "2/5" `text-faint`); mobile = horizontal scroll chips under the title. Active item `bg-secondary font-semibold`.
- **Progress header:** "ข้อมูลครบ {pct}%" + thin bar (`h-1.5 rounded-full bg-secondary` / fill `bg-brand`) + the next missing item as a link.
- **Footer of each section:** "← ก่อนหน้า" / "ถัดไป →" ghost buttons.
- **Sticky save bar** (`sticky bottom-0 border-t bg-background/95 backdrop-blur py-3`): left "มีการเปลี่ยนแปลงที่ยังไม่บันทึก" (warning dot) or "บันทึกแล้ว"; right Cancel + Save (primary). Saves the whole form from any section; a validation error jumps to its section.
- Deep links (`#field`, `#verify-*`, `#screenshots`) open the right section, then scroll + highlight the field.
- **✨ ช่วยเติมจากเว็บไซต์** (outline button, section 1 header): reads the project's website (+ GitHub README) and fills only **empty** fields, then shows "เติมให้ {n} ช่อง — ตรวจแล้วกดบันทึก · เลิกทำ". Uses a free Gemini key when configured, otherwise the page's own title/description/structured data.
- **ดึงจาก GitHub** (outline `sm` button with `GitBranch` icon above the stack combobox, 2026-09-30): reads the **public** repo in the GitHub link box (unsaved value allowed) — languages, root files (vercel.json, Dockerfile, fly.toml…) and manifests (package.json, requirements.txt, pyproject.toml, composer.json, Gemfile, pubspec.yaml, go.mod) — and shows the found items in the dashed "ตรวจพบจาก GitHub: … · เพิ่มทั้งหมด" strip. Disabled with a hint when there is no GitHub link. Private repos → "ไม่พบ repo สาธารณะ".

### ScreenshotsManager (edit form, spec 6.9)

- Drop zone `rounded-xl border border-dashed p-6 text-center` ("ลากไฟล์มาวาง, วาง (Ctrl/Cmd+V) หรือคลิกเพื่อเลือก"), PNG/JPG/WebP ≤ 5MB, max 8. Files are resized in the browser to ≤ 2400px, re-encoded to WebP (JPEG on Safari / iOS, transparent areas white; both drop EXIF/GPS), then uploaded to `screenshots/{startup_id}/{uuid}.webp|jpg`.
- Grid of thumbnails (`grid grid-cols-2 sm:grid-cols-4 gap-3`): thumbnail, kind select (Desktop / Mobile / LINE; auto from aspect ratio), caption input (≤ 60), ←/→ move buttons + drag to reorder, delete (×). The first is marked "ภาพปก" (cover).

### VocabCombobox (edit form, spec 6.9)

- Searchable multi-select: selected **LogoChips with ×** above an input (`inputClass`); typing filters a listbox (`rounded-md border bg-popover shadow-md max-h-64 overflow-auto`) grouped under muted headers, each option with its glyph; ↑/↓/Enter/Esc; Backspace in an empty input removes the last chip. Channels allow a custom entry row "+ เพิ่ม “{text}”".
- Province uses the single-select variant (grouped by region), required when the country is Thailand.
- **Province picker everywhere** (onboarding, profile editor, startup edit; first-user test 2026-10-05: people scrolled 77 provinces and gave up): the same single-select combobox. Before typing, a **"จังหวัดยอดนิยม"** group sits on top (Bangkok, Chiang Mai, Khon Kaen, Chon Buri, Phuket, Nonthaburi), then the regions. Typing matches Thai and English names plus common aliases ("กทม", "bkk", "โคราช", "korat", "หาดใหญ่", "pattaya"…). Where province is optional, a "ไม่ระบุ" option sits first. Placeholder "พิมพ์ชื่อจังหวัด เช่น กทม".
- **Suggested province** (onboarding only): when the field is still empty, it is pre-filled from the visitor's approximate location (`/api/live/whoami`, nearest province, Thailand only) with a hint under the field "เดาจากตำแหน่งโดยประมาณ เปลี่ยนได้" (`text-2xs text-faint`). Nothing is saved until the user continues.

### More startups (profile bottom)

- H2 "สตาร์ทอัพอื่น ๆ" + "View all →" link; `grid sm:grid-cols-2 lg:grid-cols-3 gap-3` of large StartupCards (same category first, then same province, then newest; 6 max).

### ShareStudio (spec 6.5, Phase 3)

Dialog `sm:max-w-xl rounded-xl bg-popover`, title "แชร์ตัวเลขที่ยืนยันแล้ว" (listing/verify moments keep their celebratory titles); × / Esc / backdrop close.

1. **ลิงก์ผลงาน**: read-only input + `คัดลอก` outline button that turns into "คัดลอกแล้ว ✓" for 2 s (no toast).
2. **Tabs** = `SegmentedControl`: **Badge · กราฟรายได้ · ปฏิทิน · โพสต์** (Post = JaoPor's ready-to-paste thread text; spec lists the first three).
3. Options: **Theme** Light/Dark; **Period** (chart 7 วัน / 30 วัน / 12 เดือน; calendar 12 / 6 / 3 เดือน); **สีเส้น / สี ฿** = 12 dots in spec order (blue, purple, indigo, sky, cyan, teal, emerald, lime, amber, orange, rose, pink), selected shows a check, the colour name on the right.
4. **Preview**: the server-rendered PNG (`/api/share-card`) in a `rounded-xl border bg-card p-3` frame; **⤓ ดาวน์โหลดภาพ** saves exactly that PNG as `{slug}-{tab}.png` (server rendering kept instead of html-to-image: the download is byte-identical to the preview and works without canvas/CORS issues).
5. Badge tab also has the **embeddable SVG badge** (`/api/badge/{slug}.svg?theme=dark|light`) with **คัดลอกโค้ด README** (Markdown) and **คัดลอก HTML**.

Card renderer (next/og, renderer palette in `lib/share-palette.ts`):

- **Badge** 900×340: startup logo (WebP converted server-side; letter tile fallback) · UPPERCASE metric label ("TOTAL REVENUE" / "รายได้ทั้งหมด" first, else the strongest verified metric) · big mono value · "Verified by JaoPor" with the tile mark.
- **Chart** 1200×630: period total + "รายได้ · {period}", logo + name chip, line + 18% area in the chosen colour, verified footer. 12 months = monthly points.
- **Calendar** 1200×630: GitHub-style heatmap where every cell is a **"$" glyph ("฿" for THB projects: pricing in THB, or Thai projects without a price)**, 5 levels from `grid` gray to the chosen colour; month labels on top, จ./พ./ศ./อา. (Mon/Wed/Fri/Sun) on the left; legend "น้อย ฿ ฿ ฿ ฿ ฿ มาก".
- Verified numbers only; demo projects never get numbers.

### Categories page (`/[locale]/categories`, spec 6.6; compact redesign 2026-09-30, user: "too big to scan", TrustMRR pattern)

- `main max-w-6xl`: centred breadcrumb (JaoPor › หมวดหมู่, `text-caption text-faint`) → centred H1 "สำรวจหมวดหมู่" (`text-2xl md:text-3xl font-bold`) → subtitle.
- Grid `grid gap-3 sm:grid-cols-2 lg:grid-cols-4` of **one-line CategoryCards**: `rounded-xl border bg-card p-3 flex items-center gap-3` link (hover `border-border-strong`) → 40px icon box (`size-10 rounded-lg bg-background`, icon 18px) · name (`text-sm font-semibold truncate`) + count (`text-2xs font-bold text-brand-text`, "{n} ผลงาน", only when > 0) · description one line (`text-caption text-muted-foreground truncate`).
- Sorted by count, then config order. Count 0 → icon `opacity-50`, name `text-muted-foreground`.
- Cards (and every category link: footer, QuickSearch, home teaser) open **`/category/{slug}`**.

### Category page (`/[locale]/category/[slug]`, 2026-09-30)

- The category **is the title**, so the visitor always sees the topic: centred breadcrumb JaoPor › หมวดหมู่ › {name} → 48px icon tile (`size-12 rounded-xl border bg-card`) → H1 "ผลงานหมวด {name}" → description + "พบ **{n}** ผลงานในหมวดนี้" → QuickSearch + Add (max 640px, centred).
- Large StartupCards `sm:grid-cols-2 lg:grid-cols-3` with third stat รวมทั้งหมด; more than 24 → "ดูทั้งหมด {n} ผลงาน →" (`/startups?category=`). Empty → dashed card + Add.
- "หมวดหมู่อื่น": 12 busiest other categories as icon chips + "หมวดหมู่ →". Unknown slug → 404.

### HomeTeasers (home, spec 6.2, Phase 7)

- After the LeaderboardCard: `grid gap-3 md:grid-cols-2`. Left `Card p-5` "สำรวจหมวดหมู่" + "ดูทั้งหมด ›" (`text-caption text-faint`) → 8 busiest categories as chips (`rounded-full border bg-secondary px-2.5 py-1 text-caption`, lucide icon `size-3.5`, bold count when > 0) → `/startups?category=`. Right `Card p-5` "โอลิมปิกจังหวัด" → top 3 provinces (Medal · ProvinceBadge `h-8 w-11` · name · total) + caption "จัดอันดับจากรายได้ที่ยืนยันแล้ว". No ranked province → the Olympics card is omitted and categories take the full width.
- Home CTA rule: "+ เพิ่ม Startup" only in the header and the hero. The hero sub-links are หมวดหมู่ · โอลิมปิก · กระดานผู้นำ; the "Recently added" empty state has no button; the bottom QuickSearch section renders without its Add button and chips (`add={false} chips={false}`).
- Hero "ดูผลงานทั้งหมด {n} ชิ้น" shows the number only from 20 projects ("ดูผลงานทั้งหมด" below).
- LeaderboardCard empty state: "ยังไม่มีตัวเลขที่ยืนยัน… มาเป็นคนแรกบนกระดาน" + `text-brand-text` link "ยืนยันตัวเลขของคุณ →" (/dashboard).

### Olympics page (`/[locale]/olympics`, spec 6.7; v3 2026-10-01 = Claude Design frame 149:7635 + our open spots and map)

Product decision (user asked to act as PM / marketer / designer): the Claude Design structure wins on retention and sharing (your-province gap, rank movement, monthly season, dense table, share + methodology cards). Kept from v2: dashed "ที่ว่าง" podium places (the board is young) and the region map (moved into the region card). Not adopted yet: "แชมป์ N เดือนติด" (needs rank history) and "อัปเดตทุกชั่วโมง" (we sync daily).

- **Season metric:** รายได้ 30 วัน (default) · MRR · ผู้เข้าชม 30 วัน · Commits. Rank movement (▲/▼/–/ใหม่) and growth % compare with the previous 30 days (revenue30d, visitors only).
- **Header:** pills "● อัปเดตทุกวัน" (positive dot) + "ฤดูกาล {month year}" (Gregorian year) · H1 `text-3xl md:text-4xl font-extrabold` · subtitle; right: two stat Cards (จังหวัดที่ลงแข่ง n / 77 · "{metric} รวมทั้งประเทศ").
- **Podium cards** (`md:grid-cols-3`, shown 2-1-3): rank ring (gold / silver / bronze tokens) + "ผู้นำฤดูกาล" on #1 · region dot + name · province `text-2xl` (#1 `text-3xl`) · other-language name + "{n} สตาร์ทอัพ" · total `text-3xl` (#1 `text-4xl`) · top project row under `border-t` ("ตัวท็อป: {name}" + value). #1 card `border-warning/40 bg-warning/5`, taller. Empty place: dashed card "+ ที่ว่าง · ส่งผลงานแทนจังหวัดคุณ" → /new.
- **Controls:** metric SegmentedControl + region chips (dot + name; horizontal scroll on phones). Both in the URL.
- **OlympicsBoard** (client): **your-province bar** (`border-brand/40 bg-brand/5`; MapPin "จังหวัดของคุณ" · badge + name · #rank · RankChange · "อีก ฿X จะแซง{ahead}ขึ้นอันดับ #n" or "กำลังนำกระดาน" · "เปลี่ยนจังหวัด"; no pick yet → inline select grouped by region; stored in localStorage `jaopor.myProvince`) · province search (whole board) · **table** from #4: # · change · badge + name (+ "· คุณ") + region · ผลงาน (md+) · value · growth (sm+) · top logos (lg+) · expand chevron → sub-row with top projects (logo, name, share %, value, `h-1` brand bar) + "ดูผลงานทั้งหมดใน{จังหวัด} n ชิ้น →". 10 rows then "ดูอันดับ 14–N ↓". Own row `bg-brand/5` + 3px brand inset edge.
- **Open provinces** Card: "ยังไม่มีผลงานจาก {n} จังหวัด" + subline + "+ เพิ่มผลงาน", 10 chips then "+N จังหวัด" (expands).
- **Sidebar (320px):** "ภาคไหนแรงสุด" (OlympicsMap h-36 + RegionStandings) · "มาแรงเดือนนี้" (Flame; top 3 climbers with ▲n; hidden when none) · **ShareRankCard** (`border-brand/40 bg-brand/5`: download the province's OG image, or the Olympics one; copy link) · "นับคะแนนยังไง" methodology text.

### LiveVisitorsSection (home, Phase 8, "ตอนนี้มีคนดูอยู่")

- `rounded-xl border bg-card` section after the card rows. Header: status dot (positive pulse = live, warning = fallback, faint = connecting) + title; right: "ทั่วโลก / ประเทศไทย" toggle (`h-7 border` button) and × (hides the section, remembered; a small "แสดงคนที่กำลังดู JaoPor" link brings it back).
- Body `h-[420px] sm:h-[460px]`: Thailand silhouette (`fill-muted-foreground/15`) with one pin per province at its centre (brand circle + DiceBear avatar, positive count badge when > 1); world view = MapLibre (OpenFreeMap dark, loaded on demand) with avatar markers at the coarse coordinates.
- Overlay top-left (`w-56 rounded-lg border bg-background/85 backdrop-blur`): big count + "คนกำลังดู JaoPor", rows ประเทศ / อุปกรณ์ / หน้า (top 3, fixed section labels only, never slugs), "+n คนจากต่างประเทศ". Fallback shows the count + "แสดงจำนวนโดยประมาณ".
- Feed bottom-left: last 4 page views as `bg-background/85` rows: avatar, "{ชื่อ} เปิด{หน้า}", "เมื่อสักครู่ / n นาทีที่แล้ว".
- Footer `border-t text-2xs`: "คุณแสดงเป็น “{ชื่อ}” · ไม่แสดงตัวฉัน" (opt-out; then "คุณไม่ได้แสดงตัว · แสดงตัวอีกครั้ง") + "ไม่ระบุตัวตน · ตำแหน่งระดับจังหวัด/ประเทศ".
- Names only from the fixed word lists (EN "Color Animal", TH "สัตว์สี"); every received payload is validated. Production waits for the approved /privacy page (`LIVE_ENABLED`).

### DashboardShell (Phase 9d, docs/design/dashboard.png)

- `max-w-7xl` row: **sidebar** `w-60` (from `lg`, sticky under the header) + content. Items: ภาพรวม · ผลงานของฉัน (count) · โปรไฟล์ของฉัน · คำขอคุย (brand badge = unread notifications) · ที่บันทึกไว้ · การเชื่อมต่อ · ตั้งค่า; "คอมมูนิตี้": คนสร้าง, หา Co-founder (both `aria-disabled` with a "เร็ว ๆ นี้" chip until Phase 9c). Item `rounded-lg px-3 py-2 text-caption`; active `bg-secondary font-semibold`.
- Bottom **user card** `rounded-xl border bg-card p-3`: avatar 36 + name + @handle (links to the public profile), then 3 equal bordered buttons: theme, language, sign out.
- Below `lg`: the main items become one horizontal scroll row (`border-b`) above the content.
- A user without a username is sent to /onboarding first.

### Dashboard overview (`/dashboard`)

- Header: "สวัสดี, {ชื่อ}" `text-2xl font-bold` + "ผลงานของคุณมีคนเข้าชม {n} ครั้งในสัปดาห์นี้"; right: outline "ดูโปรไฟล์สาธารณะ ↗" + primary "+ เพิ่มผลงาน".
- **Setup checklist** Card (hidden when all 6 are done): title + "3 / 6" + `h-1.5` brand bar + hint; `sm:grid-cols-2 lg:grid-cols-3` items: done = check circle (positive) + faint text; the next undone item `border-brand bg-brand/10 font-semibold`; undone items link to the place that completes them.
- `xl:grid-cols-[1fr_320px]`: **ผลงานของฉัน** table (ผลงาน: logo 36 + name + "✓ ยืนยันแล้ว · Stripe · GitHub" positive or "ยังไม่ยืนยันตัวเลข" warning · ผู้เข้าชม 7 วัน · อันดับ · MRR · icon buttons edit / copy link / view with aria-labels). Unverified owned rows get an inline banner `border-warning/40 bg-warning/10` "เชื่อมต่อเพื่อขึ้นกระดานผู้นำและโอลิมปิกจังหวัด" + primary "เชื่อมต่อ Stripe" + outline "ตัวเลือกอื่น". Under the table two dashed tiles: "เพิ่มผลงานใหม่" (/new) and "อ้างสิทธิ์ผลงาน" (disabled, "เร็ว ๆ นี้", claim flow not built).
- Right: **คำขอคุย** card (2 latest pending: avatar, name · topic, 2-line message, ยอมรับ / ข้าม; footer "LINE / อีเมลจะแสดงหลังกดยอมรับเท่านั้น") and **โปรไฟล์ 7 วันที่ผ่านมา** (views, requests). No "ค้นหาเจอ" stat until search impressions are logged.

### Profile editor (`/dashboard/profile`; redesign 2026-10-01, owner: "a bit overwhelming")

- **One section at a time**, same pattern as the startup Edit page, but the section menu is a **tab row** (the dashboard already has a left sidebar): chips with icon + name + state (`CheckCircle2` positive when complete, else "1/3" `text-faint`), wrapping on desktop, horizontal scroll on phones. Six sections: ข้อมูลพื้นฐาน · สถานะและสิ่งที่มองหา · ทักษะ · ประสบการณ์ · ผลงานที่ปักหมุด · ลิงก์และช่องทางติดต่อ (social links + private contacts in one card, contacts in a dashed sub-block with the "only after you accept" note).
- **Progress header:** "โปรไฟล์ครบ {pct}%" + thin brand bar + "ถัดไป: {section} →"; "ดูโปรไฟล์สาธารณะ ↗" on the right of the title.
- Each card: title + one hint line, the fields, then "← ก่อนหน้า" / "ถัดไป →" ghost buttons. One sticky save bar for everything (unchanged).
- **Optional things stay folded:** experience shows only "+ เพิ่มประสบการณ์" until used; social links show filled ones plus a row of "+ GitHub", "+ LinkedIn"… chips that reveal one input each; looking-for details appear only for looking-for-co-founder / open-to-work.
- **VisibilityMenu** (per-field privacy where the field is edited): a small outline pill next to the field or section title — `Globe` สาธารณะ / `Users` สมาชิก / `EyeOff` ซ่อน + chevron — opening a dropdown with the three choices and one explanation line each. Placed on: bio, province (fields), สิ่งที่มองหา, ทักษะ, ประสบการณ์, ลิงก์โซเชียล (section titles). The activity graph's setting stays in Settings; Settings shows the same values.
- Deep links `#province`, `#skills`, `#experience` (any section or field id) open the right section and highlight the field.
- Reordering uses ↑/↓ buttons (keyboard and phone friendly) instead of drag-and-drop.
- **Profile photo** (first row of ข้อมูลพื้นฐาน, 2026-10-02): avatar 72 + "📷 เปลี่ยนรูป" outline button · "ใช้รูปจาก {Google|GitHub}" (only when the current photo is something else) · "ลบรูป" (back to initials) as quiet text links; hint line `text-2xs text-faint` saying only what helps the choice or builds trust: formats, square crop from the centre, location data removed (no pixel sizes or processing details). Saved immediately, outside the sticky save bar, with a toast that names the result: "อัปเดตรูปโปรไฟล์แล้ว" (upload or replace) · "เปลี่ยนเป็นรูปจาก {provider} แล้ว" · "ลบรูปโปรไฟล์แล้ว". The header avatar updates at once (no reload); every card, post and chat uses this photo.
- **Person photos everywhere** (`PersonPhoto`, 2026-10-04): every avatar frame shows the photo or, when there is none or it can't load (deleted after a change while a cached page still points at it, bad URL, network), the same initials the frame already uses. Never a broken-image icon or an error text.

### Requests inbox (`/dashboard/requests`), Connections, Settings, Saved

- Requests: two Cards (ได้รับ / ส่งไป); rows show avatar, name (→ profile), topic, status pill (pending warning, accepted positive), relative time, message; accepted rows reveal the other side's LINE / email in a `border-positive/30 bg-positive/10` strip. Received pending: ยอมรับ / ข้าม / บล็อก; sent pending: ยกเลิกคำขอ. Opening the page marks notifications read.
- Connections: followers / following lists (avatar, name, @handle · headline).
- Settings: per-field visibility as 3-way segmented radios (สาธารณะ / สมาชิก / ซ่อน), directory checkbox, a `border-negative/30` delete-account card (email request until self-service).
- Saved: honest placeholder (no bookmarks table yet).

### Onboarding (`/onboarding`, spec 9e)

- `max-w-lg` Card: "ขั้นที่ n จาก 4" + 4-segment brand progress, title, hint; steps: username (live check, suggestion from the display name) → headline + province → status tiles → SkillPicker (skippable). Back / ถัดไป; the last step has "ข้ามไปก่อน" + "เสร็จสิ้น" → back to the page the user signed in from (`next`), else `/startups` with the welcome banner.

### Sign-in routing (2026-10-05, first-user test: everyone landed on an empty dashboard)

- Every "เข้าสู่ระบบ" link carries the current page as `next` (header included); gated pages (e.g. "เพิ่ม Startup" → `/new`) already do.
- After sign-in: no username yet → onboarding, then `next`. With a username: `next` if given; else users with a startup → `/dashboard`, users without → `/startups?welcome=1`. `next` must be an internal path (no `//`, no backslash) and never `/login` or `/onboarding`.
- **Welcome banner** on `/startups?welcome=1`: dismissible `rounded-xl border border-brand/30 bg-brand/5 px-4 py-3` row under the hero, "ยินดีต้อนรับสู่ JaoPor 👋 ดูผลงานของคนอื่นก่อนได้ สร้างอะไรด้วย AI อยู่ก็เพิ่มของคุณได้เมื่อพร้อม" + "เพิ่มผลงานของฉัน →" link to `/new` + × close.

### Add-startup wizard v2 (`/new`, 2026-10-05, first-user test: "adding a startup is hard", most skipped verification)

- **Loading (`/new/loading.tsx`, 2026-10-07, owner: "takes longer to open"):** a skeleton shaped like step 1 (title, 2 step bars, intro line, link field, name + category, one-liner, logo tile, button) shows the moment "เพิ่ม Startup" is clicked, while the sign-in check runs. The verify step's code loads in the background after step 1 shows.
- **Step labels:** "1. ลงผลงาน" / "List it" · "2. ยืนยันตัวเลข" / "Verify". Same 2-segment `border-t-2` bar.
- **Step 1, four things, link first:** ลิงก์ผลงาน (full width, autofocus) → ชื่อ · คำโปรย (optional, ≤ 140, counter `text-2xs text-faint tabular-nums`) → หมวดหมู่ · โลโก้. AI tools, looking-for and screenshots moved to the edit page (the profile's "+ เพิ่ม…" cards lead there).
- **Auto-fill from the link** (website links only): ~600 ms after typing stops, the server reads the page (SSRF-guarded, 3 s, 512 KB) and returns name (`og:site_name`, else the `<title>` part that matches the domain), one-liner (meta description, ≤ 140) and logo (apple-touch-icon, else the largest PNG / SVG / WebP / JPEG icon; resized to 256 px PNG). It fills only fields that are empty or still hold the previous auto value, never what the user typed. Status line under the link (`text-caption`): muted "กำลังอ่านหน้าเว็บ…" → brand "✨ เติมจากเว็บของคุณแล้ว แก้ได้ทุกช่อง" → nothing on failure (fields stay manual).
- **Logo field:** 48 px rounded tile preview (auto or uploaded) + "อัปโหลดเอง" file button + "ลบ" text button; the auto logo is uploaded as PNG on submit.
- **Step 2:** the VerifyPanel **chooser** (below), then the footer row: muted "ยืนยันทีหลังได้จากหน้าผลงานของคุณ" + outline "ข้ามไปก่อน" (primary "ไปที่หน้าผลงาน" once something is connected).

### VerifyPanel chooser (no source connected yet: wizard step 2 and the edit page)

- One question, `text-sm font-semibold` "คุณมีอะไรบ้าง? เลือกหนึ่งอย่างก่อน" + hint. Choice tiles `grid gap-2 sm:grid-cols-2`, each a `button` `rounded-xl border bg-card p-3 text-left hover:bg-accent` with lucide icon (size-4, muted) + title `text-sm font-semibold` + one line `text-caption text-muted-foreground` + right-aligned chip `text-2xs` ("ไม่ต้องใช้คีย์" positive / "คีย์อ่านอย่างเดียว" muted):
  1. **มีเว็บไซต์** (Globe) → JaoPor snippet. Only when the project has a website link.
  2. **รับเงินผ่าน Stripe** (CreditCard) → Stripe.
  3. **แอปมือถือ ใช้ RevenueCat** (Smartphone) → RevenueCat.
  4. **โค้ดบน GitHub** (Github) → GitHub (repo must be public and the user's).
  5. **มี analytics อยู่แล้ว** (BarChart3) → Plausible | Umami | Cloudflare segmented switch.
- Choosing shows only that connector: "← เปลี่ยนวิธี" text button + its title, then the usual numbered how-to and form. Connected sources show as ✓ on their tile; "เพิ่มอีกแหล่ง" returns to the tiles. Tiles carry the deep-link ids (`#verify-revenue` Stripe · `#verify-traffic` snippet, or analytics without a website · `#verify-build` GitHub), so the profile's "+ เชื่อม…" links scroll to and highlight the right tile.
- Once a source is connected (edit page after refresh), the panel switches to the grouped manage view (§5 VerifyPanel).
- **Stripe permission guide** (Stripe has no pre-filled key link): under how-to step 2 a small mock of Stripe's permission table, `rounded-lg border bg-card text-caption divide-y`: rows "Charges" and "Subscriptions" with a `Read` pill (`bg-positive/15 text-positive font-semibold`), then "ทุกอย่างที่เหลือ" with a `None` pill (muted). Caption `text-2xs text-faint`: "หน้าตาในหน้า Stripe › Developers › API keys › Create restricted key".
- **Trust box** beside every key field (all sources that take a key): `rounded-xl border bg-muted/30 p-3 text-caption`, two short lists side by side from `sm` — "✓ สิ่งที่เราเก็บและแสดง" (positive check icons: the totals for that kind, the provider name) and "✕ สิ่งที่เราไม่เก็บและทำไม่ได้" (muted x icons: customer names / emails / cards, writing or refunding, showing the key) — then one line "ยกเลิกได้ทุกเมื่อ คีย์และตัวเลขจะถูกลบทันที · อ่านวิธีที่เราดูแลคีย์ →" (link `/security`). Wording must match /security.

### Owner verified + verified first (round 3, 2026-10-05)

- **Proof levels** (`startups.proof_level`, generated in the DB, ordering only, never shown as a number): 3 verified revenue · 2 build proof (GitHub) · 1 site proof (Owner verified, or an analytics account for the site connected) · 0 nothing (demos always 0). Visitor counts never rank above 1: anyone can send events to a snippet or an analytics endpoint, so they are *counted*, not verified. `/startups` and category pages sort by proof level first for every sort except "ใหม่ล่าสุด" (newest stays chronological). Leaderboards never include demo projects.
- **Owner verified** = our server opened the listed website and found the JaoPor snippet with this project's **permanent id** (never the slug: a renamed slug could be taken by someone else). The page read must be on the listed domain, not a redirect elsewhere. It proves the lister can edit that page; it says nothing about numbers. Checked when the founder presses "เริ่มนับ", on "ตรวจอีกครั้ง" (at most once per 20 s per project, shared by all servers), and nightly; any change to the website URL clears it. The snippet counts visits **only** while it is set (the browser `Origin` header alone can be faked).
- **Badge** (startup header, via `VerifiedBadge ownerVerified`): when there is no verified revenue, neutral chip `rounded-full border bg-secondary text-caption font-semibold` + `ShieldCheck` "ยืนยันเจ้าของเว็บแล้ว" / "Owner verified", `title` explains it ("พบโค้ด JaoPor ของผลงานนี้บนเว็บไซต์ …").
- **Snippet status** in VerifyPanel (chooser and manage view), above the code box: found → positive `ShieldCheck` line "พบโค้ดบน {host} แล้ว …"; not found → `rounded-md border border-warning/40 bg-warning/10 p-3 text-caption` "ยังไม่พบโค้ดบน {host} … ระหว่างนี้ยังไม่นับผู้เข้าชม" + outline "ตรวจอีกครั้ง".

### Owner "not verified yet" prompt (startup page)

- When the project has no verified number at all (no revenue, visitors or build proof) and is not a demo, the owner's `OwnerBar` turns warning-tone: `border-warning/40 bg-warning/10`, `ShieldAlert` icon, "ผลงานนี้ยังไม่มีตัวเลขที่ยืนยัน ยืนยันใน 1 นาทีเพื่อให้คนเชื่อตัวเลขและติดอันดับ" + primary "ยืนยันตัวเลข" (→ `/dashboard/{id}/edit#verify`) + outline "แก้ไขโปรไฟล์". Visitors never see it. The dashboard keeps its existing unverified row banner.

### Builder profile v2 (`/u/[username]`, also `/@username`; Phase 10e, Figma "Founder Prfile 2nd" 160-2)

- Breadcrumb (JaoPor › คนสร้าง › name, `text-2xs text-faint`), then `lg:grid-cols-[296px_minmax(0,1fr)] gap-12`; the sidebar is `lg:sticky lg:top-20` and stacks above the main column below `lg`.
- **Sidebar:** avatar 144 (240 at `lg`) with a status dot · name `text-2xl font-bold` · `@handle` · **proof line** "{n} ผลงาน · {v} ยืนยันแล้ว · สร้างมา {m} เดือน" (`text-caption text-muted-foreground tabular-nums`, parts with no data left out) · headline · StatusPill · bio · ProfileActions · followers with the 30-day gain in positive ("128 ผู้ติดตาม +12 · 42 กำลังติดตาม") · info list · badges (round, grid of 4) · skills: superpowers as large chips (`border-brand bg-brand/15 px-3 py-1 font-bold text-brand-text`), the rest small (`bg-card px-2.5 text-2xs`) · "สร้างด้วย" · report.
- **Main:** looking-for card → **4 stat tiles** (MRR รวม "จาก n ผลงานที่ยืนยัน" · รายได้ทั้งหมด "ตั้งแต่เริ่มขาย" · GitHub ★ "n commits" · อัปเดตผลงาน "โพสต์ใน 6 เดือน"; zero tiles hidden) → **revenue / activity card** (see "Profile revenue dashboard" below; "กิจกรรมการสร้าง" = the heatmap; no verified revenue → visitors see the heatmap alone, the owner sees both tabs with a "connect a payment provider" prompt) → pinned works (4, "ดูทั้งหมด n ›" shows the rest in place via `?works=all`) → **อัปเดตผลงาน** (latest 4 PostCards, `variant="profile"`, `md:columns-2` masonry, "ดูฟีดทั้งหมด →") → experience (`sm:grid-cols-2 lg:grid-cols-3`, each entry `border-l-2 pl-3.5`, the current role `border-brand`).
- **Edit in place (owner):** each section title gets a small "✎ แก้ไข" link (`text-2xs text-faint`) to `/dashboard/profile#{section}`, which opens the editor on exactly that section. Visitors never see empty sections; the owner gets dashed "+ เพิ่ม…" prompts (incl. "โพสต์อัปเดตผลงานแรกของคุณ" → dashboard composer).
- Contact dialog, report dialog and the profile-view beacon are unchanged (Phase 9b).

### Profile revenue dashboard (Figma 160-2 "รายได้รวม" tab; replaces MetricChart on the profile)

- Card `rounded-2xl border bg-card px-4 py-5 sm:px-6`. **Toolbar row:** tablist "รายได้รวม | กิจกรรมการสร้าง" (`rounded-xl border bg-background p-1`, tabs `h-9 px-3.5 text-caption font-bold`, active `border-border-strong bg-secondary`) · spacer · on the revenue tab the range buttons **7 วัน / 30 วัน / 12 เดือน**, on the activity tab the year buttons (both `h-8 rounded-lg border px-3 text-2xs`, active `border-border-strong bg-secondary font-bold text-foreground`, inactive `text-muted-foreground`). Wraps under the tabs on phones.
- **Hero row:** total for the range `text-3xl font-extrabold tabular-nums` in the visitor's currency · growth vs the previous period of the same length, complete days only ("↑ 9% เทียบช่วงก่อน", `text-positive` / `text-negative`; hidden without a previous period) · spacer · legend: a 10×3 brand bar + the works included ("JaoPor + กาแฟบอท", more than two → "A + B + n"), a dashed muted bar + "ช่วงก่อนหน้า".
- **Plot** (`h-[200px]`): y labels on the left (nice max, half, 0; compact money, `text-3xs text-faint`), 3 gridlines (top/mid in `border` at low contrast, baseline `border`), brand area at 16% opacity, the previous period as a 1.5px dashed `muted-foreground` line, the range as a 2.5px brand line. **Today** (or this month on 12 เดือน) is the partial point: the last segment is dashed and ends in a hollow 8px ring; when there is no row for today the chart ends yesterday without it. 12 เดือน shows monthly totals.
- **Hover / touch:** a vertical crosshair, a dot on the line, and a tooltip (date, this period's value, the previous period's value) that flips to the left near the right edge. A visually hidden table carries the same numbers for screen readers.
- **X labels:** 5 evenly spaced dates (`text-3xs text-faint`, "2 ก.ย."; months "ก.ย. 26" on 12 เดือน); the last reads "วันนี้ (ยังไม่ครบวัน)" / "เดือนนี้ (ยังไม่ครบเดือน)" when the partial point is shown.
- **Footer** (`border-t pt-3 text-2xs text-faint`): positive ✓ "ยืนยันผ่าน {sources} · อัปเดตล่าสุด {time} · ไม่รวมผลงานที่ยังไม่ยืนยัน". Verified, non-demo works only; demo works never count.

### PostPreview (startup page "อัปเดตล่าสุด", Phase 10e)

- The startup page is cached for everyone, so it shows the latest 3 posts as compact, non-interactive cards (`md:grid-cols-3`): author · time + type chip, 3 lines of text (milestone headline bold on the gold card), ♥ / 💬 counts (+ "n รูป"); the whole card opens `/post/{id}`. Header "อัปเดตล่าสุด" + "ดูฟีดทั้งหมด →". Hidden when there are no posts.

### Builders directory (`/builders`, Phase 9c)

- Same frame as `/startups`: centered hero (BrandPill, H1 "คนสร้าง", subline, a people search box = GET form `q`, and "สร้างโปรไฟล์ของคุณ" for visitors without a profile) → `lg:grid-cols-[15rem_minmax(0,1fr)]` filter sidebar (CSS-only toggle below `lg`) + results.
- **Filters** (one GET form, "ใช้ตัวกรอง" / "ล้าง"): ทักษะ (select, optgroups by skill group) · พื้นที่ (one select: a region, or a province grouped by region; param `area`) · สถานะ · สร้างด้วย (AI tool) · "เฉพาะคนที่มีตัวเลขยืนยันแล้ว" checkbox. Only what an anonymous visitor may see is filterable: a hidden province or hidden skills never match.
- **Order:** verified revenue → verified works → works → newest. 24 per page, the same prev / next pager.
- **BuilderCard** (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3`): `rounded-xl border bg-card p-4` + hover lift (`hover:-translate-y-0.5 hover:border-foreground/20`), whole card links to `/u/{handle}`. Row: avatar 48 round (initials fallback) · name `font-semibold truncate` + `@handle text-2xs text-faint`. Headline `text-caption text-muted-foreground line-clamp-2`. StatusPill. Up to 3 skill chips (superpowers `border-brand/40 text-brand-text`, others `bg-secondary`). Footer `border-t pt-3 text-caption tabular-nums`: "n ผลงาน" · "฿X/เดือน" with a positive ✓ only when there is verified revenue; province (MapPin) right-aligned when public.
- **StatusPill** (shared by the profile page and cards): `rounded-full border px-2.5 py-0.5 text-2xs font-semibold` + 6px dot; looking for co-founder / open to work = `positive` tint, networking = `brand` tint, busy = neutral `bg-secondary text-muted-foreground`.
- Empty: dashed one-liner + "ล้างตัวกรอง". The dashboard sidebar's คนสร้าง / หา Co-founder link here (`/builders`, `/builders?status=looking_cofounder`); header nav gets "คนสร้าง" (the home-anchor "กระดานผู้นำ" link moves to `xl` only so `lg` still fits).
- **QuickSearch "คน" group** (spec 9c): up to 4 people (avatar 28 round, name with highlight, @handle · headline), after startups; handle-prefix matches first.

### PostCard (Phase 10b, Figma "Feed Ux/ui" 160-555)

- `article rounded-xl border bg-card p-5 space-y-3`. Header row: avatar 36 round (links to `/u/{handle}`) · "**{name}** บน **{startup}**" (both links) over "{time ago} · {province}" (`text-caption text-faint`) · type chip on the right (`rounded-full px-2 py-0.5 text-2xs font-bold`).
- **Type colours:** ฟีเจอร์ใหม่ = brand (`bg-brand/15 text-brand-text`), เปิดตัว = positive, บทเรียน = neutral (`bg-secondary text-muted-foreground`), ขอ Feedback = info, Milestone = warning. A milestone post is a **gold card** (`border-warning/40 bg-warning/5`), a round badge instead of the avatar (฿ MRR / revenue, ★ GitHub stars, ✓ first verification), the headline written from its milestone key in the visitor's language ("{startup} แตะ ฿10,000 MRR"; the stored Thai body is the fallback), and "✓ ยืนยันผ่าน {source}" in positive (GitHub for stars). Posted by the daily job (Phase 10d) as the startup owner.
- Body `text-sm leading-relaxed whitespace-pre-line` (links not auto-linked). Link: preview card (`rounded-lg border`, image on top when the site has one, title, description 2 lines, domain `text-faint`), or the bare domain link while the preview loads/fails. Images: 1 = full width (max-h 420, `object-contain bg-secondary`), 2–4 = 2-column grid of square crops, each opens the full image in a new tab.
- Footer (`text-caption text-muted-foreground`): ♥ count (filled `text-negative` when I liked it; signed-out click → login), 💬 count (link to `/post/{id}#comments`), spacer, "แชร์ไป LINE" outline button + 𝕏 icon button, `⋯` menu (edit within 15 min / delete for the author; report for others).
- Feedback posts: a teal "ให้ Feedback" outline button (opens the post's comment box) and the first top-level comment in a `rounded-lg bg-secondary p-3` box.
- On a profile, the header shows the startup (logo 22 + name) instead of the person.

### Composer (Phase 10b)

- Card `p-4 space-y-3`: avatar + textarea (`rows 3`, placeholder "อัปเดตอะไรในผลงานของคุณวันนี้?"). Row below: startup select (only my confirmed works), type select (ฟีเจอร์ใหม่ / เปิดตัว / บทเรียน / ขอ Feedback; never Milestone), image button (≤ 4, WebP / JPEG on Safari in the browser like screenshots), link button (reveals an https input), counter "n / 500" (`text-warning` past 450), "โพสต์" primary. Thumbnails of picked images with × under the textarea.
- Signed out: one line + "เข้าสู่ระบบเพื่อโพสต์". No confirmed work: "เพิ่มผลงานก่อนจึงจะโพสต์ได้" + link to /new. Errors inline: "โพสต์ได้วันละ 5 ครั้ง", "เฉพาะทีมของผลงานนี้".
- Lives on the dashboard overview in 10b and at the top of /feed in 10c.

### Post page (`/post/[id]`) and comments

- `max-w-2xl`: breadcrumb (JaoPor › ฟีด › {startup}), the PostCard, then "ความคิดเห็น (n)": composer textarea (500, signed-in) + list. Top-level comments with replies indented one level (`ml-11 border-l pl-4`); each: avatar 28, name, time, body, "ตอบกลับ" (top-level only), `⋯` (delete own / report others). Deleted → "ความคิดเห็นถูกลบ" in `text-faint italic`, kept for its replies.
- Hidden or missing post → 404. OG image: author, startup, type chip, the first 160 characters, counts.

### Feed (`/feed`, Phase 10c, Figma "Feed Ux/ui" 160-555)

- Three columns from `xl` (`xl:grid-cols-[12.5rem_minmax(0,40rem)_minmax(0,1fr)] gap-8`, max-w-6xl); at `lg` two columns with the right rail under the posts (1024px is too narrow for three); below `lg` one column, the view tabs become a horizontal scroll row and type / province / category fold into the CSS-only "ตัวกรอง" toggle as on /startups.
- **Left:** "ฟีด" `text-2xl font-extrabold` + "คนสร้างอัปเดตอะไรกันบ้าง"; view links ล่าสุด / กำลังติดตาม / ยอดนิยมสัปดาห์นี้ (`h-10 rounded-lg px-3`, active `bg-secondary font-bold`); "ประเภท" chips (ทั้งหมด + 5 types, each in its type colour, active = filled `bg-foreground text-background`); จังหวัด and หมวดหมู่ selects (GET form). Everything lives in the URL (`view`, `type`, `province`, `category`, `waiting`).
- **Center:** Composer, then PostCards (`space-y-4`), then "โหลดเพิ่ม" (`h-12 w-full rounded-xl border`) which appends the next page in place (cursor = the last post's time; popular uses an offset). Empty: dashed one-liner per view (following with no follows → "ติดตามคนสร้างเพื่อเห็นอัปเดตที่นี่" + link to /builders).
- **Right rail** (`space-y-5`): "คนสร้างที่น่าติดตาม" (3 rows: avatar 36, name + "● หา Co-founder" in positive when looking, startup · province, ติดตาม outline button) · "อัปเดตบ่อยสุดสัปดาห์นี้" (top 3 startups by posts in 7 days: logo 28, name, "n โพสต์") · "รอ Feedback จากคุณ" teal card (`border-info/40 bg-info/10`; count of feedback posts from the last 14 days that aren't mine and I haven't commented on; "ดูโพสต์ที่รอคำตอบ" → `?type=feedback&waiting=1`). Signed-out visitors see the count of feedback posts with no comments yet.
- "ยอดนิยมสัปดาห์นี้" = posts of the last 7 days ranked by (likes + 2 × comments) / (hours + 2)^1.5.

### NotificationBell (header, Phase 10c)

- Signed in only, left of the avatar: `size-8` ghost icon button (`BellIcon`) with an unread dot-count (`bg-brand text-white text-3xs rounded-full min-w-4`, "9+" above 9). Opens a dropdown (`w-80 max-h-[420px] overflow-y-auto`) with the latest 15: actor avatar 28 + one line ("{name} ถูกใจโพสต์ของคุณ" / "แสดงความคิดเห็น" / "ส่งคำขอคุย" / "ยอมรับคำขอคุย") + time; unread rows `bg-brand/5`. Opening marks them read. Each row links to the post (`/post/{id}`, `#comments` for comments) or `/dashboard/requests`. Empty: "ยังไม่มีการแจ้งเตือน".
- Header nav (Figma 160-555): สตาร์ทอัพ · คนสร้าง · ฟีด · หมวดหมู่ · โอลิมปิก. The home-anchor "กระดานผู้นำ" and the xl-only "แดชบอร์ด" links leave the header (the leaderboard is linked from the Olympics page, the mobile menu and the footer; the dashboard from the avatar menu).

### Chat (`/dashboard/messages`, Phase 11)

- Inside DashboardShell. `lg`: two panes in one card (`lg:grid-cols-[18rem_minmax(0,1fr)] rounded-xl border bg-card overflow-hidden`, height `calc(100dvh-9rem)`): conversation list | open conversation. Below `lg` the list (`/dashboard/messages`) and a conversation (`/dashboard/messages/{id}`, with "← ข้อความ") are separate screens.
- **List row** (`flex gap-3 px-4 py-3 border-b`, active `bg-secondary`): avatar 36, name `text-caption font-semibold truncate`, last message `text-2xs text-muted-foreground truncate` ("คุณ: …" for mine), time `text-2xs text-faint`, unread count pill (`bg-brand text-white text-3xs rounded-full min-w-4`). Blocked → "ถูกบล็อก" in `text-faint`. Deleted account → "ผู้ใช้ที่ลบบัญชี". Empty: dashed one-liner "เมื่อคำขอคุยถูกยอมรับ แชทจะเปิดที่นี่" + link to /builders.
- **Conversation:** header (avatar 32 + name linking to the profile, ⋯ menu: บล็อก (confirm) / ดูโปรไฟล์); messages scroll area with day separators (`text-2xs text-faint` centred); bubbles max-w 80%: mine right `bg-brand text-white rounded-2xl rounded-br-md`, theirs left `bg-secondary rounded-2xl rounded-bl-md`, time under the last bubble of a run (`text-3xs text-faint`); `⋯` on their bubbles → รายงาน. Composer pinned at the bottom: textarea (auto-grow to 5 lines, 2000 chars, counter past 1800), Enter sends / Shift+Enter new line, ส่ง button. Blocked: the composer is replaced by a `text-caption text-faint` note.
- **Entry points:** header `MessageCircle` icon next to the bell with the unread count (same pill as the bell), the dashboard sidebar "ข้อความ" + unread badge, "ส่งข้อความ" on a profile when a conversation exists, and on accepted requests in the inbox. Messages never create bell notifications.

### Privacy page (`/[locale]/privacy`, 2026-10-01)

- `main max-w-3xl`: H1 `text-2xl md:text-3xl font-bold` · "ปรับปรุงล่าสุด" `text-caption text-faint` · intro `text-body text-muted-foreground` · contact line with a `text-brand-text` mailto link.
- Sections `space-y-8`: H2 `text-base font-bold`, paragraphs `text-body leading-relaxed text-muted-foreground`, bullet lists (`list-disc pl-5`, faint markers) whose lead phrase is `font-semibold text-foreground`.
- §5 (`#live`) ends with **LiveOptOutControl**: `rounded-lg border bg-card px-4 py-3` row, Eye (positive) / EyeOff (faint) icon, status text, outline `sm` button ("ไม่แสดงตัวฉัน" / "แสดงตัวอีกครั้ง").
- Wording is owner-approved (docs/privacy-draft.md); change it only with the owner, and update "ปรับปรุงล่าสุด".

### Trust pages: "How we handle your key" (`/[locale]/security`) and Terms (`/[locale]/terms`), 2026-10-04

- Same frame and type scale as the Privacy page (shared `DocPage`): H1, "ปรับปรุงล่าสุด", intro, contact mailto, numbered sections with paragraphs and bullet lists (lead phrase `font-semibold text-foreground`). Static, both locales; linked from the footer's "เกี่ยวกับเรา" column.
- **Security** states only what the code does (read-only key checks per source, AES-256-GCM at rest, server-only decryption, aggregate numbers only, daily sync + รีเฟรช, disconnect deletes the key and that source's numbers). Section ids for deep links: `#read-only`, `#encryption`, `#disconnect`.
- **Terms** ships as a clearly labelled draft (owner approval 2026-10-04): "(ฉบับร่าง)" in the title and a status note under the date, `rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-caption text-warning` with `role="note"` ("ยังไม่ผ่านการตรวจทานทางกฎหมาย และอาจมีการปรับปรุง"). Wording describes only current product behaviour; remove the note after a legal review.

### LiveViewersPill (startup page)

- `rounded-full border-positive/30 bg-positive/10 text-positive text-2xs` + Eye: "{n} คนกำลังดูผลงานนี้", only when n ≥ 2 people are on the same project (any language).

### ProvinceBadge

- `h-10 w-14 rounded-lg border bg-background` tile holding **ThailandMap**: a hand-simplified silhouette (6 region paths, ~150 points, viewBox 84×150). Other regions `fill-muted-foreground/30`, the province's region `--region-*`; `stroke-card` separates regions. Never an official provincial seal. Decorative (`aria-hidden`): the region name is always printed next to it.
- The OG renderers draw the same paths (`REGION_HEX` in `share-palette.ts`).

### Province page (`/[locale]/province/[slug]`, spec 6.7)

- Breadcrumb JaoPor › โอลิมปิกจังหวัด › {province} → badge + H1 "สตาร์ทอัพจังหวัด{name}" → subtitle "ตัวเลขที่ยืนยันแล้วจาก{name} · {region}" → brand link "อันดับ #X ในโอลิมปิกจังหวัด (รายได้รวม)" (when ranked) → QuickSearch + Add.
- "{n} สตาร์ทอัพ" then large StartupCards `sm:grid-cols-2 lg:grid-cols-3` with third stat **รวมทั้งหมด** (all-time revenue) instead of growth; demo projects keep their tag. More than 24 → "ดูทั้งหมด {n} ผลงาน →" to `/startups?province=`. None → dashed empty card + Add.
- "← กลับไปโอลิมปิกจังหวัด", "จังหวัดใกล้เคียง" + RegionChip, chips of the other provinces in the region. Unknown slug → 404. OG: "{จังหวัด} / อันดับ #X ในโอลิมปิกจังหวัด" + the map with the region lit.
- Profile stat card ก่อตั้ง/ที่ตั้ง caption: `MapPin` + "{จังหวัด} · อันดับ #X ในโอลิมปิก" linking to the province page (wraps on phones).

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
- **VerifyPanel** (manage view; the chooser in §5 Add-startup wizard v2 is shown while nothing is connected): three bordered groups (Revenue: Stripe | RevenueCat · Visitors: **JaoPor snippet** | Plausible | Umami | Cloudflare · Build proof: GitHub), segmented source switch, numbered how-to, one primary "Verify". One source per group.
  - **JaoPor snippet** (no analytics account needed; listed first): a read-only code box (`rounded-lg border bg-card p-3 font-mono text-caption`) with the one-line `<script>` and a Copy button, then the install status: "รอการเข้าชมครั้งแรก" / "Waiting for the first visit" (muted, pulsing dot) → "นับตั้งแต่ {date}" / "Counting since {date}" (positive).
  - **Cloudflare:** API token (Account Analytics: Read only) + account ID. Numbers are **visits** (sessions), labelled so.
- **TractionTiles source captions:** "นับโดย JaoPor ตั้งแต่ {date}" / "Counted by JaoPor since {date}" for the snippet; "ยืนยันผ่าน Cloudflare · visits" for Cloudflare.
- **Tech stack card (InsightsGrid):** the owner's list; if empty, the stack detected from the connected GitHub repo, captioned "ตรวจพบจาก GitHub" / "Detected from GitHub" (`text-2xs text-faint`). Detection never overwrites the owner's list.
- **Dashboard startup card:** `rounded-xl border bg-card p-4`, status chip, 3 tiles, completeness bar (`bg-brand`), one primary action + `⋯` menu.
- **Empty fields (spec 2.4, replaces InfoCard's "always render" rule 2026-09-30):** visitors see only fields with data (InsightsGrid, TractionTiles, build story, tagline/description); the owner sees each empty slot as an `EmptyOwnerCard`; a section with no data at all is owner-only. Owner detection is client-side so the profile stays ISR.

### Footer

- `border-t mt-16`: 4 columns (brand + tagline · Navigation · Browse startups by category · About/legal), headings `text-3xs uppercase text-faint`, links `text-caption text-faint`; bottom line centered `text-2xs text-faint`: "© 2026 JaoPor · Built with JaoPor.dev in Thailand".

## 6. Page templates

| Route              | Structure (top → bottom)                                                                                                                                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` Home           | Header · Hero (pill, H1, subline, ProviderStrip, SearchBar, links) · **Recently listed** (5 compact cards) · **Top traction** (5 compact cards, by verified visitors/commits) · **LeaderboardCard** · **HomeTeasers** (categories + Olympics) · QuickSearch (no Add/chips) · Footer |
| `/startups`        | Header · Hero · FilterSidebar + results header + large card grid + pagination                                                                                                                                                                                                       |
| `/startup/[slug]`  | Breadcrumb · Profile header (logo, name, description, Share, Visit) · links + LookingFor · StatCards (data only) · RevenueChartCard (Stripe) · VerifiedStamp · TractionTiles · InsightsGrid · More startups                                                                         |
| `/u/[username]`    | Sidebar (who, actions, info, badges, skills, tools) · looking-for · proof strip · pinned works · heatmap · experience \| recent activity                                                                                                                                            |
| `/feed`            | Filters (view, type, province, category) · composer + PostCards + โหลดเพิ่ม · right rail (who to follow, most active, waiting for feedback)                                                                                                                                         |
| `/builders`        | Hero (people search) · filter sidebar (skill, area, status, built with, verified) + BuilderCard grid + pager                                                                                                                                                                        |
| `/dashboard`       | Title + "+ Add Startup" · Dashboard startup cards                                                                                                                                                                                                                                   |
| Add-startup wizard | 2 steps: 1) project link (auto-fills name · one-liner · logo) · category → 2) VerifyPanel chooser or skip                                                                                                                                                                           |
| `/acquire`         | Phase 2: Directory layout + price/multiple filters and FOR SALE tags                                                                                                                                                                                                                |

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
- **OG image** (`/[locale]/startup/[slug]/opengraph-image`): 1200×630 dark card (mark, name, tagline, up to 3 metric boxes, "✓ verified via …", URL). Fonts vendored in `src/assets/fonts` (OFL) and loaded for every OG / share image by `lib/og-fonts`: text uses `OG_SANS` (Plex Latin, then Plex Thai), numbers `OG_MONO` (Inconsolata, then Plex Thai for "฿"). Each subset is its own family because the renderer keeps one file per family and weight. The OG renderer has no CSS variables, so it keeps one `C` palette mirroring the `.dark` tokens (exception to "no raw hex"); the share-card route shares that palette.
- **Site OG card** (`/[locale]/opengraph-image`, 2026-09-30): tile + "JaoPor" + the two headline lines (second in brand) + host, on `bg`. Used by every page without its own image. Layout metadata sets `og:title/description/site_name/locale/type` and `twitter:card`; **no `og:url` in the layout** (children would inherit the home URL). Profiles repeat the full `openGraph` object (Next merges it shallowly) with their own `url` + description (tagline, else the first 200 chars of the description). Demo projects never put numbers in the title.
- **Builder OG image** (`/[locale]/u/[username]/opengraph-image`, Phase 9b): mark + status pill, avatar 160 round (OAuth hosts only: `lh3.googleusercontent.com`, `avatars.githubusercontent.com`, converted to PNG), name, @handle, headline, verified revenue/month summed over confirmed works (else "n ผลงาน"), `host/@handle`. Built from the anonymous view only.
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

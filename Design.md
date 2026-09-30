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

### Edit form vocab fields (spec Phase 1, 2026-09-30; Phase 2 upgrades them to searchable logo multi-selects)

- **Province:** native `<select>` (`ProvinceSelect`) with one `<optgroup>` per region (6), provinces sorted by the page language; only shown when the country is Thailand.
- **Pricing:** fieldset of billing period (month / year / one-time / free) → amount + currency (฿ THB / $ USD) when paid → free-text details. Profile shows "฿990 / เดือน" (`text-sm font-semibold tabular-nums`) above the note.
- **Tech stack:** one `ToggleChips` row per stored group under a `text-2xs text-muted-foreground` group label. Profile groups chips under muted sub-labels and skips empty groups.
- **Marketing channels:** `ToggleChips` of the config list + one "other channels" text input (comma separated → `custom:` values, max 10 in total).

### SiteHeader (sticky, ledgerly pattern)

- `sticky top-0 z-40 border-b bg-background`, `h-14`, inner `max-w-6xl`, gaps `gap-3` (`md:gap-6`).
- Left: `BrandLogo` = `<Logo>` (blue app tile 28px + "JaoPor"). **Nav links from `lg`** (`text-xs text-muted-foreground hover:text-foreground`): สตาร์ทอัพ · หมวดหมู่ · กระดานผู้นำ · แดชบอร์ด (โอลิมปิก added in Phase 6).
- Right: **CurrencyToggle** (฿/$; "THB/USD" text from `lg`), **search trigger** (`/` shortcut), primary **"+ เพิ่ม Startup"** (icon-only below `sm`), **HeaderAuth** (signed out: "เข้าสู่ระบบ" from `sm`, a `LogIn` icon button below; signed in: avatar menu), TH/EN (full name from `lg`) and ThemeToggle (both from `sm`), then **MobileNav** below `lg`: a `size-8` `Menu` icon button opening a DropdownMenu with the nav links, and below `sm` also the language switch and the theme switch.
- Must fit 360px (no horizontal scroll) and 768px.

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

### ScreenshotsManager (edit form, spec 6.9)

- Drop zone `rounded-xl border border-dashed p-6 text-center` ("ลากไฟล์มาวาง, วาง (Ctrl/Cmd+V) หรือคลิกเพื่อเลือก"), PNG/JPG/WebP ≤ 5MB, max 8. Files are resized in the browser to ≤ 2400px, re-encoded to WebP (drops EXIF/GPS), then uploaded to `screenshots/{startup_id}/{uuid}.webp`.
- Grid of thumbnails (`grid grid-cols-2 sm:grid-cols-4 gap-3`): thumbnail, kind select (Desktop / Mobile / LINE; auto from aspect ratio), caption input (≤ 60), ←/→ move buttons + drag to reorder, delete (×). The first is marked "ภาพปก" (cover).

### VocabCombobox (edit form, spec 6.9)

- Searchable multi-select: selected **LogoChips with ×** above an input (`inputClass`); typing filters a listbox (`rounded-md border bg-popover shadow-md max-h-64 overflow-auto`) grouped under muted headers, each option with its glyph; ↑/↓/Enter/Esc; Backspace in an empty input removes the last chip. Channels allow a custom entry row "+ เพิ่ม “{text}”".
- Province uses the single-select variant (grouped by region), required when the country is Thailand.

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

### Categories page (`/[locale]/categories`, spec 6.6, Phase 5)

- `main max-w-6xl`: breadcrumb (`text-2xs text-faint`: JaoPor › หมวดหมู่) → H1 "สำรวจหมวดหมู่" (`text-2xl font-bold`) → subtitle "สำรวจผลงานใน {n} หมวดหมู่" (`text-body text-muted-foreground`).
- Grid `grid gap-3 sm:grid-cols-2 lg:grid-cols-4`. **CategoryCard** = `Card interactive p-4 flex flex-col gap-3` link to `/startups?category={slug}`: top row = 48px icon box (`size-12 rounded-lg border bg-background`, lucide icon `size-5`) + count pill on the right (`rounded-full border bg-secondary text-2xs`, bold number + "ผลงาน"); below, full width, name `text-sm font-bold` and description `text-caption text-muted-foreground line-clamp-2` (stacked so Thai names don't wrap into a narrow column at 4 columns).
- Sorted by count (desc), then config order. Count 0 → last and dimmed without losing contrast: icon box `opacity-40`, name `text-muted-foreground`; the count pill keeps full contrast (still a link).
- Counts = listed projects (published, demo excluded) from `category_counts()`.
- Bottom QuickSearch section.

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

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

| Token                                           | Dark (spec 2.1)                   | Light                             | Use                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------- | --------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--background`                                  | `#0a0a0b`                         | `#f4f4f5`                         | Page                                                                                                                                                                                                                                                                                                   |
| `--card`                                        | `#161618`                         | `#ffffff`                         | Cards, tiles, leaderboard, chart, filter sidebar                                                                                                                                                                                                                                                       |
| `--popover` (spec `surface-2`)                  | `#1e1e20`                         | `#ffffff`                         | Dialogs, menus                                                                                                                                                                                                                                                                                         |
| `--secondary` / `--muted` / `--accent`          | `#18181b`                         | `#ebebee`                         | Chips, dropdown buttons, hover fills, segmented controls                                                                                                                                                                                                                                               |
| `--foreground`                                  | `#ededed`                         | `#09090b`                         | Headings, numbers                                                                                                                                                                                                                                                                                      |
| `--muted-foreground`                            | `#a1a1a6`                         | `#52525b`                         | Descriptions, captions, body secondary                                                                                                                                                                                                                                                                 |
| `--faint` (spec `text-subtle`)                  | `#8a8a8f`                         | `#67676f`                         | Metric labels, table headers, placeholders, dot separators                                                                                                                                                                                                                                             |
| `--primary` / `--primary-foreground`            | `#f4f4f5` / `#09090b`             | `#18181b` / `#fafafa`             | Primary button (light on dark)                                                                                                                                                                                                                                                                         |
| `--border`                                      | `#2a2a2e`                         | `#e4e4e7`                         | All borders and dividers                                                                                                                                                                                                                                                                               |
| `--input`                                       | `#3a3a40`                         | `#e4e4e7`                         | Input borders; input fill `bg-card`                                                                                                                                                                                                                                                                    |
| `--ring`                                        | `#52525b`                         | `#a1a1aa`                         | Focus ring                                                                                                                                                                                                                                                                                             |
| `--brand` ★ (spec `accent`)                     | `#6e6cf3`                         | `#4f46e5`                         | Fills: logo tile, selected, bars, borders (`border-brand/40`)                                                                                                                                                                                                                                          |
| `--brand-text`                                  | `#8280f6`                         | `#4f46e5`                         | Indigo **text/icons/links** (`#6e6cf3` is 4.47:1 on cards, under AA)                                                                                                                                                                                                                                   |
| `--hero-grad-from/via/to`                       | `#3b78ff` → `#7fb0ff` → `#a8f0ff` | `#1251fd` → `#2563eb` → `#0e7490` | **Hero highlight gradient** (owner 2026-10-12, the Aetox look), `.text-hero-gradient` (90°, via at 55%, `background-clip: text`). Dark = the Aetox stops (5.0 / 9.1 / 15.7:1); light = deeper stops so each is ≥ 5:1 on white. Home hero only: the dot of "JaoPor." and "ตัวเลขจริง" / "Real numbers." |
| `--hero-light` / `--hero-beam` / `--hero-cloud` | white 20% / 7% / `#09090b` 80%    | `#1251fd` 16% / 6% / white 85%    | **Hero light** glow, ray and cloud colours (see §5 Hero)                                                                                                                                                                                                                                               |
| `--surface-2`                                   | `#1e1e20`                         | `#ffffff`                         | Modals, dropdowns (= popover)                                                                                                                                                                                                                                                                          |
| `--border-strong`                               | `#3a3a40`                         | `#d4d4d8`                         | Hover border on interactive cards, inputs                                                                                                                                                                                                                                                              |
| `--chart-1`                                     | `#6e6cf3`                         | `#4f46e5`                         | **Revenue line** + faint area fill                                                                                                                                                                                                                                                                     |
| `--chart-2`                                     | `#0d9488`                         | `#0d9488`                         | Previous period (**dashed**) when "Compare" is on                                                                                                                                                                                                                                                      |

Chart pair validated with the dataviz validator (2026-09-29; dark re-run 2026-09-30 with `#6e6cf3`): all checks pass. Re-run it if they change.

**Page vs card (owner 2026-10-13, compared with TrustMRR: "พื้นหลังกับการ์ดกลืนกันจนอ่านยาก"):** cards must stand off the page in both themes.

- **Light:** the page is light grey (`#f4f4f5`) and cards are white (`#ffffff`, was the reverse: `#fafafa` cards on a white page). Chips, hover fills and tracks (`--secondary`) step to `#ebebee` so they still show on both. `--faint` darkens to `#67676f` to keep ≥ 4.5:1 on the grey page (5.1:1) and on chips (4.8:1).
- **Dark:** cards step up to `#161618` and borders to `#2a2a2e` (were `#141416` / `#26262a`).
- `Card` adds a hairline shadow (`shadow-xs`) so the edge reads on white-on-grey.
- Contrast on the new card (dark): muted 7.0:1, faint 5.3:1, `--brand-text` 5.5:1, chart lines `#6e6cf3` 4.4:1 / `#0d9488` 4.8:1 (≥ 3:1 for marks).

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
- **Prose (2026-10-07, owner-approved; UX review: long Thai paragraphs in monospace were tiring to read):** long-form text people write uses `font-prose` = `IBM Plex Sans Thai` (Latin + Thai) → `ui-sans-serif`. Applies to: startup tagline + description on the profile, founder message, build story, insight paragraphs, post and comment bodies, chat messages, builder bio, request messages. Everything else stays monospace: numbers, labels, chips, headings, cards, tables, milestone headlines.
- **Scale:** `html { font-size: 112.5% }` (1rem = 18px; user feedback "too small at 100%"). Figma px sizes are written as rem (px ÷ 16), so the whole Figma layout renders 12.5% larger and stays proportional. Custom steps in `@theme`: `text-3xs` 12px · `text-2xs` 12px · `text-caption` 12.4px · `text-body` 14.6px (plus Tailwind `text-xs` 13.5px, `text-sm` 15.8px) — the px shown are **rendered** CSS px.
- **Floor: 12px, no exceptions for visible text (2026-10-10, UX audit A3).** Thai loses its vowel and tone marks below 12px, so `text-3xs` and `text-2xs` are both pinned at the 12px floor (0.6667rem) and only Latin/uppercase micro-labels or counters use them — never Thai words. `text-caption` (12.4px) is the smallest Thai-capable step. Chart axis ticks use 12px too. The one exception is SVG `<text>` inside the live map, which scales with the drawing (§3 Consistency rules). `e2e/readability.spec.ts` fails any visible text inside `<main>` under 12px.

| Role                      | Classes (rendered px)                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Brand pill (hero)         | mark `size-4` + `text-xs font-semibold tracking-wide` (13.5)                                                     |
| Hero H1                   | `text-2xl md:text-[2.125rem] font-bold tracking-tight leading-tight` (38)                                        |
| Hero subline              | `text-body text-muted-foreground` (14.6); inline link `text-foreground underline`                                |
| Page H1 (profile)         | `text-2xl font-bold tracking-tight` (27)                                                                         |
| Section H2                | `text-sm font-bold` (15.8) + "View all ›" `text-caption text-faint` on the right                                 |
| Card title                | `text-xs font-semibold truncate` (13.5); large card `text-body font-bold` (14.6)                                 |
| Metric label              | `text-2xs font-semibold uppercase tracking-wider text-faint` (12, Latin only)                                    |
| Metric value (card)       | `text-2xs font-bold tabular-nums` (12) — large card same                                                         |
| Table header              | `text-2xs font-bold uppercase tracking-wider text-faint` (12, Latin only)                                        |
| Tile label / value / note | `text-caption uppercase tracking-wider text-faint` · `text-2xl font-bold` · `text-caption text-muted-foreground` |
| Chart headline            | `text-3xl font-bold tabular-nums` (34)                                                                           |
| Body                      | `text-xs` (13.5) in cards/insights, `text-body` (14.6) for descriptions                                          |
| Prose (long-form text)    | `font-prose` + the size above; never on numbers                                                                  |

Numbers are always `tabular-nums`. Money is compact on cards (`$4.3k`) and full on the profile (`$14,903`).

### Verified vs counted (2026-10-07, owner decision)

- **"ยืนยัน / Verified"** only for what JaoPor reads from the source and can't be faked by sending events: revenue (Stripe, Polar, RevenueCat), build proof (GitHub) and the owner check ("ยืนยันเจ้าของเว็บแล้ว").
- **Visitor counts are "นับโดย {source}" / "Counted by {source}"** (JaoPor script, Plausible, Umami, Cloudflare, Google Analytics, PostHog): anyone can send events to a snippet or an analytics endpoint. They stay on the leaderboard and the Olympics with that label, never with a check icon, and never alone earn the card's "✓ ยืนยันแล้ว".
- Neutral wording where both appear: "ตัวเลขจากระบบที่เชื่อมต่อ" / "Numbers from connected sources".
- **Moments (2026-10-08, UX audit M-5):** connecting Plausible / Umami / Cloudflare / Google Analytics / PostHog toasts "เชื่อมแล้ว! จำนวนผู้เข้าชมที่นับโดย {source} ขึ้นบนหน้าผลงานแล้ว", never "ยืนยันแล้ว!"; the trust box lists "ชื่อระบบที่นับ" for visitors; after Add-project the profile opens the **"Verified!"** share dialog only when revenue or build proof was connected (owner check and visitor counts open the "listed" one); ShareStudio's own title is "แชร์ตัวเลขที่ยืนยันแล้ว" only when the project has a verified number, else "แชร์ผลงานนี้".

### Consistency rules (2026-10-08, UX audit Phase 5)

- **One meaning per colour:** verified is `positive` everywhere (chips on the overview and on ผลงานของฉัน alike); brand is JaoPor / selection / links.
- **No raw sizes:** text uses the type steps (`text-3xs` … `text-sm`), never `text-[Npx]` (the one exception is SVG text inside the live map, scaled with the drawing).
- **One completeness model** (`lib/completeness.ts`): verified 30 · screenshots 20 · description 15 · province 10 · the other 18 fields share 25. The edit page header and the dashboard cards show the same number.
- **Save convention:** forms save with the sticky bar; sections whose controls save on their own (ภาพและวิดีโอ, ยืนยันตัวเลข) say so under their hint ("…บันทึกทันที ไม่ต้องกดบันทึก").
- **What the browser receives:** every message namespace except the legal pages' long texts (Privacy, Security, Terms render on the server; the live-map opt-out keeps its four Privacy strings).

### Glossary (2026-10-08, owner decision; UX audit M-7)

One word per concept, in every string:

| Concept                          | Thai                                            | English                   | Never                                                                |
| -------------------------------- | ----------------------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| A listed thing                   | **ผลงาน** (+ เพิ่มผลงาน, แก้ไขผลงาน)            | **project** (Add project) | สตาร์ทอัพ / Startup / โปรเจกต์ / โปรดักต์ for it; "work" as its noun |
| The person                       | คนสร้าง (directory) · ผู้ก่อตั้ง (on a project) | builder · founder         |                                                                      |
| Proven at the source             | ยืนยัน                                          | verified                  | for visitor counts                                                   |
| Reported by a script / analytics | นับโดย                                          | counted by                | "verified"                                                           |

- Thai pages carry no English UI words except brand names, MRR, LINE / X / AI (2026-10-08, UX audit S-12): คอมมิต (Commits), แนวโน้ม (Trend), ก้าวสำคัญ (Milestone), ผู้สร้าง / ผู้ร่วมสร้าง (Maker / Contributor), คนสร้างที่ยืนยันแล้ว (Verified Builder).
- Exceptions: "โปรเจกต์" for past jobs in the profile's work experience (a different concept), "Product" as a skill role, the owner-approved legal pages (/privacy, /terms, /security) until the owner revises them. URLs stay `/startups` and `/startup/{slug}` (old links keep working).

### Voice (2026-10-08, owner-approved; from the launch post "สถานีขนส่งฝัน")

JaoPor is a place that carries Thai builders' work further. Four principles for every string:

1. **Start with one.** One project, one builder is enough. Small and early is welcome; never imply a project must be big or finished.
2. **Thai builders from anywhere.** Every province, not only Bangkok; the Olympics and province pages say "represent your province".
3. **Honest about every number.** "ยืนยัน" only for what is proven at the source, "นับโดย" for counts; never promise outcomes we can't show (no "ติดอันดับทันที", no "ถูกค้นเจอบ่อยกว่า" without data).
4. **We build it together.** Invite, encourage, ask for feedback; a missing step is "ขั้นต่อไป", not a failure.

Where the warmth goes: welcome moments, empty states, Add-project intro, the post-listing moment, prompts that ask for the founder's story, the footer. Where it doesn't: buttons, numbers, labels, errors, legal pages (plain and exact there). Metaphors ("สถานีขนส่งฝัน") only in the footer and the founder's own words, never on controls.

### Dates (2026-10-07)

- Thai pages show the **Thai (Buddhist) year** everywhere ("ต.ค. 2569"), the default of `th-TH` and of next-intl's formatter; English pages the Western year. Never force `-u-ca-gregory` on Thai (the Olympics season, profile experience and revenue-chart dates used to, so one page said 2026 and the next 2569).

### Currency (USD / THB)

- Verified revenue is stored in USD cents. Visitors choose **฿ THB** or **$ USD** with the header **CurrencyToggle** (`h-8 rounded-md border bg-card px-2 text-xs font-semibold`, shows the active symbol; `aria-label` from messages). The choice lives in `localStorage.currency`. With nothing stored, `th` pages default to THB and `en` to USD.
- **The header switch and client charts never flash the wrong currency (2026-10-08, UX audit C-5):** the switch renders both labels in `.cur-thb` / `.cur-usd` spans like `<Money>`; `useCurrency()` assumes the page language's default before hydration (Thai → ฿), the same default as the `<head>` script. Below `sm` the switch lives in the ☰ menu ("แสดงเป็นดอลลาร์ ($)" / "แสดงเป็นเงินบาท (฿)", C-11), so the phone header keeps five controls.
- No flash, ISR-safe: the server renders **both** values (`<Money>` → `.cur-usd` + `.cur-thb` spans), an inline `<head>` script sets `html[data-currency]`, and CSS hides the other one. Client charts read the same attribute (`useCurrency()`).
- THB = USD × the day's ECB rate (Frankfurter, cached 6 h). The THB span has a `title` "≈ at 1 USD = {rate} THB". If the rate can't be fetched, only USD is rendered.
- Formats: `฿62K` compact, `฿62,350` full (Latin digits, no decimals).
- Share images, the OG card and the badge stay in USD (one canonical number when posted outside).

## 4. Layout

- **Container (layout audit 2026-10-12; width refined 2026-10-14):** one public container, **`max-w-page px-4`** (`--container-page: 64rem` = **1152px** at the 112.5% root, matching TrustMRR's `max-w-5xl`), the same as the site header, footer and identity bar, so every page's left edge lines up with the logo. It applies to home, project profile, directories, feed and Olympics. (Before the 2026-10-14 pass it was `max-w-6xl` = 72rem = 1296px, which left almost no side whitespace on a 1280–1440 laptop; `max-w-6xl` scaled with the root and was wider than assumed.) Only forms keep `max-w-5xl` (the project edit page) for line length. No horizontal scroll at 375px.
- **Sparse grids:** a grid never leaves whole empty columns because of a low count. Home card rows use fewer, wider columns: 3 cards → 3 columns, 4 → 4 (2×2 at `md`), 5 or more → 5. Directory grids with a sidebar (`/startups`, `/builders`) are `sm:2 · xl:3` columns. Grids beside a sidebar use `minmax(0,1fr)` so long content can't widen them.
- **Section rhythm on home:** sections are `mt-12` apart. A section heading outside a card is `text-lg font-bold tracking-tight`; a heading inside a card is `text-base font-bold` (`text-sm` below `sm` where the row also holds controls, e.g. the LeaderboardCard).
- **SEO (product audit 2026-10-12):**
  - Every public page's metadata uses `localeAlternates(locale, path)` (`lib/seo`): canonical plus `hreflang` th / en / x-default. `/startups` with filters points at `/startups`.
  - Category and province pages with 0 projects are `noindex, follow` (`EMPTY_PAGE_ROBOTS`).
  - `app/robots.ts` allows the site and keeps out `/api`, dashboard, new, onboarding and login.
  - `app/sitemap.ts` lists static pages, published non-anonymous projects, directory builders, and non-empty categories and provinces, in both languages with alternates; revalidated hourly.
  - **AI-readable surfaces (launch-plan §Should-have, 2026-10-14):** `app/llms.txt/route.ts` serves an [llms.txt](https://llmstxt.org/) index (plain text: key pages, non-empty categories and recent non-demo projects, each linked to its Markdown twin), revalidated hourly. Every public project also has a Markdown twin at `/{locale}/startup/{slug}/md`, built by `lib/llms.ts` (localized labels; each counted or verified number is followed by an em-dash and its source). The profile page advertises the twin with `<link rel="alternate" type="text/markdown">`, and the proxy rewrites the human URL to the twin when a client sends `Accept: text/markdown`. Demo projects never get a twin.
- **Thresholded home (product audit 2026-10-12):** a module that would show too little data gives way to something honest instead of looking empty:
  - each leaderboard opens on its own at 3 rankable projects (§5 LeaderboardCard);
  - (the live board is exempt: its map always shows, owner 2026-10-13).
- **Radius:** `--radius: 0.5rem`. Compact cards and dropdown buttons `rounded-lg` (8); profile tiles, insight cards, chart card, leaderboard, large cards `rounded-xl` (12); buttons/inputs `rounded-md` (6); pills `rounded-full`; tags `rounded-sm` (4).
- **Spacing:** compact card `p-3`, large card / tile `p-4`, chart card `p-6`; section gap `mt-9` (36), `mt-12` between home sections; grids `gap-3`.
- **Elevation:** separation from `bg-card` + `border`, plus a hairline `shadow-xs` on `Card` (2026-10-13, white cards on the grey light page). No other shadows.
- **Columns scroll together (owner 2026-10-13: "เลื่อนลงให้มันเลื่อนไปพร้อมกัน … รู้สึกเวียนหัว"):** a side column with content (the builder profile's sidebar, the project page, the Olympics sidebar) scrolls with the page; never pin one content column while the other moves. Only navigation may stay pinned: the site header, the identity bar and section tabs, the feed's view rail, the edit page's section nav, the wizard's live preview (it has to stay in view while you type), and bottom action bars.
- **Native controls:** `color-scheme` follows the theme (date pickers, scrollbars). No native `<select>` anywhere: see §5 Dropdowns.

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
- **Logo** (`components/Logo.tsx`): `<Logo size variant="full|mark" />` = the user's **blue circle mark** (winking fedora mascot with a star and a thumbs-up on JaoPor blue, cut to a circle with transparent corners; `public/brand/jaopor-tile.png`, 128px; file name kept from the old square tile) + "JaoPor" wordmark (`font-extrabold tracking-[-0.02em]`). Owner decision 2026-10-12 replaced the square tile everywhere **except the home hero lockup**, which keeps the plain mascot (`public/brand/jaopor-mascot.webp`). Same mark as the tab icon (`src/app/icon.png` 512 circle; `apple-icon.png` 180 and `public/icon-192/512.png` are the circle on a flat brand-blue square; `favicon.ico` 16–64). Image renderers (OG, share cards, badge) inline it as a data URI via `lib/logo.ts` (badge: 64px copy in `src/assets/`).

### Edit form vocab fields (spec Phase 1, 2026-09-30; Phase 2 upgrades them to searchable logo multi-selects)

- **Province:** native `<select>` (`ProvinceSelect`) with one `<optgroup>` per region (6), provinces sorted by the page language; only shown when the country is Thailand.
- **Pricing:** fieldset of billing period (month / year / one-time / free) → amount + currency (฿ THB / $ USD) when paid → free-text details. Profile shows "฿990 / เดือน" (`text-sm font-semibold tabular-nums`) above the note.
- **Tech stack:** one `ToggleChips` row per stored group under a `text-2xs text-muted-foreground` group label. Profile groups chips under muted sub-labels and skips empty groups.
- **Marketing channels:** `ToggleChips` of the config list + one "other channels" text input (comma separated → `custom:` values, max 10 in total).

### SiteHeader (sticky, ledgerly pattern)

- `sticky top-0 z-40 border-b bg-background`, `h-14`, inner `max-w-page`, gaps `gap-3` (`md:gap-6`).
- Left: `BrandLogo` = `<Logo>` (blue app tile 28px + "JaoPor"). **Nav links from `lg`** (`text-xs text-muted-foreground hover:text-foreground`): ผลงาน · หมวดหมู่ · โอลิมปิก · กระดานผู้นำ · แดชบอร์ด (`whitespace-nowrap`, `gap-4`/`xl:gap-5`; แดชบอร์ด only from `xl` because five links don't fit at 1024px and it is also in the avatar menu). Right-side gaps `lg:gap-2 xl:gap-3`.
- Right: **CurrencyToggle** (฿/$; "THB/USD" text from `xl`), **search trigger** (`/` shortcut), primary **"+ เพิ่มผลงาน"** (icon-only below `sm`), **HeaderAuth** (signed out: "เข้าสู่ระบบ" from `sm`, a `LogIn` icon button below; signed in: avatar menu), TH/EN (full name from `xl`; both moved from `lg` on 2026-10-08: the English header overflowed 1024 px by about 45 px) and ThemeToggle (both from `sm`), then **MobileNav** below `lg`: a `size-8` `Menu` icon button opening a DropdownMenu with the nav links, and below `sm` also the language switch and the theme switch.
- Must fit 360px (no horizontal scroll), 768px and 1024px in both languages.

### Hero (home and directory)

- Centered, `pt-10` (`md:pt-14`). **Home** opens with the **HeroBrand lockup** (owner mockup 2026-10-12): the mascot `size-14` / `md:size-[4.5rem]` + "JaoPor" `text-4xl md:text-5xl font-extrabold tracking-[-0.02em]` with a `text-hero-gradient` dot "JaoPor.", not a link (it is the home page). The **directory pages** keep the small **brand pill** = a link home: the mascot (`public/brand/jaopor-mascot.webp`, the winking fedora with a rising chart line, `size-9`) + "JaoPor" (`text-sm font-bold`), same on home and directory → H1 → subline → ProviderStrip → **SearchBar row** (`max-w-xl`) → secondary links row (`text-caption text-faint`, dot separated: เพิ่มผลงาน · กระดานผู้นำ · Dashboard).
- Home H1 is two deliberate lines: **"1 คน + 1 Startup"** / **"ดูผลงานจริง ตัวเลขจริง"** (EN "1 person + 1 startup" / "Real work. Real numbers."), each a `block` span: line 1 `text-[1.75rem] sm:text-5xl md:text-6xl leading-[1.15]` (1.75rem of the 18 px root keeps it on one line at 360 px) with the "+" in `text-muted-foreground`; line 2 `text-2xl sm:text-3xl md:text-4xl` with "ตัวเลขจริง" / "Real numbers." in `text-hero-gradient` (blue → cyan; rich-text keys `Home.heroTop` / `heroBottom`; `headline1/2` stay plain for the OG image) (2026-10-11: the "AI" framing left the headline; owner decision, Project.md §6). Under the H1 sits one **belief line** ("คนตัวเล็กก็ทำสิ่งที่ยิ่งใหญ่ได้" / "Ordinary people can achieve extraordinary things."): `text-body font-medium text-foreground`, no italics (Thai has no true italic), `mb-3`. Then the subline: it names what can be listed (web, mobile app, LINE OA, game, GitHub), says listing works whether you are just starting or already have users (never phrase it as "even without revenue": it sounds like an excuse), and says how numbers get verified; it never promises outcomes (Voice principle 3). "Startup" (headline, footer) and "SaaS" (hero subline and meta description, in the list of what can be listed) are allowed English words in Thai UI copy.

- **Category rail** (owner-approved 2026-10-12, pattern seen on ploykhong.app): under the secondary links, one row of chips `rounded-full border bg-card px-3 py-1.5 text-caption` with the category's lucide icon and its project count (`text-faint tabular-nums`); categories with projects first (most first), 12 shown, then "ดูทั้งหมด ›" (`text-brand-text`). Phones: one row that scrolls sideways (no page overflow); `sm` and up: wraps, centered.
- **Hero light** (owner 2026-10-12, after the Aetox landing page, then "a circle of light that twinkles and breathes, like light through clouds"; our own CSS): `HeroLight` behind the home hero, full window width (`left-1/2 w-screen -translate-x-1/2`; the layout's content wrapper is `overflow-x-clip`), `h-[44rem]`, faded out at the bottom. The light source sits **on the hero's top edge** (owner 2026-10-12: light from above, like the first version), so only its lower half shows and the rays fan downward: **rays** all around (`repeating-conic-gradient` of `--hero-beam`, two fans turning 90 s / 60 s in opposite directions so they twinkle, and the whole fan pulsing 0.92 ↔ 1.08 over 7 s), a round **glow** (`--hero-light`, `44rem`, breathing 0.82 ↔ 1.12 over 5 s), and soft **clouds** (`--hero-cloud`, the page colour, centred `12rem` down) drifting ±7 % over 22 s so light breaks through in gaps. **Owner-approved exception to the no-infinite-loop rule (§7 Motion):** only transform / rotate / scale / opacity animate (composited, no JS, no canvas); reduced motion gets a still light.
- **Headline typing** (owner 2026-10-12): `TypedHeadline` splits `Home.heroTop` / `heroBottom` into grapheme clusters (`lib/motion/typing.ts`, so Thai marks stay on their letter); each glyph appears at `250 ms + i × 55 ms` (a 4-step pause between lines), and a 0.07em caret in `--hero-grad-from` passes along and blinks 3 times at the end. "ตัวเลขจริง" carries the gradient one slice per glyph (`color-mix` of the gradient tokens). The text is in the HTML from the first byte; screen readers read an `sr-only` copy (the glyphs are `aria-hidden`). Plays only on `html[data-nav="enter"]` (link or reload), never on Back / Forward, never with reduced motion.

### ProviderStrip ("Numbers verified by")

- Label `text-caption text-muted-foreground`, then one row of **real provider logos** (user request 2026-09-30): `size-8 rounded-lg` tiles in the brand's own colour with the glyph in white (dark glyph on yellow brands), `ring-1 ring-border` so black tiles show on the dark page. Hover/focus shows a tooltip with the name (`bg-popover border rounded-md text-xs`). Upcoming sources (`upcoming` prop) are the same tiles at `opacity-40` with "coming soon" in the tooltip, **off on the heroes** (2026-10-07, UX review: faded logos read as supported sources).
- Logos: Simple Icons SVG paths (CC0) in `src/lib/brand-icons.ts`, used only to say which service verifies a number (no endorsement implied). Polar has no Simple Icons entry, so it's a letter tile. Brand colours are the second hex exception after the image renderers.

### QuickSearch (spec 6.8, Phase 4 — replaces SearchBar)

- One client component, used in the **hero** (home, directory) and the **bottom section** (home, directory, startup detail; later categories / olympics / province). Input = `h-9 rounded-md border border-input bg-card pl-9 text-xs` + search icon + `kbd "/"` (sm+), inside a GET `form role="search"` to `/startups?q=` (works without JS); "+ เพิ่มผลงาน" primary button next to it.
- Search starts at 1 character, 200 ms debounce, stale requests aborted. `GET /api/search?q=&locale=`.
- **Panel:** `absolute z-30 w-full rounded-xl border bg-popover shadow-lg max-h-[420px] overflow-y-auto p-1.5`; opens **upward** when less than 440px is left below the input; never off-screen. Groups with `text-3xs uppercase text-faint` headers: **ผลงาน** (≤ 6: logo 28 · name with the match in `<mark class="bg-brand/20 text-foreground rounded-sm">` · verified check + source · 1-line tagline) · **หมวดหมู่** (icon + name) · **จังหวัด** (name + region). Empty groups hidden. Last row: "ดูผลลัพธ์ทั้งหมดสำหรับ “{q}” →".
- Focused + empty: "ยอดนิยม" (5 startups) + 8 category chips. Loading: 3 skeleton rows. No results: "ไม่พบ “{q}” · เพิ่มผลงานของคุณเป็นคนแรก" (link to /new).
- Keyboard: ↑/↓ (scrolls into view), Enter opens, Esc closes, click outside closes. ARIA combobox + listbox, options have ids for `aria-activedescendant`.
- **Mobile (< 640px):** focusing opens a full-screen sheet (`fixed inset-0 z-50 bg-background`) with the input pinned at the top, a close button and the same results.
- **Bottom section:** `border-t pt-12 mt-16`, centered `max-w-[640px]`: muted heading "หาผลงานอื่นต่อ" (`text-sm text-muted-foreground`), the QuickSearch row, then chips (top 8 categories).

### Buttons

- **Primary:** `bg-primary text-primary-foreground rounded-md text-xs font-semibold`
- **Outline/ghost-card:** `border bg-card hover:bg-accent rounded-md text-xs font-medium` (profile Share)
- **Dropdown button:** `h-7 rounded-lg border bg-secondary px-2.5 text-xs` + chevron (leaderboard metric, chart range)
- **Text link:** `text-caption text-faint hover:text-foreground` with trailing `›`

### Dropdowns (2026-10-11, owner report: the filter list opened upward past the screen edge, one choice only)

Rule for **every** list that drops from a control (selects, filters, action menus, search results, comboboxes): it **opens below its trigger, never above, and stays inside the screen**. Before it opens, the page scrolls just enough to give it room (never so far that the trigger slides under the sticky header), and the list is capped to the room that is there and scrolls inside (`src/lib/ui/room-below.ts`). No native `<select>`: the browser decides where its popup goes (Chrome opened it upward).

- **ChoiceSelect** (`core/ChoiceSelect.tsx`, Radix Select, popper below, `align start`, at least the trigger's width, max `22rem` / the room below): one choice. Variants: `field` (forms; = `inputClass` box, h-9), `filter` (sidebars; h-8 `rounded-md border border-input bg-background text-caption`), `chip` (= Dropdown button above). Rows `py-2 text-sm` (touch-sized), checked row `font-semibold` + brand check on the right; group headings `text-2xs font-semibold text-faint`. Optional fields keep the placeholder as a choosable first row so a choice can be cleared. In forms it posts one hidden field (works in GET forms); `required` blocks submit on the empty value.
- **MultiChoice** (`core/MultiChoice.tsx`, Radix Popover below): several choices, for **filters**. Trigger = `filter` box; text = placeholder ("ทุกหมวดหมู่") / the one label / "{first} +{n}" (all labels for screen readers). Panel: a search box when there are more than 12 options (matches Thai, English and aliases, e.g. "กทม"); checkbox rows (`accent-(--brand)`), grouped like the old optgroups; footer "ล้าง" · "เลือก n รายการ" · "เสร็จ". On touch screens opening doesn't focus the search box (the keyboard would eat the room).
- **URL:** one parameter, values joined by commas (`?category=saas,fintech`); repeated parameters are read too, unknown values dropped, max 20 (`src/lib/url-list.ts`). Within a filter any value matches (OR); different filters combine (AND).
- **Action menus** (DropdownMenu wrapper in `ui/dropdown-menu.tsx`): side bottom, capped to the room below; a menu taller than that scrolls the page and grows. **QuickSearch** results and **VocabCombobox** follow the same rule (QuickSearch no longer flips upward near the page bottom; phones still get the full-screen sheet).

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
- **Corner tag** `absolute top-2 right-2 rounded-sm border px-1.5 py-0.5 text-3xs font-bold uppercase tracking-wider`: `✓ Verified` (positive tone; **check only** on compact cards so the name stays readable, label kept for screen readers) when **revenue** is verified (visitor counts alone no longer earn it, §3 Verified vs counted); else `ShieldCheck` **Owner verified** (neutral tone, icon only on compact cards) when the snippet was found on the site; else the first **looking-for** ask in amber (Figma's FOR SALE slot until the marketplace ships), else none.
- Metrics by state (compact cards use the short labels "Revenue" / "Visitors"): verified revenue → Revenue (30d) · MRR · Growth; else traction → Visitors · Growth · Commits; else one muted "Not verified yet" line.
- **Nothing verified** (`proof_level = 0`, not a demo): the card is muted, `border-dashed bg-transparent` instead of `bg-card`; text keeps its normal tokens (no opacity, contrast stays). Round 3, 2026-10-05.
- **Home rows on phones are a swipeable row (owner 2026-10-13, replaces the 2026-09-30 "plain grid, no horizontal scrolling" rule below `md`).**
  - Below `md`: one `flex overflow-x-auto snap-x snap-mandatory` row that bleeds to the screen edges (`-mx-4 px-4 scroll-px-4`, no visible scrollbar). Cards are `shrink-0 snap-start`, `w-[80%]` (`min-[420px]:w-[46%]`), so the next card peeks and invites a swipe. The page itself never scrolls sideways.
  - From `md`, the grid as before (3 columns; 4 cards → 2/4; 5+ → 5 at `lg`).
  - Earlier rule, kept for `md` and up: Home rows are a **plain grid, no horizontal scrolling** (user feedback 2026-09-30): `grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3`. Show 6 cards below `lg` and 5 at `lg`. One column on narrow phones (UX review 2026-10-07: at 375 px the third metric column was ~40 px and cut values to "฿119…").
- **Metric values never truncate** (labels may): a number is the point of the card.

### StartupCard — large (directory grid, "More startups")

- `rounded-xl border bg-card p-4 flex flex-col justify-between`. Header: logo 36 `rounded-lg`, name 13 bold, copy-link + corner tag on the right; then the category chip on its **own full-width line** (`mt-3 inline-flex w-fit max-w-full rounded-sm border bg-secondary px-1.5 text-3xs text-muted-foreground`, inner `truncate` so it never wraps) — kept out of the header row because the copy button + corner tag squeeze the name column and would wrap the chip, drifting card heights (2026-10-14); then 2-line tagline `text-caption text-muted-foreground line-clamp-2`; footer `mt-4 border-t pt-4` 3 metrics (label 10 / value 10 bold, revenue shows growth inline in positive/negative).
- Copy-link icon button stays (top right, next to the tag, `opacity-0 group-hover:opacity-100` on desktop).

### LeaderboardCard

- **Opening, per metric (audit 2026-10-12, owner review):** each home board (MRR, revenue 30 days, visitors, commits) opens once **3** projects can rank on that board (`BOARD_OPEN_MIN`, `boardState`). Only open boards appear in the metric picker.
  - **Closed** (none open): the `#leaderboard` anchor holds a `rounded-xl border border-dashed bg-card p-5` card with a Trophy in a `size-10 rounded-full bg-secondary` circle and "กระดานผู้นำ". It says that each board opens at 3 projects with that number from a connected source.
  - Under that, a `text-faint tabular-nums` line gives the two numbers that differ: "ผลงานที่ลงไว้ {listed} ชิ้น · มีตัวเลขพอจัดอันดับ {eligible} ชิ้น". Listed = published projects; eligible = distinct projects on any board, team and demos excluded.
  - The primary "เชื่อมตัวเลขของผลงาน" → `/dashboard`. It doesn't say "ยืนยัน", because visitors are counted, not verified.
  - **Sparse** (some open): the card shows the open boards plus a footnote that the others open at 3.
  - **Open**: as before.
- **The team's own projects never rank** (`lib/team`, owner decision 2026-10-12): they're left out of every board (and so out of the landing API's board) and out of the profile's "อันดับ #n". They stay listed and verified like any project.
- Founder column (2026-10-07): the JaoPor display name (fallback `@handle`) with the profile photo, linking to `/u/{handle}`; never the X handle (the rest of the site names people by their JaoPor profile).

- One `rounded-xl border bg-card` container with `id="leaderboard"`.
- Header row `px-5 py-3.5 border-b`: "Leaderboard" (`text-sm font-bold`) + **"● อัปเดตทุกวัน" / "Updated daily"** (`size-1.5 rounded-full bg-positive` dot + `text-2xs text-muted-foreground`, no uppercase; was "LIVE" until 2026-10-08, but the numbers sync daily, UX audit M-4) + right-side **metric dropdown**: MRR · Revenue (30d) · Visitors (30d) · Commits. Switching is client-side (lists are fetched server-side, page stays ISR).
- Table (shadcn `Table`): header `text-2xs uppercase text-faint`; rows `border-b hover:bg-accent/40`, `py-3`:
  - `#` (`Medal` rings 1–3, then number, `text-faint`) · logo 24 + name (`text-xs font-semibold`) over tagline (`text-2xs text-faint truncate`) · founder (avatar 16 round + name `text-xs text-muted-foreground`, hidden below `sm`) · value (right, `text-xs font-bold`) · growth (right, `text-xs`, hidden below `sm` for commits).
- Shows 10 rows, then "Show all (n) ↓" text button reveals up to 50.
- **Rules (A1.3, 2026-10-10; `lib/leaderboard.ts`, the single definition):**
  - **What each board ranks:**
    - **MRR ปัจจุบัน** (current MRR at the last daily sync, verified);
    - **รายได้ 30 วัน** (trailing 30 days, verified);
    - **ผู้เข้าชม 30 วัน** (trailing 30 days, **counted**);
    - **Commits ทั้งหมด** (all-time, default branch, GitHub).
  - **Labels carry the period**, in the select and the column header.
  - **Eligible:** published, not a demo, has a value (no data ≠ 0); revenue boards also need `verification_status = 'verified'` (a broken key sets "error" and drops the project).
  - **Ties:** equal values share a competition rank (1, 1, 3), shown as the rank (or medal) + a small "=" and `sr-only` "อันดับเท่ากับผลงานอื่น", and listed by name, never by creation date. The project page's "อันดับ #X" (`getRank`) counts the same way.
  - **Footer:** the selected board's definition line (`Leaderboard.basis.{metric}`: source, period, and what "เติบโต" compares; on the MRR board growth is **revenue** growth, said explicitly). When the board has a tie, a second line: "ค่าเท่ากันได้อันดับเดียวกัน (=) และเรียงตามชื่อ".
  - **Not yet:** a dedicated `/leaderboard` page and Movers (later phase; rank history isn't stored).

### Profile header

- **Profile layout v3 (owner 2026-10-13, compared with TrustMRR: "overwhelming … ตำแหน่งการวาง layout"; supersedes the two-column layout, the cover, the headline number and the pinned left column below).** What a visitor should do here, in order: see the 4 key cards, read the chart, then Visit or Share. Everything else comes after.
  - **One column**, `max-w-page`, no cover banner (the screenshots are further down; anonymous projects lose nothing).
  - **Header row:** logo 64 (`rounded-2xl`, 56 on phones) · name `text-2xl sm:text-3xl font-bold` + tagline `font-prose text-body text-muted-foreground` (2 lines max on phones) · a meta row (`text-caption`): category link, FoundingBadge, team chip, VerifiedBadge, evidence-ladder ⓘ, anonymous chip, LiveViewersPill. **Right side (from `sm`): Share (outline) then "เข้าเว็บไซต์ ↗" (primary), both `h-9`**, top-aligned with the name, as on TrustMRR. Phones: the two buttons sit in one row under the header (Visit `flex-1`). Other project links (GitHub, store pages) stay as small chips under the meta row.
  - **Four cards** right under the header (`KeyCards`: `grid grid-cols-2 gap-3 lg:grid-cols-4`, `StatCard` look: label `text-caption font-semibold text-faint uppercase`, value `text-2xl font-bold tabular-nums`, caption `text-caption text-muted-foreground`):
    1. **รายได้ทั้งหมด** (verified) · caption "อันดับ #n" · ⓘ source.
    2. **MRR** (verified) · caption active subscriptions · ⓘ what MRR counts, and, when MRR is above revenue so far, the per-source reason (was a line under the headline number).
       - No verified revenue: these two slots take the next public numbers in this order: revenue shown as a range / growth (R2), visitors 30 days ("นับโดย {source}"), commits (GitHub), active users. A number used here isn't repeated in "ตัวเลขจากระบบที่เชื่อมต่อ".
       - No public number at all: the slots are left out and the early-stage / upgrade card sits under the row (as before).
    3. **ผู้ก่อตั้ง:** photo 28 + name `text-lg font-bold truncate`, caption = role (else headline, else @X); the card links to `/u/{handle}`. Anonymous projects: "ไม่เปิดเผยชื่อ".
    4. **ก่อตั้ง:** month + year (`text-2xl`), caption = province with its Olympics rank (link) or country. No date: the card shows the province as the value instead; nothing at all: an owner-only "+ เพิ่ม" card.
    - Phones: 2 × 2. Fewer cards: the row uses that many columns from `lg` (never an empty cell).
  - **Chart card** next (full width), with its "ยืนยันผ่าน … · อัปเดตล่าสุด" stamp.
  - **Then the story, in this order:** SectionTabs (ภาพผลงาน · เกี่ยวกับ · ข้อมูลเชิงลึก · อัปเดต; "ตัวเลข" dropped because the numbers are above) → screenshots → ตัวเลขจากระบบที่เชื่อมต่อ → เกี่ยวกับ → กำลังหา → ข้อความจากผู้ก่อตั้ง → ข้อมูลเชิงลึก → อัปเดต → ผลงานอื่น → QuickSearch.
  - **StickyIdentity** now shows at every width (there is no pinned left column any more) once the header has scrolled away; the tab row pins under it (`top-[6.5rem]`).
  - **Acceptance:** at 1440 × 900 the header, the four cards and the top of the chart are on the first screen; at 375 the header, both buttons and the four cards (2 × 2) are; no horizontal scroll; th / en; light and dark.
- **Two-column layout (owner 2026-10-12, from the Lovable mockup; superseded 2026-10-13 by v3 above, kept for history):** from `lg` a grid `16.25rem | 1fr` (`gap-10`).
  - **Left column (who and what):** logo 80 `rounded-2xl` → name `text-2xl font-bold` + category link (`text-caption text-muted-foreground`) → badges row (anonymous chip, FoundingBadge, VerifiedBadge, evidence-ladder ⓘ) → tagline (`font-prose text-body leading-relaxed text-muted-foreground`) → full-width primary "เข้าเว็บไซต์ ↗" (`h-9`) + ShareStudio → other ProjectLinks → **FounderLine** (photo 40, name, "ผู้ก่อตั้ง · {role}", links to `/u/{handle}`, `hover:bg-accent`) → province / country and founded date (`text-caption`, MapPin / Calendar icons) → LiveViewersPill.
  - **Right column (numbers and story):** anonymous / demo notes → TractionTiles when they lead → StatCard row (`grid-cols-2`, auto-fit from `sm`) → chart card → TractionTiles otherwise → **"เกี่ยวกับ {name}"** (`text-lg font-bold`) + the long description (ClampedText) → LookingForBanner → screenshots → FounderMessage → InsightsGrid → updates.
  - **Phones:** one column, the left column first with the logo beside the name; the first number still shows on the first screen at 375 px.
  - "More startups" and QuickSearch stay full width under the grid.
  - **Cover (owner 2026-10-12):** a full-width banner above the grid (`h-32 sm:h-44 lg:h-52 rounded-2xl border`), `ProfileCover`: the first desktop screenshot (`object-cover object-top`), else a gradient in the hero blues (`--hero-grad-from/via/to`) with a faint dot grid; a `from-background/60` fade at the bottom. The logo overlaps its bottom edge (`-mt-14` / `lg:-mt-16`, `ring-4 ring-background`), above the name at every width. Anonymous projects have no public screenshots, so they always get the gradient.
  - **Headline number:** under the badges, the strongest number public at its exact value, `text-3xl font-bold tabular-nums`, with "{label} · ยืนยันผ่าน {source}" (`text-caption`): MRR → revenue 30 days → visitors 30 days ("นับโดย {source}") → total commits. None for demos.
  - **Team project label:** the team's own project (`lib/team`) carries a chip "ผลงานของทีม JaoPor · ไม่จัดอันดับ" (`rounded-full border text-2xs text-muted-foreground`, Users icon) in the badges row.
  - **MRR above revenue so far:** when the headline is MRR and MRR > all-time revenue, a `text-caption text-faint` line under it explains why, per source:
    - **Stripe:** our own calculation (`lib/revenue/metrics.ts`): list price of subscriptions not cancelled, including overdue ones, excluding trials, averaged per month, coupons not deducted, so it isn't money received.
    - **RevenueCat:** RevenueCat's own figure, by RevenueCat's definition.
    - Any other source: no line.
  - **Order in the right column (owner 2026-10-12):** stats → chart → **screenshots** → traction tiles → เกี่ยวกับ → … (visuals early).
  - **Section tabs (owner 2026-10-12):** at the top of the right column, `SectionTabs`: ตัวเลข · ภาพผลงาน · เกี่ยวกับ · ข้อมูลเชิงลึก · อัปเดต (links to `#numbers` `#shots` `#about` `#insights` `#updates`). Sticky (`top-14` from `lg`; `top-[6.5rem]` below it, under the identity bar), `bg-background/95 backdrop-blur border-b`, `h-10` tabs in `text-caption font-semibold`; the part on screen gets `border-b-2 border-brand text-foreground` and `aria-current="location"`. Tabs whose part renders nothing for this visitor drop out after the first paint; the row hides below 2 tabs. Parts carry `scroll-mt-40 lg:scroll-mt-28`. Scrolls sideways on phones.
  - **Tabs analysis and recommendation (2026-10-13, NOT built; waits for owner approval).** Replaces the 2026-10-12 "tabs that switch" proposal.
    - **Owner feedback:** tapping a tab "drags" the page down to a section far below, which feels jarring.
    - **Current IA (measured on `/th/startup/jaopor`, local, 2026-10-13):**
      - One long page: cover → two columns (identity left, numbers and story right) → "More startups".
      - Right column order: ตัวเลข → ภาพผลงาน → เกี่ยวกับ → ข้อมูลเชิงลึก → อัปเดต. Page height 4,339 px at 1440, 6,211 px at 375.
      - `SectionTabs` are plain links to `#numbers` … `#updates`, pinned under the header; the active tab follows the scroll (IntersectionObserver).
      - The name is already kept in view: the left column is sticky from `lg`, and StickyIdentity shows a bar below it.
    - **What actually goes wrong (Playwright, tab row pinned, each tab clicked in order):**
      1. **Instant jumps of 450–930 px.** No smooth scrolling exists anywhere (only the reduced-motion `scroll-behavior: auto`), so the whole right column is replaced in one frame and the reader can't tell which way or how far they moved. This is the "dragged" feeling.
      2. **Focus doesn't move.** After a jump, focus stays on the link (or `body`), so a screen reader doesn't announce the new section and Tab continues from the tab row.
      3. **"เกี่ยวกับ" lands flush against the tab row** (2 px gap vs 18 px for the other sections, because of its own `pt-2`).
      - What works: every section lands under the pinned row; the active tab is correct after each click; the hash updates, so direct links (`/startup/x#updates`) and Back work.
    - **Option A, anchor navigation polished (recommended):** keep one page and the links, but:
      - scroll smoothly on a tab click (`scrollIntoView({ behavior: "smooth" })`; instant with reduced motion);
      - pin the clicked tab as active until the scroll ends (`scrollend`, 1 s fallback), so the underline doesn't run through every tab on the way;
      - push the hash with `history.pushState` so Back and direct links keep working (a hash in the URL on load still jumps there, as today);
      - move focus to the section heading (`tabIndex={-1}`, `focus({ preventScroll: true })`);
      - even out the landing gap (the same `scroll-mt` for every section, no `pt-2` on "เกี่ยวกับ").
      - About 30 lines in `SectionTabs` and the page; no new strings, no new layout.
    - **Option B, content-switching tabs (the 2026-10-12 proposal):** one panel visible at a time.
      - It removes the long jump, but hidden panels break find-in-page and the quick scan down the page, need `?tab=` state and an overview panel, change the page height on every switch (which jumps the page anyway), and need `role="tablist"` keyboard handling.
      - Several times the code of A for a problem A solves at the source.
    - **Recommendation:** A. The problem is how the page moves, not that the content lives on one page. Revisit B only if, after A, readers still say they can't find a section.
    - **Acceptance (for the build):**
      - A tab click scrolls smoothly (instantly with reduced motion), and the section heading lands 16–24 px below the pinned row at 1440 and 375.
      - The active tab doesn't flicker through other tabs during the scroll.
      - Focus is on the section heading afterwards; a screen reader reads it.
      - `#updates` in a shared link opens at that section; Back after a tab click returns to the previous position.
      - No horizontal scroll at 375; checked on desktop and 375.
  - **Shorter insights:** InsightsGrid sits in `ShowMore` (first 26rem, a fade into the background, then "ดูข้อมูลเชิงลึกทั้งหมด ⌄" / "ย่อ"). It only clips after the script has measured it as taller, so the full text is in the HTML.
  - **No public numbers yet (owner 2026-10-12, early-stage projects):** the numbers slot doesn't show the faint "ยังไม่ยืนยัน: …" line. **Visitors** get **EarlyStageCard** (`rounded-xl border border-dashed bg-card p-5`, Sprout in a `size-9 rounded-full bg-secondary` circle): "ผลงานช่วงเริ่มต้น" + one sentence + a primary "ลองใช้งาน ↗" (project link) and an outline "ดูโปรไฟล์ผู้สร้าง". The **owner** gets **UpgradeCard** (`rounded-xl border border-brand/40 bg-brand/5 p-5`): "อัปเกรดเป็นตัวเลขยืนยัน" + why + three rows to the editor's chooser: Commit บน GitHub (ไม่ต้องใช้คีย์) → `#verify-build`, ผู้เข้าชม (โค้ดนับของ JaoPor, ไม่ต้องใช้คีย์) → `#verify-traffic`, รายได้ (Stripe / RevenueCat, คีย์อ่านอย่างเดียว) → `#verify-revenue`, plus a faint line saying what others see. "เกี่ยวกับ" without a description renders nothing for visitors (no lone heading). Section tabs show only with 3 or more non-empty parts.
  - **Never lose the name (owner 2026-10-12):** from `lg` the left column is `sticky top-20` (only when the screen is at least 40rem tall, so it never hides its own bottom). Below `lg`, **StickyIdentity** slides a 48 px bar under the site header (`fixed top-14`, `bg-background/95 backdrop-blur border-b`, `translate` + `opacity` in `--motion-base`) once the logo + name block is under the header: logo 28, name `text-sm font-bold truncate`, a small primary "เข้าเว็บไซต์ ↗". Hidden from screen readers and `inert` while out of view.

- Breadcrumb `text-2xs text-faint`: `JaoPor › Startups › {name}` (last item `text-foreground`).
- Row: logo 72 `rounded-2xl border` · name (`text-2xl font-bold`) + founding badge + `VerifiedBadge` · description paragraph `font-prose text-body text-muted-foreground max-w-2xl` (tagline, then the long description). Below `sm` the logo sits **above** the name (`flex-col`, 2026-10-07: beside it, the logo column squeezed the text into a narrow strip on phones). Right side actions: **Share** (outline-card button, opens ShareStudio) and **Visit ↗** (primary; the first project link).
- **Numbers first (2026-10-08, UX audit M-6; order refined 2026-10-10, master audit item 6):** the StatCard row comes **directly under the header** at every width (tiles with no data drop out); ProjectLinks and the LookingForBanner follow, then the **Proof** container (chart + traction tiles), then **Story** (why + build story + facts), screenshots, founder message, updates. `TractionTiles` no longer sits above the header row for revenue-less projects — it lives in Proof. (On a 375 px phone the first screen used to hold no number.)
- **Long description on phones:** below `sm` the description shows 4 lines (`line-clamp-4`) with a `text-caption text-brand-text` "อ่านต่อ" / "ย่อ" toggle (only when it is longer than about 160 characters); full text from `sm`.
- Under the numbers: other ProjectLinks (small outline buttons) and the LookingForBanner.

- **Evidence ladder (2026-10-08, UX audit C-4):** a MetricHelp ⓘ at the end of the name / badge row (not on demos), "หลักฐานแต่ละแบบต่างกันอย่างไร", opening "ตัวเลขบน JaoPor มาจากไหน" with four lines, strongest first: ยืนยันรายได้ (read from Stripe / Polar / RevenueCat) · หลักฐานการสร้าง (public GitHub commits) · ยืนยันเจ้าของเว็บ (ownership, not numbers) · นับโดย (browser-sent, so counted). The ones this project has get a positive ✓, the rest a faint dot.

### StatCard (profile quick stats)

- `rounded-xl border bg-card p-4 space-y-2`: label (`text-caption uppercase tracking-wider text-faint font-semibold`) → value (`text-2xl font-bold tabular-nums`) → note (`text-caption text-muted-foreground`).
- Row (`grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3`), **only tiles with data**: **All-time revenue** (note: "Ranked #n on JaoPor") · **MRR** (note: "n active subscriptions") · **Founder** (`FounderCard`: avatar 20 + name as value at `text-base`; note = the founder's role on this project (`startups.founder_role`, e.g. "Founder, CEO"), else their profile headline (e.g. "cu109"), else the 𝕏 handle; the whole tile links to `/u/{handle}` with the hover lift, and the FounderMessage name links there too) · **Founded** (month year; note: province + localized country name via `Intl.DisplayNames`; no flag emoji, Windows renders them as letters).
- **MetricHelp (2026-10-08, UX audit M-3):** money tiles explain themselves. The label row gets a `size-6` ghost icon button (`Info` 14 px, `text-faint hover:text-foreground`, `aria-label` "{label} คืออะไร", `aria-expanded`); it opens a popover across the tile row, which is `relative` (`absolute inset-x-0 sm:inset-x-3 top-12 z-10 rounded-md border bg-popover p-3 text-caption text-muted-foreground shadow-md`, Esc / outside click / the button close it). Texts say what is counted and from where, never more than the code does:
  - รายได้ทั้งหมด: money actually received since the first sale, minus refunds, read from {source}.
  - MRR: the monthly value of subscriptions active now (yearly plans ÷ 12) as reported by {source}; expected, not received, so it can differ from revenue. Stripe adds: counted from plan prices, includes overdue subscriptions, coupons not deducted yet.
- **Empty-state rule (spec 2.4):** unverified revenue/MRR tiles are dropped and replaced by one `UnverifiedLine`; Founded without a date shows as **Location** (ที่ตั้ง); nothing at all → owner-only `EmptyOwnerCard`. Visitors never see "–".

### RevenueChartCard (spec 6.4 step 3, Phase 2)

- `Card p-4 sm:p-6`. Header left: period total (`text-3xl font-bold tabular-nums`; for **MRR** the latest value) + GrowthPill vs the previous period. Right: two compact selects (`h-7 rounded-lg border bg-secondary text-caption`): **metric** (รายได้ · MRR · ผู้เข้าชม, only those with data) and **period** (7 วัน · 30 วัน · 12 เดือน). 12 months plots weekly points.
- Plot `h-64`: Recharts area (smooth), `--chart-1` 2px line, gradient fill (0.25 → 0), horizontal grid `--border`, axes `text-2xs --faint`. Hover: crosshair + tooltip in text tokens. (Owner preference 2026-10-07: keep the smooth area for every metric; a bar version was tried and reverted.)
- **Y ticks are round numbers in the displayed currency** (0 / 250 / 500 / 750 / 1k), computed in ฿ or $ (not converted from round dollar ticks), integers for visitors.
- Footer switches: **เทียบช่วงก่อนหน้า** (dashed `--chart-2` + mini legend) and **Trend** (7-point moving average).
- Under the plot, inside the card: `text-caption text-muted-foreground` stamp for the **selected metric's** source: revenue / MRR = check icon (`text-brand-text`) "ยืนยันผ่าน {Source} · อัปเดตล่าสุด {time}"; visitors = `ChartColumn` icon (`text-muted-foreground`) "นับโดย {Source} · อัปเดตล่าสุด {time}" (demo: "ข้อมูลตัวอย่าง").
- No profit-margin pill: we have no cost data (spec item skipped until a source exists).
- Nothing verified: the card is hidden for visitors; the owner sees an `EmptyOwnerCard` "+ เชื่อมต่อ Stripe เพื่อแสดงกราฟ".

### VerifiedStamp

- `text-caption text-muted-foreground`, centered line: brand check icon · "Revenue is verified with **{Source}** API key. Last updated: {datetime}". Stale (> 48h) or error → amber text.

### Project page order (owner request 2026-10-11: back to the pre-10-Oct layout)

The 2026-10-10 "Proof → Story" split (master audit item 6: one "ตัวเลขที่ยืนยัน / นับได้" container, one "เรื่องราวของผลงาน" container) was **reverted**: the owner found it harder to read. The page reads again:

- header → stat cards → links / looking-for. A project **without verified revenue leads with `TractionTiles`** (visitors, build) right under the header (`tractionFirst`), so a phone's first screen holds a number.
- **Chart card** (revenue / MRR / visitors with the verified-by / counted-by stamps). Nothing verified → the owner's "+ เชื่อมต่อ" prompt, never an empty card for visitors.
- **TractionTiles** ("ตัวเลขจากระบบที่เชื่อมต่อ", H2, tiles + the founder's **build story** quote card under them), unless it already led.
- Screenshots / demo video → FounderMessage → **InsightsGrid** ("ข้อมูลเชิงลึก": value proposition full width, then two columns: audience · pricing · team · funding · channels | problem solved · category · tech stack · AI tools) → latest updates → more startups.
- Empty-state rule unchanged: visitors see only filled cards; the owner sees `EmptyOwnerCard` prompts.
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

- **One section at a time.** Seven sections, each a `Card p-5 space-y-4` with a title (`text-sm font-bold`) and one helper line (`text-caption text-muted-foreground`): 1 ข้อมูลหลัก (name, tagline, description, category, logo) · 2 ลิงก์และที่ตั้ง (links, country, province, founded) · 3 เล่าเรื่องผลงาน (value, problem, audience, pricing, team, funding) · 4 เทคโนโลยีและการตลาด (built with, stack, channels, looking for) · 5 ภาพและวิดีโอ (screenshots, demo video) · 6 ผู้ก่อตั้ง (message, role, build story) · 7 ยืนยันตัวเลข (VerifyPanel). **2026-10-08 (UX audit S-8):** "กำลังหาอะไรอยู่?" moved from section 4 to 1 ข้อมูลหลัก (it is the banner at the top of the profile).
- **Section nav:** `lg` = sticky left column (`w-56`), each item icon + name + state (`CheckCircle2` positive when complete, else "2/5" `text-faint`); mobile = horizontal scroll chips under the title. Active item `bg-secondary font-semibold`.
- **Progress header:** "ข้อมูลครบ {pct}%" + thin bar (`h-1.5 rounded-full bg-secondary` / fill `bg-brand`) + "ต่อไป: {section} →". **Weighted (2026-10-08, UX audit S-6):** verification 30, screenshots 20, description 15, province 10, the other fields share 25. "ต่อไป" follows the OwnerBar order (story → screenshots → verify → province), then the first incomplete section, and never names the section already open.
- **Footer of each section:** "← ก่อนหน้า" / "ถัดไป →" ghost buttons.
- **Sticky save bar** (`sticky bottom-0 border-t bg-background/95 backdrop-blur py-3`): left "มีการเปลี่ยนแปลงที่ยังไม่บันทึก" (warning dot) or "บันทึกแล้ว"; right Cancel + Save (primary). Saves the whole form from any section; a validation error jumps to its section. **Saving stays on the page (2026-10-08, UX audit S-3):** toast "บันทึกแล้ว" with the action "ดูหน้าผลงาน"; the saved row becomes the new baseline (bar back to "บันทึกแล้วทั้งหมด"). It used to jump to the public page after every save.
- Deep links (`#field`, `#verify-*`, `#screenshots`) open the right section, then scroll + highlight the field.
- **✨ ช่วยเติมจากเว็บไซต์** (outline button, section 1 header): reads the project's website (+ GitHub README) and fills only **empty** fields, then shows "เติมให้ {n} ช่อง — ตรวจแล้วกดบันทึก · เลิกทำ". Uses a free Gemini key when configured, otherwise the page's own title/description/structured data.
- **ดึงจาก GitHub** (outline `sm` button with `GitBranch` icon above the stack combobox, 2026-09-30): reads the **public** repo in the GitHub link box (unsaved value allowed) — languages, root files (vercel.json, Dockerfile, fly.toml…) and manifests (package.json, requirements.txt, pyproject.toml, composer.json, Gemfile, pubspec.yaml, go.mod) — and shows the found items in the dashed "ตรวจพบจาก GitHub: … · เพิ่มทั้งหมด" strip. Disabled with a hint when there is no GitHub link. Private repos → "ไม่พบ repo สาธารณะ".

- **Editable link (2026-10-08, UX audit S-9, migration slug_history):** first field of ลิงก์และที่ตั้ง, "ลิงก์หน้าผลงาน": an input group with the muted prefix `{host}/startup/` and the slug (typed lowercase, spaces → "-", other characters dropped; same rule as the DB check). Hint: old links redirect automatically and the badge keeps working. Taken (or another project's old link) → "ลิงก์นี้ถูกใช้แล้ว ลองอันอื่น" in that section. Behind it: every rename is remembered in `startup_slug_history`; `/startup/{old}` permanently redirects to the current slug, `/api/badge/{old}` serves the current badge, and an old slug stays reserved for its project.
- **LogoField (2026-10-08, UX audit S-4):** the one logo control for Add-project and the edit page: 48 px `rounded-xl` tile (current logo, or the first letter), "อัปโหลดเอง" (a styled `label` around a hidden file input, never the browser's "Choose File" text) and "ลบโลโก้". On the edit page the tile shows the stored logo; remove clears it on save.
- **"ฟรี" next to verified revenue (2026-10-08, C-3):** in เล่าเรื่องผลงาน, choosing ฟรี while revenue is verified shows a `rounded-md border border-warning/40 bg-warning/10 p-3 text-caption` note (`role="note"`) asking for the paid plan's price.

### ScreenshotsManager (edit form, spec 6.9)

- Drop zone `rounded-xl border border-dashed p-6 text-center` ("ลากไฟล์มาวาง, วาง (Ctrl/Cmd+V) หรือคลิกเพื่อเลือก"), PNG/JPG/WebP ≤ 5MB, max 8. Files are resized in the browser to ≤ 2400px, re-encoded to WebP (JPEG on Safari / iOS, transparent areas white; both drop EXIF/GPS), then uploaded to `screenshots/{startup_id}/{uuid}.webp|jpg`.
- Grid of thumbnails (`grid grid-cols-2 sm:grid-cols-4 gap-3`): thumbnail, kind select (Desktop / Mobile / LINE; auto from aspect ratio), caption input (≤ 60), ←/→ move buttons + drag to reorder, delete (×). The first is marked "ภาพปก" (cover). Drag-to-reorder is native HTML5 DnD on the tile: a `GripVerticalIcon` handle, the dragged tile fades to 40% (`opacity-40`), the hovered drop target gets `ring-2 ring-brand`, `draggable={false}` on the image and `text/plain` set on the dataTransfer (Firefox needs data for a drag to start), and the pure `moveShot` helper (`lib/media.ts`, unit-tested) computes the new order; the ←/→ buttons stay for keyboard and touch (native DnD does not work on touch).

### VocabCombobox (edit form, spec 6.9)

- Searchable multi-select: selected **LogoChips with ×** above an input (`inputClass`); typing filters a listbox (`rounded-md border bg-popover shadow-md max-h-64 overflow-auto`) grouped under muted headers, each option with its glyph; ↑/↓/Enter/Esc; Backspace in an empty input removes the last chip. Channels allow a custom entry row "+ เพิ่ม “{text}”".
- Province uses the single-select variant (grouped by region), required when the country is Thailand.
- **Category picker** (wizard step 1 and the edit page; owner request 2026-10-11, "scrolling to find a category took too long"): the same single-select combobox. Each option shows its category icon; before typing, **"ประเภทยอดนิยม"** (AI · SaaS · อีคอมเมิร์ซ · เพิ่มประสิทธิภาพงาน · การศึกษา · เกม) sits on top; typing matches Thai and English names, descriptions and common words ("เกม", "ร้านค้า", "บัญชี", "ไลน์", "chatbot"). Placeholder "พิมพ์หาประเภท เช่น เกม การศึกษา ร้านค้า"; no match → "ไม่พบประเภทนี้ ลองคำอื่น หรือเลือก “อื่น ๆ”". Required in the wizard (no default).
- **Province picker everywhere** (onboarding, profile editor, startup edit; first-user test 2026-10-05: people scrolled 77 provinces and gave up): the same single-select combobox. Before typing, a **"จังหวัดยอดนิยม"** group sits on top (Bangkok, Chiang Mai, Khon Kaen, Chon Buri, Phuket, Nonthaburi), then the regions. Typing matches Thai and English names plus common aliases ("กทม", "bkk", "โคราช", "korat", "หาดใหญ่", "pattaya"…). Where province is optional, a "ไม่ระบุ" option sits first. Placeholder "พิมพ์ชื่อจังหวัด เช่น กทม".
- **Suggested province** (onboarding only): when the field is still empty, it is pre-filled from the visitor's approximate location (`/api/live/whoami`, nearest province, Thailand only) with a hint under the field "เดาจากตำแหน่งโดยประมาณ เปลี่ยนได้" (`text-2xs text-faint`). Nothing is saved until the user continues.

### More startups (profile bottom)

- H2 "ผลงานอื่น ๆ" + "View all →" link; `grid sm:grid-cols-2 lg:grid-cols-3 gap-3` of large StartupCards (same category first, then same province, then newest; 6 max).

### ShareStudio (spec 6.5, Phase 3)

Dialog `sm:max-w-xl rounded-xl bg-popover`, title "แชร์ตัวเลขที่ยืนยันแล้ว" (only the verify moment opens it by itself, with "ยืนยันแล้ว!"; "แชร์ผลงานนี้" when nothing is verified); × / Esc / backdrop close.

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

- `main max-w-page`: centred breadcrumb (JaoPor › หมวดหมู่, `text-caption text-faint`) → centred H1 "สำรวจหมวดหมู่" (`text-2xl md:text-3xl font-bold`) → subtitle.
- Grid `grid gap-3 sm:grid-cols-2 lg:grid-cols-4` of **one-line CategoryCards**: `rounded-xl border bg-card p-3 flex items-center gap-3` link (hover `border-border-strong`) → 40px icon box (`size-10 rounded-lg bg-background`, icon 18px) · name (`text-sm font-semibold truncate`) + count (`text-2xs font-bold text-brand-text`, "{n} ผลงาน", only when > 0) · description one line (`text-caption text-muted-foreground truncate`).
- Sorted by count, then config order. Count 0 → icon `opacity-50`, name `text-muted-foreground`.
- **Empty categories fold away (2026-10-07, UX review: 36 of 37 were empty cards):** when at least one category has projects, only those get cards. The empty ones follow as one compact chip row: heading "ยังว่าง {n} หมวด" (`text-sm font-bold`) + hint "ลงผลงานเป็นคนแรกในหมวดเหล่านี้" with a `text-brand-text` link "เพิ่มผลงาน →" (`/new`), then chips `rounded-full border bg-card px-2.5 py-1 text-caption text-muted-foreground` with the 14px icon, each linking to `/category/{slug}`. With no projects anywhere, the card grid stays as it is.
- Cards (and every category link: footer, QuickSearch, home teaser) open **`/category/{slug}`**.

### Category page (`/[locale]/category/[slug]`, 2026-09-30)

- The category **is the title**, so the visitor always sees the topic: centred breadcrumb JaoPor › หมวดหมู่ › {name} → 48px icon tile (`size-12 rounded-xl border bg-card`) → H1 "ผลงานหมวด {name}" → description + "พบ **{n}** ผลงานในหมวดนี้" → QuickSearch + Add (max 640px, centred).
- Large StartupCards `sm:grid-cols-2 lg:grid-cols-3` with third stat รวมทั้งหมด; more than 24 → "ดูทั้งหมด {n} ผลงาน →" (`/startups?category=`). Empty → dashed card + Add.
- "หมวดหมู่อื่น": 12 busiest other categories as icon chips + "หมวดหมู่ →". Unknown slug → 404.

### HomeTeasers (home, spec 6.2, Phase 7)

- **Olympics teaser value (fix 2026-10-12):** the value follows the default Olympics metric. It shows a project count ("{n} ผลงาน") when the board counts projects, money only for money metrics, and the subtitle says which. It used to format a count of 1 as "฿0".
- After the LeaderboardCard: `grid gap-3 md:grid-cols-2`. Left `Card p-5` "สำรวจหมวดหมู่" + "ดูทั้งหมด ›" (`text-caption text-faint`) → 8 busiest categories as chips (`rounded-full border bg-secondary px-2.5 py-1 text-caption`, lucide icon `size-3.5`, bold count when > 0) → `/startups?category=`. Right `Card p-5` "โอลิมปิกจังหวัด" → top 3 provinces (Medal · ProvinceBadge `h-8 w-11` · name · total) + caption "จัดอันดับจากรายได้ที่ยืนยันแล้ว". No ranked province → the Olympics card is omitted and categories take the full width.
- Home CTA rule: "+ เพิ่มผลงาน" in the header, the hero and next to the bottom search (owner request 2026-10-07: a visitor who scrolled to the end should be able to add without scrolling back up). The hero sub-links are หมวดหมู่ · โอลิมปิก · กระดานผู้นำ; the "Recently added" empty state has no button; the bottom QuickSearch section renders without its chips (`chips={false}`).
- Hero "ดูผลงานทั้งหมด {n} ชิ้น" shows the number only from 20 projects ("ดูผลงานทั้งหมด" below).
- LeaderboardCard empty state: "ยังไม่มีตัวเลขที่ยืนยัน… มาเป็นคนแรกบนกระดาน" + `text-brand-text` link "ยืนยันตัวเลขของคุณ →" (/dashboard).

### Olympics page (`/[locale]/olympics`, spec 6.7; v3 2026-10-01 = Claude Design frame 149:7635 + our open spots and map)

- **Team projects (owner decision 2026-10-12, `lib/team`):** the team's own project is listed in its province but scores nothing on any metric. It isn't on the podium or in "ตัวท็อป", and it gives its province no rank.
  - **Listing and competing are separate numbers:** `countByProvince` / `getProvinceProjectCounts` count published projects; `rankProvinces` scores competitors.
  - "ยังไม่มีผลงานจาก N จังหวัด", the province page's noindex and the sitemap use the listing counts.
  - The header's "จังหวัดที่ลงแข่ง" and "ผลงานที่นับคะแนน รวมทั้งประเทศ" (projects board) use the competition.
  - "นับคะแนนยังไง" says the team's projects aren't scored.

#### Olympics v4 — part 1 built (2026-10-12, owner: "อันดับเรียงเป็นการ์ด … unsatisfying" on phones)

- **Ranking rows on every screen:** the table starts at #1, with a Medal for #1–3 in a `w-12 sm:w-14` rank column.
  - Each row carries a bar of its total against the leader's (`h-1 max-w-36 bg-brand/70`, at least 4% so it shows).
  - **Phones:** the rank-change column and the ProvinceBadge hide; the change moves beside the region name and the value column narrows to `w-24`.
  - On the projects board the "ผลงาน" count column is hidden (it repeated the value).
- **Podium cards:** (superseded 2026-10-13 by the stepped podium below, shown on every width from one province). The table still starts at #1 under it, so every province keeps its leader bar (owner 2026-10-13: "ranking bar … always display it"; until then #1–3 hid from `md` up).
- **Coverage bar** under the subtitle: "ปลดล็อกแล้ว {n} จาก {total} จังหวัด" + % (`h-2 rounded-full bg-secondary`, fill `bg-brand`).
  - `n` = provinces with a published project (listing counts).
  - The header stat label on the projects board is "ผลงานที่นับคะแนน".
- **Map card on phones** sits right after the ranking (`lg:hidden`); on desktop it stays in the sidebar.
- **Not built yet (rest of the proposal):** the map as the hero, a sticky your-province bar, region chips → select on phones, and search inside the table header.

#### Olympics v4, complete (2026-10-13; podium part BUILT on the owner's go: "อยากให้มี bar ranking … ตัวอย่างก็ให้ดูแล้ว")

Supersedes the 2026-10-12 draft below where they differ. **Inspiration (owner's reference image, 2026-10-13):** a stepped podium (2 · 1 · 3, the middle step tallest) with an avatar and a value chip above each step, then plain list rows: rank · avatar · name + sub-line · a progress ring at the end. We take the structure (podium on steps, then rows), not the image's art, colours or 3D rendering.

**1. Ranking hierarchy (one component, three tiers).**

- **Tier 1, the podium (`PodiumSteps`, new):** #2 · #1 · #3 side by side at every width, including 375 px.
  - Each place: ProvinceBadge 40 px (#1 48 px) with the Medal ring overlapping its bottom edge → province name `text-sm font-bold` (one line, `truncate`) → value chip `rounded-full border bg-card px-2 text-caption font-bold tabular-nums` → the step.
  - Steps are flat blocks, not 3D: `rounded-t-xl border border-b-0 bg-secondary`, heights #1 `h-20` · #2 `h-14` · #3 `h-10` (phones `h-16 / h-12 / h-8`), the place number centred in `text-2xl font-extrabold text-faint`. #1's step `border-warning/40 bg-warning/5` (medal tones from `core/Medal`, no new colours).
  - Whole block ≤ 220 px tall at 375 (today's three cards: about 450 px).
  - An empty place is a dashed step with "+ ที่ว่าง" → `/new` (kept from v3).
- **Tier 2, the full ranking from #1 (`RankRow`, today's table restyled; owner 2026-10-13: the leader bar always shows, so #1–3 stay in the list under the podium):** rank `#n` (`w-8 text-faint tabular-nums`) · ProvinceBadge 32 · name `text-sm font-semibold` + sub-line `text-caption text-muted-foreground` ("{n} ผลงาน · ตัวท็อป {project}") · value `text-sm font-bold tabular-nums` right-aligned · **leader bar** under the name (the row's total against #1, as built in part 1). Row ≈ 56 px, `divide-y`, the expand chevron and the top-projects sub-row stay.
- **Tier 3, "ยังไม่มีผลงานจาก N จังหวัด"** chips, collapsed to one line + "+N".
- **Your own province** is never hidden by the tiers: if it's on the podium its place gets a `ring-2 ring-brand` and "คุณ"; otherwise its row is highlighted as today.

**2. Podium threshold (replaces part 1's "desktop only, ≥ 5").**

- **Podium as soon as one province competes, on every width (built 2026-10-13):** places without a province are dashed "+ ที่ว่าง" steps → `/new`. Today only 2 provinces compete (JaoPor's own project never ranks), so the owner would never have seen a podium gated at 3.
- With 3+ provinces the podium shows above the full list; the list repeats #1–3 on purpose so the bar race is always complete.
- **Sparse (1–2 competing):** the podium still shows, with the missing places as dashed open steps; rows from #1 with Medals and leader bars below.
- **Empty (0 competing on this metric):** no table; a dashed card "ยังไม่มีจังหวัดไหนมี{metric}ที่ยืนยัน" + the metric's one-line meaning + "เชื่อมตัวเลขของผลงาน" → `/dashboard`. The "จำนวนผลงาน" board stays the default, so a visitor sees this only after choosing a verified metric.
- Team projects never count (`isRankEligible`, unchanged).

**3. Province selection ("จังหวัดของคุณ").**

- A full-width bar right under the coverage line, before the podium.
- **Not chosen:** the question on its own line (no 4-line wrap), then a full-width ChoiceSelect grouped by region with type-to-filter. Stored in localStorage `jaopor.myProvince` as today.
- **Chosen:** badge + name + "#rank" + RankChange + the gap line ("อีก ฿X จะแซง{ahead}") + a small "เปลี่ยน" link. Unranked on this metric: "ยังไม่มีคะแนนใน{metric}" + "ส่งผลงาน →".
- **Phones:** once scrolled past, it condenses to a one-line bar `sticky top-14` (badge · name · #rank); tapping it scrolls to the row (`scrollIntoView`, `block: "center"`, smooth unless reduced motion) and briefly outlines it.
- Province search stays, as an icon button in the ranking header that expands into a field (whole board, also opens collapsed rows).

**4. Map placement.**

- **Desktop (`lg`):** the sidebar keeps the map card at the top ("ภาคไหนแรงสุด": OlympicsMap + RegionStandings); the sidebar scrolls with the page (no pinned columns, owner 2026-10-13). It explains regions next to the rows rather than above them.
- **Phones:** the map card stays right after the ranking (part 1). Not in the first screen: the race (podium) is the first thing to see; the map is the second look.
- Tapping a province on the map opens the province page (as today); it does not filter the board. Region filtering stays in the controls.

**5. Desktop and phone layouts.**

- **Desktop 1440:** header (pills, H1, subtitle, coverage bar; stat cards right) → controls row (metric SegmentedControl · region chips) → main column: your-province bar → PodiumSteps (max-w 640, centred) → rows → pioneers / newest → open provinces → "นับคะแนนยังไง"; sidebar 320 px: map card → "มาแรงเดือนนี้" → ShareRankCard.
- **Phone 375:** header (H1 `text-3xl`, subtitle, coverage bar; stat cards become one 2-up row `text-caption`) → your-province bar → metric control (scrolls sideways) + region ChoiceSelect "ทุกภาค ▾" → PodiumSteps → rows → map card → "มาแรงเดือนนี้" → pioneers / newest → open provinces (1 line + "+N") → share card → "นับคะแนนยังไง" (`<details>`, closed).
- First screen at 375 × 812: header, coverage bar, your-province bar and the top of the podium.

**6. Metric explanations (every number says what it is).**

- Under the metric control, one line for the selected metric (`text-caption text-muted-foreground`), with an ⓘ that opens the full "นับคะแนนยังไง" section:
  - **จำนวนผลงาน:** published projects in the province, verified or not; JaoPor team projects excluded.
  - **รายได้ 30 วัน / MRR:** sum of the province's projects, verified through Stripe or RevenueCat, in THB at today's rate; MRR as each source defines it (Stripe = our calculation, RevenueCat = theirs).
  - **ผู้เข้าชม 30 วัน:** counted by the connected analytics source ("นับโดย"), never called "verified".
  - **Commits:** public GitHub commits in the last 30 days, owner-checked repos.
- **Leader bar** on each row (owner decision 2026-10-13, instead of the share ring from the image): the province's total against #1's, `h-1 max-w-36 bg-brand/70`, at least 4% so it shows; the ⓘ text says "แถบ = เทียบกับอันดับ 1".
- Value chips and rows show the unit (฿, ครั้ง, ผลงาน) and use the same formatters as today; ties show "=" before the rank.

**7. Motion (§7 rules):** steps rise once on first view (`--motion-slow`, staggered 2 → 1 → 3), rings fill once, metric switch slides rows (FLIP); reduced motion: everything static and complete.

**8. Acceptance criteria (for the build).**

- 375 px: podium of 3 side by side, ≤ 220 px tall, names not cut mid-glyph (truncate with "…"), no horizontal page scroll; desktop 1440 podium centred ≤ 640 px.
- 0 / 1 / 2 / 3 / 4 / 5+ / 77 competing provinces each render the state above (unit test the tier split, Playwright screenshots of 0, 2, 3 and many via the metric switch).
- Every row from #1 has its leader bar at every width, with and without the podium.
- Your province: findable in ≤ 1 tap from anywhere on the page on phones (sticky bar).
- Every metric shows its one-line explanation; visitors are never labelled "verified".
- Team projects absent from podium, rows and rings' totals.
- th / en strings, tokens only, `tabular-nums`, reduced motion, keyboard: podium places and rows are links with visible focus.
- Before / after screenshots at 1440 and 375, e2e and unit tests green.

**Decided (owner 2026-10-13):** the leader bar stays on every row, always; no share ring.

#### Draft — Olympics v4 (2026-10-12; superseded by the complete proposal above)

**Owner feedback:** the board "doesn't look attractive", and on phones it "เรียงเป็นก้อน" (stacks into blocks).

**Observed at 375 px:**

- Three podium cards about 150 px each, each with a giant rank and a giant "1".
- The "จังหวัดของคุณอยู่อันดับไหน?" question breaks over 4 lines next to its picker.
- The map and region standings, which explain the board at a glance, sit near the end of a 4,962 px page.

**Goals:**

1. See the race in one glance.
2. Find your province in one tap.
3. Stay readable at 3 provinces and at 77.

**Changes:**

1. **Hero = coverage, not a podium.**
   - H1 + one line + a progress bar "ปลดล็อกแล้ว {n}/77 จังหวัด" (`h-2 rounded-full bg-secondary`, fill `bg-brand`; `{n}` = provinces with a published project, listing counts).
   - Beside it on desktop, under it on phones, the Thailand map becomes the hero visual, about 240 px tall: provinces with projects filled by region colour, the rest `fill-muted-foreground/15`. Tapping a province opens its page.
   - The sidebar map is removed.
2. **Your province first.** A full-width bar under the hero.
   - Before you choose: the question on its own line, the ChoiceSelect full width under it.
   - After you choose: badge + name + "#rank" + RankChange + the gap line, plus "เปลี่ยน".
   - It sticks under the header while the board scrolls on phones (`sticky top-14`, one line high).
3. **Ranking as rows, not cards** (`RankRow`, about 56 px; one table for every viewport). Columns:
   - rank: Medal for 1–3, plain `#n` after;
   - ProvinceBadge + name + region dot;
   - value: `text-base font-bold tabular-nums`, unit beside;
   - the top project's logo stack (up to 3 logos, `-space-x-2`);
   - RankChange.
   - Top 3 rows get a faint medal-tinted background (`bg-[gold-token]/5`, tokens only) instead of separate cards.
   - **Podium cards only on desktop, only with ≥ 5 competing provinces:** below that, a podium of 2–3 looks like the empty state it is.
4. **Controls collapse on phones.**
   - Metric stays a SegmentedControl (it scrolls sideways).
   - Region chips become one ChoiceSelect "ทุกภาค ▾" below `sm`.
   - Search moves inside the table header as an icon button that expands.
5. **Order on phones:** hero (coverage + map) → your province → metric / region → ranking rows → "ผู้บุกเบิกจังหวัด" / "มาใหม่ล่าสุด" → "ยังไม่มีผลงานจาก N จังหวัด" (collapsed to 1 row of chips + "+N") → share card → "นับคะแนนยังไง" (collapsed `<details>`).
   - Target: the full page under about 3,000 px at 375 with today's data.
6. **Desktop:**
   - `lg:grid-cols-[minmax(0,1fr)_320px]` stays.
   - The sidebar keeps "มาแรงเดือนนี้" and the share card.
   - Region standings move under the map in the hero.
7. **Motion (Design.md §7):**
   - Rows rise in once.
   - Switching metric slides rows to their new rank (the LeaderboardCard FLIP).
   - The coverage bar fills once on first view; nothing loops.

**What stays:**

- The metric definitions and the scoring text.
- Pioneers / newest.
- The share card.
- Listing vs competing counts (above).
- No new data or migration.

**Acceptance criteria (for the build):**

- At 375 the first screen shows the coverage bar, the map and your-province bar, and rows start within the second screen.
- No card stack of more than one podium-style card on phones.
- With 3 provinces the board reads as a short list, not three hero cards; with 77 it stays scannable (rows ≤ 60 px, value right-aligned).
- No horizontal page scroll; th / en strings; reduced motion respected.
- Before/after screenshots at 1440 and 375.

- **Default board "จำนวนผลงาน" / "Projects"** (owner request 2026-10-11: quantity first, it works before anyone verifies numbers): every published, non-demo project counts, verified or not; movement and growth compare with the projects listed 30+ days ago. The verified boards (รายได้ 30 วัน · MRR · ผู้เข้าชม · คอมมิต) follow in the metric switch. The province page's rank line and the Olympics OG image use this board.

Product decision (user asked to act as PM / marketer / designer): the Claude Design structure wins on retention and sharing (your-province gap, rank movement, monthly season, dense table, share + methodology cards). Kept from v2: dashed "ที่ว่าง" podium places (the board is young) and the region map (moved into the region card). Not adopted yet: "แชมป์ N เดือนติด" (needs rank history) and "อัปเดตทุกชั่วโมง" (we sync daily).

- **Season metric:** รายได้ 30 วัน (default) · MRR · ผู้เข้าชม 30 วัน · Commits. Rank movement (▲/▼/–/ใหม่) and growth % compare with the previous 30 days (revenue30d, visitors only).
- **Header:** pills "● อัปเดตทุกวัน" (positive dot) + "ฤดูกาล {month year}" (Gregorian year) · H1 `text-3xl md:text-4xl font-extrabold` · subtitle; right: two stat Cards (จังหวัดที่ลงแข่ง n / 77 · "{metric} รวมทั้งประเทศ").
- **Podium cards** (`md:grid-cols-3`, shown 2-1-3): rank ring (gold / silver / bronze tokens) + "ผู้นำฤดูกาล" on #1 · region dot + name · province `text-2xl` (#1 `text-3xl`) · other-language name + "{n} ผลงาน" · total `text-3xl` (#1 `text-4xl`) · top project row under `border-t` ("ตัวท็อป: {name}" + value). #1 card `border-warning/40 bg-warning/5`, taller. Empty place: dashed card "+ ที่ว่าง · ส่งผลงานแทนจังหวัดคุณ" → /new.
- **Controls:** metric SegmentedControl + region chips (dot + name; horizontal scroll on phones). Both in the URL.
- **OlympicsBoard** (client): **your-province bar** (`border-brand/40 bg-brand/5`; MapPin "จังหวัดของคุณ" · badge + name · #rank · RankChange · "อีก ฿X จะแซง{ahead}ขึ้นอันดับ #n" or "กำลังนำกระดาน" · "เปลี่ยนจังหวัด"; no pick yet → inline select grouped by region; stored in localStorage `jaopor.myProvince`) · province search (whole board) · **table** from #4: # · change · badge + name (+ "· คุณ") + region · ผลงาน (md+) · value · growth (sm+) · top logos (lg+) · expand chevron → sub-row with top projects (logo, name, share %, value, `h-1` brand bar) + "ดูผลงานทั้งหมดใน{จังหวัด} n ชิ้น →". 10 rows then "ดูอันดับ 14–N ↓". Own row `bg-brand/5` + 3px brand inset edge.
- **Open provinces** Card: "ยังไม่มีผลงานจาก {n} จังหวัด" + subline + "+ เพิ่มผลงาน", 10 chips then "+N จังหวัด" (expands).
- **Sidebar (320px):** "ภาคไหนแรงสุด" (OlympicsMap h-36 + RegionStandings) · "มาแรงเดือนนี้" (Flame; top 3 climbers with ▲n; hidden when none) · **ShareRankCard** (`border-brand/40 bg-brand/5`: download the province's OG image, or the Olympics one; copy link). "นับคะแนนยังไง" (methodology text) sits at the end of the **main column**, under the pioneers / newest cards (layout audit 2026-10-12: in the sidebar it made the right column ~460px taller than the left).

### LiveVisitorsSection (home, Phase 8, "ตอนนี้มีคนดูอยู่")

- **Back on (2026-10-11, owner request), as a cheap "poll" board by default** (`NEXT_PUBLIC_LIVE_VISITORS` unset): no Supabase Realtime. Each visible tab sends the heartbeat about once a minute (`/api/live/ping`, which answers the tab's short key) and reads `/api/live/snapshot` every 30 s (CDN-cached 30 s: one query per half minute for the whole site). Same board: count, Thai map pins (at the province capital), countries, devices, pages and the latest activity. "1" / "realtime" switches back to the presence channel (only on a plan with higher Realtime limits; it was turned off on 2026-10-09 for that reason); "0" / "off" hides it.

- `rounded-xl border bg-card` section after the card rows. Header: status dot (positive pulse = live, warning = fallback, faint = connecting) + title; right: "ทั่วโลก / ประเทศไทย" toggle (`h-7 border` button) and × (hides the section, remembered; a small "แสดงคนที่กำลังดู JaoPor" link brings it back).
- Body `h-[420px] sm:h-[460px]` at every count (the round C compact height for ≤ 3 viewers was reverted on 2026-10-07: the map became too small to see the pins, and the 4-row feed overlapped the stats overlay): Thailand silhouette (`fill-muted-foreground/15`) with one pin per province at its centre (brand circle + DiceBear avatar, positive count badge when > 1); world view = MapLibre (OpenFreeMap dark, loaded on demand) with avatar markers at the coarse coordinates.
- **Map placement (layout audit 2026-10-12):** from `sm` the Thailand map is centred in the space right of the overlay (`sm:pl-64`), no longer pushed to the right edge. That left a wide empty band between the overlay and the map. The height stays as above.
- **Collapsible stats overlay (owner 2026-10-12):** the overlay's count line is a button (`aria-expanded`, chevron).
  - Phones start collapsed: one line "{n} คนกำลังดู JaoPor ⌄", so the map shows. From `sm` it starts open.
  - The activity feed shows the 2 latest on phones (4 from `sm`).
- **The map always shows (owner 2026-10-13):** the one-line "few viewers" mode (below 5, 2026-10-12) was removed at the owner's request. On phones the collapsible stats overlay keeps the map visible.
- Overlay top-left (`w-56 rounded-lg border bg-background/85 backdrop-blur`): big count + "คนกำลังดู JaoPor", rows ประเทศ / อุปกรณ์ / หน้า (top 3, fixed section labels only, never slugs), "+n คนจากต่างประเทศ". Fallback shows the count + "แสดงจำนวนโดยประมาณ".
- Feed bottom-left: last 4 page views as `bg-background/85` rows: avatar, "{ชื่อ} เปิด{หน้า}", "เมื่อสักครู่ / n นาทีที่แล้ว".
- Footer `border-t text-2xs`: "คุณแสดงเป็น “{ชื่อ}” · ไม่แสดงตัวฉัน" (opt-out; then "คุณไม่ได้แสดงตัว · แสดงตัวอีกครั้ง") + "ไม่ระบุตัวตน · ตำแหน่งระดับจังหวัด/ประเทศ".
- Names only from the fixed word lists (EN "Color Animal", TH "สัตว์สี"); every received payload is validated. **Off by default since 2026-10-09** (launch readiness B-2: Realtime Free-plan limits): `LIVE_ENABLED` is true only with `NEXT_PUBLIC_LIVE_VISITORS=1`. When off, the section, the LiveViewersPill and every Realtime connection, heartbeat and geo lookup from the provider are gone, and `/api/live/ping|count` answer without touching the database.

### DashboardShell (Phase 9d, docs/design/dashboard.png)

- `max-w-7xl` row: **sidebar** `w-60` (from `lg`, sticky under the header) + content. Items: ภาพรวม · ผลงานของฉัน (count) · โปรไฟล์ของฉัน · คำขอคุย (brand badge = unread notifications) · ที่บันทึกไว้ · การเชื่อมต่อ · ตั้งค่า; "คอมมูนิตี้": คนสร้าง, หา Co-founder (both `aria-disabled` with a "เร็ว ๆ นี้" chip until Phase 9c). Item `rounded-lg px-3 py-2 text-caption`; active `bg-secondary font-semibold`.
- Bottom **user card** `rounded-xl border bg-card p-3`: avatar 36 + name + @handle (links to the public profile), then 3 equal bordered buttons: theme, language, sign out.
- Below `lg`: the main items become one horizontal scroll row (`border-b`) above the content. On a project's edit page that row is replaced by one "← ผลงานของฉัน" link (2026-10-08, UX audit S-17): the editor has its own section chips, and two rows left about half a 375 px screen for the form.
- A user without a username is sent to /onboarding first.

### Dashboard overview (`/dashboard`)

- Header: "สวัสดี, {ชื่อ}" `text-2xl font-bold` + "ผลงานของคุณมีคนเข้าชม {n} ครั้งในสัปดาห์นี้"; right: outline "ดูโปรไฟล์สาธารณะ ↗" + primary "+ เพิ่มผลงาน".
- **Order (2026-10-08, UX audit S-11):** header → setup checklist (while incomplete) → ผลงานของฉัน + side cards → the post composer last (it used to come first and push the founder's own work below the first screen). **Counters say what they count (S-14):** the header line reads "ผลงานของคุณยังไม่ได้นับผู้เข้าชม…" when no project counts visitors (instead of "0 ครั้ง"); the side card says "คนดูโปรไฟล์คุณ" / "คำขอคุยที่ได้รับ"; the requests card's empty line is "ไม่มีคำขอคุยที่รอตอบ".
- **Setup checklist** Card (hidden when all 6 are done): title + "3 / 6" + `h-1.5` brand bar + hint; `sm:grid-cols-2 lg:grid-cols-3` items: done = check circle (positive) + faint text; the next undone item `border-brand bg-brand/10 font-semibold`; undone items link to the place that completes them.
- `xl:grid-cols-[1fr_320px]`: **ผลงานของฉัน** table (ผลงาน: logo 36 + name + "✓ ยืนยันแล้ว · Stripe · GitHub" positive or "ยังไม่ยืนยันตัวเลข" warning · ผู้เข้าชม 7 วัน · อันดับ · MRR · icon buttons edit / copy link / view with aria-labels). Unverified owned rows get an inline banner `border-warning/40 bg-warning/10` "เชื่อมต่อเพื่อขึ้นกระดานผู้นำและโอลิมปิกจังหวัด" + primary "เชื่อมต่อ Stripe" + outline "ตัวเลือกอื่น". Under the table two dashed tiles: "เพิ่มผลงานใหม่" (/new) and "อ้างสิทธิ์ผลงาน" (`/dashboard/claim`, live since 2026-10-15).
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
- Saved: honest placeholder. Bookmarks were built (2026-10-15) and removed again at the owner's request (2026-10-18: "we don't need it yet"); the `public.saves` table stays in the database, unused, until a migration drops it.

### Claim an imported listing (`/dashboard/claim`, `/dashboard/claim/[id]`, 2026-10-15)

- **Purpose:** a founder whose project was imported (found via crawl / directory) proves it is theirs and takes ownership. Imported rows are owned by a system account with `unclaimed = true`, so they look like a normal listing but belong to nobody until claimed.
- **List (`/dashboard/claim`):** title + one-line explanation + a GET `<form>` search (`?q=`, input `maxLength` 80) over name / website; results are compact rows (logo + name + website host) linking to the detail page; empty state explains there is nothing to claim yet and links to Add-project. Matching is `.ilike` on name / website with `%`, `(`, `)`, `*`, `\`, `,` stripped from the query.
- **Detail (`/dashboard/claim/[id]`):** back link + the listing card + an intro line ("นี่คือผลงานที่ยังไม่มีเจ้าของ…ยืนยันด้วยแหล่งที่ผูกกับตัวผลงาน") then `<VerifyPanel claim order={["traffic","build"]} recommend="traffic" showTitle={false} … />`. In claim mode the chooser is forced open, revenue sources are hidden (`sourcesFor` filters via `isClaimSource`), and only **asset-bound** sources show — the listing's website (JaoPor snippet / Plausible / Umami / Cloudflare / GA4 / PostHog) or its repo.
- **Proof is asset-bound:** JaoPor snippet must be found live in the site HTML, the analytics domain must match the website host, and GitHub must match the listing's `github_url` — a payment key never proves which listing is yours (so revenue sources are refused with `not_claimable`). On success `connectSource` transfers `owner_id` atomically and clears `unclaimed`; the client toasts `Sources.claim.claimed` and returns to `/dashboard`. An already-claimed listing (or a losing concurrent claim) says `not_claimable`.
- **Data:** `startups.unclaimed` is server-only (not in the client column grants), and `owner_id` is never writable by clients — no browser can claim or un-claim by hand. Migration `20261015160000_claim_startup` (system owner + column + trigger + index) is pending the owner's apply.

### Phase 6 polish (2026-10-08, UX audit)

- **No dead ends:** the sidebar hides "ที่บันทึกไว้" until `/dashboard/saved` exists (C-6; it answers now); the dashboard's "อ้างสิทธิ์ผลงาน" tile became live 2026-10-15 (links to `/dashboard/claim`), no longer a disabled "เร็ว ๆ นี้".
- **Login says why (C-9):** with `next` = Add-project the title is "เข้าสู่ระบบเพื่อเพิ่มผลงาน".
- **Add-project (C-12 / C-13 / C-14):** on phones the primary button sits in a sticky bottom bar (full width, `border-t bg-background/95 backdrop-blur`); an owner at the 5-project limit sees the amber note and a disabled button before typing anything; under the auto-fill status one faint line says what is read ("เราอ่านแค่ชื่อ คำอธิบาย และโลโก้จากหน้าแรกของเว็บ").
- **Edit-page suggestions from build proof (C-1 / C-2):** "พบ commit ที่เขียนร่วมกับ Claude… + เพิ่ม Claude Code" under AI tools when Claude co-authored commits exist and it is not ticked; "commit แรกของ repo: {month year} · ใช้เป็นวันที่ก่อตั้ง" under Founded while it is empty. Both are one-click and only fill, never overwrite.
- **Feed composer on phones (C-8):** one tappable line (avatar + "อัปเดตอะไรในผลงานของคุณวันนี้?") that opens the full composer and focuses the text; from `sm` the full composer as before. The dashboard keeps the full composer.

### Onboarding (`/onboarding`, spec 9e)

- `max-w-lg` Card: "ขั้นที่ n จาก 4" + 4-segment brand progress, title, hint; steps: username (live check, suggestion from the display name) → headline + province → status tiles → SkillPicker (skippable). Back / ถัดไป; the last step has "ข้ามไปก่อน" + "เสร็จสิ้น" → back to the page the user signed in from (`next`), else `/startups` with the welcome banner. **Quick mode (2026-10-08, UX audit M-8):** when `next` is `/new` (they came to add a project) it is one screen: "ตั้งชื่อผู้ใช้ แล้วไปเพิ่มผลงานกัน" + username + province (suggested from location, reused as the project's province) + "ไปเพิ่มผลงาน →"; no step counter, no Back. Headline, status and skills wait for the dashboard checklist.

### Sign-in routing (2026-10-05, first-user test: everyone landed on an empty dashboard)

- Every "เข้าสู่ระบบ" link carries the current page as `next` (header included); gated pages (e.g. "เพิ่มผลงาน" → `/new`) already do.
- After sign-in: no username yet → onboarding, then `next`. With a username: `next` if given; else users with a startup → `/dashboard`, users without → `/startups?welcome=1`. `next` must be an internal path (no `//`, no backslash) and never `/login` or `/onboarding`.
- **Welcome banner** on `/startups?welcome=1`: dismissible `rounded-xl border border-brand/30 bg-brand/5 px-4 py-3` row under the hero, "ยินดีต้อนรับสู่ JaoPor 👋 ดูผลงานของคนอื่นก่อนได้ สร้างอะไรด้วย AI อยู่ก็เพิ่มของคุณได้เมื่อพร้อม" + "เพิ่มผลงานของฉัน →" link to `/new` + × close.

### Add-startup wizard v2 (`/new`, 2026-10-05, first-user test: "adding a startup is hard", most skipped verification)

- **v3 (owner 2026-10-13: "ดูเหมือน plain text … no interactive experience"; make each step's job obvious).** Same fields, data and rules as v2 below; only the presentation changes.
  - **Page:** `max-w-5xl`. Title + one line "3 ขั้น ใช้เวลาราว 2 นาที แก้ได้ทุกอย่างทีหลัง".
  - **Stepper (`WizardStepper`, `<ol aria-label>`, `aria-current="step"`):** three steps in a row joined by a line: ① ลงผลงาน ("ลิงก์ ชื่อ หมวดหมู่ จังหวัด") ② ยืนยันตัวเลข ("ไม่บังคับ ทำทีหลังได้") ③ เปิดหน้าผลงาน ("พร้อมแชร์"). Circle `size-8 rounded-full`: current `bg-brand text-brand-foreground ring-4 ring-brand/15`; done `bg-brand/10 text-brand-text` with a Check; upcoming `border text-muted-foreground`. The connector before a done step fills `bg-brand`. Sub-lines from `sm`.
  - **Step 1 = three section cards** (`Card p-4 sm:p-5`), each with a header: a number badge that turns into a green CircleCheck once the section is complete, a title `text-sm font-semibold`, and a one-line `text-caption text-muted-foreground` of what to do:
    1. **"วางลิงก์ผลงาน"** ("ลิงก์เดียวพอ เราเติมชื่อ คำโปรย และโลโก้ให้"): the link, its type and the auto-fill status. Complete = a valid link that isn't already listed.
    2. **"ผลงานชื่ออะไร ทำอะไร"**: name, category, one-liner. Complete = name + category.
    3. **"อยู่จังหวัดไหน"** (Olympics) + logo + the anonymous option. Complete = province.
    - Under the cards: "พร้อมแล้ว {n} จาก 3 ส่วน" with an `h-1.5` brand bar, then the submit button (still sticky at the bottom on phones).
  - **Live side panel (from `lg`, `sticky top-20`, 20rem):** "ตัวอย่างการ์ดของคุณ" with the preview card shown from the start ("ชื่อผลงานของคุณ" until a name is typed), the existing hint, then "หลังจากนี้" (3 rows with icons: ยืนยันตัวเลข → การ์ดโชว์ตัวเลขจริง · หน้าผลงานพร้อมแชร์ · ลงแข่งโอลิมปิกจังหวัด). Phones: the preview sits under the cards, before the button.
  - **Step 2** opens with a success card (`border-positive/30 bg-positive/5`, CircleCheck): "สร้างหน้าผลงานแล้ว" + "{name} เปิดให้ทุกคนเห็นแล้ว ขั้นนี้ไม่บังคับ …", then the stage cards and the VerifyPanel as before; the side panel keeps the preview.
  - Motion: the section check and the progress bar change with `--motion-fast`; nothing moves with reduced motion.
  - **Step changes start at the top (owner 2026-10-13: "กดถัดไปแล้วมันค้างอยู่ส่วนนั้น ต้องเลื่อนขึ้นเอง"):** in every multi-step flow (this wizard, onboarding), going to the next or previous step brings the top of the flow back under the header (`useStepScroll`, `scroll-mt-20`; smooth, instant with reduced motion; only when the top is off screen) and moves focus to it (`tabIndex={-1}`, no outline). The edit page's "ถัดไป: …" already did this.
  - **v3.1 (owner 2026-10-13: "ไม่รู้เลยว่าปุ่ม anonymous หมายความว่ายังไง … ใช้พลังงานสมองให้น้อยที่สุด", too much plain text):**
    - **Icons instead of paragraphs:** the two intro paragraphs become a row of 4 icon chips (`rounded-full border bg-card px-2.5 py-1 text-caption`, icon `size-3.5 text-brand-text`): Sparkles "วางลิงก์เดียว เราเติมให้" · PencilLine "แก้ได้ทุกอย่างทีหลัง" · Globe "กดเผยแพร่แล้วทุกคนเห็นทันที" · BadgeCheck "ตัวเลขที่ยืนยันมาจากขั้นที่ 2".
    - **Section icons:** each card's header leads with an icon tile (`size-9 rounded-xl bg-brand/10 text-brand-text`): Link2 (ลิงก์), PencilLine (ชื่อ หมวดหมู่ โลโก้), MapPin (จังหวัด), Eye (ใครเห็นชื่อ). It becomes a green CircleCheck tile (`bg-positive/10 text-positive`) once the part is complete. The logo moves into part 2 (what the project looks like); part 3 is just the province.
    - **"ใครเห็นชื่อผลงาน?" (part 4, optional, only when anonymous mode is live)** replaces the checkbox with two choice cards (`role="radiogroup"`, chosen = `border-brand bg-brand/5`), each with a tiny picture of what others will see:
      - Eye **"แสดงชื่อผลงาน"** + "แนะนำ" chip: "คนอื่นเห็นชื่อ โลโก้ และลิงก์ของผลงาน"; picture = a logo square + the name.
      - EyeOff **"ไม่เปิดเผยชื่อ"**: "ซ่อนชื่อ โลโก้ และลิงก์ แต่ยังโชว์ตัวเลขที่ยืนยันได้ เหมาะถ้ายังไม่อยากบอกว่าเป็นผลงานไหน"; picture = a grey square + a blurred bar.
      - Default "แสดงชื่อผลงาน"; locked after the project is created (as before); the live preview card follows the choice.

- **Loading (`/new/loading.tsx`, 2026-10-07, owner: "takes longer to open"):** a skeleton shaped like step 1 (title, 2 step bars, intro line, link field, name + category, one-liner, logo tile, button) shows the moment "เพิ่มผลงาน" is clicked, while the sign-in check runs. The verify step's code loads in the background after step 1 shows.
- **Step labels:** "1. ลงผลงาน" / "List it" · "2. ยืนยันตัวเลข" / "Verify". Same 2-segment `border-t-2` bar; labels `text-caption font-semibold`, no uppercase (2026-10-08: the 10 px uppercase labels were hard to read in Thai).
- **Step 1, four things, link first:** ลิงก์ผลงาน (full width, autofocus) → ชื่อ · คำโปรย (optional, ≤ 140, counter `text-2xs text-faint tabular-nums`) → หมวดหมู่ · โลโก้. AI tools, looking-for and screenshots moved to the edit page (the profile's "+ เพิ่ม…" cards lead there). **2026-10-08 (UX audit M-9, M-10, S-2):** หมวดหมู่ has **no default** ("เลือกหมวดหมู่…", required; a preselected "AI" silently miscategorised projects); **จังหวัด** is asked here (the province combobox without "ไม่ระบุ", required, prefilled from the founder's profile province, hint "ใช้จัดอันดับโอลิมปิกจังหวัด…"), saved with country TH, so the edit page no longer blocks the first save on it; once a name is typed, a **live card preview** (the large `StartupCard` in `preview` mode: not a link, local logo, the muted "not verified" card a new listing really gets) under "หน้าตาในหน้าผลงานทั้งหมด" + hint "ยืนยันตัวเลขในขั้นถัดไปแล้ว การ์ดจะแสดงรายได้หรือผลงานบน GitHub". **A2 (2026-10-10):** under the intro a `text-caption text-faint` "ข้อมูลที่คุณกรอกจะแสดงเป็น “เจ้าของบอก” ส่วนตัวเลขที่ยืนยันมาจากขั้นถัดไป", and under the submit button a `text-caption text-muted-foreground` "ต่อไป: ยืนยันตัวเลข (ไม่บังคับ) — ด้วย Stripe, GitHub หรือโค้ดนับผู้เข้าชม".
- **Auto-fill from the link** (the project's own website and its store listings; 2026-10-13): ~600 ms after typing stops, the server reads the link (SSRF-guarded, 3 s) and returns name, one-liner and logo. It fills only fields that are empty or still hold the previous auto value, never what the user typed. Status line under the link (`text-caption`): muted "กำลังอ่านหน้าเว็บ…" → brand "✨ เติม…แล้ว แก้ได้ทุกช่อง" → nothing on failure (fields stay manual).
  - **Own website:** reads the page (512 KB) → name (`og:site_name`, else the `<title>` part that matches the domain), one-liner (meta description, ≤ 140) and logo (apple-touch-icon, else the largest PNG / SVG / WebP / JPEG icon; resized to 256 px PNG).
  - **App Store (`apps.apple.com/.../idN`):** reads Apple's public lookup API (`itunes.apple.com/lookup?id=N`, the storefront from the URL path) → name (`trackName`), one-liner (the first sentence of the description, ≤ 140) and logo (`artworkUrl512`). The page's own og tags are **not** used: they describe the store ("App Store", Apple's favicon), not the app.
  - **Google Play (`play.google.com/store/apps/details?id=…`):** reads the page (2 MB) → name (`og:title` without the " - Apps on Google Play" suffix), one-liner (`og:description`, ≤ 140) and logo (`og:image`, the "=s0-br30 / =w240-h480" size suffix rewritten to `=s512`; Google's own favicon is dropped).
  - A GitHub / LINE OA link, or a platform page, is never read.
- **Already listed (2026-10-07):** when the link is a website that one of the owner's projects already uses (same domain, `www` ignored), a `rounded-md border border-warning/40 bg-warning/10 p-3 text-caption` note under the link: "คุณลงเว็บนี้ไว้แล้วในชื่อ {name}" + `text-brand-text` link "ไปที่ผลงานเดิม →" (`/dashboard/{id}/edit`), and "สร้างและไปต่อ" is disabled. The server also refuses connecting a second revenue / visitor source for the same website (one business, one listing on the boards).
- **Link type (A1.2, 2026-10-10):** under the link, `LinkTypeStatus`:
  - **"ประเภทลิงก์" select** (`h-8 rounded-md border`): เว็บไซต์ของผลงาน · App Store · Google Play · LINE OA · GitHub · ลิงก์อื่น (เพจโซเชียล ลิงก์รวม). It's preset from the link, with faint "ตรวจจากลิงก์ เปลี่ยนได้ถ้าไม่ถูก", and resets when the link changes.
  - **Platform pages** (Facebook, Instagram, TikTok, YouTube, X, Threads, LinkedIn, Linktree, Notion, Google Docs / Sites, TestFlight, LINE LIFF, `lib/links.ts` `linkPlatform`):
    - detected as "ลิงก์อื่น" and stored in the website column;
    - a muted note says the page isn't the project's own site: no auto-fill, no JaoPor visitor counter (the verify chooser hides the "มีเว็บไซต์" tile; the server refuses traffic sources and the owner check for them);
    - verify with Stripe / RevenueCat / GitHub instead.
  - **Problems** show as `role="alert" text-destructive`, with one sentence each:
    - short links (bit.ly…) are refused (paste the full link);
    - a platform page chosen as "เว็บไซต์ของผลงาน";
    - "ลิงก์อื่น" for an unknown domain (we can't store it as a platform page);
    - a per-kind format message.
  - **"Already listed"** compares a platform page by the page itself (path + identifying query such as `profile.php?id=` or `watch?v=`, tracking parameters dropped), so two Facebook pages are two projects.
  - **The edit page:** the website box is labelled "เว็บไซต์หรือเพจของผลงาน" and shows the same note / problem under each box.
- **Logo field:** 48 px rounded tile preview (auto or uploaded) + "อัปโหลดเอง" file button + "ลบ" text button; the auto logo is uploaded as PNG on submit.
- **Step 2:** the VerifyPanel **chooser** (below), then the footer row: ghost "← ย้อนกลับ" (left) · muted "ยืนยันทีหลังได้จากหน้าผลงานของคุณ" · outline "ข้ามไปก่อน" (primary "ไปที่หน้าผลงาน" once something is connected).
- **Back (2026-10-07, owner: "I could not return to the previous step"):** "ย้อนกลับ" returns to step 1 with every field kept. The project already exists, so the button reads "บันทึกและไปต่อ" and saves the changes to the same project (link, name, one-liner, category; the logo only when it changed). It never creates a second listing, and the "Already listed" note ignores the project itself.

- **v3.2 (owner 2026-10-13, production test: step 2 "แอบดู plain text"; going back to change the verify method "หาไม่ค่อยเจอ"; the stepper "เหมือนจะยังไม่สมบูรณ์" because the line ran through the translucent done circle):**
  - **Stepper circles are opaque:** done = solid `bg-brand text-brand-foreground` with a Check; current = `border-2 border-brand bg-card text-brand-text ring-4 ring-brand/15`; upcoming = `border bg-card text-muted-foreground`. The connecting line sits behind them and never shows through.
  - **Step 2 = two cards like step 1** (`WizardSection`): Compass "ตอนนี้ผลงานของคุณอยู่ช่วงไหน?" (turns ✓ once chosen) and ShieldCheck "อยากพิสูจน์อะไร? …" holding the VerifyPanel (its own heading hidden there, `showTitle={false}`).
  - **Stage cards** use the VisibilityChoice look: icon tile, title, one line, then chips of what you'd show with their metric icons (early: การสร้าง · ผู้เข้าชม; revenue: รายได้ / MRR).

### VerifyPanel chooser (no source connected yet: wizard step 2 and the edit page)

- **Stage first, in the wizard (owner 2026-10-12: grow quantity, don't scare people without revenue):** above the chooser, "ตอนนี้ผลงานของคุณอยู่ช่วงไหน?" with two radio cards (`rounded-xl border p-3`, chosen = `border-brand bg-brand/5`): **"ยังไม่มีรายได้ / กำลังสร้าง"** (Sprout; "โชว์ commit และผู้เข้าชมได้เลย ไม่ต้องใช้คีย์") and **"มีรายได้แล้ว"** (CreditCard; "ยืนยันรายได้และ MRR ด้วยคีย์อ่านอย่างเดียว"). Nothing is chosen at first, and the chooser keeps its usual order. Early → the metric rows become build · visitors · revenue, and the footer's main button is a filled "ไปหน้าผลงานเลย" (adding proof later is the normal path). Revenue keeps today's order. The choice isn't stored.
- **Clear rows and a visible way back (owner 2026-10-13):** each metric row leads with an icon tile (`size-9 rounded-xl bg-brand/10 text-brand-text`) and ends with a ChevronRight. After picking one, its header is a bordered row: the icon tile, the metric's name, and on the right an outline button "← เปลี่ยน" (`h-8`; was a small grey text link). The source switch is a segmented control (`rounded-lg bg-secondary p-1`, chosen `bg-card shadow-xs text-foreground`).
- **Metric-first (A2, 2026-10-10):** the question is "อยากพิสูจน์อะไร? เลือกหนึ่งอย่างก่อน" + hint, then the "what you get" strip (a `flex flex-wrap` of `text-caption text-muted-foreground` items each with a `CheckIcon text-positive`: ✓ บนการ์ดของคุณ · ขึ้นบอร์ดผู้นำ · ป้ายสำหรับเว็บของคุณ). Three **metric rows** (`grid gap-2`), each a `button` `rounded-xl border bg-card p-3 text-left hover:bg-accent` with a lucide icon (size-4, muted), title `text-sm font-semibold`, a `text-caption text-muted-foreground` line of what it measures, a `text-2xs text-faint` source list and a `text-2xs text-faint` limits line, plus the chip `text-2xs` ("ไม่ต้องใช้คีย์" positive / "คีย์อ่านอย่างเดียว" muted):
   1. **รายได้ / MRR** (CreditCard) → Stripe · Polar · RevenueCat.
  2. **ผู้เข้าชม** (ChartColumn) → JaoPor snippet · Plausible · Umami · Cloudflare · Google Analytics (only when JaoPor's GA4 service account is configured) · PostHog.
  3. **การสร้าง (build proof)** (GitBranch) → GitHub.
- **Sources per metric, not tools:** the snippet appears only when the project has a website (issue 4 → A1.2); Google Analytics appears only when `NEXT_PUBLIC_GA4_SERVICE_EMAIL` is set (2026-10-11). The mapping lives in `lib/sources/catalog.ts` (`METRICS`, `sourcesOfKind`), so the chart (issue 7) can reuse it. The `claim` prop (claim page) forces the chooser open and filters sources to `CLAIM_SOURCES` (asset-bound only — never revenue).
- Choosing a row shows the sources for that metric as a segmented switch (`rounded-md border px-3 py-1 text-xs`; `aria-pressed`), then "← เปลี่ยนวิธี" + the metric title, and only the chosen connector (the usual numbered how-to and form). Connected sources show as ✓; "เพิ่มอีกแหล่ง" returns to the rows. Rows carry the deep-link ids (`#verify-revenue` · `#verify-traffic` · `#verify-build`), so the profile's "+ เชื่อม…" links scroll to and highlight the right row.
- **Stripe (issue 3):** above the key field a one-line `text-caption text-muted-foreground` "อ่านอย่างเดียว · เห็นแค่ยอดรวม · ยกเลิกได้ทุกเมื่อ"; the full trust box stays below.
- Once a source is connected (edit page after refresh), the panel switches to the grouped manage view (§5 VerifyPanel).
- **Stripe permission guide** (Stripe has no pre-filled key link): under how-to step 2 a small mock of Stripe's permission table, `rounded-lg border bg-card text-caption divide-y`: rows "Charges" and "Subscriptions" with a `Read` pill (`bg-positive/15 text-positive font-semibold`), then "ทุกอย่างที่เหลือ" with a `None` pill (muted). Caption `text-2xs text-faint`: "หน้าตาในหน้า Stripe › Developers › API keys › Create restricted key".
- **GitHub without a GitHub sign-in (2026-10-08, UX audit M-11):** the GitHub option shows "เชื่อมบัญชี GitHub ของคุณก่อน…" + an outline `sm` button "เชื่อมบัญชี GitHub" (`GitBranch`) + a caption on what is used (the username only, no code access, back to this page). It calls Supabase `linkIdentity` (GitHub → `/api/auth/callback?next={this page}`); the wizard restores its step from the session draft. If linking is unavailable (Supabase "manual linking" off), a `text-warning` line explains the fallback (sign out and in with GitHub when the emails match).
- **Google Analytics (2026-10-11):** steps (add the email as a Viewer → copy the Property ID → paste), then an email box: `text-caption text-muted-foreground` label "อีเมลของ JaoPor (เพิ่มเป็น Viewer ใน GA4):", the email in `code rounded-lg border bg-card px-3 py-2 font-mono text-caption break-all` and an outline `sm` "คัดลอกอีเมล" button; one field "GA4 Property ID". The number is Total users, captioned "นับโดย Google Analytics" (counted, never "verified").
- **Snippet help (2026-10-08, UX audit S-18):** under every snippet code box a `<details>` "วางโค้ดที่ไหน? (Next.js, Lovable, Framer, WordPress…)" (`rounded-lg border bg-card text-caption`) listing one line per tool: Next.js (plain script in the layout's head), Lovable / Bolt / v0 / Vite (index.html), Framer, Webflow, WordPress, Wix, plain HTML. The amber "not found" box adds one muted line of common causes (not deployed, redirect to another domain, added by GTM / JavaScript, cached page), because the owner check reads the home page's HTML directly.- **Trust box** beside every key field (all sources that take a key): `rounded-xl border bg-muted/30 p-3 text-caption`, two short lists side by side from `sm` — "✓ สิ่งที่เราเก็บและแสดง" (positive check icons: the totals for that kind, the provider name) and "✕ สิ่งที่เราไม่เก็บและทำไม่ได้" (muted x icons: customer names / emails / cards, writing or refunding, showing the key) — then one line "ยกเลิกได้ทุกเมื่อ คีย์และตัวเลขจะถูกลบทันที · อ่านวิธีที่เราดูแลคีย์ →" (link `/security`). Wording must match /security.

### Owner verified + verified first (round 3, 2026-10-05)

- **Proof levels** (`startups.proof_level`, generated in the DB, ordering only, never shown as a number): 3 verified revenue · 2 build proof (GitHub) · 1 site proof (Owner verified, or an analytics account for the site connected) · 0 nothing (demos always 0). Visitor counts never rank above 1: anyone can send events to a snippet or an analytics endpoint, so they are _counted_, not verified. `/startups` and category pages sort by proof level first for every sort except "ใหม่ล่าสุด" (newest stays chronological). Leaderboards never include demo projects.
- **Owner verified** = our server opened the listed website and found the JaoPor snippet with this project's **permanent id** (never the slug: a renamed slug could be taken by someone else). The page read must be on the listed domain, not a redirect elsewhere. It proves the lister can edit that page; it says nothing about numbers. Checked when the founder presses "เริ่มนับ", on "ตรวจอีกครั้ง" (at most once per 20 s per project, shared by all servers), and nightly; any change to the website URL clears it. The snippet counts visits **only** while it is set (the browser `Origin` header alone can be faked).
- **Badge** (startup header, via `VerifiedBadge ownerVerified`): when there is no verified revenue, neutral chip `rounded-full border bg-secondary text-caption font-semibold` + `ShieldCheck` "ยืนยันเจ้าของเว็บแล้ว" / "Owner verified", `title` explains it ("พบโค้ด JaoPor ของผลงานนี้บนเว็บไซต์ …").
- **Snippet status** in VerifyPanel (chooser and manage view), above the code box: found → positive `ShieldCheck` line "พบโค้ดบน {host} แล้ว …"; not found → `rounded-md border border-warning/40 bg-warning/10 p-3 text-caption` "ยังไม่พบโค้ดบน {host} … ระหว่างนี้ยังไม่นับผู้เข้าชม" + outline "ตรวจอีกครั้ง".
- **No false success (2026-10-08, UX audit M-0):** "เริ่มนับ" toasts "พบโค้ดบนเว็บของคุณแล้ว" only when the code was found, otherwise the info "ยังไม่พบโค้ดบน {host} …"; never the generic "ยืนยันแล้ว! ตัวเลขขึ้นบนโปรไฟล์ของคุณแล้ว". The wizard treats the snippet as verified (primary "ไปที่หน้าผลงาน", profile opens with `?verified=1`) only once the code is found, including after "ตรวจอีกครั้ง".

### OwnerBar "3 ขั้นต่อไป" (startup page, 2026-10-08, UX audit S-1; replaces the "not verified yet" prompt)

- Owner-only. Until the page has a **story** (description), a **screenshot** (or demo video) and a **number from a connected source** (revenue, build proof, owner check or visitors), the bar is a checklist `rounded-xl border border-brand/40 bg-brand/5 p-4`: title "อีก n ขั้น หน้าผลงานนี้ก็พร้อมแชร์" (+ "ผลงานของคุณขึ้น JaoPor แล้ว!" above it right after Add-project, `?new=1`), outline "แก้ไขผลงาน" on the right, then `sm:grid-cols-3` items linking to the editor (`#description`, `#screenshots`, `#verify`): number ring or positive `CheckCircle2` (done items `text-faint line-through`, no hint), the first open one `border-brand bg-brand/10` with `aria-current="step"`. All done → the plain bar ("นี่คือหน้าผลงานของคุณ…" + primary edit). Visitors never see it. After Add-project the share dialog no longer opens by itself (it did on a page with nothing to show yet); it opens automatically only with a verified number (`?verified=1`).

### Builder profile v2 (`/u/[username]`, also `/@username`; Phase 10e, Figma "Founder Prfile 2nd" 160-2)

- **Key cards (owner 2026-10-13, from TrustMRR's founder profile: "ชอบ … followers จาก social media และ total startups"; supersedes the 4 stat tiles below):** always the same 4 cards in this order, `grid-cols-2 lg:grid-cols-4`, the project page's StatCard look (label · value `text-2xl` · caption):
  1. **รายได้รวม**: verified all-time revenue across the builder's projects; caption "จากทุกผลงาน". None verified: "—" + "ยังไม่มีรายได้ที่ยืนยัน".
  2. **MRR รวม**: caption "จาก {n} ผลงานที่ยืนยัน"; none: "—".
  3. **ผู้ติดตาม**: the builder's followers on JaoPor (always available, counted by us); caption "+{n} ใน 30 วัน" (followers gained in 30 days) or "บน JaoPor". When the builder lists GitHub on their profile **and** it is the GitHub account they sign in with, the caption adds "GitHub {n} (@login)" from GitHub's public API (cached a day), so the number is theirs.
     - **X followers aren't offered:** X's API is paid (no free read access), and we don't show numbers we can't check.
  4. **ผลงานทั้งหมด**: published projects (no demos); caption "ยืนยันตัวเลขแล้ว {n} ชิ้น" (+ "★ n" GitHub stars when any).

- Breadcrumb (JaoPor › คนสร้าง › name, `text-2xs text-faint`), then `lg:grid-cols-[296px_minmax(0,1fr)] gap-12`; the sidebar scrolls with the page (owner 2026-10-13: a pinned side column while the other scrolls felt dizzying; was `lg:sticky lg:top-20`) and stacks above the main column below `lg`.
- **Sidebar:** avatar 144 (240 at `lg`) with a status dot · name `text-2xl font-bold` · `@handle` · **proof line** "{n} ผลงาน · {v} ยืนยันแล้ว · สร้างมา {m} เดือน" (`text-caption text-muted-foreground tabular-nums`, parts with no data left out) · headline · StatusPill · bio · ProfileActions (ติดต่อ / ติดตาม + "แชร์โปรไฟล์") · followers with the 30-day gain in positive ("128 ผู้ติดตาม +12 · 42 กำลังติดตาม") · info list · badges (round, grid of 4) · skills: superpowers as large chips (`border-brand bg-brand/15 px-3 py-1 font-bold text-brand-text`), the rest small (`bg-card px-2.5 text-2xs`) · "สร้างด้วย" · report.
- **Main:** looking-for card → **4 stat tiles** (MRR รวม "จาก n ผลงานที่ยืนยัน" · รายได้ทั้งหมด "ตั้งแต่เริ่มขาย" · GitHub ★ "n commits" · อัปเดตผลงาน "โพสต์ใน 6 เดือน"; zero tiles hidden) → **revenue / activity card** (see "Profile revenue dashboard" below; "กิจกรรมการสร้าง" = the heatmap; no verified revenue → visitors see the heatmap alone, the owner sees both tabs with a "connect a payment provider" prompt) → pinned works (4, "ดูทั้งหมด n ›" shows the rest in place via `?works=all`) → experience (`sm:grid-cols-2 lg:grid-cols-3`, each entry `border-l-2 pl-3.5`, the current role `border-brand`) → **อัปเดตผลงาน** (latest 4 PostCards, `variant="profile"`, `md:columns-2` masonry, "ดูฟีดทั้งหมด →").
- **Phone order (2026-10-10, master audit item 9):** below `lg` the sidebar keeps only identity — photo, name, proof line, headline, StatusPill, actions, followers, province — plus a skill preview that links to `#profile-extras`; bio, links, badges, the full skills list, "สร้างด้วย" and report move to the bottom of the main column (`#profile-extras`). The main column leads with looking-for → proof → revenue → pinned works → **experience → อัปเดตผลงาน** (experience moved above the feed so the founder's history isn't buried under posts).
- **Request on the first screen (2026-10-11, phones):** when the founder is looking for a co-founder or open to work, a compact "ส่งคำขอคุย →" link (`text-caption font-semibold text-brand-text`, same contact flow as the card's button) sits right under the StatusPill, below `lg` only and never for the owner. The full looking-for card stays first in the main column.
- **Share (2026-10-10, item 11):** a full-width "แชร์โปรไฟล์" button sits under the actions (the owner sees it under "แก้ไขโปรไฟล์"): the native Web Share sheet on phones, otherwise it copies the canonical `/{locale}/@handle` link (Instagram as a profile link is still pending the review it needs).
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
- **Filters** (one GET form, "ใช้ตัวกรอง" / "ล้าง"; every list is a **MultiChoice**, §5 Dropdowns): ทักษะ (grouped by skill group) · พื้นที่ (regions and provinces in one list, "ทั้งภาค…" first in each region group; param `area`) · สถานะ · สร้างด้วย (AI tool) · "เฉพาะคนที่มีตัวเลขยืนยันแล้ว" checkbox. Only what an anonymous visitor may see is filterable: a hidden province or hidden skills never match.
- **Order:** verified revenue → verified works → works → newest. 24 per page, the same prev / next pager.
- **BuilderCard** (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3`): `rounded-xl border bg-card p-4` + hover lift (`hover:-translate-y-0.5 hover:border-foreground/20`), whole card links to `/u/{handle}`. Row: avatar 48 round (initials fallback) · name `font-semibold truncate` + `@handle text-2xs text-faint` (both carry `title`). Headline `text-caption text-muted-foreground line-clamp-2` (`title`). StatusPill. Up to 3 skill chips `max-w-full truncate` with `title` (superpowers `border-brand/40 text-brand-text`, others `bg-secondary`). Footer `mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-caption tabular-nums` (content-driven, no `nowrap` on the row and no fixed widths): a left group holds "n ผลงาน" (`min-w-0`, `[overflow-wrap:anywhere]`) and the verified-revenue `flex min-w-0 flex-wrap` group (`·` `✓` `฿X` `/เดือน`, the icon + amount kept together in an inner `inline-flex`, the positive ✓ only with verified revenue); when a province is set the row adds `justify-between`, so the province (MapPin + `[overflow-wrap:anywhere]`, `title`) sits at the right edge on the same line and falls back to the **left** edge when it wraps to its own line. (2026-10-14: the footer was one `gap-2` line, so Thai labels and the revenue/`/เดือน` unit broke across lines and the row crowded. 2026-10-14: hardened at the layout level — a zero-basis flexible spacer still consumed the `gap`, so it could wrap onto the province's line and push it right; `justify-between` with the province as the second child is reliable because a lone wrapped child aligns to the start. Verified with fixed-width fixtures at 360→110 px in th/en and desktop/mobile: same-row province right-aligned, wrapped-alone province left-aligned, no horizontal overflow, and the revenue badge + amount always on one line.)
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

- Three columns from `xl` (`xl:grid-cols-[12.5rem_minmax(0,1fr)_18rem] gap-8`, max-w-page; the right rail is a fixed 18rem so names and follow buttons fit, layout audit 2026-10-12); at `lg` two columns with the right rail under the posts (1024px is too narrow for three); below `lg` one column, the view tabs become a horizontal scroll row and type / province / category fold into the CSS-only "ตัวกรอง" toggle as on /startups.
- **Left:** "ฟีด" `text-2xl font-extrabold` + "คนสร้างอัปเดตอะไรกันบ้าง"; view links ล่าสุด / กำลังติดตาม / ยอดนิยมสัปดาห์นี้ (`h-10 rounded-lg px-3`, active `bg-secondary font-bold`); "ประเภท" chips (ทั้งหมด + 5 types, each in its type colour, active = filled `bg-foreground text-background`); จังหวัด and หมวดหมู่ MultiChoice filters (GET form, several values each). Everything lives in the URL (`view`, `type`, `province`, `category`, `waiting`).
- **Center:** Composer, then PostCards (`space-y-4`), then "โหลดเพิ่ม" (`h-12 w-full rounded-xl border`) which appends the next page in place (cursor = the last post's time; popular uses an offset). Empty: dashed one-liner per view (following with no follows → "ติดตามคนสร้างเพื่อเห็นอัปเดตที่นี่" + link to /builders).
- **Right rail** (`space-y-5`): "คนสร้างที่น่าติดตาม" (3 rows: avatar 36, name + "● หา Co-founder" in positive when looking, startup · province, ติดตาม outline button) · "อัปเดตบ่อยสุดสัปดาห์นี้" (top 3 startups by posts in 7 days: logo 28, name, "n โพสต์") · "รอ Feedback จากคุณ" teal card (`border-info/40 bg-info/10`; count of feedback posts from the last 14 days that aren't mine and I haven't commented on; "ดูโพสต์ที่รอคำตอบ" → `?type=feedback&waiting=1`). Signed-out visitors see the count of feedback posts with no comments yet.
- "ยอดนิยมสัปดาห์นี้" = posts of the last 7 days ranked by (likes + 2 × comments) / (hours + 2)^1.5.

### NotificationBell (header, Phase 10c)

- Signed in only, left of the avatar: `size-8` ghost icon button (`BellIcon`) with an unread dot-count (`bg-brand text-white text-3xs rounded-full min-w-4`, "9+" above 9). Opens a dropdown (`w-80 max-h-[420px] overflow-y-auto`) with the latest 15: actor avatar 28 + one line ("{name} ถูกใจโพสต์ของคุณ" / "แสดงความคิดเห็น" / "ส่งคำขอคุย" / "ยอมรับคำขอคุย") + time; unread rows `bg-brand/5`. Opening marks them read. Each row links to the post (`/post/{id}`, `#comments` for comments) or `/dashboard/requests`. Empty: "ยังไม่มีการแจ้งเตือน".
- Header nav (Figma 160-555): ผลงาน · คนสร้าง · ฟีด · หมวดหมู่ · โอลิมปิก. The home-anchor "กระดานผู้นำ" and the xl-only "แดชบอร์ด" links leave the header (the leaderboard is linked from the Olympics page, the mobile menu and the footer; the dashboard from the avatar menu).

### Chat (`/dashboard/messages`, Phase 11)

- Inside DashboardShell. `lg`: two panes in one card (`lg:grid-cols-[18rem_minmax(0,1fr)] rounded-xl border bg-card overflow-hidden`, height `calc(100dvh-9rem)`): conversation list | open conversation. Below `lg` the list (`/dashboard/messages`) and a conversation (`/dashboard/messages/{id}`, with "← ข้อความ") are separate screens.
- **List row** (`flex gap-3 px-4 py-3 border-b`, active `bg-secondary`): avatar 36, name `text-caption font-semibold truncate`, last message `text-2xs text-muted-foreground truncate` ("คุณ: …" for mine; "ข้อความถูกลบ" when the last message was deleted), time `text-2xs text-faint`, unread count pill (`bg-brand text-white text-3xs rounded-full min-w-4`). Blocked → "ถูกบล็อก" in `text-faint`. Deleted account → "ผู้ใช้ที่ลบบัญชี". Empty: dashed one-liner "เมื่อคำขอคุยถูกยอมรับ แชทจะเปิดที่นี่" + link to /builders.
- **Conversation:** header (avatar 32 + name linking to the profile, ⋯ menu: บล็อก (confirm) / ดูโปรไฟล์); messages scroll area with day separators (`text-2xs text-faint` centred); bubbles max-w 80%: mine right `bg-brand text-white rounded-2xl rounded-br-md`, theirs left `bg-secondary border border-border rounded-2xl rounded-bl-md` (2026-10-14: in the dark theme `--secondary` #18181b sits within ~2 levels of the card #161618, so the incoming bubble vanished into the thread background; a `border-border` outline separates it in both themes), time under the last bubble of a run (`text-3xs text-faint`, with "· แก้ไขแล้ว" when a bubble in the run was edited); `⋯` on their bubbles → รายงาน. Composer pinned at the bottom: textarea (auto-grow to 5 lines, 2000 chars, counter past 1800), Enter sends / Shift+Enter new line, ส่ง button. Blocked: the composer is replaced by a `text-caption text-faint` note.
- **Edit / delete your own messages (2026-10-14, migration `chat_message_edit_delete`):** `⋯` on my bubbles → แก้ไข / ลบ (confirm). Edit swaps the bubble for an inline textarea in a `border-input bg-background` box (Enter saves, Esc cancels, บันทึก / ยกเลิก); the bubble then shows "· แก้ไขแล้ว". Delete is soft (`body` emptied, `deleted_at` stamped): the bubble becomes `text-faint italic` "ข้อความถูกลบ" for both people and the order is unchanged. Only the author, only while the conversation is open, and never an already-deleted message (RLS `update (body, edited_at, deleted_at)` + `private.chat_messages_edit_guard`).
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
- **Province dot (owner 2026-10-13: "รูปจังหวัดทำไมไม่ตรง", two provinces of one region looked identical):** the region stays tinted and a dot marks the province itself (`lib/config/province-points`: the capital's lon / lat projected as x = (lon − 97.35) × 10, y = (20.46 − lat) × 10; a test keeps every dot inside its region's outline). Dot `r=5` in `--foreground` with a `stroke-card` ring. The map is centred in the tile at a fixed height (`h-8 w-auto`).

### Province page (`/[locale]/province/[slug]`, spec 6.7)

- Breadcrumb JaoPor › โอลิมปิกจังหวัด › {province} → badge + H1 "ผลงานจากจังหวัด{name}" → subtitle "ตัวเลขที่ยืนยันแล้วจาก{name} · {region}" → brand link "อันดับ #X ในโอลิมปิกจังหวัด (รายได้รวม)" (when ranked) → QuickSearch + Add.
- "{n} ผลงาน" then large StartupCards `sm:grid-cols-2 lg:grid-cols-3` with third stat **รวมทั้งหมด** (all-time revenue) instead of growth; demo projects keep their tag. More than 24 → "ดูทั้งหมด {n} ผลงาน →" to `/startups?province=`. None → dashed empty card + Add.
- "← กลับไปโอลิมปิกจังหวัด", "จังหวัดใกล้เคียง" + RegionChip, chips of the other provinces in the region. Unknown slug → 404. OG: "{จังหวัด} / อันดับ #X ในโอลิมปิกจังหวัด" + the map with the region lit.
- Profile stat card ก่อตั้ง/ที่ตั้ง caption: `MapPin` + "{จังหวัด} · อันดับ #X ในโอลิมปิก" linking to the province page (wraps on phones).

### Directory (`/startups`, Figma "Marketplace")

- Hero (brand pill, H1, subline, ProviderStrip, SearchBar) then `grid lg:grid-cols-[15rem_1fr] gap-4`.
- **FilterSidebar** (`rounded-xl border bg-card p-4 space-y-4`, title "FILTERS" `text-3xs text-faint` above it): Category · Province · AI tool · Project type (Website / App / LINE OA / GitHub) · Looking for, each a **MultiChoice** (several values, any matches; §5 Dropdowns) · Verified only (checkbox) · Reset link. GET form; on mobile it collapses behind the "Filters" toggle (CSS checkbox, no JS).
- Results header: "{n} startups found" (`text-caption text-muted-foreground`) + sort select (Top MRR · Most visitors · Newest · Most commits).
- Grid `sm:grid-cols-2 gap-3` of large StartupCards; pagination below.

### Demo projects (`startups.is_demo`)

- Sample projects that fill the site before launch. Card: corner tag `Demo` (neutral: `border bg-secondary text-muted-foreground`), which replaces the verified/ask tag. Profile: a strip above the stat tiles (`rounded-xl border border-dashed bg-card p-3 text-xs text-muted-foreground`, `FlaskConical` icon): "Demo project: sample numbers for illustration, not a real business." The verified stamp says "Sample data" instead of naming a provider.
- Demo rows are excluded from share images and the badge (they render "not verified").
- Remove them all with `delete from startups where is_demo`.
- Home rows list **real projects before demos** (2026-10-07): a row shows at most 6 cards, so demos drop out of the home page by themselves once there are 6 real projects.

### ProjectLinks, LookingForBanner, TractionTiles, VerifyPanel, Dashboard card, InfoCard

Unchanged behaviour (see git history of this file for the full spec); restyle only through tokens:

- **ProjectLinks:** one link lists a project (website / App Store / Play / LINE OA / GitHub); outline `size="sm"` buttons with lucide `Globe`/`Smartphone`/`MessageCircle`/`Code`. A platform page in the website column is labelled with its platform ("Facebook", "YouTube"…), never "เว็บไซต์" (A1.2).
- **LookingForBanner** (A1.1, 2026-10-10): `rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs`.
  - **Asks:** a `HandHelping` icon + "กำลังหา:" + the asks as **plain text joined by " · "** (not pills: pills read as tabs and did nothing).
  - **Actions** (`lib/looking-for.ts`), each a real button `min-h-9 rounded-md`:
    - **co-founder** → primary "สนใจร่วมก่อตั้ง? ส่งคำขอคุย ›" to `/u/{founder}?contact=1&topic=cofounder`;
    - **investor / buyer** → "ติดต่อผู้ก่อตั้ง ›" (`topic=other`);
    - **users / feedback / testers** → "ลองใช้เลย ›" to the product link (outline when a contact button is present, else primary).
  - **The contact button** is hidden from the owner (`VisitorOnly`); the owner sees "ผู้เข้าชมจะเห็นปุ่มส่งคำขอถึงคุณตรงนี้". Visitors see "ส่งคำขอถึง {name}… เมื่อเขารับ คุณจะคุยกันในแชตได้".
  - **The profile page:**
    - signed-out visitors with `?contact=1` go through sign-in (title "เข้าสู่ระบบเพื่อส่งคำขอคุย") and come back;
    - the dialog opens on the linked topic;
    - with a pending / accepted / blocked request it doesn't open; a `role="status"` line says why.
- **TractionTiles:** StatCard row (only metrics with data; owner sees EmptyOwnerCards) "Verified traction": Visitors (30d) · Active users · Build proof (commits, % co-authored by Claude, first commit). Never convert users into revenue; self-typed numbers never appear.
- **VerifyPanel** (manage view; the chooser in §5 Add-startup wizard v2 is shown while nothing is connected): three bordered groups (Revenue: Stripe | Polar | RevenueCat · Visitors: **JaoPor snippet** | Plausible | Umami | Cloudflare | Google Analytics | PostHog · Build proof: GitHub), segmented source switch, numbered how-to, one primary "Verify". One source per group.
  - **JaoPor snippet** (no analytics account needed; listed first): a read-only code box (`rounded-lg border bg-card p-3 font-mono text-caption`) with the one-line `<script>` and a Copy button, then the install status: "รอการเข้าชมครั้งแรก" / "Waiting for the first visit" (muted, pulsing dot) → "นับตั้งแต่ {date}" / "Counting since {date}" (positive).
  - **Cloudflare:** API token (Account Analytics: Read only) + account ID. Numbers are **visits** (sessions), labelled so.
- **TractionTiles source captions:** visitors are always "counted": "นับโดย JaoPor ตั้งแต่ {date}" for the snippet, "นับโดย {Plausible / Umami}", "นับโดย Cloudflare · การเข้าชม (visits)"; build proof stays "ยืนยันผ่าน GitHub". Section heading "ตัวเลขจากระบบที่เชื่อมต่อ".
- **Tech stack card (InsightsGrid):** the owner's list; if empty, the stack detected from the connected GitHub repo, captioned "ตรวจพบจาก GitHub" / "Detected from GitHub" (`text-2xs text-faint`). Detection never overwrites the owner's list.
- **Hide for now (2026-10-08, UX audit S-10, migration owner_private_status):** the ⋯ menu on ผลงานของฉัน has "ซ่อนไว้ก่อน" (`EyeOff`, confirm dialog: what disappears, that numbers keep syncing, that it can be published again) or "เผยแพร่อีกครั้ง" (`Eye`, no confirm). Status `private`: gone from every public page, search, the leaderboard and the Olympics; only the owner sees it. A muted "ซ่อนอยู่ · เห็นแค่คุณ" chip on the card and under the name in the overview table; view / copy-link actions are hidden (there is no public page), the name opens the editor. A moderator's `hidden` keeps its warning label and has no toggle (the database refuses owners both ways).- **Dashboard startup card:** `rounded-xl border bg-card p-4`, status chip, 3 tiles, completeness bar (`bg-brand`), one primary action + `⋯` menu.
- **Empty fields (spec 2.4, replaces InfoCard's "always render" rule 2026-09-30):** visitors see only fields with data (InsightsGrid, TractionTiles, build story, tagline/description); the owner sees each empty slot as an `EmptyOwnerCard`; a section with no data at all is owner-only. Owner detection is client-side so the profile stays ISR.

### Footer

- `border-t mt-16`: 4 columns (brand + tagline · Navigation · Browse startups by category · About/legal), headings `text-3xs uppercase text-faint`, links `text-caption text-faint`; bottom line centered `text-2xs text-faint`: "© 2026 JaoPor · Built with JaoPor.dev in Thailand".

### Not-found and error pages (2026-10-09, launch readiness H-4)

- **Where:**
  - `[locale]/not-found.tsx` covers `notFound()` calls and every unmatched URL (via the `[locale]/[...rest]` catch-all);
  - `[locale]/error.tsx` covers render errors under the layout;
  - `app/global-error.tsx` covers a failure of the root layout itself.

  The first two render inside the normal layout (header, footer, current language).

- **Layout:** the Login page's centred column: `main mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center`.
  - `BrandMark size-10`;
  - a small faint code line (`404` / `500`, `font-mono tabular-nums text-faint text-caption`);
  - `h1 text-2xl font-bold`;
  - one `text-sm text-muted-foreground` sentence;
  - a button row: primary "กลับหน้าแรก" + outline "ดูผลงานทั้งหมด" (404) or primary "ลองอีกครั้ง" + outline "กลับหน้าแรก" (error).
- **Never shown:** the error message or stack. Only Next's opaque `digest` appears, as "รหัสอ้างอิง" (`text-2xs text-faint`), so a founder can quote it and we can find the server log.
- **Links** go through `@/i18n/navigation`, so the language is kept.
- **The global error** has no layout: it renders its own `<html class="dark">` with `globals.css`, reads the language from the first path segment and loads only that language's messages when it appears.

## 6. Page templates

| Route              | Structure (top → bottom)                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` Home           | Header · Hero (pill, H1, subline, ProviderStrip, SearchBar, links) · **Recently listed** (5 compact cards) · **Top traction** (5 compact cards, by counted visitors / verified commits; skips projects already in Recently listed and is hidden when fewer than 3 remain, 2026-10-07) · **LeaderboardCard** · **HomeTeasers** (categories + Olympics) · QuickSearch (no Add/chips) · Footer |
| `/startups`        | Header · Hero · FilterSidebar + results header + large card grid + pagination                                                                                                                                                                                                                                                                                                               |
| `/startup/[slug]`  | Breadcrumb · Profile header (logo, name, description, Share, Visit) · StatCards (data only; numbers first) · links + LookingFor · RevenueChartCard (Stripe) · VerifiedStamp · TractionTiles · InsightsGrid · More startups                                                                                                                                                                  |
| `/u/[username]`    | Sidebar (who, actions, info, badges, skills, tools) · looking-for · proof strip · pinned works · heatmap · experience \| recent activity                                                                                                                                                                                                                                                    |
| `/feed`            | Filters (view, type, province, category) · composer + PostCards + โหลดเพิ่ม · right rail (who to follow, most active, waiting for feedback)                                                                                                                                                                                                                                                 |
| `/builders`        | Hero (people search) · filter sidebar (skill, area, status, built with, verified) + BuilderCard grid + pager                                                                                                                                                                                                                                                                                |
| `/dashboard`       | Title + "+ Add project" · Dashboard startup cards                                                                                                                                                                                                                                                                                                                                           |
| Add-startup wizard | 2 steps: 1) project link (auto-fills name · one-liner · logo) · category → 2) VerifyPanel chooser or skip                                                                                                                                                                                                                                                                                   |
| `/acquire`         | Phase 2: Directory layout + price/multiple filters and FOR SALE tags                                                                                                                                                                                                                                                                                                                        |

## 7. States

- **Loading:** skeletons shaped like the final component (`bg-muted animate-pulse rounded`). No spinners in content areas.
- **Instant page feedback (owner 2026-10-13: the site felt "หน่วง ๆ แลค ๆ"; measured: every public page except /new showed nothing for 0.3–0.7 s after a click while the server rendered):** `NavProgress` in the root layout, a 2 px `bg-brand` bar fixed at the top that starts on any internal link click (no modifier keys, not `_blank`, a different path or query) and eases to 85 % (`--ease-settle`, 2.4 s), then completes and fades when the new path renders; it gives up after 10 s. Not a route-level `loading.tsx`: streaming a shell first turns real 404s into 200s (caught by `e2e/not-found.spec.ts`).
- **Heavy code off the first paint:** the chart library (Recharts, ~390 KB) loads after the page is interactive (`MetricChart` via `next/dynamic`, `ssr: false`, with a same-height skeleton); Google Analytics loads `lazyOnload`.
- **Empty:** muted one-liner + a primary action.
- **Error:** `text-destructive text-sm` inline, plus a retry. Never raw errors.
- **Unverified:** founder-typed numbers are never shown as revenue; show "Not verified yet".

### Motion (M1, 2026-10-11, owner decision; references studied: Finsepa, Bencho)

Motion shows the page arriving and the data being drawn (a section, a line, a source that is live). It never decorates. No animation library. **Numbers never animate** (owner, 2026-10-11): figures are plain text from the first paint.

- **Page enter** (owner request 2026-10-11): a page opened by a link or a reload fades its top-level blocks up (`page-enter`: opacity 0→1, 16 px, `--motion-slow`, `--ease-settle`), staggered 70 ms per block (max 280 ms). Back / Forward shows the page at once (it was seen already) and holds nothing for the scroll reveal. A `<head>` script sets `html[data-nav]` before the first paint (`lib/motion/nav.ts`), so the CSS plays from the first frame and no content is ever shown then hidden; `popstate` switches it to "back" (ScrollReveal). Blocks held by the section reveal below the fold are left to it.
- **Tokens** (`globals.css`):
  - `--ease-settle: cubic-bezier(0.22, 1, 0.36, 1)` (fast start, soft landing). Use it instead of Tailwind's `ease-out`, which keeps its own meaning.
  - Durations: `--motion-fast` 160 ms (hover, press), `--motion-base` 240 ms (small state changes), `--motion-slow` 700 ms (a section or line arriving).
- **Rules:**
  - animate `transform`, `opacity` and `clip-path` only, so nothing reflows;
  - content is complete in the HTML: motion only plays after JS marks an element as seen, and without JS, or in a browser without `@media (scripting)`, the final value simply shows;
  - each effect plays **once per element**, on first view; switching period, metric or currency doesn't replay it;
  - no infinite loops (the live pulse beats 3 times; one owner-approved exception: the home **Hero light**, §5 Hero, CSS transform / opacity only, still with reduced motion; the hero **headline typing** plays once per arrival); no autoplay video; no hidden-until-JS hero text;
  - `prefers-reduced-motion: reduce` makes every animation and transition effectively instant (global rule), and the M1 effects don't run at all.
- **InView** (`core/InView`): a client wrapper that sets `data-inview` and, on first intersection (about 30% visible), `data-in="1"`, then `data-in="done"` once the effect has finished. Before it is seen, the element waits in its start state (the chart's hidden series); a 3 s CSS failsafe shows it if JS never arrives.
- **Section reveal** (`core/ScrollReveal` in the locale layout, owner request 2026-10-11): as a visitor scrolls down a page, each top-level `<section>` of `<main>` fades up once (`opacity` 0 → 1, `translate` 24 px → 0, `--motion-slow`, `--ease-settle`). Sections on screen at load never move; only those below the fold are marked `data-reveal="wait"` (out of view, so nothing visibly disappears) until they enter. Nested sections move with their parent. Runs again after a client-side navigation. Without JS or with reduced motion nothing is marked.
- **Chart draw** (RevenueChartCard): on first view the series (area + compare line) is revealed left to right with `clip-path` in `--motion-slow`; axes, grid and tooltip don't move. Recharts' own animation stays off.
- **Live pulse** (VerifiedBadge `live`): a 6 px `bg-positive` dot after the source name with a ring that expands and fades (`scale` 1 → 2.8, opacity 0.5 → 0) 3 times, then rests. Only when the source synced within the last 26 h (the daily cron); decorative (`aria-hidden`), the text already says the source.
- **InView modes:** `seen` (default; the chart): the waiting state applies before the first view (hidden chart series). `enter` (cards, leaderboard): nothing is hidden before JS; an element already on screen when the page loads counts as seen at once (no effect, no flash), and only elements that scroll in later play their effect.
- **Card rise (M2, 2026-10-11):** StartupCard (home rows, directory, category, province, "More startups") and BuilderCard rise in when they scroll into view: `opacity` 0 → 1 and `translate` 16 px → 0 in `--motion-slow` with `--ease-settle`, staggered 60 ms by position in the grid (capped at 5 steps). The wizard's preview card never moves.
- **Leaderboard (M2):** **switching the board** (MRR → visitors …) slides rows that are on both boards from their old place to the new one (FLIP: `transform` only, 450 ms `--ease-settle`), and rows new to the board fade up 6 px. Showing more rows doesn't animate. Reduced motion: rows just swap.
- **First-verify stamp (M2):** right after a source connects in VerifyPanel, the check pops in (scale 0.4 → 1.15 → 1, 500 ms) with one ring that expands and fades, once. Rows that were already connected never animate.
- **Card hover (owner 2026-10-12, after the Lovable mockup):** StartupCard and BuilderCard lift 4 px (`translate`, `--motion-base`, `--ease-settle`, mouse / trackpad only via `@media (hover:hover)`, none with reduced motion), brighten the border and get a soft shadow. **CardGlow** (`core/CardGlow`) adds a brand-colour ring that follows the pointer along the border (radial gradient at the pointer, masked to a 1.5 px band) plus a 10% brand wash inside; it fades in on enter and out on leave (`--motion-base`), never on touch, `aria-hidden`, no pointer events. The card needs `relative isolate`.
- **Later (M3):** like burst, hover / press feedback, skeleton shimmer, a "recently verified" ticker from real events only.

### Anonymous projects (2026-10-11, owner request; TrustMRR's anonymous mode as the reference)

A project can be listed **without its identity**. Visitors see its verified numbers and charts, category, province, tagline, description, story, posts and the owner; they do **not** see the name, logo, any link (website, App Store, Google Play, LINE OA, GitHub, repo), screenshots, demo video or the page's old URLs. Unlike TrustMRR, nothing is deleted: the real details are kept and turning the mode off restores them, old URLs included.

- **Enforced in the database** (migration `anonymous_mode`): while `is_anonymous`, the public row holds placeholders (name "Anonymous", slug `anon-<10 hex>`, no logo or links), the real identity sits in a private table that only the owner (`startup_identity()`) and the server read, and screenshots are hidden by RLS. Every list, search, embed, OG image and API therefore shows nothing identifying without per-surface filters. The slug shape `anon-<10 hex>` is reserved for anonymous projects, so the UI recognises one from the slug alone (`isAnonymousSlug`).
- **Display (blur, owner 2026-10-12):** the name is a **blurred made-up word** (`ProjectName`: `anonymousMask(slug)`, built from the random slug only, `blur-[5px] select-none aria-hidden`) with an `sr-only` "ผลงานไม่เปิดเผยชื่อ" / "Anonymous project"; the logo tile is a **blurred gradient** (`from-brand/70 via-muted-foreground/30 to-positive/50 blur-[6px]`). Plain-text places (page title, OG image, share card, alt text) keep the words "ผลงานไม่เปิดเผยชื่อ". The project page adds a chip "ไม่เปิดเผยตัวตน" (`rounded-full border text-2xs`, `EyeOff`) next to the H1 and, under the header, a dashed note (`rounded-lg border border-dashed p-3 text-caption text-muted-foreground`) saying the owner keeps the name, logo and links private while the numbers are still checked against the real source.
- **Add-project wizard (step 1):** a checkbox card under the logo, "ไม่เปิดเผยชื่อผลงาน (Anonymous)" + hint; the live preview card switches to the anonymous look. The row is masked before it is ever visible.
- **Edit page (basics, first block):** "โหมดไม่เปิดเผยตัวตน (Anonymous)" switch card (`rounded-lg border p-4`, on = `border-brand/40 bg-brand/5`), with what others won't see, what they still see, a `text-warning` line to keep the tagline / description / posts free of the name, and (when off) that the page gets a new link. Saves on its own after a ConfirmDialog. The owner keeps seeing and editing the real name, logo and links; edits are stored privately while the mode is on. Owner views mark the project with the same chip.
- Hidden until the migration is applied (no switch, no checkbox).

### Disclosure levels (R2, 2026-10-11, owner decisions O1–O5; spec: docs/DISCLOSURE_SPEC.md)

The owner picks, per group (`revenue` · `users` · `traffic` · `build`), what visitors see. Verified ≠ visible: the level never changes what was verified.

- **Levels (th / en, one plain sentence each, no pressure, no shame):**
  - `exact` — "แสดงตัวเลขจริง" / "Show the exact number"
  - `band` — "แสดงเป็นช่วง เช่น ฿10k–25k" / "Show a range, e.g. ฿10k–25k"
  - `growth` — "แสดงแค่การเติบโต (%)" / "Show growth only (%)"
  - `badge` — "แสดงแค่ป้ายยืนยัน ไม่มีตัวเลข" / "Show the verified badge only"
  - `private` — "ไม่แสดงต่อสาธารณะ (คุณยังเห็นเอง)" / "Hide from the public (you still see it)"; hides the badge too (O2) and doesn't count toward the public proof level.
- **Defaults (O1):** new `revenue` / `users` connections → `badge`; `traffic` / `build` → `exact`; existing projects stay `exact`. Visitors are never told when a level changed (O3).
- **Chooser:** "ใครเห็นตัวเลขนี้?" right after a source connects and in project settings: a radio list (`rounded-lg border`, selected `border-brand bg-brand/5`), and beside it a **preview of what visitors see** (the real card + StatCard at that level).
- **Display:** `band` = range text in the value slot (`tabular-nums`, no rolling); `growth` = GrowthValue + "เทียบ 30 วันก่อน", no chart axis values; `badge` = VerifiedBadge with source and checked-at, no figure; `private` = nothing. Wording rule unchanged: "ยืนยัน" only for what a source confirmed; JaoPor / analytics counts say "นับโดย".
- **Owner dashboard line:** next to each number, `text-caption text-muted-foreground` "คนอื่นเห็น: {level label}" / "Others see: {level label}".
- **Bands (O5):** money in THB-equivalent from the stored daily `fx_rates` row for the sync day (never an FX call per write); the rate day used is stored with the public value so a band can be audited. Users / visitors / commits use their own units on a 1–2.5–5–10 ladder.

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

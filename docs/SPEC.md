# JaoPor — Product & Build Spec

> Save this file in the repo as `docs/SPEC.md`. It is the single source of truth for the features below.
> Visual design comes from Figma (links given per task). When Figma and this spec disagree on **looks**, Figma wins. When they disagree on **behavior or data**, this spec wins.

---

## 0. How to work (read first)

1. **This is an existing, live app.** Stack: Next.js (App Router) on Vercel, Supabase (Postgres, Auth, Storage), routes under `/[locale]` with `th` (default) and `en`. Read the codebase before changing anything. Extend existing components, don't rewrite working ones.
2. **Work phase by phase** (section 9). For each phase: short plan, then build, then run lint/typecheck/build, then summarize what changed. Stop after each phase and wait for me.
3. **Figma:** for each page I'll give a Figma frame link. Read it with the Figma MCP (`get_design_context` / `get_screenshot`) and adapt it to our existing components and tokens. Don't paste generated code blindly. Stitch exports can have messy layers: use the design as a reference, and build clean components.
4. **Database changes:** write every change as a Supabase migration file. **Show me the SQL before you apply it.** Every new table gets RLS policies. Never expose service-role keys to the client.
5. **i18n:** every UI string goes in the `th` and `en` message files. No hard-coded Thai or English in components.
6. **No fake data in production.** Mock or seed data only in local dev seeds. Empty states must look intentional (section 2.4).
7. **Only verified numbers count** toward rankings and totals. Unverified startups can be listed, but show "ยังไม่ยืนยัน" and count as 0 on leaderboards.
8. Accessibility: real `<button>`/`<a>`, labels on inputs, `aria-label` on icon-only buttons, visible focus rings, text contrast ≥ 4.5:1.
9. Mobile-first: every page must work at 375px wide with no horizontal scroll.

---

## 1. Product

**JaoPor (เจ้าพ่อ, "the godfather")** is a permanent home for things Thai (and Asian) builders make with AI: websites, mobile apps, LINE OA bots, GitHub projects. Each project shows **verified** numbers pulled directly from providers, not screenshots.

- Tagline: **"1 คน + AI พีคได้แค่ไหน — ดูผลงานจริง ตัวเลขจริง"**
- Verification providers (already built): Stripe, RevenueCat, Plausible, Umami, GitHub. Coming soon: Polar, Lemon Squeezy, Paddle, App Store.
- Metrics: MRR, revenue (30d / 12m / all-time), visitors (30d), active users (28d), commits.
- Unique filters (already built, keep them): **สร้างด้วย** (Claude Code, Cursor, Codex, Windsurf, Lovable, v0, Replit, Bolt…), **ประเภทโปรเจกต์** (เว็บไซต์ / แอปมือถือ / LINE OA / GitHub), **กำลังหา** (ผู้ใช้, Feedback, คนช่วยทดสอบ, Co-founder, ผู้ซื้อกิจการ, นักลงทุน).
- Currency: startups report in THB or USD. Show each startup's own currency. For combined totals (provinces, categories), convert to THB using a `fx_rates` table updated daily (fallback: `FX_USD_THB` env var).

---

## 2. Design system

### 2.1 Tokens (put in Tailwind config / CSS variables, one place)

| Token           | Value     | Use                                         |
| --------------- | --------- | ------------------------------------------- |
| `bg`            | `#0A0A0B` | page background                             |
| `surface`       | `#141416` | cards                                       |
| `surface-2`     | `#1E1E20` | modals, dropdowns                           |
| `border`        | `#26262A` | 1px borders                                 |
| `border-strong` | `#3A3A40` | hover, inputs                               |
| `text`          | `#EDEDED` | body                                        |
| `text-muted`    | `#A1A1A6` | secondary                                   |
| `text-subtle`   | `#8A8A8F` | labels (UPPERCASE, tracking 0.1em)          |
| `accent`        | `#6E6CF3` | brand indigo: logo, links, charts, selected |
| `positive`      | `#22C55E` | ↑ growth, verified                          |
| `negative`      | `#EF4444` | ↓ growth                                    |
| `warning`       | `#F59E0B` | badges like "กำลังหาผู้ซื้อ"                |
| `paper`         | `#F4F4F5` | primary button background                   |

- Radius: 8px (chips/inputs), 12px (cards), 16px (large sections/modals), 999px (pills).
- Font: **JetBrains Mono** for everything, falling back to **IBM Plex Sans Thai** for Thai glyphs (`font-family: 'JetBrains Mono', 'IBM Plex Sans Thai', monospace`). Load both with `next/font`.
- No heavy shadows, no gradient backgrounds, no emoji as icons. Icons: `lucide-react`. Brand logos: `simple-icons`.
- Light theme exists (sun toggle in nav). Every token needs a light value too.

### 2.2 Core components (build once, reuse everywhere)

- `Card`: surface, border, radius 12. Hover: border-strong plus 1px lift when clickable.
- `Chip`: pill with optional 16px icon or logo plus label. Variants: default, active, muted.
- `SegmentedControl`: near-black pill container; the selected segment is a raised black block with a light inner border.
- `StatCard`: UPPERCASE label, big bold value, muted sub-line.
- `Button`: `primary` (paper bg, dark text), `secondary` (border), `ghost`. Always icon plus label, min height 44px.
- `StartupAvatar`: logo image, or a gray letter avatar for anonymous/no logo.
- `VerifiedBadge`: green "ยืนยันแล้ว · Stripe" or muted "ยังไม่ยืนยัน".
- `InsightCard`: 40px dark icon box, UPPERCASE label, content.
- `EmptyOwnerCard`: dashed border "+ เพิ่ม…" CTA, shown **only to the owner**.
- `QuickSearch`: see 6.8.

### 2.3 Number formatting

`฿990/เดือน`, `$1.2k`, `$3,569,654`, `↑ 19%`, `1.9x`. One `formatMoney` / `formatCompact` / `formatPct` util, locale-aware.

### 2.4 Empty-state rule

- **Visitors:** hide any field, card or section that has no data. Never show a wall of "–" or "ยังไม่ได้เพิ่ม".
- **Owner:** show those same slots as `EmptyOwnerCard` prompts that link to the edit form.
- Unverified metrics: group them into one small muted line ("ยังไม่ยืนยัน: รายได้, MRR · เชื่อมต่อ Stripe") instead of one card each.

---

## 3. Brand: logo "Rising Fedora"

The mark is a white fedora on an indigo rounded-square tile, where the hat band is a rising revenue line.

`/public/logo.svg` (≥ 24px):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="15" fill="#6E6CF3"/>
  <path d="M19 40 L21.5 24 C22 21 24.5 19.8 27 21 L32 23.5 L37 21 C39.5 19.8 42 21 42.5 24 L45 40 Z" fill="#fff"/>
  <polyline points="21.6,36 27,32 31,34.2 37,27.6 43.4,24.6" fill="none" stroke="#6E6CF3" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M5 43 C5 40.5 9 39.5 14 39.5 L50 39.5 C55 39.5 59 40.5 59 43 C59 45.5 55 46.5 50 46.5 L14 46.5 C9 46.5 5 45.5 5 43 Z" fill="#fff"/>
</svg>
```

`/app/icon.svg` favicon (≤ 24px, the line is dropped and the hat is thicker):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#6E6CF3"/>
  <path d="M18 42 L21 22 L32 25 L43 22 L46 42 Z" fill="#fff"/>
  <rect x="3" y="39" width="58" height="10" rx="5" fill="#fff"/>
</svg>
```

- Lockup: mark plus "JaoPor" in JetBrains Mono 800, letter-spacing -0.02em.
- Also generate: `apple-icon.png` (180), `icon-192.png`, `icon-512.png`, and a mono version (black tile, white hat, black line) for light backgrounds.
- Make it a `<Logo size variant="full|mark|mono" />` React component. Replace the current hat icon everywhere.

---

## 4. Shared config files (single source of truth)

Put these in `/lib/config/`. The filters, forms, footer, search and pages must all import them. No duplicated lists.

### 4.1 `categories.ts`: `{ slug, nameTh, nameEn, descTh, descEn, icon }`

Keep existing slugs. Full list (lucide icon names):

| slug            | Thai                 | icon            |
| --------------- | -------------------- | --------------- |
| ai              | AI / ปัญญาประดิษฐ์   | Sparkles        |
| saas            | SaaS                 | Cloud           |
| developer-tools | เครื่องมือนักพัฒนา   | Terminal        |
| fintech         | ฟินเทค               | Wallet          |
| marketing       | การตลาด              | Megaphone       |
| ecommerce       | อีคอมเมิร์ซ          | ShoppingBag     |
| productivity    | เพิ่มประสิทธิภาพงาน  | SquareCheck     |
| design          | ดีไซน์               | PenTool         |
| no-code         | No-Code / Low-Code   | Blocks          |
| analytics       | วิเคราะห์ข้อมูล      | BarChart3       |
| education       | การศึกษา             | GraduationCap   |
| health          | สุขภาพและฟิตเนส      | HeartPulse      |
| community       | คอมมูนิตี้           | MessageCircle   |
| content         | คอนเทนต์ครีเอเตอร์   | Video           |
| crypto          | คริปโตและ Web3       | Bitcoin         |
| support         | บริการลูกค้า         | Headphones      |
| entertainment   | บันเทิง              | Film            |
| games           | เกม                  | Gamepad2        |
| green-tech      | เทคโนโลยีสีเขียว     | Leaf            |
| iot             | IoT และฮาร์ดแวร์     | Cpu             |
| legal           | กฎหมาย               | Scale           |
| marketplace     | มาร์เก็ตเพลส         | Store           |
| mobile-apps     | แอปมือถือ            | Smartphone      |
| news            | ข่าวและสื่อ          | Newspaper       |
| real-estate     | อสังหาริมทรัพย์      | House           |
| hr              | จัดหางานและ HR       | Users           |
| sales           | การขาย               | TrendingUp      |
| security        | ความปลอดภัย          | ShieldCheck     |
| social          | โซเชียลมีเดีย        | Share2          |
| travel          | ท่องเที่ยว           | Plane           |
| utilities       | เครื่องมือทั่วไป     | Wrench          |
| line-oa         | LINE OA และแชทบอท    | Bot             |
| food            | อาหารและร้านอาหาร    | UtensilsCrossed |
| agritech        | เกษตรเทค             | Sprout          |
| local-sme       | ธุรกิจท้องถิ่น / SME | Building2       |
| logistics       | โลจิสติกส์และขนส่ง   | Truck           |
| other           | อื่น ๆ               | Shapes          |

Write a short Thai and English description for each (e.g. ai: "เครื่องมือ AI, LLM, แชทบอท และระบบอัตโนมัติ"). If an existing slug is missing from this table (e.g. `analytics` vs `data`), keep the existing slug and tell me.

### 4.2 `provinces.ts`: `{ slug, nameTh, nameEn, region }`

- All **77** entries: 76 provinces plus Bangkok (กรุงเทพมหานคร). Assert `length === 77` in a test.
- Regions use the official 6-region grouping: `north` ภาคเหนือ, `northeast` ภาคตะวันออกเฉียงเหนือ, `central` ภาคกลาง, `east` ภาคตะวันออก, `west` ภาคตะวันตก, `south` ภาคใต้. Each region also gets a display color (muted, distinct in lightness).
- Slugs: lowercase English, hyphenated (`bangkok`, `chiang-mai`, `mukdahan`, `nakhon-ratchasima`).

### 4.3 `stack.ts`: tech stack options `{ slug, label, group, simpleIcon?, lucideIcon? }`

- **Frontend:** Next.js, React, React Native, Vue, Nuxt, Svelte, Flutter, Swift, SwiftUI, Kotlin, Tailwind CSS, Expo
- **Backend:** Node.js, Python, Go, Laravel, Django, FastAPI, Supabase, Firebase, Rails
- **Database:** PostgreSQL, MySQL, MongoDB, Redis, SQLite
- **Hosting:** Vercel, Cloudflare, AWS, Google Cloud, Railway, Render, Netlify
- **AI / LLM:** Claude, OpenAI, Gemini, Llama, Mistral
- **Payments:** Stripe, RevenueCat, Omise, 2C2P, PromptPay, Lemon Squeezy, Paddle
- **Built with:** the existing "สร้างด้วย" list (Claude Code, Cursor, Codex, Windsurf, Lovable, v0, Replit, Bolt…), moved here

### 4.4 `channels.ts`: marketing channels `{ slug, labelTh, labelEn, simpleIcon?, lucideIcon? }`

LINE OA, LINE Ads, Facebook, Facebook Groups, Facebook Ads, Instagram, TikTok, TikTok Ads, YouTube, YouTube Ads, X, X Ads, LinkedIn, LinkedIn Ads, Google Ads, Meta Ads, Pantip, Blockdit, Shopee/Lazada Affiliate, SEO, Blog, Content marketing, Email marketing, Influencer / KOL, Word of mouth, Events / Meetups.
Generic channels use lucide icons: SEO=Search, Blog=BookOpen, Content=PenLine, Email=Send, Word of mouth=Share2, KOL=Star, Events=CalendarDays.

Brand logos come from the `simple-icons` package, inlined as SVG. Render logos white when their brand color is too dark on our background (X, Vercel, Next.js, TikTok). If a brand isn't in simple-icons, fall back to a lucide icon. Never hotlink logo images.

---

## 5. Data model changes (migrations, show SQL first)

- `startups.province` text (a slug from 4.2), nullable. Migrate existing location text such as "มุกดาหาร, ไทย" into it and report the rows that couldn't be matched.
- `startups.tech_stack` jsonb: `{ frontend: [], backend: [], database: [], hosting: [], ai: [], payments: [], built_with: [] }` (slugs).
- `startups.marketing_channels` text[] (slugs, plus custom entries prefixed `custom:`).
- `startups.pricing` → structured: `pricing_amount` numeric, `pricing_currency` ('THB'|'USD'), `pricing_period` ('month'|'year'|'once'|'free'), plus `pricing_note` text.
- `startups.demo_video_url` text (YouTube / Loom / TikTok, validated).
- `startups.founder_message` text (max 600), `founder_role` text.
- New table `startup_screenshots`: id, startup_id (fk, cascade), url, kind ('desktop'|'mobile'|'line'), caption (≤60), width, height, position, created_at. RLS: public read; only the owner can insert, update or delete.
- Storage bucket `screenshots`: path `{startup_id}/{uuid}.webp`. Public read; the owner writes. When a startup is deleted, delete its files.
- New table `fx_rates` (date, usd_thb).
- Extension `pg_trgm` plus trigram GIN indexes on startup name/description (for Thai search, 6.8).
- Views or RPCs: `category_counts()`, `province_leaderboard(metric, region)`, `search_all(q, locale)`.

---

## 6. Pages & features

### 6.1 Global

- Nav: logo · สตาร์ทอัพ · หมวดหมู่ · โอลิมปิก · กระดานผู้นำ · แดชบอร์ด · search (`/` shortcut) · "+ เพิ่ม Startup" · เข้าสู่ระบบ · language · theme.
- Footer: add links to หมวดหมู่ and โอลิมปิกจังหวัด. The footer category list comes from config.
- `metadataBase` = the production domain (from `NEXT_PUBLIC_SITE_URL`). **Bug to fix:** OG images currently point at the old `mrr-mafia.vercel.app` domain.

### 6.2 Home `/[locale]`

- Hero (keep): logo, headline, subtitle, provider chips, search + "+ เพิ่ม Startup". **Hide the "ดูผลงานทั้งหมด N ชิ้น" count while N < 20.** Show the "+ เพิ่ม Startup" CTA at most twice on the page (nav plus hero).
- "เพิ่มล่าสุด" horizontal row of compact cards, with "ดูทั้งหมด ›".
- Leaderboard (keep, polish): metric dropdown (MRR / รายได้ 30 วัน / ผู้เข้าชม 30 วัน / Commits), top 3 with medal styling, rows show logo, name, 1-line description, founder, value, growth. Rows link to detail. Empty state: "ยังไม่มีตัวเลขที่ยืนยัน — มาเป็นคนแรกบนกระดาน" + CTA.
- "สำรวจหมวดหมู่" teaser: the 8 top categories as chips → /categories.
- "โอลิมปิกจังหวัด" teaser: top 3 provinces → /olympics.
- Bottom QuickSearch section (6.8).

### 6.3 Startups list `/[locale]/startups` (exists, extend)

- Add **Province** and **Region** filters. Categories come from config.
- **Check:** the filter panel renders twice in the HTML (desktop plus mobile). Make sure only one is visible at any width.
- Bottom QuickSearch.

### 6.4 Startup detail `/[locale]/startup/[slug]`

Order:

1. Breadcrumb, header (logo, name, badge like "เจ้าพ่อรุ่นบุกเบิก #1", description), actions: **แชร์** (opens 6.5) and **เข้าเว็บไซต์ ↗**.
2. 4 stat cards: รายได้ทั้งหมด (+ อันดับ #X), MRR (+ subscriptions), ผู้ก่อตั้ง (avatar, name), ก่อตั้ง (date + "📍 จังหวัด · อันดับ #X ในโอลิมปิก" linking to the province page).
3. **Revenue chart card:** period total, growth vs the previous period, profit-margin pill. Dropdowns: metric (รายได้ / MRR / ผู้เข้าชม) and period (7 วัน / 30 วัน / 12 เดือน). Area chart in accent with a gradient fill. Toggles: "เทียบช่วงก่อนหน้า" (dashed line) and "Trend". Below: "✓ ยืนยันผ่าน Stripe · อัปเดตล่าสุด {time}". Hidden when nothing is verified; the owner sees "เชื่อมต่อ Stripe เพื่อแสดงกราฟ".
4. **ภาพผลงาน (screenshots),** App Store style:
   - Header: "ภาพผลงาน" + the domain (linked), "1 / 6" counter, and ← → buttons on desktop.
   - Horizontal scroll-snap carousel. `desktop` shots are 16:10 cards (~720px, 88vw on mobile) with a thin browser top bar (3 dots + domain). `mobile` and `line` shots are phone-shaped 9:19.5 cards (~260px, 28px radius, thin bezel). A single desktop shot is shown full width with no carousel.
   - Optional caption under each shot. Fade edges when there's more to scroll. Arrow keys work when focused.
   - Demo video (if set) is the first slide, with a play overlay.
   - Lightbox: full-size image, swipe or ← →, caption, counter, close on Esc / × / backdrop, focus trap.
   - Use `next/image`, lazy-load after the first 2 shots, blur placeholders. Alt text = caption or "ภาพหน้าจอ {name} {n}".
5. **ข้อความจากผู้ก่อตั้ง:** a large card with an 80px circular avatar on the left and the quote on the right (18px, line-height 1.8, paragraphs kept), then the name in bold and the role in muted text. Hidden if empty.
6. **ข้อมูลเชิงลึก:** a 2-column bento of `InsightCard`s (1 column on mobile).
   - Left: กลุ่มลูกค้า (text + B2B/B2C chips + "~N ผู้ใช้"), ราคา ("฿990 / เดือน"), ขนาดทีม, เงินทุน, ช่องทางการตลาด (logo chips).
   - Right: คุณค่าที่มอบให้ (wide), ปัญหาที่แก้, ตลาด (category chips), เทคโนโลยีที่ใช้ (logo chips grouped under muted sub-labels, empty groups skipped), ข้อมูลเพิ่มเติม.
   - Apply the empty-state rule (2.4).
7. สตาร์ทอัพอื่น ๆ: same category or province first.
8. Bottom QuickSearch.

- OG image: the cover screenshot darkened as background, with logo, name and verified numbers on top.

### 6.5 Share modal (from "แชร์")

- Title "แชร์ตัวเลขที่ยืนยันแล้ว", × (also Esc and backdrop click).
- "ลิงก์ผลงาน": read-only URL + "คัดลอก" button, which shows "คัดลอกแล้ว ✓" for 2s.
- Tabs (SegmentedControl): **Badge | กราฟรายได้ | ปฏิทิน**.
  - Badge: Theme Light/Dark. Preview card: logo, "TOTAL REVENUE" (or the best verified metric), big value, "★ Verified by JaoPor" (use the Logo mark instead of a star).
  - กราฟรายได้: Theme + Period (7 วัน / 30 วัน / 12 เดือน) + "สีเส้น" with 12 color dots (blue, purple, indigo, sky, cyan, teal, emerald, lime, amber, orange, rose, pink), showing the selected color name. Preview: total, "รายได้ {period}", logo + name, line chart, verified footer.
  - ปฏิทิน: Theme + Period (12 / 6 / 3 เดือน) + "สี $". Preview: a GitHub-style heatmap where every cell is a "$" (or "฿" for THB startups), 5 intensity levels from gray to the chosen color, month labels on top, จ./พ./ศ./อา. on the left, and a legend "น้อย ฿ ฿ ฿ ฿ ฿ มาก".
- "⤓ ดาวน์โหลดภาพ" exports only the preview card as PNG (`html-to-image`), named `{slug}-{tab}.png`.
- Also: a public embeddable badge at `/api/badge/[slug].svg?theme=dark` plus a "คัดลอกโค้ด README" button that gives Markdown for GitHub READMEs.

### 6.6 Categories `/[locale]/categories`

- Breadcrumb "JaoPor › หมวดหมู่". Title "สำรวจหมวดหมู่". Subtitle "สำรวจผลงานใน {n} หมวดหมู่".
- A 4-column grid of category cards (2 on tablet, 1 on mobile): 48px dark icon box, bold name, 1-line muted description, and the startup count on the right. Each links to `/startups?category={slug}`.
- Sort by count. Categories with 0 startups go last and are dimmed.
- Counts come from one grouped query (`category_counts()`).
- Bottom QuickSearch.

### 6.7 Province Olympics

**`/[locale]/olympics` "โอลิมปิกจังหวัด"**

- Title plus subtitle "จังหวัดไหนสร้างผลงานด้วย AI ได้พีคที่สุด ตัดสินด้วยตัวเลขที่ยืนยันแล้วเท่านั้น", then search + CTA.
- Controls: a metric SegmentedControl (รายได้รวม | MRR | ผู้เข้าชม 30 วัน | Commits) and region chips (ทั้งหมด plus the 6 regions). Both are kept in the URL query.
- Stacked province cards ranked by metric:
  - rank number, with SVG medals for 1–3
  - a 56×40 badge: a small Thailand silhouette SVG with the province's region highlighted in its region color. **No official provincial seals.**
  - Thai name in bold with the English name muted, a region chip, and "{n} สตาร์ทอัพ"
  - the total, right-aligned
  - the top 5 startups: logo, name, share % of the province total, a thin progress bar, and the value
  - the header links to the province page
- Provinces with no verified startups go in a collapsed section: "ยังไม่มีผลงานจาก {n} จังหวัด — เป็นคนแรกของจังหวัดคุณ" with the names as chips + CTA.
- Totals are in THB (converted via `fx_rates`).

**`/[locale]/province/[slug]`**

- Title "สตาร์ทอัพจังหวัด{nameTh}" with the region badge, and subtitle "ตัวเลขที่ยืนยันแล้วจาก{nameTh} · {region}".
- Search + CTA, then "{n} สตาร์ทอัพ".
- A 3-column grid of startup cards: logo, name, 2-line description, divider, and 3 stats (รายได้ 30 วัน | MRR | รวมทั้งหมด). Anonymous startups show a letter avatar.
- "← กลับไปโอลิมปิกจังหวัด" and "จังหวัดใกล้เคียง" chips (same region). OG image: "{จังหวัด} อันดับ #X ในโอลิมปิกจังหวัด". An unknown slug returns a 404.

### 6.8 QuickSearch (one component, used everywhere)

Used in the nav (`/` shortcut), the hero, and a **bottom section** above the footer on: home, startups list, detail, categories, olympics and province pages.

- Bottom section: centered, max-width 640px, muted heading "หาผลงานอื่นต่อ", input + "+ เพิ่ม Startup", and quick chips (top categories plus "โอลิมปิกจังหวัด →").
- Starts searching at 1 character, with a 200ms debounce. Out-of-date requests are cancelled (AbortController).
- Floating panel: surface-2, border, radius 12, max-height ~420px with its own scroll. **It opens upward when there's less than ~440px below the input** (this always applies at the page bottom). It never goes off-screen.
- Groups: **สตาร์ทอัพ** (≤6: logo, name with the match highlighted, VerifiedBadge, 1-line description), **หมวดหมู่**, **จังหวัด**. Empty groups are hidden. Last row: "ดูผลลัพธ์ทั้งหมดสำหรับ "{q}" →" → `/startups?q=`.
- Focused but empty: "ยอดนิยม" (5 startups) plus category chips. Loading: 3 skeleton rows. No results: "ไม่พบ "{q}" · เพิ่มผลงานของคุณเป็นคนแรก".
- Keyboard: ↑/↓ with scroll-into-view, Enter, Esc, click outside closes. ARIA combobox/listbox pattern.
- Mobile: tapping the bottom search opens a full-screen search sheet with the input pinned at the top.
- Backend: `search_all(q, locale)` RPC using **pg_trgm** similarity + ILIKE (Thai has no spaces between words), matching Thai names, English names and slugs ("saa" → SaaS, "mukda" → มุกดาหาร). Ranking: exact match, then verified, then MRR.

### 6.9 Add / edit startup form (extend the existing `/new` and edit)

- **จังหวัด:** a searchable select from config (required when the country is Thailand).
- **หมวดหมู่:** from config.
- **เทคโนโลยีที่ใช้ / ช่องทางการตลาด:** searchable multi-selects that show logo chips. Selected chips have ×. Custom entries are allowed (generic icon).
- **ราคา:** amount + currency + period.
- **ภาพผลงาน step:** drag-and-drop, paste (Ctrl/Cmd+V) or click. PNG/JPG/WebP, max 8 images, 5MB each. Detect the kind from the aspect ratio (the owner can switch to "line"). Drag to reorder; the first is the cover. Caption per image.
  - **Compress in the browser** to WebP, max 2400px on the long side, and **strip EXIF** (it can contain GPS) before upload.
  - Optional "ลิงก์วิดีโอเดโม".
  - Optional "ดึงภาพจากเว็บอัตโนมัติ": capture via a screenshot API (ask me which one before adding). The result is added as a draft for the owner to keep or delete, never auto-published.
- **ข้อความจากผู้ก่อตั้ง** (≤600, with a live counter) + role.

---

## 7. Content & data cleanup (I do these; remind me)

- Delete the duplicate test listing "MRRMafiass" (its description also has a typo: "สำหรัคน").
- Rewrite MRRMafia's value proposition ("เชื่อมต่อกัน") and problem ("platform การร่วมกลุ่ม") to be specific. Set pricing as "฿990 / เดือน".
- Verify at least one real metric on MRRMafia so the leaderboard isn't empty.
- Fill in MRRMafia's tech stack, province, 3–4 screenshots and founder message as the showcase example.

---

## 8. Out of scope for now (later)

- Live-visitors world map section on home.
- Full "for sale" marketplace (asking price, multiple). For now "กำลังหา: ผู้ซื้อกิจการ" is just a badge and filter.
- New verification providers (Polar, Lemon Squeezy, Paddle, App Store).

---

## 9. Build phases (one at a time, stop after each)

| Phase                              | Scope                                                                                                                                                                              | Done when                                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **0. Fixes & foundation**          | `metadataBase`/OG domain bug; tokens (2.1); core components (2.2); format utils (2.3); empty-state rule on detail page; `Logo` component + icons (3); duplicate filter-panel check | lint/typecheck/build pass; detail page shows no "–" walls to visitors; shared links show the correct domain           |
| **1. Shared configs + migrations** | 4.1–4.4 config files; section 5 migrations (**show SQL first**); province back-fill report                                                                                         | tests: 77 provinces, no duplicate slugs; migration applied; RLS verified                                              |
| **2. Detail page**                 | 6.4 (chart, screenshots, founder message, insights with logo chips) + 6.9 form fields                                                                                              | an owner can add stack/channels/screenshots; a visitor sees a clean profile; Lighthouse a11y ≥ 95                     |
| **3. Share modal**                 | 6.5 incl. PNG export + SVG badge endpoint                                                                                                                                          | all 3 tabs work; downloaded PNG matches the preview; the badge embeds in a GitHub README                              |
| **4. QuickSearch**                 | 6.8 + `search_all` RPC                                                                                                                                                             | Thai substring search works ("พ่อ" finds "เจ้าพ่อ"); the dropdown opens upward at the page bottom; keyboard nav works |
| **5. Categories**                  | 6.6 + nav/footer links                                                                                                                                                             | 37 categories; counts correct; 0-count cards dimmed                                                                   |
| **6. Province Olympics**           | 6.7 both pages + detail-page link                                                                                                                                                  | rankings match the SQL; region filter + metric in the URL; empty provinces collapsed                                  |
| **7. Home polish**                 | 6.2 teasers, CTA de-dupe, count hiding                                                                                                                                             | home works with 2 startups and with 200                                                                               |

After every phase: a list of changed files, anything I need to do manually (env vars, Supabase settings), and what to test by hand.

---

## 10. Phase 8: Live visitors (free, self-hosted)

Build a live-visitors feature using only Supabase Realtime + Vercel geo:

1. Middleware / route handler reads geolocation() from @vercel/functions
   (country, city, lat, lng) and exposes it to the client. Round lat/lng
   to 1 decimal and add random jitter of ±0.05. Never send the IP.
2. Client: a stable anonymous identity in localStorage: a DiceBear
   avatar (generated locally with @dicebear/core, "notionists" style —
   check the style's license) and a random name from
   unique-names-generator (color + animal).
3. One Supabase Realtime channel "live-visitors":
   - presence.track({ id, name, avatar, country, city, lat, lng, path })
   - update path on route change; broadcast "page_view" events for
     the activity feed
   - connect only while the map section is visible or the tab is
     focused; disconnect on visibilitychange hidden.
4. Home section "ตอนนี้มีคนดูอยู่" (replace the old live-visitors idea):
   - default: SVG Thailand map by province (reuse provinces config),
     avatar pins clustered per province with count badges
   - toggle "🌏 ทั่วโลก": MapLibre GL with OpenFreeMap dark tiles
   - top-left overlay: green live dot + "{n} คนกำลังดู JaoPor",
     rows for Countries / Devices / top pages
   - bottom-left: activity feed, last 4 events, "เมื่อสักครู่"
   - × to hide (remembered in localStorage)
5. Startup detail: small "👀 {n} คนกำลังดูผลงานนี้" pill when n ≥ 2.
6. Graceful fallback: if Realtime fails or we hit the connection limit,
   show only a count polled every 30s from a cached endpoint.
7. Add a line to /privacy about anonymous city-level live location.
   No new paid services.

---

## 11. Phase 9: Builder profiles & dashboard

Visual source of truth: `docs/design/profile.png`, `docs/design/dashboard.png`.

GOAL
JaoPor becomes a networking platform where founders find co-founders.
Profiles are built on PROOF (verified numbers, real commits, shipped
products), not self-claims.

ROUTES

- Public profile: /[locale]/u/[username], with a rewrite so /@username
  works too. Do NOT create a folder named "@username": in the App Router,
  "@" folders are parallel routes.
- Dashboard: /[locale]/dashboard (overview) plus subpages: startups,
  profile, requests, saved, connections, settings. Extend the existing
  dashboard; don't duplicate it.
- Directory: /[locale]/builders (basic version, see 9c).

9a. DATA MODEL (migrations, RLS on every table, show the SQL first)

- profiles (extend the existing user/profile table if there is one):
  username (unique, lowercase, 3–30 chars, block reserved words like
  admin/dashboard/api/new/u), display_name, headline (≤80), bio (≤280),
  avatar_url, province (slug from provinces config), status enum:
  looking_cofounder | open_to_work | networking | busy.
  looking_for jsonb {roles[], offer, commitment, deal, location,
  industries[]}.
  social_links jsonb {x, linkedin, github, facebook, youtube, tiktok,
  website}.
  show_in_directory bool (default true).
  field_visibility jsonb (public | members | hidden, per field).
- private_contacts (user_id, line_id, email): readable ONLY by the owner
  and by users whose contact request that owner accepted. Never select
  it in public queries.
- skills config file /lib/config/skills.ts, grouped: Engineering,
  Product, Design, Growth/Marketing, Sales, Ops/Finance, AI.
  profile_skills (user_id, skill_slug, is_superpower, position). Max 3
  superpowers, max 20 skills.
- positions (user_id, title, company, start_date, end_date nullable,
  description ≤200, position).
- startup_members (startup_id, user_id, role enum
  founder|cofounder|maker|contributor, status
  pending|confirmed|declined, invited_by, created_at). Membership needs
  BOTH sides: the owner invites and the member accepts, or the member
  requests and the owner approves. Migrate existing startup owners in as
  confirmed founders. Only confirmed members show on profiles.
- follows (follower_id, following_id, created_at).
- contact_requests (from_id, to_id, topic enum
  cofounder|job|collab|other, message ≤500, status
  pending|accepted|declined|blocked, created_at). Limit: 5 new requests
  per sender per day, 1 pending request per pair. Must be logged in.
- profile_views (profile_id, day, viewer_hash): unique per day. The hash
  is made from a salted anonymous id; never store IPs.
- Badges are COMPUTED, not stored: รุ่นบุกเบิก #N (first 100 users),
  Verified Builder (≥1 verified startup), MRR milestones (฿1k / ฿10k /
  ฿100k), streak (days in a row with activity).

9b. PUBLIC PROFILE (match docs/design/profile.png)
Layout: sticky left sidebar (296px) plus main column; stacked on mobile.

- Sidebar: large avatar with a status dot, name, @username, status pill,
  bio, buttons "ติดต่อ" (opens the contact request modal) and "ติดตาม",
  follower counts, info list (province link + Olympics rank, current
  role, website, socials). "ขอ LINE / อีเมล" is shown locked until a
  request is accepted. Then badges, skills (3 superpowers highlighted in
  accent), "สร้างด้วย" tools (from the stack config), and "รายงานผู้ใช้นี้".
- Main:
  1. "กำลังมองหา" card in accent color, only when status is
     looking_cofounder or open_to_work. Shows ต้องการ chips, สิ่งที่ฉันมีให้,
     ข้อตกลง, and a "ส่งคำขอคุย" button.
  2. Proof strip: number of works, verified revenue/month (sum of
     confirmed startups, converted to THB), GitHub stars, months building.
     Verified numbers only; hide any stat that is 0 or unverified.
  3. "ผลงานที่ปักหมุด": 2-column cards (up to 6, the owner picks the
     order) with logo, name, role chip, description, main metric + growth,
     and verified source.
  4. Activity heatmap, GitHub-style, in accent shades: 53 weeks × 7 days
     with Thai month labels and จ./พ./ศ. Counts GitHub commits (from the
     existing GitHub sync), days with verified revenue, and startup
     updates. Has a year switcher and a "น้อย … มาก" legend. Built from a
     daily aggregated view, not calculated on each request.
  5. Two columns: ประสบการณ์ timeline | กิจกรรมล่าสุด (auto events:
     milestones, launches, badges, commit bursts).
- Visitors never see empty sections; the owner sees dashed "+ เพิ่ม…"
  prompts instead (same empty-state rule as SPEC 2.4).
- OG image: avatar, name, headline, status, and verified revenue.
- Link founders' avatars and names on startup detail pages to their
  profiles.

9c. DIRECTORY /builders (basic)
Left filters (skill, province/region, status, สร้างด้วย, verified only)
and a 3-column grid of compact cards (avatar, name, headline, status
pill, top 3 skills, "N ผลงาน · ฿X/เดือน"). Only profiles with
show_in_directory = true. Add a "คน" group to QuickSearch.

9d. OWNER DASHBOARD (match docs/design/dashboard.png)

- Sidebar: logo, ภาพรวม, ผลงานของฉัน (count), โปรไฟล์ของฉัน, คำขอคุย
  (unread badge), ที่บันทึกไว้, การเชื่อมต่อ, ตั้งค่า. Section
  "คอมมูนิตี้": คนสร้าง, หา Co-founder (disabled with "เร็ว ๆ นี้").
  Bottom: user card + theme / language / log out icon buttons.
- Header: "สวัสดี, {name}", a weekly views line, "ดูโปรไฟล์สาธารณะ ↗",
  and "+ เพิ่มผลงาน".
- Setup checklist: progress bar plus 6 items computed from data
  (account, first startup, province, connect a verification provider,
  skills + status, 3 screenshots). The next undone item is highlighted
  in accent. Hide the whole card once all 6 are done.
- "ผลงานของฉัน" table: columns ผลงาน | ผู้เข้าชม (7d) | อันดับ | MRR |
  actions (edit / share / view, icon buttons with aria-labels).
  Unverified rows show an inline amber banner: "เชื่อมต่อเพื่อขึ้นกระดาน
  ผู้นำและโอลิมปิกจังหวัด" + "เชื่อมต่อ Stripe" + "ตัวเลือกอื่น".
  Below the table, two dashed tiles, clearly different:
  "เพิ่มผลงานใหม่" (never listed before) and "อ้างสิทธิ์ผลงาน"
  (already listed by someone else; verify with a read-only API key).
- Right column: "คำขอคุย" preview (the 2 latest pending, with
  accept / skip, and a note "LINE / อีเมลจะแสดงหลังกดยอมรับเท่านั้น"),
  and "โปรไฟล์ 7 วันที่ผ่านมา": views, and requests. Don't add the
  "ค้นหาเจอ" (search appearances) stat unless we log search impressions;
  leave it out for now.
- Profile editor (dashboard/profile): every field above, with a live
  preview link. Username change has an availability check. Drag to
  reorder skills, positions and pinned works.
- Requests page (dashboard/requests): inbox list; accepting reveals
  private contacts to both sides and sends an email notification.
  Also block and report.

9e. ONBOARDING
After the first login: choose a username (live availability check) →
headline + province → status → skills (optional, skippable). Then land on
the dashboard with the checklist.

PRIVACY (PDPA)
Contact details are only revealed after an accepted request. Every field
has visibility settings. Directory opt-out. Report + block. Explain it
on /privacy. Deleting an account removes the profile, skills, positions,
follows, requests and memberships.

BUILD ORDER (stop after each)
9a migrations → 9d dashboard + profile editor + onboarding → 9b public
profile → 9c directory.
Done = lint/typecheck/build pass, RLS tested (another user can't read
private_contacts or edit someone's profile), and pages work at 375px.

---

## 12. Phase 10: Product updates feed

Figma: profile v2 "Founder Prfile 2nd" (node 160-2) and "Feed Ux/ui" (node 160-555) in
https://www.figma.com/design/l5Pwv6xqIoPVDpoieNuf5G/JaoPor. Export them to `docs/design/profile-v2.png`
and `docs/design/feed.png` when possible.

GOAL
Builders post short "build in public" updates tied to a startup.
Updates appear on the profile, the startup page and a global /feed,
mixed with automatic milestone posts from verified data.

DATA (migrations, RLS on every table, show SQL first)

- posts: id, author_id, startup_id (author must be a CONFIRMED member
  of that startup), type enum feature|launch|lesson|feedback|milestone,
  body (≤500 chars), link_url, link_preview jsonb {title, description,
  image, domain}, is_auto bool, milestone_key text UNIQUE (for auto
  posts), province + category (copied from the startup for fast
  filtering), created_at, edited_at, hidden_at.
- post_images: post_id, url, width, height, position (max 4 per post).
  Storage bucket "post-images" at {post_id}/{uuid}.webp. Reuse the
  screenshot uploader (compress to WebP, strip EXIF).
- post_likes: (post_id, user_id) primary key.
- post_comments: id, post_id, author_id, parent_id (nullable, max 1
  level of replies), body ≤500, created_at, deleted_at.
- reports: target_type (post|comment|user), target_id, reporter_id,
  reason, status.
- Counters likes_count / comments_count kept on posts with triggers.

AUTO MILESTONES
A scheduled job (Supabase cron or Vercel cron) checks verified
metrics and creates is_auto posts, idempotent via milestone_key
(e.g. "mrr_10k:{startup_id}"):
first verification, MRR ฿1k / ฿10k / ฿100k, total revenue ฿100k / ฿1M,
GitHub ★100 / ★1k, Olympics podium entry. Never create milestones from
unverified data.

RULES

- Logged-in users only; max 5 posts per day and 30 comments per day.
- Author can edit for 15 minutes, delete anytime. Admin can hide.
- Link previews: fetch Open Graph server-side with a 3s timeout and
  max size, block private/internal IPs (SSRF), cache results.
- Notify the post author in-app (bell badge) on likes and comments.

PAGES & COMPONENTS (match the designs)

- <PostCard>: avatar, name, "บน {startup}", time, province, type chip
  (colors: feature=indigo, launch=green, milestone=gold card,
  lesson=gray, feedback=teal), body, link, image grid, like / comment
  buttons, "แชร์ไป LINE"
  (https://social-plugins.line.me/lineit/share?url=...) and X intent.
  Feedback posts show a teal "ให้ Feedback" button and the top comment.
- /[locale]/feed: left filters (ล่าสุด | กำลังติดตาม | ยอดนิยมสัปดาห์นี้,
  type chips, province, category, all kept in the URL), center composer
  - posts with cursor pagination ("โหลดเพิ่ม"), right rail (who to
    follow, most active startups this week, feedback posts with 0
    replies). "ยอดนิยม" score = likes + 2×comments, decayed by age.
- /[locale]/post/[id]: single post + full comment thread + OG image.
- Profile: "อัปเดตผลงาน" section, latest 4 in 2 columns + "ดูฟีดทั้งหมด".
  Startup detail page: "อัปเดตล่าสุด" section with the latest 3 posts.
- Composer: textarea with live counter, startup picker (only my
  confirmed startups), type picker, image/link attach.

PROFILE REVENUE / ACTIVITY CARD

- One card with tabs "รายได้รวม | กิจกรรมการสร้าง".
- Revenue tab: daily verified revenue summed across the user's
  confirmed startups, converted to THB; periods 7 / 30 days / 12
  months; dashed "previous period" line; today's point drawn dashed
  and labeled "วันนี้ (ยังไม่ครบวัน)". Hide this tab if there's no
  verified revenue.
- Activity heatmap now also counts posts.
- Add the proof line under the name:
  "{n} ผลงาน · {v} ยืนยันแล้ว · สร้างมา {m} เดือน".

DONE WHEN
lint/typecheck/build pass; RLS tested (you can't post for a startup
you're not a confirmed member of; you can't edit others' posts);
milestone job is idempotent (running it twice creates no duplicates);
works at 375px.

---

## 13. Phase 11: In-app chat (owner decision 2026-10-01: after Phase 10)

GOAL
When a contact request is accepted, the two people can keep talking on JaoPor instead of moving
straight to LINE.

SCOPE (v1)
- 1:1 text chat, opened automatically by an accepted contact request (existing accepted pairs
  get a conversation too). No group chats, no images or files, no edits.
- Live: new messages appear without reloading (Supabase Realtime, RLS applies); unread counts.
- Limits: 2000 characters per message, 200 messages a day per person.
- Block ends the chat for both (history stays readable, no new messages) and also blocks the
  contact request, so LINE / email stop being shared. No unblock in v1.
- Report a single message (reason + note) → reports, target_type message.
- No bell notification per message (it would flood the bell); an unread badge on "ข้อความ" in the
  header and the dashboard sidebar instead. Email notifications come later (Resend).
- Deleting an account deletes the messages that person sent; the other person keeps the
  conversation with their own messages.
- /privacy: messages are stored on JaoPor (Supabase), are not end-to-end encrypted, and the team
  reads a message only when it is reported. Wording approved by the owner before release.

PAGES
- /dashboard/messages: conversation list (other person, last message, time, unread dot) and the
  open conversation (messages grouped by day, composer with counter, ⋯ block / report).
  On phones the list and the conversation are separate screens.
- "ส่งข้อความ" on a profile when a conversation exists, and on accepted rows in the requests inbox.

DONE WHEN
lint/typecheck/build pass; RLS tested (a third person can't read or write a conversation, nobody
can write to a blocked one, the 201st message in a day is refused, deleting an account removes
that person's messages only); works at 375px.

# TrustMRR UX/UI study

> Observed live on trustmrr.com, 2026-09-29, using the built-in browser (screens, DOM, page text). This is a reference for **patterns and features** only. We don't copy their copy, assets, brand or data (CLAUDE.md rule 6). Visual tokens are in [Design.md](../../Design.md).

## 0. The three patterns behind every feature

1. **Status is visible everywhere.** Verified MRR appears next to names in chat, leaderboards, medals, streak counters and tier-locked rooms. People come back to see and show their rank.
2. **Every feature creates a shareable, indexable URL**: profiles, comparisons, country pages, categories, a Markdown version of each profile. Traffic compounds.
3. **Every surface carries sponsor inventory**: side columns on almost every page, and billboards and a blimp inside the chat game. Content pays for itself.

## 1. Founder Town (`/chat`): chat rooms unlocked by MRR ⭐

The tab title says it: "a game where your MRR unlocks chat rooms with founders at your level." The meta description: walk a pixel town and chat with founders; verify revenue to unlock private rooms at your MRR.

**What you see:**

- A top-down pixel-art town (think Pokémon or Gather.town), rendered in a game canvas. After a loading bar titled "Founder Town", each player walks around as a pixel avatar. The share image shows founders _and their pets_, so avatars are customizable.
- **Houses are chat rooms, locked by verified MRR tier.** Each house has a sign with a 🔒 and a tier label:
  - `$1–$1K/mo` (teal house)
  - `$1K–$10K/mo` (red-roof house)
  - `$10K–$100K/mo` (blue office with solar panels)
  - A larger building at the top of the map is probably the top tier (not confirmed)
- **The town square is open to everyone.** A chat panel sits bottom-left, headed "Town square ▾" (a room switcher) with an online count ("7 here").
  - Every message shows avatar, name and a **verified MRR badge**, e.g. "Marc Lou 💙 $200K/mo" or "~$1K/mo", so status comes along with every line.
  - Messages get ❤️ reactions. Input line: "Say: Press Enter to chat".
- Controls legend, top-left: `Arrows` move · `Space` interact · `Enter` chat · `X` run · `Esc` menu / sign in. There's also a town minimap (bottom-right) and a "Sign in" button (top-right).
- **Guests** can load the town, walk around and read the town square. Chatting and entering houses needs sign-in plus verified revenue.
- **Ads inside the world:**
  - Billboards rotate between sponsors (three different brands seen within a minute)
  - A blimp flies across towing a sponsor banner
- The page is `noindex`: it exists for retention, not SEO.
- UX failure seen: at an ~800×600 viewport the canvas crashed ("Something went wrong — Invalid typed array length"). It only loaded at 1440×900. There's a `?mode=` URL parameter, but `mode=list` redirected back to `mode=game`, so no mobile-friendly fallback was visible.

**Why it works:** belonging ("people at my level"), aspiration (the next house is visible but locked), and proof in every message (the badge). It turns verification from paperwork into an unlock.

## 2. Homepage (`/`)

- Sponsor columns both sides. Centered logo, H1, a line with visitor count, a search box with an example query in quotes, a "+ Add startup" button, and a row of links: Buy/sell · Stats · Dashboard.
- **Recently listed** and **Best deals this week**: horizontal rows of cards (logo, name, category, FOR SALE corner tag, Revenue / Price / Multiple).
- **Leaderboard**, top 50:
  - 🥇🥈🥉 for the top three, then numbers
  - logo, name, founder avatar and handle (links to `/founder/<handle>`), MRR, month-over-month %
  - anonymous entries display as "Stealth Company", "Hidden Business" etc. **Founders can hide their name but keep the numbers.**
- **Feed** widget (latest community posts).
- Footer: a large link grid (categories, tools, API/MCP, the founder's other products).

## 3. Marketplace (`/acquire`)

- Hero: "Acquire …" H1, a visitor-count line, and a row of provider logos showing where revenue is verified (Stripe, LemonSqueezy, Polar, Paddle, RevenueCat, Superwall, Creem, Dodo, Whop…). Then search and "+ Sell startup".
- **Sticky filter sidebar on the left**:
  - Categories (multi-select)
  - Revenue (30d) min/max, MRR min/max, Growth (30d) min/max, Asking price min/max
  - Max multiple (select), Profit margin
  - Audience (Any/B2B/B2C), Mobile app (Any/yes/no)
  - Listed (time range), Founded from/to, Country
  - "Clear all"
- Result count ("2255 startups found") and a **sort menu with 13 options**:
  - Best deals (default)
  - Listed: newest / oldest
  - Multiple: low→high / high→low
  - Asking price: low→high / high→low
  - Revenue: low→high / high→low
  - Growth: low→high / high→low
  - Founded: oldest / newest
- **Listing card (large):**
  - top-right badge with 👁 views ("6.0k") and saves ("65"), social proof on every card
  - logo, name, category pill, 3-line description
  - REVENUE (30D) with a colored growth % (▼ red or ▲ green)
  - ASKING PRICE, showing **the old price struck through when it has dropped** ("$200k → $89k")
  - MULTIPLE
  - a "Copy link" action on every card
- A "Create free account" call-to-action placed among the results.

## 4. Startup profile (`/startup/<slug>`)

Covered in detail in Design.md §5/§6. Highlights:

- For-sale banner (price, multiple, "N people saw this", Earn, Save, Contact Seller)
- Stat tiles with rank; 30-day revenue chart with previous-period comparison and Trend/Classic toggle
- A "Revenue is verified with Stripe API key · Last updated …" line
- Startup-insights grid, scrollable full-page screenshot, founder quote
- **Affiliate hook:** "Know a buyer for X? You could earn $4,500" (1.5% of the asking price)
- A "More startups for sale" grid and a link to the AI-readable Markdown version

## 5. Feed (`/feed`)

- Two columns. The left column is a stream of cards, many **auto-generated from events**: "Vik added ScrapeAtlas · 1h", with a description and metric chips (`$340/mo` · `$17 MRR` · `$3k total`), then ♡ like · 💬 comment · share.
- The right column has:
  - a "List your startup" call-to-action
  - **Top startups by growth %** (+8,622%…)
  - **Posting streaks** (🔥 114, 6, 1…)
  - **Deals of the week**
- Zero-effort content: adding a startup _is_ a post, so the feed is never empty.

## 6. Other engagement features

| Route                                                     | What it is                                                                                                                                                    | Pattern                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `/game`                                                   | "$1 vs $1,000,000 Startup": a guess-which-earns-more game, "rookie investors playing right now", Start Game                                                   | Viral mini-game on real data                     |
| `/championship`                                           | "Startup Olympics by country": countries ranked by startup count and total revenue, top startups per country                                                  | National pride → sharing (Thailand appears here) |
| `/compete`                                                | Pick 2–6 startups and compare revenue; recent matchups listed ("X vs Y", "DataFast, POST BRIDGE +4")                                                          | Every matchup is a new SEO page                  |
| `/compare`                                                | Marketplace comparison pages: vs Acquire.com, Flippa, Empire Flippers, Microns                                                                                | Search terms from people comparing alternatives  |
| `/cofounders`                                             | Grid of startups looking for a co-founder (logo, metrics, founder). Switched on from the dashboard. **Outreach is AI-moderated, then relayed by email**, free | Safe contact without exposing emails             |
| `/loc`, `/domain-rating`                                  | Revenue per line of code; revenue vs Domain Rating                                                                                                            | Odd rankings = shareable content                 |
| `/tech`, `/channels`, `/category/*`, `/recent`, `/search` | Directory facets                                                                                                                                              | Long-tail SEO                                    |
| `/llms.txt`, `/mcp`, `/docs/api`                          | AI-readable access                                                                                                                                            | Visibility to AI assistants                      |
| Telegram bot                                              | New-listing alerts                                                                                                                                            | Push channel                                     |

## 7. What this means for MRRMafia (proposals, not decisions)

1. **Founder Town → a Thai-flavoured town.** Same mechanic, local setting: a soi with a 7-Eleven-style shop, tuk-tuk ads, a night market. Sponsor billboards inside the town are a natural first ad slot for Thai sponsors.
2. **Tiers must work for pre-revenue founders**, who are our first users. For example:
   - a **Builders' house** unlocked by GitHub build proof
   - a **Traction house** for verified visitors/users
   - then the MRR houses

   This links to the traction-metrics discussion (Project.md §7).

3. **Mobile first.** Thai Facebook traffic is mostly phones, and TrustMRR's canvas crashed on a small screen. Build **list mode first** (rooms as a chat list, with the same tier locks and MRR badges) and the pixel town as the desktop upgrade.
4. **Cheap wins for Phase 1–2**, all fitting Design.md:
   - view/save counters on cards
   - struck-through old price on price drops
   - "Copy link" on every card
   - auto-posts to the feed when a startup is added or verified
   - anonymous "Stealth" mode
5. **Proposed build approach for chat:**
   - Supabase Realtime: Presence for who's online, Broadcast for avatar positions, a Postgres table for message history
   - Room access enforced by database security rules (row-level security) against a server-computed `verified_tier`, never trusting the client
   - Rate limits, report button, AI moderation of messages
   - Pixel town: Phaser 3 plus a Tiled tilemap, with keyboard controls and an on-screen joystick on phones

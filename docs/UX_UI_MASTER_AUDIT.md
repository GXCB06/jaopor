# JaoPor master UX/UI audit (Phase 1: audit only)

Date: 2026-10-10 · Brief: the owner's Google Doc "JaoPor — Master UX/UI Audit & Redesign Plan" (17 issues + onboarding + multi-select filters) · **Nothing was changed** in code, data, auth or deployment.

**How it was checked:**

- **Code:**
  - project page, founder profile, cards, leaderboard, chart, wizard, VerifyPanel, link parser, chat, profile editor;
  - directory / builders / feed filters, onboarding;
  - Design.md typography.
- **Production** (`https://jaopor.vercel.app/th`) at desktop and 375 px, measuring sizes and positions with the browser.
- **Database** schema / grants for what filters and preferences could use.
- **Not opened:** private signed-in pages that show your messages (chat) or settings. They were reviewed from code.

**What this builds on:** the earlier `docs/UX_UI_PRODUCT_AUDIT.md` (2026-10-08, phases 1–6 shipped). Items fixed there aren't repeated here.

**Legend:**

- **Confirmed** = seen in code and/or measured on production.
- **Assumption** = plausible, needs a user test or data (the Add-project funnel analytics would supply some of it).
- **Priority:**
  - **P0:** trust or launch blocker;
  - **P1:** core experience;
  - **P2:** discovery / polish;
  - **P3:** later.

**Images in the brief** (JaoPor vs TrustMRR card screenshots under issue 2) didn't come through the document reader, so issue 2 is judged from production.

---

## Summary table

| #   | Issue                           | Type                | Priority        | Confirmed?                                                                   | Needs migration?                                                                       |
| --- | ------------------------------- | ------------------- | --------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Text readability                | Visual              | **P0**          | Confirmed (10–11 px Thai on cards and labels)                                | No                                                                                     |
| 2   | Product card length and colour  | Visual + IA         | P1              | Confirmed (215 px card; first card 635 px down on phones)                    | No                                                                                     |
| 3   | Stripe setup order              | Interaction         | P1              | Partly: current order is right; the gap is the explanation before the choice | No                                                                                     |
| 4   | Verification choices per metric | Interaction + IA    | **P0**          | Confirmed (the chooser is by tool, not by metric)                            | No                                                                                     |
| 5   | Link-type detection             | Data + interaction  | **P0**          | Confirmed (anything unknown silently becomes "website")                      | No (optional later)                                                                    |
| 6   | Project page lower sections     | IA                  | P1              | Confirmed (story split from insights; 9 lower blocks)                        | No                                                                                     |
| 7   | Multi-metric chart              | Interaction + data  | P1              | Partly: 3 metrics exist but are hidden in a dropdown; commits missing        | No                                                                                     |
| 8   | Add Startup redesign            | Interaction         | P1              | Partly: already 2 steps; remaining gaps listed                               | No                                                                                     |
| 9   | Founder profile order           | IA + responsive     | **P0** (mobile) | Confirmed (main content starts 1.8 screens down on phones)                   | No                                                                                     |
| 10  | Founder badge sharing           | Feature             | P2              | Confirmed (badge exists only for projects)                                   | No                                                                                     |
| 11  | Share action on profiles        | Feature             | P2              | Confirmed (no copy / share on founder profiles)                              | Instagram only: one small migration (the DB validation trigger whitelists social keys) |
| 12  | Mobile leaderboard              | Visual + responsive | P2              | Partly: no overflow; cramped header; growth hidden                           | No                                                                                     |
| 13  | Leaderboard logic and design    | IA + data           | P1              | Confirmed (mixed time windows, tie order, no page)                           | No (rank history = later migration)                                                    |
| 14  | Co-founder in "Looking for"     | Interaction         | **P0**          | Confirmed (chip looks clickable; the only button opens the product site)     | No                                                                                     |
| 15  | Chat                            | Interaction         | P2              | Code review only; works, with gaps                                           | No                                                                                     |
| 16  | Profile settings                | IA                  | P2              | Code review: sensible; public / private split unclear                        | No                                                                                     |
| 17  | UX writing and positioning      | Content             | **Decision**    | Confirmed (18 Thai strings centre on "AI")                                   | No                                                                                     |
| F   | Multi-select filters            | UI + URL + query    | P1              | Confirmed (single-select at every layer)                                     | **No** (columns support it)                                                            |
| O   | First-visit onboarding          | Feature             | P2              | Confirmed (none for visitors today)                                          | Only if preferences must persist on accounts                                           |

---

## A. Readability and visual hierarchy

### 1. Text and screen readability (P0)

**Current implementation:**

- `html { font-size: 112.5% }` (1 rem = 18 px) with custom steps in `src/app/globals.css`:
  - `text-3xs` 0.5625 rem = **10.1 px**;
  - `text-2xs` 0.625 rem = **11.3 px**;
  - `text-caption` 0.6875 rem = **12.4 px**;
  - `text-body` 14.6 px;
  - `text-xs` 13.5 px.
- **Usage:** `text-2xs` 162 times, `text-3xs` 25, `text-caption` 221 (Design.md §3 Typography).

**Measured on production** (`/th/startups` card):

- category chip 10.1 px;
- verified tag 10.1 px;
- metric labels and **metric values 11.3 px** (`rgb(138,138,143)` labels);
- tagline 12.4 px.

**The underlying problem:**

- The scale was copied from TrustMRR's Latin monospace layout. **Thai glyphs at 10–11 px lose their vowel and tone marks**, and uppercase monospace labels are wide, so they get truncated.
- The most important thing on a card, **the number**, is set at the same 11 px as its label, so hierarchy comes only from weight.
- Metadata and essential content share sizes, so everything looks equally small.

**Type:** visual (design system).

**Solution:**

- **Floor:** no essential text under 12 px. Use `text-3xs` only for decorative counters (e.g. badge counts), never Thai words.
- **Number-first hierarchy on cards:**
  - value `text-sm font-bold` (15.8 px);
  - label `text-2xs` (11.3 px, faint);
  - Thai labels sentence case (no uppercase tracking on Thai).
- **Redefine roles in Design.md §3** rather than editing 400 call sites one by one:
  - **Meta** = caption 12.4;
  - **Label** = 2xs 11.3, Latin-only uppercase;
  - **Value** = sm;
  - **Body** = body 14.6;
  - **Prose** = body + `font-prose`.

  Then sweep components by role.

- **Contrast:** faint text (`rgb(138,138,143)` on `#0b0b0c`) is about 5.5:1, OK for AA. Keep it, but don't drop below it.

**Acceptance:**

- At 375 px, every Thai label, value, button and helper text is ≥ 12 px.
- Metric values are visibly larger than their labels.
- No horizontal overflow (existing e2e).
- No value is cut off (existing e2e).

**Dependencies, risks, tests:**

- Touches most components, so it's best done together with issue 2 (cards) and 12 (leaderboard).
- **Risk:** card rows wrapping at 375 px.
- **Tests:**
  - extend `e2e/numbers.spec.ts` with a "no text under 12 px inside `main`" check (computed style), excluding `aria-hidden` decoration;
  - visual check of home, directory, project page, profile.

### 2. Product card length and colour (P1)

**Current implementation:** `src/components/StartupCard.tsx`.

- **Large card** (directory, "More startups"):
  - 36 px logo, name, category chip, copy-link button, corner tag (green "✓ ยืนยันแล้ว" / shield / amber "กำลังหา…");
  - 2-line tagline with `min-h-[2.5em]`;
  - divider and three metrics.
- **Measured:** **215 px tall** on desktop and phone.
- **On phones the directory hero** (title, subline, provider logos, search, filter toggle, sort chips) **pushes the first card to y = 635 of an 812 px screen**: one card visible on the first screen.

**The underlying problem:**

- **Height:** fixed tagline height plus the chip on its own row plus a divider, for every card.
- **Colour competition:**
  - green verified tag, amber "looking for" tag, coloured logos and a dashed border for unproven cards all fight the name and the number;
  - the strongest colour (green) sits on the tag, not on the evidence.
- **The directory hero repeats the home hero**, so on phones discovery starts below the fold.

**Type:** visual + information architecture.

**Solution:**

- **Card v2 (one row of identity, one row of proof):**
  - **Row 1:** logo 32, name (semibold, 15 px), one status mark (✓ verified in green **text** next to the number source, not a filled pill).
  - **Row 2:** tagline, 1 line on phones, 2 on desktop, **no min-height**.
  - **Row 3:** up to 3 metrics, values `text-sm`; category moves into the metric row's leading slot or the hover title.
  - "Looking for" becomes a small neutral icon + text in row 3 when there's no proof, never a coloured corner tag.
  - **Target height:** about 140 px desktop, 120 px phone.
- **Directory on phones:**
  - a compact header (title + search in one block, provider logos hidden below `sm`);
  - sort chips scroll horizontally in one line;
  - **first card above y ≈ 300**.
- **Keep:** dashed style for zero-proof cards (the honest signal), but one tone only.

**Acceptance:**

- At 375 px, at least 3 cards are visible after one swipe.
- Each card shows name, purpose, the strongest proof number and its source, without competing colours (one accent per card at most).

**Dependencies, risks, tests:**

- Shares tokens with issue 1.
- **Risk:** the card is used on home rows, directory, category, province, "More startups" and the Add-project preview.
- **Tests:**
  - e2e "numbers not cut off" (existing) at all card sizes;
  - add a "first result above the fold at 375 px" check on `/th/startups`.

---

## B. Verification and onboarding

### 3. Stripe setup order (P1)

**Current implementation:** `src/components/wizard/StartupWizard.tsx` + `VerifyPanel.tsx`.

- **Step 1** creates the public project (link → auto-fill → name, category, one-liner, province, logo).
- **Step 2** is the chooser "คุณมีอะไรบ้าง? เลือกหนึ่งอย่างก่อน", with Stripe as one of five tiles ("รับเงินผ่าน Stripe · ยืนยันรายได้และ MRR · คีย์อ่านอย่างเดียว"). It can be skipped.
- **The Stripe form explains:**
  - how to create the key (3 steps + a deep link);
  - the exact permissions (Charges / Subscriptions → Read, all else None, with a picture);
  - what is stored and never stored ("trust" box);
  - revocation;
  - a link to /security.
- **The server refuses** non-restricted keys and keys that can write.

**Analysis of the two approaches:**

| Approach                                         | For                                                                                                                                              | Against                                                                                                                                                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connect Stripe early (before the profile exists) | Revenue projects get proof immediately                                                                                                           | • Most JaoPor projects have no Stripe (LINE OA, apps, open source, pre-revenue).<br>• Asking for an API key before the founder has anything to show is the highest-friction moment.<br>• The 2026-10-05 first-user test found people abandoning when verification felt mandatory |
| **Profile first, verify next (current)**         | • Nothing blocks the listing.<br>• The verify step is shown right after, while motivation is high.<br>• Every source is offered, not only Stripe | The value of verifying ("✓ on your card, ranked on the leaderboard, a shareable badge") isn't shown **before** the choice                                                                                                                                                        |

**Recommendation:** keep "profile first, verify next". Add:

- **In step 1** (one line under the button): "ต่อไป: ยืนยันตัวเลข (ไม่บังคับ) — ด้วย Stripe, GitHub หรือโค้ดนับผู้เข้าชม".
- **At the top of step 2:** a small "what you get" strip (✓ on your card · ranked on the leaderboard · badge for your site).
- **For Stripe, before the key:** "อ่านอย่างเดียว · เห็นแค่ยอดรวม · ยกเลิกได้ทุกเมื่อ". The full trust box stays below.

**Confirmed vs assumption:**

- **Confirmed:** the order, the copy.
- **Assumption:** that the "what you get" strip lifts the connect rate. Measure it with the funnel analytics (migration still waiting for your approval).

**Acceptance:**

- A founder without Stripe can publish and verify with another source.
- A founder with Stripe can see the permissions, what's read, and the benefit before pasting a key.

**Tests:** existing wizard flows; copy in th / en; e2e for the signed-out skeleton (existing).

### 4. Verification choices per metric (P0)

**Current implementation:** the chooser asks "what do you have?" with five tiles:

- website → JaoPor snippet;
- Stripe;
- RevenueCat;
- GitHub;
- "มี analytics อยู่แล้ว" (Plausible / Umami / Cloudflare).

The edit page shows connected sources with "last synced".

**Supported today** (`src/lib/sources/catalog.ts`):

- **Revenue:** Stripe, RevenueCat.
- **Visitors:** JaoPor snippet, Plausible, Umami, Cloudflare.
- **Build proof:** GitHub.
- **Google Analytics is not supported** (no connector). It must not be shown as available.

**The underlying problem:**

- Founders think in **what they want to prove** ("my revenue", "my users"), and the chooser asks **which tool they own**. A founder who wants to show visitors must know that "มีเว็บไซต์" means "visitor counter".
- **Verified vs counted wording:** visitors are "นับโดย" (counted), revenue is "ยืนยัน". It's correct but not explained at choice time.

**Type:** interaction + information architecture.

**Solution:** a **metric-first chooser**, three rows, each a card:

| Metric                 | What it measures                                       | Sources (only supported ones)                                 | Evidence you get                                   | Limits                                                     |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| รายได้ / MRR           | Money received, recurring revenue                      | Stripe (web) · RevenueCat (mobile apps)                       | ✓ ยืนยันรายได้ · ranked on revenue boards          | Read-only key; Omise / 2C2P not yet                        |
| ผู้เข้าชม              | Unique visitors per day, 30-day total                  | JaoPor code (1 line, no key) · Plausible · Umami · Cloudflare | "นับโดย …" + Owner verified when our code is found | Counted, not audited; Google Analytics not supported (yet) |
| การสร้าง (build proof) | Commits on a public repo, share co-written with Claude | GitHub                                                        | Commits, activity heatmap                          | Public repos owned by your GitHub account                  |

- Each row shows its **status** (not connected / connected · "อัปเดตล่าสุด {date}" / needs attention) and the **"ไม่ต้องใช้คีย์" / "คีย์อ่านอย่างเดียว"** pill (existing).
- The same component is used in the wizard step 2 and the edit page.

**Acceptance:**

- Before connecting, a founder can see for each metric what's measured, which sources exist, what they'll get, and the limits.
- Self-reported fields stay in the "ข้อมูลที่เจ้าของบอก" area, never with ✓.

**Dependencies, risks, tests:**

- Reuses the existing per-source forms.
- Pairs with issue 7 (the chart shows the same three metrics) and 13 (the leaderboard ranks by them).
- **Risk:** breaking the deep-link anchors (`#verify-revenue`, `#verify-traffic`, `#verify-build`): keep them.
- **Tests:** unit for the metric → source mapping (no unsupported source appears); e2e for the anchors.

### 5. Link-type detection (P0)

**Current implementation:** `src/lib/links.ts` `detectLinkKind`:

- Known hosts → `app_store`, `play_store`, `line`, `github`.
- **"Anything unrecognised is a website."**
- **Wizard:** shows "ตรวจพบ: {kind}" under the link field (`StartupWizard.tsx:373`) with no way to change it.
- **Edit form:** one box per kind and rejects a mismatch (`StartupEditForm.tsx:452`).
- **The invalid-link message** only mentions the Play and GitHub rules.

**Confirmed failure cases** (from the code):

- `facebook.com/mypage`, `instagram.com/x`, `tiktok.com/@x`, `youtube.com/@x`, `linktr.ee/x`, `bit.ly/x`, `notion.site/...`, `docs.google.com/...` → silently "website":
  - auto-fill reads that page's metadata (e.g. Facebook's login wall);
  - the visitor-counter tile ("มีเว็บไซต์") is then offered, though the founder can never install our code on Facebook's site, so Owner verified and counting can never work.
  - (The duplicate-website rule compares paths, so two different Facebook pages don't collide; a bare `facebook.com` would.)
- `testflight.apple.com/join/...` → "website" (it's a beta link, not the App Store).
- `liff.line.me/...` → "website" (it's LINE).
- `@myshop` is always turned into a LINE add-friend link, but people also type Instagram handles that way.

**The underlying problem:**

- The parser **guesses silently** and the UI presents the guess as a fact.
- "Website" carries consequences (auto-fill, the snippet, duplicate checks, owner verification), so a wrong guess breaks later steps in ways the founder can't connect to the link.

**Type:** data + interaction.

**Solution:**

1. **Recognise and refuse** social / short / document hosts as the project's main link. Show "ลิงก์นี้เป็นเพจโซเชียล ใส่เว็บไซต์ แอป LINE OA หรือ GitHub ของผลงาน — ลิงก์โซเชียลใส่ในโปรไฟล์ของคุณได้". A small host list in `links.ts` covers Facebook, Instagram, TikTok, YouTube, X, Linktree, bit.ly and similar.
2. **Recognise `liff.line.me` as LINE.** For TestFlight, show "ลิงก์ทดสอบ" → ask for the App Store link, or accept as website with a warning.
3. **Show the detected type as a control,** not a label: "ตรวจพบ: เว็บไซต์ · เปลี่ยน" opens the supported kinds; picking a kind re-validates against that kind's rule.
4. **One error message per kind** ("Google Play ต้องเป็นลิงก์หน้าแอป (…/details?id=)", "GitHub ต้องเป็น github.com/ชื่อ หรือ github.com/ชื่อ/repo").

**Acceptance:**

- No unsupported URL silently becomes "website".
- The founder sees and can change the type before saving.
- Unit tests cover each listed host.

**Tests:** extend `src/lib/links.test.ts` (or create it) with the cases above; wizard e2e can't sign in, so unit tests carry this.

**Optional later:** a `social` link kind on projects (needs a migration and a design decision). **Not recommended now:** social links belong on founder profiles (issue 11).

---

## C. Product insight and public product profiles

### 6. Project page lower sections (P1)

**Current order** (`src/app/[locale]/startup/[slug]/page.tsx`):

1. header (logo, name, description, share, visit);
2. stat tiles (numbers first) + evidence ladder;
3. links;
4. "Looking for" box;
5. _(non-revenue projects)_ `TractionTiles` (visitors / commits tiles **+ build story** inside);
6. chart card (revenue / MRR / visitors);
7. screenshots + demo video;
8. founder message;
9. _(revenue projects)_ `TractionTiles` (+ build story);
10. `InsightsGrid` (problem, value, audience, pricing, team, funding, channels, stack);
11. latest updates;
12. more projects;
13. quick search.

**The underlying problem:**

- **The build story** (how it was built) lives in the traction block, and **the "why"** (problem, value, audience) lives in Insights at the bottom, so the narrative is split in two places, far apart.
- **Revenue and non-revenue projects** show traction in different positions.
- There are 13 blocks with similar card styling, so nothing signals "here's the evidence" vs "here's the story".

**Validated sequence** (adjusted from the brief). Keep 1–4 (they work: numbers first was a deliberate fix). Then:

1. **"Proof" container:** chart (all verified metrics, issue 7) + traction tiles (visitors / commits) + the "verified by / counted by" stamps. Evidence together, one heading "ตัวเลขที่ยืนยัน / นับได้".
2. **"Story" container:**
   - top: the problem → value → audience lines from Insights;
   - then the founder's build story;
   - the remaining Insights facts (pricing, team, funding, channels, stack) as a compact fact list.

   One heading "เรื่องราวของผลงาน".

3. **Screenshots and demo.**
4. **Founder message** (the personal close, before "updates").
5. Updates → more projects → search.

This matches the brief's intent (story + insight together; metrics clearly; visuals; founder message), with "metrics" before "story" because the page's promise is proof. **Decision needed** if you prefer the story first.

**Avoiding one long container:** Proof and Story are two separate cards, each with internal sub-headings and at most 2 columns on desktop. Empty sub-blocks are owner-only prompts (existing `EmptyOwnerCard`).

**Acceptance:**

- A visitor can answer "what is it, is it real, what does it look like, who made it and why" in that order.
- At most 7 top-level blocks below the header.
- No empty section is shown to visitors.

**Tests:** e2e on a project page (headings order); visual check at 375 / 1440.

### 7. Product profile charts (P1)

**Current implementation** (`src/components/MetricChart.tsx`, `src/lib/data/startups.ts:getChartSeries`):

- **Metrics:** revenue, MRR, visitors (`CHART_METRICS`).
- **Only metrics with data** are offered, through a **dropdown** shown only when more than one exists.
- **Periods:** 7 / 30 / 90 / 365 days.
- Compare-to-previous and a trend toggle.
- Zero-filled after the first data day, `null` before (no fabricated history).
- **JaoPor's own page** has only Stripe connected, so **only revenue appears and no selector shows.** That's why it looks revenue-only.
- **Commits** (`build_activity`, daily, public) aren't charted on the project page (only on the founder profile).

**The underlying problem:**

- **Discoverability:** a dropdown that appears only sometimes.
- **Visitors** can't tell that other metrics exist or why they're missing.

**Solution:**

- A **segmented control** (tabs) "รายได้ · MRR · ผู้เข้าชม · Commits".
  - Tabs without data are hidden for visitors.
  - For the owner they're shown disabled with "เชื่อมเพื่อแสดง" (links to the issue 4 chooser).
- Add **Commits** from `build_activity` (daily counts already stored), as bars.
- Each tab shows:
  - **metric name and unit** (฿ / $, คน, commits);
  - **period**;
  - the **source stamp** (existing).
- One metric per chart (no dual axes).

**Acceptance:**

- Switching metric and period never shows a fabricated value or a blank chart.
- Tabs fit 375 px (horizontal scroll inside the control if needed, never the page).

**Tests:** unit for the series builder (commits zero-fill, null before first day); e2e for "round chart ticks" (existing) on each tab.

---

## D. Add Startup flow

### 8. Add Startup redesign (P1)

**Current implementation:** wizard v2 (2026-10-05, refined in audit phases 1–6). It's already two steps with progressive disclosure:

- **Step 1:**
  - **one link field** (auto-fills name, one-liner, logo);
  - **required:** name, category (no default), province (prefilled);
  - one-liner and logo optional;
  - live card preview;
  - the 5-project limit shown up front;
  - a duplicate-website block;
  - sticky button on phones.
- **Step 2:** the verify chooser, skippable.
- **Everything else** (story, screenshots, pricing, insights) is on the edit page with a weighted completeness bar and the owner checklist "3 ขั้นต่อไป".

**Remaining gaps:**

1. **Link-type errors** (issue 5): the biggest abandonment risk at the first field.
2. **"Publish" happens on step 1** ("เผยแพร่และไปต่อ") and the project is public at once. Founders may not expect a half-filled project to be public.
   - Option: create as **private** (`status = 'private'` already exists, owner-switchable), then "เผยแพร่" at the end of step 2 or from the checklist.
   - This changes the analytics funnel definition and the RLS-tested status flow (no migration).
   - **Decision needed.**
3. **Required vs optional** isn't marked consistently (province has an asterisk; the one-liner says nothing). Use "(ไม่บังคับ)" on optional fields, the existing Common key.
4. **Self-reported vs verified** isn't stated in step 1. Add one line: "ข้อมูลที่คุณกรอกจะแสดงเป็น ‘เจ้าของบอก’ ส่วนตัวเลขที่ยืนยันมาจากขั้นถัดไป".
5. **After step 2** the founder lands on the public page with `?new=1`. Check that the owner checklist is the first thing they see on phones (it is above the fold on desktop; on phones it follows the stat tiles).

**Acceptance:**

- A founder can publish with only name + link + category + province.
- Optional fields are labelled.
- Verification is clearly optional and comes after.
- Nothing becomes public unexpectedly (if option 2 is chosen).

**Tests:** wizard unit tests where logic moves; signed-out e2e (existing); manual signed-in run on production after deploy.

---

## E. Founder profile

### 9. Founder profile order (P0 on phones)

**Current implementation** (`src/app/[locale]/u/[username]/page.tsx`):

- A sticky **sidebar** (photo, name, handle, actions, info, badges, skills, tools) and a **main column**:
  1. request box (only when status is "looking for co-founder" / "open to work");
  2. proof strip;
  3. revenue | activity chart tabs;
  4. pinned works;
  5. product updates (feed);
  6. experience (last).
- **Measured on a phone** (`/th/u/gxcb06`, 375 px):
  - the whole sidebar comes first;
  - the request box starts at **y = 1,484** (1.8 screens);
  - pinned works at **2,834** (3.5 screens);
  - experience at **3,567**;
  - page height **5,069 px** (6.2 screens).

**The underlying problem:**

- **On phones**, identity details (badges, skills, tools) push what the visitor came for (what this person built and what they're asking for) more than three screens down.
- **On desktop**, the order is close to the brief's proposal; only experience is below the feed.

**Proposed sequence** (validated against the brief):

1. **Identity header** (photo, name, headline, province, actions incl. **Share**, issue 11);
2. **Request box** (what they're looking for + "ส่งคำขอ"; already the right content);
3. **Chart / key numbers** (proof strip + chart);
4. **All products** (pinned first, then all);
5. **Experience** (LinkedIn-style: the fields already exist in `positions`: title, company, start / end date, description, chronological);
6. **Feed** (product updates).

**Sidebar extras** (badges, skills, tools, links) move:

- **under the header as compact chips on phones**, collapsed to one row with "ดูทั้งหมด";
- staying in the sidebar on desktop.

The request box keeps its current behaviour (`?contact=1` opens the request form; private contacts after acceptance).

**Acceptance:**

- At 375 px the request box (when present) is within the first screen and products within the second.
- Experience comes before the feed.
- No fields invented: only existing columns.

**Tests:** e2e headings order at 375 / desktop; measure positions (like this audit) in a test.

### 10. Founder badge sharing (P2)

**Current implementation:**

- **Founder badges** (pioneer, verified, MRR level, streak) are displayed on the profile only.
- **The embeddable SVG badge** (`/api/badge/{slug}`) and ShareStudio images exist **for projects**, and only show verified numbers.
- **The profile's OG image** (`/u/[username]/opengraph-image`) gives a link preview.

**The underlying problem:** founders can't share "I'm a verified builder on JaoPor" as an asset; the only thing to share is a raw URL.

**Solution:**

- A **founder badge** variant of the existing badge route ("JaoPor · @handle · {n} ผลงาน · ✓ {verified count}"):
  - verified counts only;
  - the self-reported count says "ผลงาน", never "ยืนยัน".
- Also a **profile share image** reusing `share-card` (the same verified-only rules as `lib/share.ts`).
- **Assets regenerate from live data** (badge revalidates hourly, as today), so they stay accurate when numbers change.

**Acceptance:**

- Nothing on a shared asset implies verification that JaoPor doesn't hold.
- Shared links update within an hour of a change.

**Tests:** unit tests on the badge text builder (verified-only), like the existing `share.ts` tests.

### 11. Share action on profiles (P2)

**Current implementation:**

- **No copy-link or share button** on founder profiles (project cards and pages have `CopyLinkButton` / ShareStudio).
- **Social links:** LinkedIn, GitHub, Facebook, YouTube, TikTok, website, plus a separate X handle. **No Instagram.**

**Recommendation:** **no separate tab** (a tab for one action adds a click and a near-empty page). Instead:

- a **Share** button in the profile header (Web Share API on phones, copy link on desktop, with the profile preview from the OG image);
- a "ดูโปรไฟล์" CTA where profiles are referenced (cards, chat header, project founder card) — mostly exists already;
- **Instagram** added to `SOCIAL_KEYS`. This **needs a small migration**: `private.profiles_validate` (migration `builder_profiles`) whitelists `linkedin, github, facebook, youtube, tiktok, website` and rejects any other key. It gets reviewed separately, like every migration.

**Acceptance:** two taps to share from a phone; visitors can reach the founder's chosen socials.

**Tests:** unit (social key validation); e2e (the share button exists and copies the canonical `/@handle` link).

---

## F. Leaderboard

### 12. Mobile leaderboard (P2)

**Current implementation** (`src/components/LeaderboardCard.tsx`, home only): a table with columns #, project, founder, metric, growth. **Measured at 375 px:**

- no horizontal overflow;
- founder and growth hidden;
- the header "กระดานผู้นำ · อัปเดตทุกวัน" wraps onto two lines each beside the metric dropdown.

**The underlying problem:** it works, but the phone version drops growth (the most interesting comparison) and the cramped header hides which metric is ranked.

**Solution:** a compact row layout on phones (rank medal · logo · name + "by founder" on line 2 · value + growth under it, right-aligned), with the metric selector as full-width tabs under the title.

**Acceptance:** at 375 px rank, identity, the ranked metric (named), value and growth are visible without horizontal scroll.

**Tests:** e2e no-overflow (existing), plus visible-growth at 375.

### 13. Leaderboard logic and design (P1 for the logic, P2 for the visuals)

**Current logic** (`src/lib/data/startups.ts:getBoard`):

- sorts by `mrr_cents`, `revenue_30d_cents`, `visitors_30d` or `build_commits`;
- excludes demos;
- revenue boards require verified revenue (self-reported never ranks);
- **ties broken by newest project first**;
- at most 50 rows;
- home card only (no `/leaderboard` page).

**Confirmed problems:**

- **Mixed time windows:** commits are **all-time** default-branch commits, while visitors and revenue are 30-day and MRR is current. The UI doesn't say which.
- **Ties:** equal values get different ranks, and the newer project wins. Should be the same rank (1, 1, 3), with the earlier verified project listed first.
- **Counted vs verified:** the visitors board mixes JaoPor-counted and analytics-counted numbers with verified revenue boards under one title. Each board needs its basis line (the footer has one general line).
- **Discovery** stops at 50 rows on the home page.

**Design recommendation (before any build):**

- A **`/leaderboard` page** with:
  - metric tabs (MRR · รายได้ 30 วัน · ผู้เข้าชม 30 วัน · Commits ทั้งหมด);
  - a basis line per tab ("ยืนยันผ่าน Stripe / RevenueCat" / "นับโดย…");
  - filters (category, province: multi-select, part F);
  - pagination.
- **"Ranking chart":** a **movers view**: rank change vs last 30 days (▲3 / ▼1) and a small sparkline of the metric. Honest and engaging without a race animation.
- **True rank history** ("champion N months in a row") needs a rank-history table (an open item; migration later).
- **No paid placement** inside organic rankings (sponsors, when they come, are separate and labelled).

**Acceptance:** every board states what it ranks, the period and the evidence; ties share a rank; visitors can go beyond the top 10.

**Tests:** unit for ranking + ties; e2e for the page at 375 / desktop.

---

## G. Founder and product connections

### 14. Co-Founder in the project's "Looking for" box (P0)

**Current implementation** (`src/components/profile/ProjectBlocks.tsx:LookingForBanner`):

- **Asks** (ผู้ใช้, Feedback, คนช่วยทดสอบ, Co-founder, ผู้ซื้อกิจการ, นักลงทุน) render as **chips that look like tabs but aren't clickable.**
- **The only action** is "ลองใช้เลย ›", which **opens the product's website**. It shows whenever any ask other than buyer / investor exists, **including co-founder**.

**The underlying problem:**

- A visitor interested in becoming a co-founder taps "Co-founder" (nothing happens) or "ลองใช้เลย" (goes to the product, not to the founder).
- The intended journey (contact the founder about joining) exists elsewhere: the founder profile request box with topics including `cofounder` (`contact_requests.topic`) and `?contact=1`. It isn't connected.

**Type:** interaction (broken journey, no data change).

**Solution:** one action per kind of ask:

- users / feedback / testers → "ลองใช้เลย ›" (product link, as now);
- **co-founder → "คุยเรื่องร่วมก่อตั้ง ›"**, linking to `/@founder?contact=1&topic=cofounder` (signed-out visitors go through sign-in and come back, the existing `next` flow);
- investor / buyer → "ติดต่อผู้ก่อตั้ง ›", same route with the matching topic if it exists, else a general one.

The chips stay non-interactive but are restyled as labels (no tab look).

**Acceptance:** tapping the co-founder action leads to a prefilled request to the founder; nothing that looks clickable is inert.

**Tests:**

- e2e (signed-out): the action goes to login with the correct `next`;
- unit: action per ask.
- The request form (`ProfileActions.tsx`) already defaults to the `cofounder` topic and opens with `?contact=1`. Investor / buyer would need a `topic` URL parameter (a small client change).

---

## H. Chat

### 15. Chat (P2)

**Current implementation** (`src/components/chat/ChatShell.tsx`, `ChatThread.tsx`, `/dashboard/messages`):

- **List:** unread badge (9+), bold unread names, empty-list state with a link.
- **Thread:** messages grouped by day and sender; Supabase Realtime (`postgres_changes`, RLS applies) with **polling fallback** while the channel isn't connected; empty-thread state; block / report; 200 messages/day limit (DB).
- **Phones:** list or thread (`max-lg:hidden`), full-height card.

**Gaps (code review; to verify with a signed-in test on a phone):**

- **No visible "connecting / offline" state** when Realtime drops (polling runs silently).
- **No send-failure retry on the message bubble** (a toast only).
- **Thread header context:** check that it shows the other person's project / headline and links to their profile (it links the name).
- **History:** confirm older messages beyond the first page can be loaded.
- **Mobile:** the full-height card leaves the site header visible; the composer should stay above the keyboard on iOS (`100dvh` is used, good).

**Acceptance:** users can tell each conversation's state; failed sends can be retried; nothing private leaks (RLS smoke T91–T104 stays green).

**Tests:** RLS smoke (existing); a manual two-account test on production.

---

## I. Profile settings

### 16. Profile settings (P2)

**Current implementation** (`src/components/profile-edit/ProfileEditor.tsx`, `/dashboard/profile`):

- **Six sections:** basics, status, skills, experience, pinned works, links.
- **Completeness:** bar + "next missing".
- **Per-field visibility menus** (everyone / members / hidden).
- **One sticky save bar** ("ยังไม่บันทึก" / "บันทึกแล้ว").
- **"ดูหน้าโปรไฟล์สาธารณะ"** preview link.
- **Private items:** contacts (LINE / email, shared only after acceptance) and account settings live in **`/dashboard/settings`**, separately.

**The underlying problem:** the structure is sound. The uncertainty is **which information becomes public**:

- the visibility menu is per field, but the defaults (everything public) aren't summarised;
- private contacts sit in another page.

**Solution:**

- A **"ใครเห็นอะไร" summary** at the top (public · members · only you · shared after a request is accepted) that links to each field.
- **Section labels say their audience** ("สาธารณะ" chip).
- The private contact fields shown in the editor's links section with a lock and "แชร์เมื่อคุณรับคำขอเท่านั้น", writing to the same `private_contacts` table.

No route or data changes.

**Acceptance:** a user can tell, for every field, who will see it, before saving.

**Tests:** existing RLS (T42–T57 visibility); unit for the summary.

---

## J. Branding and UX writing

### 17. Copy and positioning (decision first)

**Current:**

- **Positioning is AI-centred:**
  - title "1 คน + AI พีคได้แค่ไหน ดูผลงานจริง ตัวเลขจริง";
  - description "รวมผลงานที่คนไทยสร้างด้วย AI…";
  - footer "สถานีขนส่งฝันของคนไทยที่สร้างด้วย AI…";
  - 18 Thai strings mention AI.
- **The voice principles** (Design.md §3 Voice) and the glossary (ผลงาน, ยืนยัน vs นับโดย, รายได้ never "กำไร") are already consistent.

**The brief's direction:** "JaoPor — Where startups prove they're real", broader than AI, with the สถานีขนส่งฝัน vision.

**Conflict:** in the 2026-10-09 hardening pass you said **not to change the homepage positioning**, and the launch post is written around the AI framing. This needs your decision:

- **(a)** keep the AI framing for the launch, broaden after;
- **(b)** switch before the launch post;
- **(c)** hybrid: keep the AI hook in the hero, broaden the metadata, the directory and the footer.

**What the copy audit would cover** (after the decision): every surface listed in the brief. Most error / empty / CTA copy was rewritten in audit phases 1–6. The remaining work is mostly the positioning lines and the verification explanations from issue 4.

**Writing rules to keep** (all already in Design.md):

- natural Thai;
- verified vs counted vs owner-stated;
- no shaming of early projects ("ยังไม่ยืนยัน", not "ไม่มีรายได้");
- every error says what to do next.

---

## F. Multi-select filters (confirmed root cause; no migration needed)

**Current implementation:**

| Page                  | Filters                                                        | UI                                         | URL parsing                    | Query                                                                                                                                                                 |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/startups` directory | category, province, AI tool, type, looking for, verified, sort | `<select>` (single) in a GET form + submit | `one(sp.x)`: first value only  | `.eq("category")`, `.eq("province")`, `.contains("ai_tools",[x])`, `.contains("looking_for",[x])`, type → one `_url` column (`src/lib/data/startups.ts:listStartups`) |
| `/builders`           | skill, area, status, AI tool, verified                         | single selects                             | `one(sp.x)`                    | filtered in TypeScript (`listBuilders`)                                                                                                                               |
| `/feed`               | view, type, province, category, waiting                        | chips / selects (single)                   | `parseFeedFilters` → one value | `.eq`                                                                                                                                                                 |

**Root cause:** single-select **at every layer** (UI control, URL parse, query). **The schema already supports multi-select:**

- `category`, `province`: text columns → `.in()`;
- `ai_tools`, `looking_for`: arrays → `.overlaps()` (OR within the group);
- type: OR of `*_url is not null`;
- builders are filtered in TypeScript → `some()`.

**Proposed:**

- **Multi-select** (OR within a group, AND across groups):
  - category, province, AI tool, type, looking for (directory);
  - skill, area, AI tool (builders);
  - type, province, category (feed).
- **New "มีตัวเลข" group** (OR):
  - รายได้ยืนยัน = verified revenue;
  - ผู้เข้าชม = `visitors_30d` not null;
  - Commits = `build_commits` not null.

  It replaces the single "verified" checkbox and reuses existing columns.

- **Keep single-select:**
  - **sort** (exclusive);
  - feed **view** (exclusive);
  - builders **status** (one current status per person, but filtering by several is fine; make it multi as well).
- **URL format:** repeated params (`?category=saas&category=ai`), backwards compatible with today's single values. Pagination resets on change; sort is kept.
- **UI:**
  - checkbox chips in the existing filter disclosure;
  - "ล้างทั้งหมด";
  - an active-count badge on "ตัวกรอง" (n);
  - selections live in the URL, so they survive closing the panel, sharing and back / forward;
  - **instant apply on desktop** (submit on change) and **an "ดูผล (n)" apply button on phones** (avoids reloads per tap).
- **Empty results:** "ไม่พบผลงานที่ตรงทุกเงื่อนไข" + "ล้างตัวกรอง" + the closest single-filter suggestion.

**Acceptance:**

- Selecting SaaS + AI returns either.
- Adding province กรุงเทพ narrows both.
- URL round-trips.
- Counts match.
- No overflow at 375 px.
- Single-value old links still work.

**Tests:**

- unit for `parseDirectoryFilters` (multi + legacy single) and the query builder (`.in` / `.overlaps` calls);
- e2e: select two categories → the URL has both → results update → "ล้างทั้งหมด".

## O. First-visit onboarding (proposed flow; data-model impact noted)

**Current:**

- **No first-visit experience.** Every public page (home, directory, projects, profiles, feed, Olympics) works **without signing in, with no limit.**
- **Onboarding exists only after sign-in:**
  - quick mode (username + province) when coming from Add-project;
  - otherwise 4 steps (username, about, status, skills).
- **No "user type" or "interests"** is stored. `profiles` has `status` (looking for co-founder, open to work, networking…), province and skills.
- **The `?welcome=1` banner** on `/startups` greets new sign-ins.

**Proposed flow** (no sign-in needed until an account is useful):

1. **First visit, home:** a dismissible card "คุณมาเพื่อ…" with **สร้างผลงาน** / **ค้นหาผลงานและคนสร้าง** (both selectable; not a lock).
2. **Personalize** (one screen, all optional):
   - builders: province + categories;
   - discoverers: categories + "สิ่งที่สนใจ" (e.g. LINE OA, SaaS, mobile apps); AI tools optional.
3. **Personalized card:** "ผลงาน {หมวด} ใน {จังหวัด}" with **one next action**:
   - builders → "เพิ่มผลงานของคุณ" (after showing 3 examples);
   - discoverers → "ดูผลงานที่ตรงกับคุณ" = the directory with the **same multi-select filters** pre-applied (this is why filters go first).
4. **Explore freely.** Recommendation: **no hard guest limit.**
   - Public profiles are the product's shareable proof; a gate would hurt sharing, SEO and the launch post's clicks.
   - Ask for sign-in only to save, follow, contact, post or publish (the current behaviour).
5. **Preferences:**
   - **guests:** this browser only (localStorage), stated as "จำไว้ในเบราว์เซอร์นี้";
   - **signed-in users:** optionally saved to the profile → **needs a migration** (`profiles.interests text[]`, `profiles.intent text[]`, RLS = own row, visibility private). Not needed for v1.
   - Changeable anytime from a "ปรับให้ตรงกับคุณ" link.

**Data-model changes:** none for the guest version. One small, reviewed migration only if preferences should follow the account across devices.

**Acceptance:**

- A first-time visitor gets one relevant next action within two taps.
- Nothing is required.
- Guest limits are stated honestly.
- Preferences can be changed or cleared.

---

## Phased implementation plan (after your approval)

Reordered from the brief because of dependencies:

- the filters feed onboarding;
- the metric chooser feeds the chart and the leaderboard;
- the type scale affects every component.

| Phase                          | Items                                                                                                                                        | Why this order                                             | Migration                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| **A1: trust fixes (small)**    | **14** co-founder action · **5** link-type detection + correction · **13 logic** (windows labelled, ties)                                    | Broken or misleading interactions, each small and isolated | None                                                                     |
| **A2: verification clarity**   | **4** metric-first chooser · **3** "what you get" + step-1 hint · **8** optional labels, owner-stated line (+ "create as private" if chosen) | One component used by the wizard and the edit page         | None                                                                     |
| **A3: readability foundation** | **1** type roles in Design.md + sweep · **2** card v2 + compact directory header on phones                                                   | Everything later inherits the scale; do it once            | None                                                                     |
| **B1: profiles**               | **9** founder profile order (phone-first) · **11** share button + Instagram · **6** project page Proof / Story                               | Highest-traffic pages after the post                       | Instagram: one small migration (validation trigger), reviewed separately |
| **B2: charts and settings**    | **7** chart tabs + commits · **16** "ใครเห็นอะไร" · **15** chat states (after a signed-in test)                                              | Builds on A2 (metric vocabulary)                           | None                                                                     |
| **C1: discovery**              | **F** multi-select filters (directory, builders, feed) · **12 / 13** `/leaderboard` page + mobile rows + movers                              | Filters are reused by C2 and the leaderboard               | None (rank history later)                                                |
| **C2: onboarding**             | **O** first-visit card + personalization (guest, localStorage)                                                                               | Uses C1 filters                                            | Only if account-saved preferences are wanted                             |
| **C3: distribution and copy**  | **10** founder badge + profile share image · **17** copy pass (after the positioning decision)                                               | Depends on the decision and on final labels from A–C       | None                                                                     |

**Each phase:**

- Design.md first;
- th + en;
- typecheck / lint / unit / build;
- e2e at desktop + 375 px;
- a browser check;
- PROGRESS / Project.md;
- **a stop for your review before the next phase** (and before any migration or deploy you haven't approved).

## Questions that need your decision

1. **Positioning (17):**
   - (a) keep AI framing for the launch;
   - (b) switch to "Where startups prove they're real" now;
   - (c) hybrid.
2. **Project page order (6):** proof before story (recommended) or story before proof?
3. **Add-project publishing (8):** keep "public on create", or create as private and publish at the end?
4. **Guest access (O):** confirm **no hard limit** for signed-out visitors (recommended), or set a limit (how many profiles)?
5. **Preferences (O):** browser-only for now (no migration), or saved to the account (one small migration)?
6. **Leaderboard (13):** approve a standalone `/leaderboard` page and the "movers" view (rank change vs 30 days)?
7. **Founder badge (10):** which numbers may it show (number of projects, verified count, total verified revenue)?
8. **Card images (2):** please paste the two screenshots from the brief if card v2 should match a specific TrustMRR pattern.

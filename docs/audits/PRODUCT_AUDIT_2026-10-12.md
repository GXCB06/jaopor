# JaoPor — Principal Product & UX/UI Audit (2026-10-12)

Scope: the path from the landing page (https://jaopor-landing.vercel.app) into the product (https://jaopor.vercel.app/th), plus the repository.
Mode: audit only. No code, data, settings or deploys were changed.

## 0. How this was done, and what I could not test

**Observed (production, signed out, read-only):**

- Full-page screenshots at 1440 px and 375 px of 15 product routes and the landing page (th, en, root).
- Rendered text and link targets of the landing page.
- Leaderboard, category, province, sign-in, project, builder-profile, feed and Olympics pages.
- `robots.txt` / `sitemap.xml` / canonical tags, and the landing page's OG image URL.

**Read in code:**

- Routes (`src/app/**`), the sign-in routing (`lib/next-path.ts`), onboarding, notifications and the contact-request comment.
- Leaderboard strings, the verification model (`lib/sources`), and the add wizard.

**Benchmarks:** TrustMRR, Indie Hackers, Peerlist (web search; sources at the end).

**Not tested (please treat related points as hypotheses):**

- Anything behind sign-in: dashboard, messages, requests, saved, settings, connections, onboarding UI, the add wizard UI, the edit page, the verify panel UI. The browser pane had no session, and I don't sign in with credentials. These parts are reviewed from code only.
- No analytics, funnel data or user interviews were available. Abandonment points are hypotheses.
- Tablet width (768) was not captured. Keyboard-only navigation was not walked end to end.
- The landing page is a separate project (`C:\Users\ACER\jaopor-landing`); I reviewed its live output, not its code.

**Data on production at the time (it shapes almost every finding):**

- 3 projects, 5 builders, 1 project with verified revenue: JaoPor itself.
- 2 feed posts, both automatic milestones of JaoPor.
- 3 of 77 provinces have a project; most of the 37 categories have 0 projects.

---

## A. Executive assessment

**Verdict:** JaoPor's trust model and craft are ahead of its stage, but the product is built for a marketplace that doesn't exist yet.

- **Ahead of its stage:**
  - The product is careful about what "verified" means, read-only keys are proven read-only, and the visual quality is high.
  - Signing up and adding a first project is short.
- **Not there yet:**
  - The product has the surface area of a mature community: four leaderboards, a 77-province Olympics, a feed with likes, comments and follows, a live-viewers map, builder directory, co-founder requests, 37 categories and 77 province pages.
  - It has three projects. A first-time visitor mostly meets "1", "0" and "be the first", and the one verified success story is the platform's own.
- **The core:** the most valuable thing JaoPor does today is give one builder one credible, shareable proof page. Everything else depends on supply that isn't there yet.

| Area                  | Assessment                                                      | Why                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value proposition** | Clear on the landing page; weaker in the product                | The landing H1 ("ให้คนเห็นสิ่งที่คุณสร้าง พร้อมตัวเลขที่เชื่อถือได้") passes a five-second test. The product home leads with a slogan ("1 คน + 1 Startup") and a dense 3-line paragraph. The why-use-this is clearer for builders (proof + a page) than for visitors (little to discover yet).                                                                                  |
| **Core journey**      | Short and mostly well designed, with a silent ending            | Landing CTA → `/new` → Google/GitHub → choose a handle → add from a link → optional verify → profile with a share dialog. Few steps, good recovery (`next=` is kept). After publishing, nothing brings the builder back: notifications are in-app only.                                                                                                                         |
| **UX/UI quality**     | High craft, too many modules                                    | Consistent tokens, good empty states, no horizontal overflow at 375, reduced-motion respected. Pages carry more modules than content (home has 8 sections for 3 projects; the project page is 6,057 px tall on a phone).                                                                                                                                                        |
| **Trust & data**      | Strong in the product, weaker on the landing page and in optics | The product separates verified / counted, names sources, shows "updated" times and explains leaderboard bases. The landing page labels a board "VERIFIED SOURCES ONLY" that includes counted visitors, and calls unverified projects "Pending". The only verified project is JaoPor itself, and its MRR (฿2,310) shows above its all-time revenue (฿1,980) without explanation. |
| **Feature coherence** | Fragmented at current scale                                     | Each feature is reasonable alone. Together, they spread three projects across 15+ surfaces, so every surface looks empty.                                                                                                                                                                                                                                                       |
| **Mobile**            | Works; long                                                     | No overflow; sticky identity bar and tabs help. Long pages (project 6,057 px, Olympics 4,962 px, home 4,070 px) and a long footer menu.                                                                                                                                                                                                                                         |

---

## B. The five biggest problems (ranked)

### 1. P1 — Surface area far exceeds supply, so the product reads as empty

- **Where:** home (live board, leaderboard, teasers), `/olympics`, `/feed`, `/categories`, `/category/*`, `/province/*`, the leaderboard tabs.
- **Observed:**
  - The leaderboard has 1 row.
  - The live board shows "1 คนกำลังดู" — on a quiet site that is usually the visitor themself.
  - Olympics shows "3 / 77" and a list of 74 empty provinces.
  - The feed has 2 automatic posts and 0 likes or comments.
  - Most category and province pages say "0 ผลงาน".
- **Why it matters:**
  - Social proof works in reverse at this scale. Each empty module tells a visitor "nobody is here", and tells a builder "nobody will see my page".
  - It also splits the founder's limited time across many features that can't show value yet.
- **Recommendation:** gate modules behind minimum data (thresholds), and put the founder's effort into supply (Section F, Phase 1/3) rather than more surfaces.
- **Confidence:** high that the product looks empty (observed). Medium on how much that hurts sign-ups (needs testing).

### 2. P1 — The trust story's proof example is the platform itself, and the landing page overstates verification

- **Where:** landing hero ("Verified MRR ฿2,310 · JaoPor · via Stripe"), the landing board, product home, `/startup/jaopor`.
- **Observed:**
  - JaoPor is #1 on every revenue board and is the only verified project.
  - On its page, MRR ฿2,310 sits next to "รายได้ทั้งหมด" ฿1,980, so MRR is higher than all-time revenue.
  - The landing page labels unverified projects "Pending" / "รอยืนยัน", which implies a verification in progress; the product says "ยังไม่ยืนยัน".
  - The landing board's badge says "VERIFIED SOURCES ONLY" while one of its tabs is visitors (counted), and its own footnote says visitors are not verified.
- **Why it matters:**
  - JaoPor's differentiator is trust. A skeptical visitor can read "the only verified success is the platform itself" as self-promotion.
  - MRR above all-time revenue looks like an error, even though it can be legitimate (new subscriptions, annual plans).
  - Copy that overstates verification undoes the product's careful wording.
- **Recommendation:**
  - Label JaoPor's listing as the team's own project, and consider leaving it off the revenue boards.
  - Add a one-line explanation when MRR is greater than all-time revenue.
  - Align the landing page's words with the product's ("ยังไม่ยืนยัน"; "ตัวเลขจากระบบที่เชื่อมต่อ" instead of "VERIFIED SOURCES ONLY").
- **Confidence:** high (observed). **Effort:** S.

### 3. P1 — The Connect and Return loops are silent

- **Where:** contact requests (`/u/[username]` → `dashboard/requests`), comments and likes, follows, `NotificationBell`.
- **Observed (code):**
  - `dashboard/requests/page.tsx` line 31 says requests create in-app notifications "and nothing is emailed yet".
  - There is no email or LINE channel anywhere in `src`.
- **Why it matters:**
  - "Find people to build with" is promised on the landing page.
  - A builder who signs up, adds a project and leaves will never learn that someone wants to talk to them. The sender gets no reply and concludes the platform is dead.
  - There is also no weekly reason to come back: no digest of views, numbers or new projects in your category or province.
- **Recommendation:** an email notification for contact requests first (smallest useful loop), then a weekly digest. Defer new social features until these loops exist.
- **Confidence:** high (code). **Effort:** M (email provider, templates, settings opt-out, rate limits).

### 4. P1 — The landing → product handoff leaks

- **Where:** jaopor-landing.vercel.app.
- **Observed (confirmed bugs):**
  - The landing page's `og:image` is `https://jaopor.vercel.app/landing/og`, which redirects to `/th/landing/og` and returns **404**. Links to the landing page shared on Facebook, LINE or X show no image.
  - Its `<link rel="canonical">` points to `https://jaopor.vercel.app` (the product home), so search engines are told the landing page is a duplicate of another page.
  - "ดูกระดานเต็มในแอป" goes to `/startups`, not to the leaderboard (`/#leaderboard`). "เปิดแอป JaoPor" goes to `/olympics`.
- **Observed (design):** the landing page and the product feel like different products.
  - **Fonts:** Manrope / Noto Sans Thai / IBM Plex Mono on the landing page; JetBrains Mono / IBM Plex Sans Thai in the product.
  - **Accent colour:** blue #1251fd versus indigo #6e6cf3.
  - **Card shape:** `rounded-3xl` cards versus `rounded-lg/xl`.
  - **Menu sections:** "จุดเด่น / ผลงาน / กระดานผู้นำ / คนสร้าง / โอลิมปิก / ความปลอดภัย" versus "ผลงาน / คนสร้าง / ฟีด / หมวดหมู่ / โอลิมปิก".
- **Why it matters:** the landing page is where launch traffic lands. A broken share image costs click-through on every post, and the visual jump makes the product look less finished than the landing page promised.
- **Recommendation:** fix the OG URL and canonical, correct the two CTA targets, and align a minimal set of shared tokens (the brand blue for accents, the same card radius family). Don't redesign either side.
- **Confidence:** high (observed). **Effort:** S for bugs, M for visual alignment.

### 5. P2 — Search engines can't map the site

- **Where:** the product domain.
- **Observed:**
  - `https://jaopor.vercel.app/robots.txt` → 404 and `/sitemap.xml` → 404.
  - Project pages have a canonical tag but no `hreflang` alternates for th/en.
  - Empty category and province pages ("0 ผลงาน") have no `noindex`.
- **Why it matters:**
  - CLAUDE.md positions JaoPor as "the permanent, searchable home" for projects. Organic search is the cheapest durable channel for a directory, and builders join partly for findability.
  - Thin pages (0 results) can drag down how the domain is judged.
- **Recommendation:** add `app/sitemap.ts` (published projects, builders, non-empty categories/provinces) and `app/robots.ts`, add `alternates.languages`, and `noindex` empty taxonomy pages.
- **Confidence:** high (observed). **Effort:** S.

Next in line, outside the top five:

- **Project page length and repetition (P2).** ฿2,310 appears in the headline and an MRR tile; ฿1,980 in the all-time tile and the chart heading.
- **Thai OG card shows USD.** The image shows "$69" while the Thai page shows ฿2,310 (P2).

---

## C. Page-by-page audit

Format: **ID · severity · route/component** — observation → recommendation (effort, confidence).

### Landing (jaopor-landing.vercel.app)

**What works:**

- Strongest copy in the whole system, with a clear H1.
- A security section that says exactly what is and isn't read.
- Real product screenshots, dated and labelled "not live data".
- A founder note with a concrete reason (inspect-element screenshots).

**Findings:**

- **L-1 · P1 · OG image:** 404 (B4). Fix the URL to the landing domain's own `/landing/og`, or serve it from the product. (S, high)
- **L-2 · P2 · canonical:** points to the product home. Self-canonical, or a deliberate cross-domain strategy. (S, high)
- **L-3 · P2 · CTA targets:** "ดูกระดานเต็มในแอป" → `/startups`; "เปิดแอป JaoPor" → `/olympics`. Point to `/th#leaderboard` and `/th` respectively. (S, high)
- **L-4 · P2 · trust copy:** "Pending/รอยืนยัน", and "VERIFIED SOURCES ONLY" over a board that includes counted visitors (B2). (S, high)
- **L-5 · P2 · visual discontinuity** with the product (B4). (M, medium — taste is involved; the risk is "two products")
- **L-6 · P3 · length:** 6,799 px at 1440 and 9,391 px at 375, with 7 sections. The "what do I get" tabs repeat the hero chips. Consider cutting one section after testing. (S, low)

### Product home (`/th`)

**What works:**

- The new H1 lockup is distinctive.
- The category rail gives a one-tap way in.
- Empty states invite action.
- Container and spacing were just aligned.

**Findings:**

- **H-1 · P2 · H1 (five-second test):** "1 คน + 1 Startup / ดูผลงานจริง ตัวเลขจริง" is a slogan. What JaoPor _is_ sits in a dense 3-line paragraph (`Home.subline`). The landing page's sentence explains it better. Consider the landing H1 idea as the product's subline. Copy change; owner approval needed. (S, medium)
- **H-2 · P2 · module count:**
  - The page has: hero (with ProviderStrip, search, quick links, a 12-chip rail) → "เพิ่มล่าสุด" → live board → leaderboard → categories + Olympics teasers → "หาผลงานอื่นต่อ" search.
  - With 3 projects, the leaderboard and live board advertise emptiness.
  - Recommendation: hide the live board under N concurrent viewers (e.g., 5) and the leaderboard under 3 ranked projects, and replace them with one "how it works / add yours" block. (S–M, medium)
- **H-3 · P3 · duplication:** category chips appear in the hero rail and again in the "สำรวจหมวดหมู่" teaser; search appears in the header, hero and bottom. Keep the hero rail; drop the teaser chips until categories have content. (S, high)

### Directory (`/startups`)

**What works:**

- Clear hero, a sidebar of multi-select filters, and URL-shareable state.
- 3-column cards after the layout fix.

**Findings:**

- **D-1 · P3 · three search inputs** on one page (header, hero, bottom "หาผลงานอื่นต่อ"). Remove the bottom one on directory pages. (S, high)
- **D-2 · P3 · card label truncation:** "รายได้ (30 …" in 3 columns and at 375. Use the short label "รายได้" plus a tooltip. (S, high)
- **D-3 · P2 · sort tabs:** "MRR สูงสุด" is the default with 1 verified project. Default to "ใหม่ล่าสุด" until there are ≥ 3 verified projects. (S, medium)

### Project page (`/startup/[slug]`)

**What works (best page in the product):**

- Identity column, cover, headline number with its source, verify ladder ⓘ, chart stamp, early-stage card for projects with no numbers, share studio, section tabs.

**Findings:**

- **P-1 · P2 · repeated numbers:** the headline ฿2,310 MRR and the MRR tile show the same figure; ฿1,980 shows in the all-time tile and the chart heading. Drop the MRR tile when the headline is MRR, or make the headline the only MRR. (S, high)
- **P-2 · P2 · MRR > all-time revenue** without explanation (B2). Add a caption, e.g. "MRR คิดจากสมาชิกที่ใช้งานอยู่ 4 ราย (รวมแผนรายปีเฉลี่ยต่อเดือน)". (S, high)
- **P-3 · P3 · cover from a full-page screenshot:** for JaoPor it crops a picture of a web page mid-heading; it looks accidental. Owners choosing the cover (planned) fixes most cases. (M, medium)
- **P-4 · P2 · mobile length:** 6,057 px at 375. Insights already collapse; consider collapsing "ตัวเลขจากระบบที่เชื่อมต่อ" and "ผลงานอื่น ๆ" too. (S, medium)
- **P-5 · P2 · OG (share) image:** the Thai card shows "$69 / $59" (USD) while the Thai page shows baht. Use the page's currency. (S, high)

### Builder directory (`/builders`) and profile (`/u/[username]`)

**What works:**

- The profile is rich: status ("กำลังหา Co-founder" with terms), skills, experience, pinned works, badges, contact gated by sign-in.

**Findings:**

- **B-1 · P3 · GitHub tile** leads with "★ 0" and puts "134 commits" in the caption. For indie builders, stars are usually 0; lead with commits. (S, high)
- **B-2 · P3 · number format:** "฿2.3k" here versus "฿2,310" on the project page. Pick one rule per context (compact in cards, full on detail pages) and document it. (S, medium)
- **B-3 · P1 · contact requests aren't emailed** (B3).

### Feed (`/feed`)

**Observed:** two automatic posts from one project; composer, likes, comments, follow and filters all exist.

**Findings:**

- **F-1 · P2 · value at this scale:** the feed is the most socially demanding feature and has no organic posts. Keep it, stop investing until posting is organic, and consider showing a project's updates on the project page as the main surface.
- **F-2 · P3:** the right rail now fits names (layout fix).

### Olympics (`/olympics`, `/province/*`)

**What works:**

- A genuinely differentiated, local hook (province pride, "คนแรกของจังหวัด").
- Clear scoring explanation.
- Pioneers and newest panels make low data feel intentional.

**Findings:**

- **O-1 · P2 · gaming risk (hypothesis):** the default board counts projects (verified or not), so the cheapest way to raise a province is many thin listings. Not a problem at 3 projects; add a minimum quality bar (e.g., a website that resolves plus a description) before promoting the board publicly.
- **O-2 · P3:** 74 empty province pages are indexable (B5).

### Categories (`/categories`, `/category/*`)

- **C-1 · P3:** 37 categories, nearly all at 0. Show only non-empty categories plus "อื่น ๆ" in navigation until supply grows; keep the pages for SEO later. (S, medium)

### Sign-in, onboarding, add, verify (code review; UI not tested)

**What works:**

- The sign-in page states why you're there ("เข้าสู่ระบบเพื่อเพิ่มผลงาน") and keeps `next`.
- A new user goes handle → straight to Add; autofill from the link; a category suggestion; "ไม่บังคับ" verification.
- The new stage choice ("ยังไม่มีรายได้").

**Findings:**

- **S-1 · P3 · login options:** Google and GitHub only. For a Thai audience, LINE login is a plausible conversion lever. Hypothesis only; test before building.
- **S-2 · P3 · stale verify copy:** the panel still says "Google Analytics ยังไม่รองรับ" while a GA4 source exists (hidden until configured). Update when GA4 is switched on.

### Security / privacy (`/security`, `/privacy`, `/terms`)

**Strength:**

- Concrete, matches the implementation (read-only proof per provider, encryption at rest, aggregate-only storage).
- Keep linking it from every verify step.

---

## D. Journey friction map

| Step                | User goal                        | What works                                          | Friction / risk                                                                                                                     | Evidence                              |
| ------------------- | -------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1. Land (landing)   | "What is this, is it for me?"    | Clear H1, proof screenshot, security section        | Shared links show no image (OG 404) → fewer clicks from social                                                                      | Observed                              |
| 2. Understand value | "Why not just post on Facebook?" | Inspect-element argument, read-only promise         | The proof example is JaoPor itself; "VERIFIED SOURCES ONLY" vs counted visitors                                                     | Observed; impact is a hypothesis      |
| 3. Enter product    | Continue the story               | CTA → `/new` keeps intent                           | The look changes (font, colour, menu sections); "เปิดแอป" lands on Olympics                                                         | Observed                              |
| 4. Explore          | See real work                    | Fast pages, good filters                            | 3 projects; leaderboard 1 row; live board "1"; most categories and provinces 0 → **highest abandonment risk for visitors**          | Observed; abandonment is a hypothesis |
| 5. Sign up          | Low-commitment account           | Google/GitHub, one screen for the handle            | No LINE login (hypothesis); OAuth consent wording not reviewed                                                                      | Code                                  |
| 6. Builder profile  | Be presentable                   | Rich profile model                                  | Optional; quick path skips it (good)                                                                                                | Code                                  |
| 7. Add project      | Publish in ~2 minutes            | Autofill, category suggestion, preview card         | Not UI-tested this session                                                                                                          | Code                                  |
| 8. Verify           | "Prove it" without risk          | Read-only proof, stage choice, no-key options first | **Second-highest abandonment risk for builders:** pasting an API key is a trust leap; most indie products have $0 revenue (IH data) | Code + external data                  |
| 9. Publish/share    | Show people                      | Share studio, OG card, LINE/X/Facebook              | Thai OG shows USD; cover crop quality                                                                                               | Observed                              |
| 10. Outcome         | Views, contacts, credibility     | Profile views count, followers                      | **No email/LINE notification** → contacts and comments go unseen; no digest → no return trigger                                     | Code                                  |

---

## E. Feature decisions

| Decision                        | Features                                                                                                                                                                          | Reasoning                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Keep & strengthen**           | Project page; verified-source model + read-only proof; share kit (OG, badge, share studio); add flow + autofill; security page; builder profile                                   | These are the core job: a credible, shareable proof page. They work and differentiate. |
| **Improve**                     | Notifications (email first); landing handoff; leaderboard fairness and self-listing; number and currency consistency; SEO infrastructure                                          | Each directly affects trust, return, or reach, at low cost.                            |
| **Simplify / consolidate**      | Home modules (thresholds); bottom "หาผลงานอื่นต่อ" on directory pages; category teaser chips; 37 visible categories → non-empty ones; MRR shown twice on the project page         | Fewer, fuller surfaces read as alive.                                                  |
| **Defer**                       | Feed social features beyond posts; Olympics expansions (province × category); project graph page; auto screenshots; GA4 rollout (until env set); co-founder matching enhancements | Need supply or demand signals first.                                                   |
| **Consider removing (for now)** | Live-viewers board on home (until N viewers); commits as a _ranking_ (keep as proof, don't rank by raw commit count, which is easy to inflate)                                    | Both currently signal emptiness or invite gaming more than they add value.             |

---

## F. Recommended roadmap

### Phase 1 — Critical fixes (before pushing launch traffic)

| #   | Initiative            | Outcome                                         | Acceptance criteria                                                                                                                                                                                  |
| --- | --------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Landing handoff bugs  | Shares show a preview; landing is its own page  | `og:image` returns 200 `image/png` (checked in Facebook Sharing Debugger / LINE preview); canonical is self; both CTAs reach the labelled destination                                                |
| 1.2 | Trust copy alignment  | No overstatement anywhere                       | No "Pending/รอยืนยัน" for unverified; no "VERIFIED SOURCES ONLY" over counted data; MRR-greater-than-revenue explained on the page; JaoPor's own listing labelled (owner decides on board inclusion) |
| 1.3 | Contact-request email | A builder learns about a contact within minutes | Email sent on request create; links to the request; opt-out in settings; per-sender rate limit; no recipient email exposed to sender; RLS unchanged                                                  |
| 1.4 | SEO basics            | Projects are findable                           | `/sitemap.xml` lists published projects, builders, non-empty taxonomy; `/robots.txt` present; `hreflang` alternates; `noindex` on 0-result category/province pages                                   |

### Phase 2 — UX quality (core journey and coherence)

| #   | Initiative                      | Outcome                                        | Acceptance criteria                                                                                                                        |
| --- | ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1 | Thresholded home                | Home never shows a module with too little data | Live board hidden under N viewers; leaderboard under 3 ranked items; one "add yours" block replaces them; verified at 3 and at 30 projects |
| 2.2 | Project page trim               | Every number appears once                      | No duplicate MRR / all-time; mobile ≤ ~4,500 px for a full profile; tabs still map to sections                                             |
| 2.3 | Number & currency rule          | One rule everywhere                            | Compact (฿2.3k) in cards, full (฿2,310) on detail; OG follows the page locale's currency; documented in Design.md                          |
| 2.4 | Landing ↔ product visual bridge | One product feeling                            | Shared accent token and card radius family; landing uses the product's menu names for the same destinations                                |
| 2.5 | Discovery tidy-up               | Fewer, fuller entry points                     | Non-empty categories only in rails/nav; one search per page plus the header; default sort "ใหม่ล่าสุด" until ≥ 3 verified                  |

### Phase 3 — Product growth (after the loop works)

- **3.1 Supply seeding (not a feature):**
  - Founder-led concierge onboarding of 30–50 Thai projects: communities, universities, LINE OA builders.
  - Success = ≥ 30 published projects, ≥ 8 with any connected source.
- **3.2 Weekly digest (email/LINE):** your page's views, new projects in your province and category, contact requests. Success = digest click-through and week-2 return rate.
- **3.3 Disclosure levels (R2, already designed):** removes the main stated objection ("won't disclose MRR"). Success = connect rate among revenue builders.
- **3.4 Weekly "new this week" cohort (hypothesis):** similar to Peerlist's weekly Launchpad, which gives makers a recurring moment. Success = shares per launch.
- **3.5 LINE login (hypothesis):** only if testing shows Google/GitHub sign-in is a drop-off point.

---

## G. Validation plan (3–5 target users)

**Participants:**

- 2 Thai builders with paying users (Stripe or RevenueCat).
- 2 builders without revenue (students / indie developers).
- 1 non-builder visitor (potential collaborator or customer).

**Tasks (think aloud, observe, don't help):**

1. **5-second test**, first on the landing page, then on the product home. "What is this? Who is it for?"
   - **Confirms H-1 / B2** if they describe it as "a place to show projects with real numbers". **Disproves** if they say "a directory" or "AI tools".
2. "Find a project from your province or in a category you like."
   - Observe reactions to empty pages and the 3-project directory.
   - **Confirms B1** if they express doubt ("ไม่มีใครใช้เหรอ").
3. On `/startup/jaopor`: "What does ยืนยันแล้ว mean here? Which numbers are verified, which are counted?"
   - Note any confusion about MRR versus all-time revenue, and whether they notice JaoPor is the platform's own project.
4. **Builders:** "Add your project from its link and publish it." Time it and note hesitations.
5. **Builders:** "Would you connect Stripe/GitHub now? Why or why not?" Listen for key-safety and disclosure objections.
   - **Confirms the 3.3 priority** if they say "I don't want to show exact revenue".
6. "Send a contact request to a builder." Then ask the recipient-side question: "How would you expect to find out someone contacted you?"
   - **Confirms B3** if they say email or LINE.
7. "Share your page to LINE." Look at the preview card together.

**Evidence to collect:**

- Completion and time per task.
- Misreads of verified versus counted.
- Stated reasons for not verifying.
- Whether they'd share, and to where.
- One sentence of "why I'd come back" (or not).

---

## H. Implementation brief (do not start until approved)

1. **Landing handoff + trust copy (Phase 1.1 + 1.2)**
   - **Why first:** confirmed bugs on the highest-traffic entry, trust is the differentiator, all S effort.
   - **Scope:**
     - Landing project: OG URL, canonical, two CTA targets, "Pending" → "Not verified yet", board badge copy.
     - Product: MRR > revenue caption, JaoPor self-listing label (owner decision).
   - **Acceptance:** criteria in 1.1/1.2; screenshots of the share preview before and after.
2. **Contact-request email (Phase 1.3)**
   - **Why second:** the landing page promises connection, and today a request can go unseen forever. This is the first real outcome a builder can get.
   - **Scope:** an email provider (owner picks; key handled by the owner in Vercel), one template th/en, a settings toggle, rate limit. No new social features.
   - **Acceptance:** criteria in 1.3, plus an end-to-end test with two test accounts.
3. **SEO basics + thresholded home (Phase 1.4 + 2.1)**
   - **Why third:** cheap, makes the site look alive at low data, and starts compounding organic reach now.
   - **Scope:** `sitemap.ts`, `robots.ts`, `hreflang`, `noindex` on empty taxonomy; thresholds for the live board and leaderboard on home.
   - **Acceptance:** criteria in 1.4 and 2.1; Google Search Console accepts the sitemap (owner adds the property).

---

## Sources (external)

- **TrustMRR (verified revenue database).**
  - Revenue comes from connected payment providers rather than founder self-reports; the database includes a leaderboard and listings for sale.
  - Third-party summaries differ on size: [Feedbagel](https://feedbagel.com/post/trustmrr-database-of-verified-startup-revenue-metrics), [Apify listing](https://apify.com/memo23/trustmrr-scraper), [TrustMRR startup page example](https://trustmrr.com/startup/coreyes). I did not verify these against trustmrr.com's own documentation.
- **Indie Hackers.** Community analyses of Stripe-verified revenue found that most products make $0: about 937–998 verified products, with >50% / 48.7% at $0.
  - Sources: [IH analysis post](https://www.indiehackers.com/post/how-much-money-do-indie-hackers-products-make-74db9631f0), [Changelog summary](https://changelog.com/news/9llJ), [IH "60 million ARR" post](https://www.indiehackers.com/post/indie-hackers-are-making-60-million-in-stripe-verified-arr-bac07f782d).
  - Data is from 2021–2022.
  - Interpretation: a revenue-first display will make most early projects look empty, which supports JaoPor's early-stage card and stage choice.
- **Peerlist.** Spotlight became a weekly launch (2024), then "Launchpad" (2025).
  - Sources: [Peerlist blog](https://peerlist.io/blog/commentary/peerlist-launchpad-the-path-forward), [peerlist.io](https://www.peerlist.io).
  - Third-party claims (Monday launches, week-long window) were not verified on Peerlist's docs.
  - Interpretation: a recurring launch moment is a return trigger worth testing; copying votes or streak mechanics is not recommended at JaoPor's scale.

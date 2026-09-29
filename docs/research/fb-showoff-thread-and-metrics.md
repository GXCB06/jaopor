# What Claude Thailand builders want to show — and which numbers we can verify

> 2026-09-29. Sources: the "อวดโปรเจคกันหน่อยครับ ผมอยากรู้ว่า 1 คน + claude มันจะพีคขนาดไหน" thread in the Claude Thailand Community Facebook group, plus two similar posts visible in the same view. First pass logged out (~15 top comments); **second pass logged in (102 comment threads loaded, ~91 texts read)**: see §2b. Individuals are not named here: only aggregate patterns.

## 1. The signal

| Post                                                       | Reactions | Comments                        | Notes                                            |
| ---------------------------------------------------------- | --------- | ------------------------------- | ------------------------------------------------ |
| "อวดโปรเจค… 1 คน + claude มันจะพีคขนาดไหน" (solo builders) | ~28K      | ~3.8K (1,636 top-level threads) | Group has 511.5K members                         |
| "อยากดูผลงานโชว์เว็บไซต์เทพๆที่สร้างด้วย Claude"           | 955       | 290                             | Same format, 4 days old: it's a recurring ritual |
| A single launch post ("ขออนุญาตแอดมิน ฝากระบบ…")           | —         | —                               | Builders need admin permission to promote        |

**This is the demand.** Thousands of people want to show what they built with Claude and see what others built. Today it all lives in comment threads that get buried within days.

## 2. What people post (patterns)

1. **A link + one line.** "www.X.com — ระบบ POS สำหรับร้านค้าไทย", "โปรแกรมถอดแบบก่อสร้าง". The link preview (OG image + title) does most of the work.
2. **Build proof, not revenue.** "ประมาณ 2 weeks 700 commits", "6 เดือน ได้เท่านี้", "สร้างด้วย claude ทั้งหมด", "สาย solo".
3. **Traction when they have it, in any unit.** "เริ่มขายได้บ้างแล้ว", "users จริง 3–4 ระบบ", "มูลค่าการซื้อขายผ่านระบบ ~100M/เดือน". Rarely MRR, and almost never Stripe.
4. **Thai vertical tools dominate:** POS for Thai shops, hotel systems (OTA, payroll, ตม.30, tax), construction takeoff, school management, supermarket promo comparison, camping and parking finders, legal auction maps, visual-novel and AI-video makers, journaling apps, portfolios.
5. **Enterprise/internal work** that can't be shown in detail ("enterprise grade… ให้รายละเอียดมากไม่ได้").
6. **Hesitation:** "ไม่กล้าเอามาลง กลัวสังคมประนาม" (bots). Some people won't post publicly without a softer format.
7. **Comment-level upvotes are the ranking:** top comments got 2.9K / 940 / 342 likes. The community already votes.
8. **Replies ask how it was built** ("ใช้ server อะไร", "รัน Docker ได้ไหม") and **ask to try it** ("ขอทดลองระบบหน่อย"). That's stack curiosity plus demand for demos and leads.

## 2b. Logged-in re-study (102 threads)

The larger sample confirms §2 and adds five things that change the product:

| Finding                                                                                                                                                                        | Share of sample (rough) | Implication for JaoPor                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------- |
| **Traction is stated in users, not money:** "13,000 ช่าง / 700,000 users", "13,000 users, DAU 500–600", "ร้านใช้จริง 30+ ร้าน", "ขายได้บ้างแล้ว", "ทำเงินให้บริษัทหลายสิบล้าน" | ~1 in 6                 | Users / downloads / visitors must be first-class verified numbers, next to MRR         |
| **Mobile apps**: App Store / Play links (baby tracker, law app, EV-charger finder, sports booking)                                                                             | ~1 in 8                 | RevenueCat + store links as project types                                              |
| **LINE bots / LINE OA** with no website (todo, calorie counter, blood-pressure log, fridge manager, AI secretary, credit-card picker)                                          | ~1 in 8                 | "LINE OA" must be a project type; website URL can't be required                        |
| **Build story is the brag:** "2 weeks 700 commits", "2 ชั่วโมงผ่าน claude code", "ทำคนเดียว 100%", "1 เดือน", "Claude + Codex"                                                 | ~1 in 4                 | GitHub build proof + "time to build" + tools used are headline fields                  |
| **Asks from the community:** "อยากให้มีผู้ใช้งานเยอะ ๆ", "ใครมีไอเดียหากลุ่มเป้าหมาย", "ขอ feedback", "ขอทดลองใช้", invite/referral codes; beginners asking how to start       | ~1 in 5                 | A "looking for: users / feedback / testers / co-founder / buyer" flag on every project |

Also seen: Thai civic/vertical tools (disaster GIS, flood alerts, labor-rights AI, Shopee price history, fake-page checker, taxi meter, school/farm/hotel systems, B2B factory matching), personal/family tools, hobby games and open-source repos. Most are **free and pre-revenue**.

**The community is already building this, by hand.** One member made a static directory of the thread (`open.thaith.ai/1claude`: projects harvested from comments, owner wording, links unverified, filters by category/platform; "2,200+ comments… still incomplete"). Another posted a categorized index as a comment, and people asked the admin not to delete the post. A separate Thai SaaS directory (saasthai.com, ~190 products, votes + reviews) exists but has **no verified numbers** and targets registered SaaS companies, not solo AI builders.

**So demand is proven, and the gap is:** (1) owner-managed profiles that stay current, (2) **verified** numbers (revenue _and_ users), (3) a share card worth posting back into the thread, (4) a way to ask for users/feedback. Nobody does all four.

## 3. What this means for JaoPor

> **Adopted 2026-09-29** (Project.md §1/§6): built the same day: any-link listing, looking-for asks, RevenueCat + Plausible + Umami + GitHub sources, share card/badge/dialog. Not built yet: upvotes ("ปัง"), traffic leaderboard, request-demo button, stealth listing.

**Positioning shift:**

- From "verified revenue database (for sale)"
- To **"the permanent, searchable home of the 'อวดโปรเจค' thread, where every project can level up with verified numbers"**

TrustMRR's core (verification, profiles, leaderboard, share, marketplace) stays. The **entry point** changes from "connect Stripe" to "show your project".

| Thread today                             | JaoPor                                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Buried after 3 days                      | Permanent profile page + searchable directory (category, AI tool, solo)                                     |
| Link preview only                        | **Paste a URL → auto-fill** name/description/image from its OG tags (30-second listing)                     |
| "2 weeks, 700 commits" = trust-me        | **Build proof** (GitHub: first commit, commits, % Claude co-authored)                                       |
| "users จริง / ขายได้บ้างแล้ว" = trust-me | **Verified traction** (users, downloads, visitors) and **verified revenue** (Stripe, RevenueCat, App Store) |
| Comment likes                            | **Upvotes** ("ปัง") → weekly/monthly leaderboards incl. **"1 คน + Claude" (solo)**                          |
| "ขออนุญาตแอดมิน ฝาก…"                    | A place built for launching, and a **share card + badge** to post back into the group                       |
| "ขอทดลอง" replies                        | "Request demo / Contact builder" → later: hire the builder, buy the project (marketplace)                   |
| Fear of judgement                        | Only positive reactions (no downvotes), optional "stealth" listing later                                    |

**Proof ladder** (each step is a badge; profiles and ranking reward climbing it):

`Listed` → `Built with Claude (claimed)` → `Build proof (GitHub)` → `Traction verified (users / downloads / visitors)` → `Revenue verified (MRR)`

**Growth loop:** the next "อวดโปรเจค" thread → people comment their **JaoPor card** (OG image with numbers + badge) instead of a bare link → viewers click through → list their own.

## 4. Numbers we can verify with read-only credentials

| Metric                                                                     | Source                                                         | Credential (read-only?)                                                                  | Effort                                                            | Notes                                                                                          |
| -------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| MRR, revenue, subscribers                                                  | **Stripe**                                                     | Restricted key ✅ (live)                                                                 | done                                                              | Web SaaS                                                                                       |
| MRR, revenue 28d, active subs, trials, **active users 28d**, new customers | **RevenueCat** API v2 `GET /v2/projects/{id}/metrics/overview` | v2 secret key with **read-only** "charts metrics" permission ✅                          | **S**: one call, pre-aggregated                                   | **Best single source for mobile apps** (iOS + Android + web subscriptions). Near-real-time.    |
| **Downloads** (installs, redownloads), proceeds, active devices            | **App Store Connect** Sales & Trends / Analytics reports       | API key with **Sales and Reports** or **Finance** role (can't publish or edit apps) ✅   | M: JWT signing, gzipped TSV reports, daily                        | Role can't change after creation; Analytics reports need a one-time report request.            |
| **Installs**, active devices, ratings                                      | **Google Play** bulk reports (Cloud Storage bucket)            | Service account with "View app information and **download bulk reports** (read-only)" ✅ | M/L: GCS bucket, monthly CSVs, 3–7 day lag, ~24h permission delay | Setup is fiddly for users; guide needed.                                                       |
| **Website visitors**                                                       | **Plausible** Stats API                                        | API key with `stats:read:*` scope ✅                                                     | S                                                                 |                                                                                                |
| Website visitors                                                           | **Umami** (Cloud)                                              | API key (read)                                                                           | S                                                                 | Popular with indie devs, privacy-first                                                         |
| Visitors / **active users** / events                                       | **PostHog**                                                    | Personal API key with scoped `query:read` ✅                                             | S/M                                                               | Common in AI-built SaaS                                                                        |
| Visitors / users                                                           | **Google Analytics 4**                                         | OAuth `analytics.readonly`                                                               | M + Google app verification                                       | Most-used, but OAuth review takes time                                                         |
| **Signups/users** in own DB (Supabase/Firebase)                            | —                                                              | ❌ only full-power service keys exist                                                    | —                                                                 | **Don't accept**; offer a signed "report users" endpoint later, clearly labelled self-reported |
| Build proof                                                                | **GitHub App**                                                 | Read-only repo metadata/contents ✅                                                      | M                                                                 | First commit, commits, active days, Claude co-authored %                                       |
| Visitors (fallback, no analytics tool)                                     | **JaoPor pixel** (our own script)                              | Nothing to share: we count                                                               | M                                                                 | Counts from install day only                                                                   |

**Recommended order:**

1. **RevenueCat** (apps: revenue + active users in one call)
2. **Plausible / Umami / PostHog** (visitors/users, small)
3. **App Store Connect** (downloads)
4. GitHub build proof
5. Google Play (fiddly)
6. GA4 (OAuth review)

Each new source moves from "เร็ว ๆ นี้" to live in the ProviderStrip.

**Display rule:** revenue leaderboard = verified revenue only. A separate **Traction** board (users/downloads/visitors). Never convert users into MRR. Every number carries its source + "verified" stamp; self-reported numbers stay grey and unranked.

## Sources

- [RevenueCat Overview metrics](https://www.revenuecat.com/docs/dashboard-and-metrics/overview), [v2 metrics endpoint discussion](https://community.revenuecat.com/third-party-integrations-53/available-metrics-in-v2-api-endpoint-3600)
- [App Store Connect Analytics reports API](https://developer.apple.com/help/app-store-connect-analytics/overview/analytics-reports-api/), [roles explained](https://appsubmit.io/guides/app-store-connect-roles-explained)
- [Google Play: download and export reports](https://support.google.com/googleplay/android-developer/answer/6135870?hl=en)
- [Plausible Stats API](https://plausible.io/docs/stats-api), [Umami API](https://docs.umami.is/docs/api), [PostHog personal API keys](https://posthog.com/docs/api/personal-api-keys)

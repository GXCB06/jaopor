# Owner outcomes: spec (what an owner gets back from listing)

> Written 2026-10-11. **Proposal for owner review; no code or migration yet.** This is the "Value" half of [DISCLOSURE_SPEC.md](DISCLOSURE_SPEC.md): an owner who lists and verifies should be able to see what JaoPor sent them. Without it, verifying feels like unpaid work for the platform.

## 1. What exists today (checked in the code, 2026-10-11)

| Fact                                                                                                                                                                                                     | Where                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Builder **profile** views are counted: one row per profile, day and viewer hash (HMAC of a random browser id under a daily key; no IP; owner's own visits skipped). The dashboard shows the last 7 days. | `src/components/builder/ProfileViewBeacon.tsx`, `src/app/api/profile-view/route.ts`, `profile_views` table, `src/lib/data/me.ts` |
| The dashboard shows each project's **own-site** visitors for 7 days, but only when a traffic source is connected (`visitors7d`).                                                                         | `src/lib/data/me.ts`                                                                                                             |
| Contact requests received are counted (7 days, pending).                                                                                                                                                 | `src/lib/data/me.ts`                                                                                                             |
| **Not counted:** views of a project page, and clicks from a JaoPor page out to the project (the link is a plain `href`).                                                                                 | `src/components/profile/ScreenshotGallery.tsx` (the website link), no `startup_views` table                                      |
| The add-project funnel (`analytics.funnel_events`) is applied. It measures **builders adding projects**, not visitors reaching projects, so it does not answer this.                                     | `20261011120000_add_funnel_events.sql`                                                                                           |

## 2. What the owner should see

On the dashboard, per project, last 7 and 30 days:

1. **Project page views** (unique per browser per day).
2. **Clicks out** to the project (website, App Store, Google Play, LINE, GitHub), per destination.
3. **Where viewers came from**, in coarse buckets: JaoPor home, directory/search, a board, the owner's own share link (via the existing UTM), another site, direct. No full referrer URL stored.
4. **Saves / follows** and **contact requests** (already there for contact requests).

Plus one honest line under the numbers: "นับโดย JaoPor จากผู้เข้าชมที่เปิด JavaScript; ตัวเลขนี้ไม่รวมบอตที่เรากรองได้" (counted, not verified; bots are filtered best effort).

Why this order of work: it needs no one else (no interviews, no new audience), and it turns "list your project" into "see who came", which is the part an owner can check against their own analytics.

## 3. Design

- **Same privacy design as profile views:** random browser id kept in `localStorage`, server stores an HMAC under a daily key (rotating), unique per project, day and hash; no IP read, no cookie, owner and co-members skipped, always answers 204.
- **Tables (server-written, RLS on, no client grants):** `startup_views (startup_id, day, viewer_hash, source_bucket)`, `startup_clicks (startup_id, day, viewer_hash, target, source_bucket)`. Owners and members read their own project's rows through a `security definer` function that returns daily counts only (never hashes).
- **Click counting without breaking the link:** keep the real `href`; add a tiny client handler that fires `navigator.sendBeacon` on click. The link works with JavaScript off, and a failed beacon never blocks navigation. (A `/go/<slug>` redirect would count more reliably but adds a hop, hides the destination from hover, and invites abuse; not recommended for v1.)
- **Abuse and noise:** rate limit per hash and project; drop known bot user-agents on the server; count at most one view and one click per target per browser per day.
- **Demo projects** (`is_demo`) are not counted.
- **Retention:** raw rows older than 90 days are rolled into daily counts and deleted (same job family as `prune_funnel_events`).
- **Privacy page:** add the two counters to `/privacy` (th + en) in the same change; no consent banner is needed for a cookie-free first-party counter, but the owner decision D8 (PDPA banner) is still open for GA.

## 4. Interaction with disclosure levels

Owner outcome numbers are the **owner's own data**: they are shown only on the owner's dashboard and are never public by default. If an owner later wants to show "N people visited this month" publicly, that is a new, separate choice with its own level; not part of v1.

## 5. Order of work

1. Design.md: the dashboard "ผลที่ได้จาก JaoPor" block and its empty state. (small)
2. Migration (tables + counts function + prune) with RLS smoke; **needs your approval to apply**. (medium)
3. Beacons: page view on the project page, click handler on every outbound link, source bucket. (medium)
4. Dashboard block + `/privacy` text (th + en) + tests (hashing, dedupe, owner skip, bot filter). (medium)

## 6. Open questions for you

| ID  | Question                                                                                         | Recommendation                                      |
| --- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| V1  | Count only project page views and outbound clicks in v1, or add saves/follows to the same block? | Add saves/follows (already stored); no new tracking |
| V2  | Weekly summary of these numbers in the existing bell, later by email?                            | Bell first, matches the plan's return loop (P3)     |
| V3  | Should the clicks beacon also run for signed-in members of the project?                          | No; owner and members are skipped                   |

# Disclosure levels: spec for R2 (privacy-first proof)

> Written 2026-10-11. **Proposal for owner review; no code or migration yet.** Detail for pillar P1 and decision D1 in [MAJOR_REVAMP_PLAN.md](MAJOR_REVAMP_PLAN.md). The migration is written but applied only after the 14 Oct post and your explicit approval (CLAUDE.md rule 5).

## 1. The idea in one paragraph

Three things are tied together today and should be separate: **Verified** (the number comes from a source we read), **Visibility** (how much the public sees), **Value** (what the owner gets back). This spec splits the first two. An owner connects a source, we verify, and then the owner picks, per group of numbers, what visitors see: the number, a range, only the growth, only a "verified" badge, or nothing. The stamp always says what was verified and when; it never claims the business is good.

## 2. What exists today (checked in the code, 2026-10-11)

| Fact                                                                                                                                                                                                                                       | Where                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Metric values are plain columns on `startups` (`mrr_cents`, `revenue_30d_cents`, `revenue_prev_30d_cents`, `revenue_all_time_cents`, `customers`, `active_subscriptions`, `active_users`, `visitors_30d`, `visitors_prev_30d`, `build_*`). | `src/lib/supabase/database.types.ts`                                                |
| `anon` and `authenticated` hold table-level `select` on `startups`; RLS only filters rows (published / own), **not columns**.                                                                                                              | `20260929050526_schema_v1.sql` (grants), `20260929055857_merge_select_policies.sql` |
| Public reads are `select *` on `startups` through the cookie-free anon client.                                                                                                                                                             | `src/lib/data/startups.ts` (`SELECT`)                                               |
| Chart history is public for published startups: `revenue_snapshots`, `traffic_snapshots`, `build_activity`.                                                                                                                                | the policies named in the migrations above                                          |
| The `search_startups` RPC returns `mrr_cents` and orders by it.                                                                                                                                                                            | `20260930102108_search_startups.sql`                                                |
| Metrics are read in about 20 places: boards, directory sort, home rows, project page, builder profile, cards, share kit, OG image, badge route, milestones, Olympics.                                                                      | `grep mrr_cents\|revenue_30d_cents\|visitors_30d` (list in section 6)               |
| There is a precedent for hiding columns: `profiles` revokes column `select` and exposes masked reads through `get_profile()` and `field_visibility` (`public \| members \| hidden`).                                                       | `20260930155147_builder_profiles.sql`, `20261001021524_profile_rpc_hardening.sql`   |

**Consequence:** hiding a value in the UI is not enough. Anyone can call the Supabase API with the public anon key and read the raw columns and the snapshot tables. The masking must live in the database.

## 3. Levels

One level per **group** of numbers (not per column), so the owner makes four small choices, not fifteen.

| Group     | Columns                                                                                                                   | Source kind                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `revenue` | `mrr_cents`, `revenue_30d_cents`, `revenue_prev_30d_cents`, `revenue_all_time_cents`, `customers`, `active_subscriptions` | Stripe, RevenueCat                   |
| `users`   | `active_users`                                                                                                            | RevenueCat                           |
| `traffic` | `visitors_30d`, `visitors_prev_30d` (+ `traffic_snapshots`)                                                               | JaoPor, Plausible, Umami, Cloudflare |
| `build`   | `build_commits`, `build_stars`, `build_first_commit_at`, `build_ai_commits` (+ `build_activity`)                          | GitHub                               |

| Level     | Visitors see                                               | Chart / history | Ranks on boards    | Example                       |
| --------- | ---------------------------------------------------------- | --------------- | ------------------ | ----------------------------- |
| `exact`   | the number                                                 | yes             | yes, by value      | MRR ฿12,400                   |
| `band`    | a range from a fixed ladder                                | no              | no (see 6.2)       | MRR ฿10k–25k                  |
| `growth`  | the change versus the previous period, no amount           | change only     | growth boards only | +18% vs the previous 30 days  |
| `badge`   | that it is verified, with source and checked-at, no figure | no              | no                 | "รายได้ยืนยันแล้วผ่าน Stripe" |
| `private` | nothing, including the badge                               | no              | no                 | (owner still sees everything) |

- Missing key in `metric_disclosure` means `exact`, so **nothing changes for existing projects** until the owner chooses.
- `growth` needs a previous period with a value greater than zero; otherwise it falls back to `badge` and the UI says why.
- A level never combines with another for the same group (no "band + growth"). Combining them narrows a hidden value too much (see 7).

### 3.1 What each label is allowed to say

Same rule as Design.md voice: **"ยืนยัน" only for what a source confirmed; "นับโดย" for what JaoPor counted.** `badge` text names the source and the check time and states what was verified ("ยืนยันที่มาของรายได้"), never that the business is successful. `private` hides the source too; such a group does **not** count toward the project's proof level on public pages (the owner's dashboard still shows it as connected).

### 3.2 Bands

Fixed, shared ladders (no per-owner bands, so a band never narrows). Proposed, to be tuned with real data:

- Revenue (per month, THB-equivalent): under ฿1k · ฿1k–5k · ฿5k–10k · ฿10k–25k · ฿25k–50k · ฿50k–100k · ฿100k–250k · ฿250k–500k · ฿500k–1M · over ฿1M. Each band spans at least 2x of its lower edge, so it never pins a value.
- Visitors per 30 days and commits use the same 1-2.5-5-10 idea.
- Bands are computed in the database from the stored value, not in the browser.

## 4. Data model (migration outline, not applied)

1. `startups.metric_disclosure jsonb not null default '{}'` with a check trigger (copy the pattern of `field_visibility`: object, keys in `revenue|users|traffic|build`, values in the five levels).
2. **Masked public surface.** Recommended: a view `public.startups_public` (columns masked per level; grants to `anon`/`authenticated`), and **revoke `select` on the raw metric columns** from `anon` and `authenticated` on `startups`. The view carries `band_*` text columns and `growth_*` percentages for the levels that need them.
   - Owners read their own raw numbers through a `security definer` function (`get_my_startup_metrics`) or the server's admin client in the dashboard; never through the public path.
   - **Spike first:** confirm PostgREST can embed `owner:profiles` through the view (the `SELECT` string uses a named FK). If not, expose the owner fields as view columns.
   - Alternative if the view is too invasive: precomputed `public_*` columns written by the sync and by a trigger on `metric_disclosure`. More columns, same read path, but easier to forget a consumer.
3. **Snapshots.** Replace the public `select` policies on `revenue_snapshots`, `traffic_snapshots`, `build_activity` so a row is public only when the group's level is `exact`. For `growth`, the view supplies the single percentage, never the series.
4. `search_startups` stops returning `mrr_cents` and stops ordering by it unless the level is `exact`.
5. A trigger that clears cached public aggregates (if any) when the level changes, and a log row in an owner-readable history of changes (so "I changed it" is not lost).
6. RLS smoke tests added to `supabase/tests/rls_smoke.sql` (list in 8). **Note:** that file is currently modified in the working tree by someone else; merge, don't overwrite.

## 5. Owner experience

- **Where:** a new step in the verify flow right after a connection succeeds ("ใครเห็นตัวเลขนี้?"), plus the same control per group in the project's settings. Design.md gets the new pattern **before** any component (CLAUDE.md rule 2).
- **Preview before publish:** the owner sees exactly what a visitor sees at the chosen level (card + project header), the way the share card preview already works.
- **Default for new connections (recommendation, your call):** `revenue` → `badge`, `users` → `badge`, `traffic` and `build` → `exact`. Reason: revenue is the sensitive group; the goal metric is "owners with at least one verified or opted-in metric" (plan section 5), and a high-friction default hurts that. Existing projects stay on `exact`.
- **Change anytime**, effective at the next page revalidation; the dashboard shows "คนอื่นเห็น: …" next to each number.
- **Copy rules:** no pressure ("แนะนำให้เปิดเผย" is out), no shame for `private`. Each level has one plain sentence of what it does.

## 6. Every surface that must respect the level

Audit list for the implementation; each needs a test that a hidden value is absent from the response, not only invisible.

| Surface                                                             | Rule                                                                                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Project page and builder profile (`startup/[slug]`, `u/[username]`) | Render by level; hide charts unless `exact`; keep source + checked-at for `badge`.                                     |
| Cards (`StartupCard`, home rows, directory)                         | Same; `band` shows the range, `badge` the stamp.                                                                       |
| Boards (`leaderboard.ts`, `getBoard`)                               | Value boards: `exact` only. Growth board: `growth` and `exact` (percentage). Hidden projects are absent, not "n/a".    |
| Directory sort (`DIRECTORY_SORTS`)                                  | `mrr`/`visitors`/`commits` sort only `exact` rows; others sort after, with a stable neutral order.                     |
| Search RPC and `/api/search`                                        | No `mrr_cents` for non-`exact`; no ordering by a hidden value.                                                         |
| OG image, `/api/share-card`, `/api/badge`, `share.ts`               | Use the masked values only; a `private` group produces no figure in any image.                                         |
| Milestones and feed (`milestones.ts`, `milestones-store.ts`)        | A milestone "crossed ฿X" is itself a disclosure: publish only for `exact`; suppress for the other levels.              |
| Olympics (`olympics.ts`)                                            | Province sums use only `exact` rows, or the page says it counts only projects that show exact numbers.                 |
| Public API/`select *` consumers                                     | Replace `select("*")` with the view; lint rule or test that no code reads the raw metric columns on the public client. |

## 7. Inference risks (what a determined visitor could still learn)

| Leak                                                                 | Mitigation                                                                                                                        |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Rank on a value board reveals order, then exact values by neighbours | Value boards include `exact` only; hidden levels never rank.                                                                      |
| Band + growth over several months narrows the value                  | One level per group; growth is rounded (whole percent) and shown for the latest period only, never as a series.                   |
| Milestone posts reveal thresholds                                    | Suppressed unless `exact` (section 6).                                                                                            |
| Changing level over time ("hid it after it dropped")                 | Not a technical leak; the history of changes is kept for the owner and, optionally, shown as "ซ่อนตัวเลขตั้งแต่ …". Decide in O3. |
| Cached/ISR pages or CDN keep the old exact value after a change      | Revalidate the project, builder and board paths on level change; test with a real change.                                         |
| Webhook, cron or sync logs echo values                               | Already redacted per CLAUDE.md; add a check that new code never logs metric columns.                                              |

## 8. Tests (written with the migration)

- **Unit:** band ladder edges, growth rounding and fallbacks, level-to-surface matrix (table-driven from section 6).
- **RLS smoke** (anon and another user): raw metric columns are not selectable; the view returns masked values for each level; snapshots return no rows unless `exact`; the owner can read own raw values; changing the level as a non-owner fails.
- **Advisors:** `get_advisors` security and performance clean.
- **E2E:** with a `badge` project, the number is absent from the HTML, the RSC payload, the OG image URL's rendered text and `/api/badge`; with `private`, the project shows no stamp and no figure.

## 9. Order of work (R2, after the migration is approved)

1. Spike: PostgREST embed through the view; measure ISR impact. (small)
2. Design.md: disclosure control, level labels, previews. (small)
3. Pure code + tests: levels, bands, growth, surface matrix. (medium)
4. Migration + RLS smoke + advisors + regenerate types. (medium; needs your approval to apply)
5. Switch the public data layer and every surface in section 6 to the view. (large)
6. Owner UI: verify-flow step, settings, preview, dashboard line. (medium)
7. Growth board + `badge` variants in OG/share/badge. (medium)

## 10. Open questions for you

| ID  | Question                                                                                | Recommendation                                                           |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| O1  | Default level for new `revenue` and `users` connections                                 | `badge`; `traffic` and `build` stay `exact`                              |
| O2  | Does `private` also hide that the group is connected (no stamp at all)?                 | Yes (what "private" means), and it does not raise the public proof level |
| O3  | Show visitors "ซ่อนตัวเลขตั้งแต่ …" when an owner moves from `exact` to a hidden level? | No by default; keep the history for the owner only                       |
| O4  | View-based masking or precomputed `public_*` columns (section 4.2)?                     | View, after the embed spike; fall back to columns if the spike fails     |
| O5  | Band ladder in THB only, or also USD for foreign-currency projects?                     | THB-equivalent via the stored FX; show the ladder in the owner's preview |

## 11. Not in this spec

Owner outcome numbers (project page views, outbound clicks) are a separate small piece, specified in [OWNER_OUTCOMES_SPEC.md](OWNER_OUTCOMES_SPEC.md). The per-project switch for hiding the "built with AI" label (decision D2) is also separate; it touches only presentation, not the metric columns.

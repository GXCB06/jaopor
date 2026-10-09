# JaoPor launch-readiness report

Date: 2026-10-08 · Scope: the production system as a whole (jaopor.vercel.app, Supabase `letfxefyqxxrfujpwtri`, repo `GXCB06/jaopor` at `ea27ff4`) · Mode: **read-only**. Nothing was changed in production, the database, or the code.

**How it was checked:**

- **Code review:** every API route, server action, the proxy, the SSRF guard, the live map and the cron.
- **Supabase (read-only SQL):**
  - security and performance advisors;
  - every table's RLS, grants and column grants;
  - storage buckets and policies;
  - every security-definer function;
  - public auth settings and signing keys;
  - data volumes and sizes.
- **Production over HTTP:**
  - caching and security headers;
  - the OAuth redirects for Google and GitHub, and the app name each one shows at sign-in;
  - 404 behaviour;
  - the production e2e suite: **74 / 74 passed**.
- **Plan limits** from the Supabase and Vercel documentation (fetched today).
- **Couldn't be checked from here**, so the owner must check:
  - Vercel usage, environment variables and runtime errors (the Vercel connector returned 403 for this account);
  - Google's publishing status;
  - the Supabase redirect allowlist and manual-linking switch;
  - Supabase logs (the logs API returned backend errors).

---

## 0. The short version

The application code is in good shape for a launch:

- RLS is on everywhere, and clients get column-level grants only.
- The SSRF guard is strong.
- Writes are rate-limited in the database (posts, comments, chat, avatars).
- Keys are encrypted.
- Server-side rate limits sit on the expensive endpoints.
- 74 production e2e checks pass.

**The real launch risks are the free plans, not the code.**

1. **The live map (Supabase Realtime presence) is the first thing to break.** At roughly 50 people online at once it passes the Free plan's message rate. A single busy launch day can use the whole month's 2 million Realtime messages. Repeatedly exceeding Free-plan quotas lets Supabase restrict the **whole project** (including returning 402 to every API call), which would take the site down, not only the map.
2. **There is no database backup.** The Free plan has no daily backups. One bad migration or mistaken delete is unrecoverable today.
3. **Vercel Hobby pauses the project for up to 30 days** when an included limit is exceeded. Hobby also keeps only 1 hour of runtime logs and is for non-commercial use.
4. **Sign-in:**
   - Google sign-in may still be in "Testing" mode (unverified from here).
   - Google shows `letfxefyqxxrfujpwtri.supabase.co` as the app.
   - GitHub shows **"MRRMafia"**.
5. **Nobody would know if the site broke at 3 AM.** There is no uptime check, logs last 1 hour, and the cron's result is never recorded.

---

## 1. Security

### 1.1 Authentication and authorization ✅ with notes

- **Providers:**
  - Google and GitHub are on.
  - **Email is also on** (`external.email: true`, sign-up open, confirmation required). There are 0 email users and the UI doesn't offer email, but anyone can call the sign-up API (MEDIUM, owner toggle).
- **Sessions:**
  - Tokens are signed with **ES256**, so `getClaims()` in `src/proxy.ts` verifies locally with no Auth round trip per page. ✅
  - Server routes use `getUser()` / `getClaims()` before owner-only work, and owner checks are repeated in SQL (`eq("owner_id", …)` + RLS). ✅
- **Return path:**
  - `safeNextPath` allows only one leading `/`, no `//` or `\`, at most 500 characters, and never login or onboarding. ✅
  - The callback keeps `locale`. ✅
  - e2e confirms that `/new`, the dashboard, messages and the edit page all come back after sign-in. ✅
- **Supabase `redirect_to`:** Supabase accepts any value at `/authorize` and validates it against the **Redirect URLs allowlist** at callback time. The allowlist couldn't be read from here. The owner should confirm it contains only `https://jaopor.vercel.app/**` and localhost, and **no wildcard such as `https://*.vercel.app/**`**.
- **Leaked-password protection is off** (advisor WARN). It only matters for email/password, so it's irrelevant once Email is disabled.

### 1.2 RLS and storage policies ✅

- **All 32 tables** in `public` / `private` / `storage` have RLS on.
- **Six tables have RLS with no policy** (`rate_events`, `live_pings`, `milestones`, `pixel_visitors`, `provider_connections`, `storage_cleanup`). This is intentional deny-all; they are server-only. **`provider_connections` (encrypted keys) can't be read by any client.** ✅
- **Anonymous column grants:**
  - `profiles` exposes only `id, handle, display_name, avatar_url, headline, status, x_handle, show_in_directory, created_at, updated_at`;
  - **not** bio, province, social links or email. Those go through `get_profile` (service role only) and per-field visibility. ✅
- **Client writes are column-limited:**
  - e.g. `startups` can't receive verified numbers, `verification_status`, `owner_verified_at` or `is_demo`;
  - `profiles` can't receive avatar paths. ✅
- **Storage:**
  - 4 public buckets with MIME and size limits (logos 1 MB, screenshots / post images 3 MB, avatars 1 MB server-only).
  - Listing is restricted to your own folder; uploads only into your own folder, project, or post (post images within 15 minutes of the post). ✅
  - **Gap (MEDIUM):** nothing limits the **number of objects**. Examples:
    - a logo is uploaded **before** the project insert, so a refused insert leaves an orphan;
    - screenshot files can be uploaded without a row.
  - One determined account could fill the Free plan's 1 GB.
- **Security-definer functions:** all 26 have `search_path = ''`. Those callable by clients are intended:
  - `can_see` / `can_see_as` (read checks);
  - `take_rate`;
  - `startup_owner`;
  - `is_confirmed_member`;
  - `can_message`;
  - `contact_accepted`.

  The `private` schema isn't exposed by the API. ✅

### 1.3 Secrets and environment variables

- **The repo is public:**
  - No secrets in tracked files or git history: I searched for Google/Gemini/Stripe/GitHub/Supabase secret patterns.
  - Only `.env.example` (public URL + publishable key).
  - `.claude/logs` isn't tracked. ✅
- **GitHub secret scanning and push protection are disabled** on the public repo. They're free for public repos; turn both on (owner, 1 minute).
- **Already exposed in chat (not public), rotate before launch:**
  - the Google OAuth client secret (2026-09-29);
  - the Gemini key (2026-09-30).
- **Server-only variables used by the code:** `SUPABASE_SECRET_KEY`, `KEY_ENCRYPTION_SECRET`, `CRON_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GITHUB_TOKEN`.
- **Public variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_LIVE_VISITORS`.
- **`/api/health`** reports only whether each secret is set (booleans) plus the region. It's acceptable, but it tells anyone whether the deployment is misconfigured (LOW).

### 1.4 Exposed API keys ✅

- **Only the publishable key reaches the browser,** which is correct.
- **The legacy JWT `anon` key is still enabled** alongside the new publishable key. It's harmless (same role), but it can be disabled once nothing uses it (LOW).

### 1.5 Privileged server actions ✅

- The service role (`createAdminClient`) is used only in:
  - cron;
  - `collect` / `live` / `profile-view` (fixed writes);
  - source connect / sync (after the owner check);
  - badge;
  - storage cleanup.
- The cron requires `Bearer CRON_SECRET`, compared in constant time, and fails closed when it's unset.
- Source routes require same-origin JSON plus a signed-in owner.

### 1.6 Recent security-sensitive changes ✅

All are covered by RLS smoke tests T127–T136b (138 checks pass):

- **slug history:** old slugs are reserved against takeover; the badge is served on old slugs;
- **owner `private` status:** owners can't set or undo a moderator's `hidden`;
- **LinkGithub (`linkIdentity`).**

**Not re-verified here:** that every public surface (sitemap, search, OG, badge, share card) hides `private` projects. They all use the anon client, so RLS applies, and T132–T136 cover the policy.

### 1.7 SSRF protection ✅ (strong)

`src/lib/net/public-url.ts` is used for every user-supplied URL:

- https on port 443 only;
- no credentials in the URL and no IP literals;
- blocked local suffixes;
- **the IP is checked inside the socket's DNS lookup** (no rebinding gap);
- private, link-local and metadata ranges blocked for v4 and v6;
- manual redirects (at most 3), each re-checked;
- a body cap after decompression, and a deadline.

The auto-fill README fetch goes to a fixed host (`api.github.com`) with a strict repo regex.

### 1.8 Rate limits

| Endpoint                                      | Limit today                                                                                                                             | Verdict                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Posts / comments / chat / avatars             | In SQL (`take_rate`): 5 posts, 30 comments, 200 messages, 20 avatar changes per day                                                     | ✅ survives cold starts and many instances                                                                     |
| Projects                                      | 5 per account (DB trigger)                                                                                                              | ✅                                                                                                             |
| `POST /api/startups/preview` (link auto-fill) | Signed-in only, 20/min per user, **per server instance** (in-memory); 3 s and 512 KB cap                                                | OK (a new instance resets the count)                                                                           |
| `POST …/autofill` (Gemini)                    | Owner only, 1 per 10 s per user per instance                                                                                            | OK                                                                                                             |
| `POST …/detect-stack`                         | Owner only, 1 per 5 s per user per instance                                                                                             | OK                                                                                                             |
| `POST …/sources/{source}` (connect)           | Owner only, **no limit**                                                                                                                | MEDIUM: each try calls the provider with the founder's own key; cheap for us, but unbounded                    |
| `PATCH …/sources` (refresh)                   | 10 min cooldown                                                                                                                         | ✅                                                                                                             |
| `POST /api/collect` (snippet)                 | Anonymous; works only for owner-verified projects from their own origin; at most `NET_CAP` new visitors per network per project per day | ✅ bounded                                                                                                     |
| `POST /api/live/ping`                         | **Anonymous, no limit**; one upsert per call (rows pruned after 10 min)                                                                 | HIGH (abuse): a script can flood it and inflate the live count, and every call is a Vercel function invocation |
| `POST /api/profile-view`                      | **Anonymous, no limit**; a random `vid` per call creates **a new row every time**, and rows are never deleted                           | HIGH (abuse): unbounded table growth; also MEDIUM privacy (see §8)                                             |
| Realtime channel `live-visitors`              | **Public**; anyone with the publishable key can join and broadcast                                                                      | HIGH: a script broadcasting to everyone burns the Realtime message quota (see §2)                              |

### 1.9 Abuse paths (summary)

1. **Function-invocation flood** on any anonymous endpoint (`/api/live/ping`, `/api/profile-view`, `/api/collect`, `/api/search`, pages). On Hobby, **exceeding 1 M invocations or 4 CPU-hours pauses the project for up to 30 days.** Vercel's DDoS mitigation is on by default; Attack Mode is the emergency switch.
2. **Realtime broadcast spam** in the public presence channel: drains the 2 M messages a month and can trigger Free-plan restrictions for the whole Supabase project.
3. **`profile_views` row growth** from random viewer IDs.
4. **Storage filling** through orphan uploads (signed-in only).
5. **Email sign-up API**: creates unconfirmed users. The built-in mailer is capped per hour, so the cost is small.

---

## 2. Cost and abuse

| Operation                                                              | External cost                                                                                                              | What a spike does                                                                                                                                                                                                                                                                                                                                                                 | Verdict                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Gemini auto-fill** (`gemini-2.5-flash`)                              | **$0 on a free AI Studio key.** It becomes paid only if the key's Google Cloud project has billing enabled                 | Free-tier per-minute / per-day caps get hit, then `geminiJson` returns null and the route **falls back to the page's own metadata** (`source: "page"`). The owner sees a less polished draft; nothing breaks. 25 s timeout.                                                                                                                                                       | ✅ provided billing is off (owner checks)                           |
| **Website auto-fill** (`/preview`)                                     | None (our server's CPU and bandwidth)                                                                                      | Bounded: 3 s, 512 KB, signed-in, per-user throttle                                                                                                                                                                                                                                                                                                                                | ✅                                                                  |
| **Verification connect / sync**                                        | Provider APIs with the founder's key (Stripe, etc.); GitHub at 60 requests/h without `GITHUB_TOKEN`                        | Many GitHub verifications in one hour can hit the 60/h unauthenticated limit, so build proof returns `rate_limited`. The daily cron runs 3 at a time with a 300 s cap                                                                                                                                                                                                             | MEDIUM: set the optional `GITHUB_TOKEN` (owner)                     |
| **Uploads**                                                            | Supabase Storage 1 GB (Free)                                                                                               | Images are compressed in the browser and capped per file. Today: 7 MB, 19 objects                                                                                                                                                                                                                                                                                                 | ✅ volume; MEDIUM abuse (§1.2)                                      |
| **Image delivery**                                                     | **Supabase egress: 5 GB + 5 GB cached (Free).** `images.unoptimized`, so logos and screenshots load straight from Supabase | About 0.4 MB per screenshot. **10,000 visitors who open 1–2 project pages ≈ 5–10 GB.**                                                                                                                                                                                                                                                                                            | **HIGH: the most likely Supabase quota to run out from real users** |
| **Live map: Realtime presence** (every visible tab)                    | Supabase Realtime: Free = 200 connections, **100 messages/s, 20 presence messages/s, 2 M messages/month**                  | Each page change sends a presence update **and** a broadcast to **every** connected tab. Messages per second ≈ N²/30 for N people online (one page change per minute each): **about 100/s at N ≈ 55**, beyond which Supabase disconnects everyone and they reconnect (a storm). A launch day with about 100 online and 2,000 visitors ≈ **2 M messages, the whole month's quota** | **BLOCKER**                                                         |
| **Live map: heartbeat** (`/api/live/ping`, every 60 s per visible tab) | 1 Vercel invocation + 1 upsert per tab per minute                                                                          | 1,000 tabs ≈ 17/s, which Vercel and Postgres handle fine. Counts against the 1 M invocations a month (1,000 tabs for 1 hour ≈ 60 k)                                                                                                                                                                                                                                               | ✅ scales (the count endpoint is CDN-cached for 30 s)               |
| **Server-rendered pages**                                              | Vercel Active CPU (**Hobby: 4 CPU-hours a month**)                                                                         | Home and project pages are **ISR (cached, revalidate 60 s)**. `/startups`, `/feed`, `/olympics`, `/builders`, `/u/*`, `/login` and `/new` render **on every request**. Estimate (≈ 50 ms CPU per render; check against the Vercel Usage tab): **1,000 people online ≈ 0.5–1.5 CPU-hours per hour**, so the monthly 4 h can go in an afternoon                                     | **HIGH** (Hobby pause risk)                                         |
| **Database writes**                                                    | Free Postgres (Nano: shared CPU, 0.5 GB RAM, 500 MB disk; 16 MB used)                                                      | Writes per visitor: 1 heartbeat per minute, rare profile views, snippet hits. All small and indexed                                                                                                                                                                                                                                                                               | ✅                                                                  |

**Answering the five spike questions directly:**

- **Increase API cost?** Not with free keys and Free plans; they throttle, they don't bill. The real risk is **restriction or pause**, not a bill.
- **Exhaust quotas?** Realtime messages first (if the live map stays on), then Supabase egress, then Vercel Active CPU.
- **Trigger provider limits?**
  - Gemini free caps (graceful fallback);
  - GitHub's 60/h (set `GITHUB_TOKEN`);
  - Supabase Auth per-IP limits on `/auth/v1/token` (see §3).
- **Overload Supabase or Vercel?**
  - Postgres won't be the bottleneck at these volumes.
  - Realtime will be.
  - Vercel's CPU quota (not its capacity) will be.
- **Excessive database writes?** Only by abuse (`profile_views`, `live_pings` floods), not by real users.

---

## 3. Scale and plan limits

**Plans today:**

- **Supabase Free:**
  - Nano compute, 500 MB DB, 1 GB storage, 5 GB + 5 GB egress, 50 k MAU;
  - Realtime: 200 connections, 100 messages/s, 2 M messages/month;
  - **no backups**; pauses after 7 days idle.
- **Vercel Hobby** (personal account `gxcb06s-projects`; the plan couldn't be read directly, but there are no teams):
  - 1 M invocations, 4 CPU-hours, 100 GB transfer, 1 M CDN requests;
  - logs kept 1 hour;
  - one cron a day;
  - **exceeding a limit pauses usage for up to 30 days**;
  - non-commercial only.

**Realistic expectation:** a post in a 511 K-member group isn't 511 K visitors. A typical well-received post reaches a few percent of members, and a few percent of those click: **roughly 1,000–15,000 visits over 2–3 days, peaking at tens to low hundreds online at once in the first hour.** This is an estimate, not data. 500+ online means the post went viral or was pinned or shared widely.

| Scenario                                                     | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | **Actual bottleneck**                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **100 online** (≈ 1,500–3,000 visitors that day)             | Pages, DB, Auth and Vercel CPU (≈ 0.1–0.2 CPU-h per peak hour) are all comfortable. **The live map passes 100 messages/s at about 55 online:** connections drop and reconnect, and the map flickers between live and fallback. The day's Realtime usage ≈ 2 M messages (the monthly Free quota) → Supabase quota warning → grace period → possible project-wide restriction                                                                                                                         | **Realtime presence** (and nothing else, if the live map is off) |
| **500 online** (≈ 8,000–15,000 visitors)                     | Realtime refuses connections beyond 200 (the map falls back to the heartbeat count). Supabase egress from images is ≈ 4–8 GB over the day, near or above the Free quota. Vercel CPU ≈ 0.3–0.8 CPU-h per peak hour. Postgres is fine (heartbeats ≈ 8 writes/s; dynamic pages ≈ 50–100 small queries/s). Sign-in bursts could meet Auth's per-IP limit on `/auth/v1/token`, because the code exchange and refreshes come from Vercel's server IPs, not users' IPs (the default bucket is 30 requests) | **Realtime** → **Supabase egress** → Vercel CPU                  |
| **1,000 online**                                             | Vercel CPU ≈ 0.5–1.5 CPU-h per peak hour, so **the Hobby monthly 4 CPU-h can be used up within a few hours → project paused up to 30 days.** Egress well over the Free quota. Postgres still OK but busy (Nano). Auth `token` 429s more likely during sign-in bursts                                                                                                                                                                                                                                | **Vercel Hobby Active CPU** (pause) and Supabase egress          |
| **5,000+ users over a short period** (e.g. 24 h, peak ≈ 200) | Invocations ≈ 50–100 k (fine). CPU ≈ 0.5–1 h (fine). Egress ≈ 3–5 GB (borderline). Realtime quota gone if the live map is on. Sign-ups ≈ 200–500 (50 k MAU: fine)                                                                                                                                                                                                                                                                                                                                   | **Realtime** (if on), then **egress**                            |

**What lifts every ceiling at once:**

1. **Supabase Pro ($25/month):** 7-day backups, no pausing, 250 GB egress, 500 Realtime connections, 5 M messages, and a spend cap.
2. **Vercel Pro ($20/month):** usage-based instead of a 30-day pause, spend management, 1-day logs, and commercial use allowed.
3. **In code:** turn the live presence off (or heartbeat-only) and make the dynamic directory pages cacheable.

**The cheapest safe launch:** live presence off + Supabase Pro (for backups and egress). Vercel Pro only if you expect more than about 300 people online at once, or after checking that current Active CPU usage leaves room.

---

## 4. Reliability

| Area                                        | Today                                                                                                                                                                                                                                                                                                                                                                  | Risk                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Database connections**                    | All app traffic uses the Data API (HTTP through the pooler), never direct Postgres connections. Currently 20 / 60 connections in use (internal services). Statement timeout 8 s                                                                                                                                                                                        | ✅ serverless can't exhaust connections                              |
| **Database load**                           | 16 MB, 1 project, 8 users. The heaviest per-request reads: `listBuilders` (loads every directory profile and filters in TypeScript, already an open item), `province_leaderboard`, search                                                                                                                                                                              | ✅ at launch scale; `listBuilders` matters at a few hundred profiles |
| **API failures**                            | Routes catch and answer with codes; pixel, ping and profile-view always answer 204; source errors are mapped to friendly codes. **There's no `error.tsx` / `global-error.tsx` / `not-found.tsx`:** a thrown error shows Next's default **English** "Application error", and a 404 shows "This page could not be found" with no header or way back (seen on production) | HIGH (quick fix)                                                     |
| **External APIs**                           | Gemini → falls back to page metadata. Site fetch → `site_unreachable`. Stripe and others → `upstream` / `rate_limited` codes, and **the last good numbers are kept** on a failed sync                                                                                                                                                                                  | ✅                                                                   |
| **Realtime**                                | On `CHANNEL_ERROR` / `TIMED_OUT` → fallback (heartbeat count, CDN-cached). **A `CLOSED` status (e.g. the server disconnecting for `tenant_events`) isn't handled**, so the map can show stale "live" data until reconnect. Kill switch: `NEXT_PUBLIC_LIVE_VISITORS=0` (needs a redeploy, because it's inlined at build)                                                | See §2                                                               |
| **Cron** (`0 20 * * *` UTC = 03:00 Bangkok) | Syncs every active / pending source, 3 at a time, max 300 s, then refreshes activity, prunes live pings, posts milestones and drains storage cleanup. **The result is only logged** (Hobby keeps 1 h). If the sync runs past 300 s, the later housekeeping steps don't run                                                                                             | MEDIUM: a failed night is invisible; fine at today's 1 connection    |
| **Images and storage**                      | Direct Supabase public URLs (no optimizer). Upload failures surface as toasts; post-image failures are cleaned up                                                                                                                                                                                                                                                      | ✅ (egress: §2)                                                      |
| **Caching**                                 | Home and project pages ISR 60 s (`X-Vercel-Cache: HIT/STALE` on production). OG / share images 300 s. Badge `max-age=3600`. Live count `s-maxage=30`. **During a Supabase outage, cached pages keep serving the last good version**; dynamic pages fail                                                                                                                | MEDIUM: more caching = more resilience and less CPU                  |
| **Deployment**                              | Every push to `master` deploys straight to production (no staging gate). Vercel keeps previous deployments for **Instant Rollback**                                                                                                                                                                                                                                    | OK; see §9                                                           |
| **Fallbacks**                               | Currency, FX (Frankfurter) and theme have defaults. The snippet answers 204 regardless. The live map has a fallback                                                                                                                                                                                                                                                    | ✅                                                                   |

---

## 5. Observability: how would you know something is broken?

**Visible today:**

- Vercel runtime logs (**1 hour** on Hobby) and the Vercel Observability charts.
- The server code's 11 `console.error` lines: `[collect]`, `[live/ping]`, `[profile-view]`, `[source connect]`, `[cron] …`.
- The Supabase dashboard: logs and the org Usage page.
- `/api/health` (whether secrets are set).
- Founders telling you.

**What would go unnoticed:**

1. **The whole site down at night** (Vercel or Supabase outage, Hobby pause, Supabase restriction): nothing alerts.
2. **The nightly cron failing or timing out**: numbers silently go stale; the log is gone after an hour.
3. **Sign-in failing** (Google still in Testing, a redirect mismatch, Auth 429): users land on `/login?error=auth` and leave. Nothing records it.
4. **A quota approaching its limit** (Realtime messages, egress, Vercel CPU): Supabase emails only once it's exceeded; Hobby just pauses.
5. **Server errors on dynamic pages** in the hours you aren't looking.
6. **Add-project drop-offs and verification failures** (that's what the funnel analytics is for).

**Minimum monitoring before launch (recommended, in this order):**

1. **An external uptime monitor (free, no code, no user data):**
   - UptimeRobot or Better Stack free plan;
   - check `https://jaopor.vercel.app/api/health` (expects 200) and `/th` every 5 minutes;
   - alert by email or the mobile app.

   This alone catches outages, pauses and restrictions.

2. **Usage alerts:**
   - Supabase: the org Usage page (no alerts on Free; look daily);
   - Vercel: Settings → Usage, notifications on. Hobby notifies as you approach limits.
3. **The daily 5-minute routine** in §10.
4. **Optional, small code task:** record each cron run (start, end, ok / failed counts) and server-side error counts in a server-only table, so a failure is still visible the next morning. This is first-party and has no privacy impact.

**Do we need an external error-monitoring service (Sentry etc.)?** **Not for launch week.**

- The uptime monitor plus the daily routine plus (optionally) the first-party cron/error log cover the failures that matter at this scale.
- Sentry adds a third-party processor, a privacy-policy change, and client-side JS on every page.
- Revisit if real users report bugs you can't reproduce, or after moving to Vercel Pro (1-day logs, Log Drains).

---

## 6. Launch UX: the new-user journey

Production e2e covers the signed-out parts: **74 / 74 pass**. They check:

- every public page in th / en;
- no raw keys;
- Thai year;
- no horizontal scroll at 375 px;
- sign-in returns to the exact page;
- the Add-project skeleton.

The signed-in steps were reviewed in code and in the 2026-10-08 audit (`docs/UX_UI_PRODUCT_AUDIT.md`, phases 1–6 shipped).

| Step                 | Finding                                                                                                                                                                                                                                                                                                            | Severity                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Landing              | Clear; ISR-cached, so fast and resilient                                                                                                                                                                                                                                                                           | ✅                                              |
| Sign in              | **Google:** "to continue to **letfxefyqxxrfujpwtri.supabase.co**" (seen on production), which looks like a phishing page to a Thai user. **GitHub:** "continue to **MRRMafia**" (seen). **Google may still be in Testing** (Project.md open item): if so, **every non-test user is blocked** with "Access blocked" | **BLOCKER** (Testing) / **HIGH** (names)        |
| Sign-in error        | `/login?error=auth` shows a message and the buttons again (recoverable)                                                                                                                                                                                                                                            | ✅                                              |
| Create profile       | Quick mode: username + province on one screen, then back to `next`. Defaults: listed in the builders directory, with province public (by design; the per-field visibility control is on the profile editor)                                                                                                        | LOW: say "shown publicly" on the province field |
| Add project          | Province required and prefilled; category with no default; card preview; the 5-project limit shown up front; the duplicate website blocked; sticky button on phones                                                                                                                                                | ✅                                              |
| Publish              | Instant on insert (public at once). Owners can now switch to "hidden for now" from the dashboard                                                                                                                                                                                                                   | ✅                                              |
| Verify               | Honest toasts, where-to-paste help, common causes. **"Link GitHub" fails while Supabase manual linking is off** (owner switch), a dead end for Google users who want build proof                                                                                                                                   | **HIGH** (owner toggle)                         |
| Public project page  | Numbers first, evidence ladder, owner checklist, share studio when proven                                                                                                                                                                                                                                          | ✅                                              |
| Errors anywhere      | **Default English Next pages for 404 and crashes** on Thai pages, with no header, no link home, no language                                                                                                                                                                                                        | **HIGH** (quick code fix)                       |
| Old / mistyped links | Old slugs 308-redirect ✅; anything else hits the English 404 above                                                                                                                                                                                                                                                | (same)                                          |
| Language consistency | th / en complete (the messages test parses every string)                                                                                                                                                                                                                                                           | ✅                                              |
| Mobile               | No horizontal scroll at 375 px (e2e); sticky Add button; ☰ menu has the currency                                                                                                                                                                                                                                  | ✅                                              |
| Delete account       | By email only (as /privacy says)                                                                                                                                                                                                                                                                                   | MEDIUM later                                    |
| JaoPor's own listing | Only Stripe is connected: no GitHub build proof, no "เริ่มนับ" snippet; the founder message typo "ตอนรับ". This is the page the post links to                                                                                                                                                                      | HIGH (owner content)                            |

---

## 7. OAuth and sign-in: current production state

| Item                   | State (checked)                                                                                                                                                  | Manual action before launch                                                                                                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Google                 | Enabled. The client in use ends `…aftn.apps.googleusercontent.com`; scopes `email profile`; redirect `https://letfxefyqxxrfujpwtri.supabase.co/auth/v1/callback` | **Publish the app** (Google Auth Platform → Audience → Publish). **Branding:** app name "JaoPor", logo, homepage, privacy and terms links. Until the brand is verified, Google shows the Supabase domain. A custom auth domain (`auth.<yourdomain>`) needs Supabase Pro + its add-on |
| Consent screen         | Shows `letfxefyqxxrfujpwtri.supabase.co`. **Publishing status: not visible from here**                                                                           | As above; then test with an account that is **not** a test user                                                                                                                                                                                                                      |
| GitHub                 | Enabled; scope `user:email`; same callback                                                                                                                       | **Rename the OAuth app "MRRMafia" → "JaoPor"** (GitHub → Settings → Developer settings → OAuth Apps); set the homepage URL and logo                                                                                                                                                  |
| Manual account linking | Couldn't be read from here; Project.md says it's still to enable                                                                                                 | **Supabase → Authentication → Sign In / Providers → "Allow manual linking": on**                                                                                                                                                                                                     |
| Redirect URLs          | Site URL `https://jaopor.vercel.app` (Project.md); the allowlist couldn't be read                                                                                | Confirm only `https://jaopor.vercel.app/**` (+ `http://localhost:3000/**`); **no `*.vercel.app` wildcard**                                                                                                                                                                           |
| Email provider         | **Enabled**, sign-up open, confirmation required, 0 users                                                                                                        | **Disable** (Providers → Email)                                                                                                                                                                                                                                                      |
| Locale preservation    | `?locale=` passed through the callback ✅ (e2e)                                                                                                                  | None                                                                                                                                                                                                                                                                                 |
| Return paths           | Exact page kept for `/new`, dashboard, messages, edit (e2e) ✅; open-redirect guard ✅                                                                           | None                                                                                                                                                                                                                                                                                 |
| Auth rate limits       | `/auth/v1/token` is limited **per IP**; our code exchange and session refreshes come from Vercel's server IPs                                                    | Watch Auth logs for 429 during the first hours. If they appear: enable IP-address forwarding (Auth → Rate Limits) and send `Sb-Forwarded-For` with the secret key (a code change)                                                                                                    |

---

## 8. Data and privacy

**What a launch user can expose without meaning to:**

- **Their Google / GitHub display name and avatar** become public on their profile and projects. This is stated in /privacy §1, but onboarding doesn't say it, and the name is often the person's full legal name. Consider an editable "ชื่อที่แสดง" with a "shown publicly" hint in onboarding (LOW–MEDIUM).
- **Province:** public by default (Olympics). It's changeable per field, and /privacy says so.
- **Builders directory:** listed by default (`show_in_directory = true`). It can be left; /privacy says so.
- **Projects:** public from the moment of insert. "Hide for now" now exists.
- **Verification data:** only aggregates (MRR, revenue, visitors, commits). Keys are encrypted and unreadable by clients. GitHub repo names are public for build proof (expected).
- **Visitor data (the snippet):** day-scoped HMACs, deleted after each nightly rollup ✅ (matches /privacy §4).
- **Contact info:** LINE ID and email in `private_contacts`, shown only after an accepted request ✅.
- **Messages:** participants only (RLS); not end-to-end encrypted, as /privacy says ✅.
- **Analytics events:** none yet (the design stores no content; see the migration review).

**Does the wording match production?**

| Page                                   | Matches?                                                                                                                                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| /privacy §1–§4, §5 live map, §6–§7, §9 | ✅ Checked:<br>• Supabase Singapore;<br>• snippet hashes deleted after the rollup;<br>• live heartbeat 10 min;<br>• chat 200 messages/day;<br>• deletion by email                                                                                 |
| /privacy: profile views                | ❌ **Not mentioned.** `/api/profile-view` stores a daily HMAC of the viewer's browser ID (or user ID) per profile, **kept indefinitely**, to show "คนดูโปรไฟล์คุณ". It needs a bullet **and** a retention period (owner-approved wording). MEDIUM |
| /privacy §8 Gemini                     | ⚠️ Says public text from the project's **website** is sent; the code also sends the project's **public GitHub README**. LOW wording fix                                                                                                           |
| /security                              | ✅ Matches:<br>• read-only probes;<br>• AES-256-GCM;<br>• server-only decryption;<br>• the table no client can read;<br>• about 3 AM sync;<br>• disconnect deletes numbers and history                                                            |
| /terms                                 | ✅ Describes the product today. **Still a labelled draft, not legally reviewed**: the owner decides whether to launch with a draft                                                                                                                |

All wording changes need the owner's approval. None were made.

---

## 9. Recovery: what happens, and what to do

| Event                                                         | What users see                                                                                                                                                                                                            | Recovery path                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A deployment breaks the site**                              | Errors on every page, or on the changed one                                                                                                                                                                               | Vercel → Deployments → the previous Ready production deployment → **Instant Rollback** (seconds, no rebuild). Then `git revert` the bad commit and push, so the next deploy doesn't bring it back                                                                                                                                                                                            |
| **A database migration fails**                                | A failed migration leaves no partial change (it errors before committing). The app keeps running on the old schema                                                                                                        | Fix the SQL in a **new** migration. **A migration that succeeds but is wrong** can only be undone by a hand-written reverse migration, because **the Free plan has no backup**. **Before launch and before every migration, take a dump:** `npx supabase db dump --linked -f backup-YYYYMMDD.sql` (+ `--data-only` file); needs the DB password locally. Or upgrade to Pro for daily backups |
| **Supabase temporarily unavailable**                          | **Home and project pages keep serving the cached version** (ISR). Dynamic pages (`/startups`, `/feed`, directory, dashboard, sign-in) fail with Next's default error page. Snippet beacons and pings are dropped silently | Wait: nothing to do in the app. Check status.supabase.com. The cron catches up the next night (it re-reads 30-day windows)                                                                                                                                                                                                                                                                   |
| **Supabase restricts the project** (Free-plan quota exceeded) | Every API call returns 402 (site down) or the DB goes read-only                                                                                                                                                           | Upgrade the org to Pro (lifts the restriction immediately) or wait for the next billing cycle. Prevention: live presence off + watch the Usage page                                                                                                                                                                                                                                          |
| **Vercel Hobby limit exceeded**                               | Project paused (up to 30 days)                                                                                                                                                                                            | Upgrade to Pro to resume. Prevention: watch Usage; upgrade before the post if you expect a big spike                                                                                                                                                                                                                                                                                         |
| **Gemini unavailable**                                        | "Fill from website" still works with the page's own metadata                                                                                                                                                              | Nothing needed                                                                                                                                                                                                                                                                                                                                                                               |
| **A verification provider fails**                             | Connect shows `upstream` / `rate_limited`; already-connected projects **keep their last numbers**; the nightly sync retries                                                                                               | Nothing needed. If it lasts, the founder presses Refresh later (10-min cooldown)                                                                                                                                                                                                                                                                                                             |
| **Storage fails**                                             | Logos and screenshots don't load (alt text / initials); uploads show an error toast                                                                                                                                       | Wait: Supabase status. No data loss: the files and DB rows are separate                                                                                                                                                                                                                                                                                                                      |
| **A launch bug is discovered**                                | Depends                                                                                                                                                                                                                   | 1) If it's serious: Instant Rollback first, then fix. 2) Fix on a branch, run typecheck / lint / tests / e2e, push. Vercel deploys in about 2 min. 3) If it's in the live map: `NEXT_PUBLIC_LIVE_VISITORS=0` + redeploy. 4) If it exposes data: Supabase → Database → revoke the grant or disable the policy first (one SQL line), then fix properly in a migration                          |
| **A leaked key**                                              | None visible                                                                                                                                                                                                              | Rotate at the provider, update Vercel env or Supabase provider settings, and redeploy. `KEY_ENCRYPTION_SECRET` rotation needs re-encrypting stored keys (no tool yet; don't rotate it casually)                                                                                                                                                                                              |

---

## 10. Final launch gate

### BLOCKER: must be fixed before the public launch

| ID  | Item                                                                                                                                                                                                                                                                                                    | Who                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| B-1 | **Google sign-in publishing status.** If still "Testing", nobody from the post can sign in with Google                                                                                                                                                                                                  | Owner                            |
| B-2 | **Live map presence at scale.** About 50 people online passes Realtime's message rate; a launch day can use the monthly 2 M messages and lead to a project-wide Supabase restriction. Turn presence off for launch (`NEXT_PUBLIC_LIVE_VISITORS=0` + redeploy) **or** change it to heartbeat-only (code) | Owner sets the variable, or code |
| B-3 | **No database backup.** Take a full dump before launch (and before every migration), or upgrade Supabase to Pro                                                                                                                                                                                         | Owner                            |

### HIGH: fix before the launch if reasonably quick

| ID  | Item                                                                                                                                                                                                                                 | Who                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| H-1 | Rename the GitHub OAuth app (shows "MRRMafia") and set Google branding (shows the Supabase domain)                                                                                                                                   | Owner                   |
| H-2 | Rotate the Google client secret and the Gemini key; confirm the Gemini key's Cloud project has **no billing** (or set a budget alert)                                                                                                | Owner                   |
| H-3 | Supabase "Allow manual linking": on (Google users can't link GitHub otherwise)                                                                                                                                                       | Owner                   |
| H-4 | Thai / English **error and 404 pages** (`not-found.tsx`, `error.tsx`, `global-error.tsx`) with the header and a way home                                                                                                             | Code (small)            |
| H-5 | Uptime monitor on `/api/health` + `/th`                                                                                                                                                                                              | Owner (10 min, no code) |
| H-6 | Check current Vercel and Supabase usage now; **decide on Supabase Pro** (backups + egress) and whether to take Vercel Pro (Hobby pause risk, commercial use)                                                                         | Owner                   |
| H-7 | Abuse limits on anonymous writes: a cap per profile per day on `profile_views` (DB) and a limit on `/api/live/ping` (or none needed if presence/heartbeat is off); a Vercel Firewall rate-limit rule for `/api/*` if the plan allows | Code + owner            |
| H-8 | JaoPor's own page (the post links to it): description, fix "ตอนรับ", press "เริ่มนับ", reconnect GitHub                                                                                                                              | Owner                   |
| H-9 | Approve and ship the Add-project funnel analytics (so launch traffic is measured)                                                                                                                                                    | Owner approval → code   |

### MEDIUM: can ship; address soon

| ID   | Item                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M-1  | Disable the Email provider                                                                                                                                         |
| M-2  | /privacy: disclose profile-view counting + add a retention period (owner-approved wording); mention the GitHub README in the Gemini line                           |
| M-3  | Storage object caps / orphan cleanup (logo uploaded before insert; screenshot files without rows)                                                                  |
| M-4  | Make `/startups`, `/feed`, `/olympics`, `/builders` cacheable (ISR or cached data). The biggest CPU and resilience win                                             |
| M-5  | Security headers: `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` |
| M-6  | Record cron runs + server error counts in a server-only table (morning-after visibility)                                                                           |
| M-7  | Per-user cooldown on `POST …/sources/{source}` (connect)                                                                                                           |
| M-8  | `GITHUB_TOKEN` in Vercel (60 → 5,000 GitHub requests/h)                                                                                                            |
| M-9  | GitHub secret scanning + push protection on the public repo                                                                                                        |
| M-10 | /terms is a draft (legal review): owner decision to launch with it                                                                                                 |
| M-11 | Supabase Auth per-IP `token` limit: watch for 429s; enable IP forwarding if they appear                                                                            |
| M-12 | Facebook Sharing Debugger re-scrape + LINE preview after the last content change                                                                                   |

### LOW: polish and future

- **Live map:** handle the `CLOSED` channel status (fall back instead of showing stale "live").
- **Production e2e runs** add fake visitors to the live map (70 heartbeats during this check). Skip the heartbeat when `navigator.webdriver` is set.
- **Onboarding:** "shown publicly" hints on name and province.
- **`/api/health`:** answer only `ok` publicly.
- **Keys:** disable the legacy JWT `anon` key once unused.
- **Advisors:** 16 unused indexes (INFO); the leaked-password advisor (irrelevant without Email).
- **Self-service account deletion.**
- **`listBuilders` in SQL** (open item), at a few hundred profiles.

---

### TOP 10 THINGS TO FIX BEFORE LAUNCH

1. Publish the Google consent screen and test with a non-test account (B-1).
2. Turn off live presence for launch, or make it heartbeat-only (B-2).
3. Take a full database dump, or upgrade Supabase to Pro (B-3).
4. Rename the GitHub OAuth app; set Google branding (H-1).
5. Rotate the Google client secret and the Gemini key; confirm no billing on the Gemini project (H-2).
6. Enable Supabase manual linking (H-3).
7. Thai / English error and 404 pages (H-4).
8. Uptime monitor (H-5).
9. Check usage and decide on the plans (H-6).
10. Cap `profile_views` and the anonymous ping endpoint (H-7), and finish JaoPor's own page (H-8).

### TOP 5 THINGS I MUST DO MYSELF (owner)

1. **Google:** publish the app and set its branding; **GitHub:** rename the OAuth app to JaoPor.
2. **Supabase dashboard:**
   - Allow manual linking: on;
   - Email provider: off;
   - confirm the redirect allowlist has no wildcard.
3. **Rotate the secrets:** the Google client secret (then update Supabase → Providers → Google) and the Gemini key (then Vercel `GEMINI_API_KEY`, redeploy). Confirm no billing on the Gemini project.
4. **Backups and plans:**
   - take a DB dump (`npx supabase db dump --linked`), or upgrade Supabase to Pro;
   - look at Vercel → Usage and decide Hobby vs Pro;
   - set `NEXT_PUBLIC_LIVE_VISITORS=0` in Vercel if you choose "presence off".
5. **Uptime monitor + JaoPor's own page:**
   - create the monitor;
   - add the description, fix "ตอนรับ", press "เริ่มนับ", reconnect GitHub;
   - re-scrape in Facebook's Sharing Debugger.

### TOP 5 THINGS THE CODEBASE MUST HANDLE

1. The live map at scale: presence off or heartbeat-only, and handle `CLOSED`.
2. Thai / English `not-found` / `error` / `global-error` pages.
3. Abuse caps on anonymous writes (`profile_views` per profile per day; ping).
4. Add-project funnel analytics (after your approval of the SQL and wording).
5. Cacheable directory pages + basic security headers (MEDIUM, but the biggest capacity and resilience win per hour of work).

### TOP 5 RISKS DURING LAUNCH WEEK

1. **A plan limit takes the whole site down** (Supabase restriction or Vercel pause), not a code bug.
2. **Sign-in friction or failure:** Testing mode, odd app names, Auth 429s. People leave at the most important step.
3. **An irreversible data mistake with no backup.**
4. **A silent failure** (cron, errors at night) with 1-hour logs.
5. **Abuse or spam on a public launch:** fake profiles or projects, endpoint floods, reports nobody reads.

### WHAT TO WATCH EVERY DAY DURING LAUNCH WEEK (≈ 10 minutes)

1. **The uptime monitor:** any downtime overnight?
2. **Supabase → Org Usage:** egress, Realtime messages, storage, DB size, MAU against the Free quotas (or the spend on Pro).
3. **Vercel → Usage:** Active CPU, invocations, data transfer against Hobby limits. **Observability:** the error rate.
4. **Supabase → Auth logs:** any 429 / `error=auth`; new sign-ups per day.
5. **The cron ran:** `select max(last_synced_at) from startups;` should be today ~03:00 Bangkok.
6. **New projects and reports:** `select count(*) from startups where created_at > now() - interval '1 day';` and `select * from reports order by created_at desc limit 20;`. Act on spam quickly.
7. **The funnel** (once live): the three queries in the analytics design doc.
8. **Founders' messages / LINE / Facebook comments:** the fastest bug reports you'll get.

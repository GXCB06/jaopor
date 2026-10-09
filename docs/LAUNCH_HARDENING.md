# JaoPor pre-launch hardening (2026-10-09)

Follows [LAUNCH_READINESS_REPORT.md](LAUNCH_READINESS_REPORT.md).

**Owner instructions for this pass:**

- don't apply the analytics migration;
- don't change MRR semantics, demo projects or homepage positioning;
- no new features.

Sections: **A** code changes · **B** Vercel plan · **C** Supabase usage · **D** database backup · **E** credential rotation · **F** OAuth checklist · **G** uptime monitoring · **H** anonymous writes · **I** daily operator checklist · **J** JaoPor's own launch state · **K** gate results.

---

## A. Code changes (this pass)

| Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Files                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Live map off by default (B-2).** `LIVE_ENABLED` is now true only with `NEXT_PUBLIC_LIVE_VISITORS=1` (was: on unless `0`). The Vercel environment couldn't be changed from here, so the same flag's default was flipped instead.<br><br>**When off:**<br>• no Realtime connection or presence/broadcast messages from the live map;<br>• no heartbeat and no geo lookup from the provider;<br>• the home live section and the project-page "n คนกำลังดู" pill are hidden;<br>• `/api/live/ping` answers 204 **without a database write**;<br>• `/api/live/count` answers `{count:null}` **without a query**.<br><br>**Kept:** the feature code, the `live_pings` table, the /privacy wording, and `/api/live/whoami` (the province hint on the profile editor still uses it).<br><br>**To re-enable:** set `NEXT_PUBLIC_LIVE_VISITORS=1` in Vercel and redeploy. | `src/lib/live/identity.ts`, `src/app/api/live/{ping,count}/route.ts`, `Design.md`                                                                                                         |
| **Thai / English 404 and error pages (H-4).**<br>• `[locale]/not-found.tsx`, with a `[locale]/[...rest]` catch-all for unmatched URLs;<br>• `[locale]/error.tsx` (retry + home, an opaque "รหัสอ้างอิง", never the message or stack);<br>• `app/global-error.tsx` (own document; loads only its language's messages when shown);<br>• shared `ErrorScreen`.<br><br>New `ErrorPage` messages in th / en, a Design.md pattern, and an e2e spec (`e2e/not-found.spec.ts`: 404 status, language, header, links keep the locale; desktop + 375 px).                                                                                                                                                                                                                                                                                                                    | `src/app/[locale]/{not-found,error}.tsx`, `src/app/[locale]/[...rest]/page.tsx`, `src/app/global-error.tsx`, `src/components/ErrorScreen.tsx`, `messages/*.json`, `e2e/not-found.spec.ts` |
| **Database dumps can't be committed:** `.gitignore` gains `/backups/`, `*.dump`, `*backup*.sql(.gz)`. Migrations are unaffected (checked with `git check-ignore`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `.gitignore`                                                                                                                                                                              |
| **Lint ignores Claude Code worktrees** (`.claude/worktrees/**`). An old worktree's `.next` build made `npm run lint` report 39 k problems that weren't in this checkout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `eslint.config.mjs`                                                                                                                                                                       |

**Visitor counting and verification are unaffected:**

- The JaoPor snippet (`public/v.js` → `/api/collect`) and the nightly rollup never used the live map.
- Source connect / sync (`/api/startups/[id]/sources/*`) has no dependency on it.
- **Remaining Realtime use:** only the chat thread (`chat:{id}`, signed-in users on the messages page), which is needed.

---

## B. Vercel plan

| Item                                         | Finding                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Current plan**                             | **Hobby.** Seen on the dashboard (team "gxcb06's projects", badge "Hobby", "Upgrade to Pro") on 2026-10-08. Production deployments are all from `master`, auto-deployed.                                                                                                                                                                                                                                                      |
| **Current usage**                            | **Not read.** The Vercel connector has no access to this account (403), and the browser session expired before the usage numbers loaded (it now asks for a GitHub sign-in, which I don't do). **Owner:** Vercel → Usage (last 30 days); note Fluid Active CPU, Function Invocations, Fast Data Transfer, Edge Requests.                                                                                                       |
| **Relevant Hobby limits** (docs, 2026-09-14) | • 4 Active CPU-hours, 1 M function invocations, 100 GB fast data transfer, 1 M CDN requests, 360 GB-hrs memory per month.<br>• **Exceeding a limit pauses the feature until 30 days have passed.**<br>• Runtime logs kept 1 hour; 1 cron a day; WAF: 3 custom rules, 3 IP blocks.                                                                                                                                             |
| **Hobby terms**                              | "Hobby teams are restricted to non-commercial personal use only." Commercial = a deployment "used for the purpose of financial gain of **anyone** involved in **any part of the production**". The examples include processing payments, advertising the sale of a product or service, and ads.                                                                                                                               |
| **Is JaoPor's model compatible with Hobby?** | • **Today's site:** no payments, ads or sponsor slots. Arguably within Hobby, but it's a startup built to make money.<br>• **The planned model is commercial** (Project.md):<br> – sponsor rails "house ads → first paid sponsor" are in **Phase 1b, weeks 1–4 after launch**;<br> – then listing tiers and a 3% closing fee.<br>• **Conclusion:** not compatible with Hobby once any of those start, and a gray area before. |
| **Launch risk on Hobby**                     | • A spike past 4 CPU-hours or 1 M invocations (or an invocation flood on any public endpoint) **pauses the site for up to 30 days** with no option except upgrading.<br>• 1-hour logs mean launch-night errors are lost by morning.                                                                                                                                                                                           |
| **Recommendation**                           | **Enable Pro ($20/month) before the public post.**<br>• It removes the 30-day pause (usage is billed instead; set a spend limit in Spend Management).<br>• It brings 1-day logs and more WAF rules.<br>• It matches the commercial plan.<br><br>**At the latest, before the first sponsor or paid feature.** If you stay on Hobby for the post, check Usage first and keep the live map off (done).                           |

---

## C. Supabase usage (measured 2026-10-09)

The Supabase dashboard also needed a sign-in in the browser pane, so the **egress, cached egress, Realtime messages and Realtime peak connections** totals (shown only on Org → Usage) were not readable. Everything else is measured directly in the database.

| Metric                          | Current                                                                           | Free quota         | Remaining     | Launch concern                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------- | ------------------ | ------------- | ---------------------------------------------------------------------------------- |
| Database size                   | **16.0 MB** (`pg_database_size`)                                                  | 500 MB             | 484 MB (97 %) | Low. Only abuse (`profile_views` flood, §H) could grow it fast                     |
| Storage                         | **6.9 MB**, 18 objects                                                            | 1 GB               | 99 %          | Low. About 2 MB per active project (logo + screenshots); 100 new projects ≈ 200 MB |
| Auth MAU                        | **8** (users signed in within 30 days; 8 accounts)                                | 50,000             | 99.98 %       | None                                                                               |
| Edge Functions                  | **0 deployed** (0 invocations)                                                    | 500 k invocations  | 100 %         | None                                                                               |
| DB connections (now)            | 15 of 60 (internal services; the app uses the HTTP API)                           | 60 direct / pooler | n/a           | None (serverless uses the pooled HTTP API)                                         |
| **Egress (uncached)**           | **not readable from here**: Org → Usage                                           | 5 GB               | ?             | **High:** images load straight from Supabase. 10 k visitors ≈ 5–10 GB              |
| **Cached egress**               | **not readable from here**                                                        | 5 GB               | ?             | Medium (repeat image views are cached)                                             |
| **Realtime messages**           | **not readable from here**                                                        | 2 M / month        | ?             | **Was the blocker. Now near zero:** the live map is off; only chat uses Realtime   |
| **Realtime peak connections**   | **not readable from here**                                                        | 200                | ?             | Now only chat tabs (signed-in, on the messages page)                               |
| Request volume (proxy for load) | 14,496 API requests in the last 24 h (`edge_logs`), mostly e2e runs and the owner | n/a                | n/a           | Baseline for launch-week comparison                                                |

**Owner:** Supabase → Organization → Usage, then fill the four "?" rows. Check them daily during launch week.

**Upgrade advice:** **Supabase Pro ($25/month)** gives 7-day backups, 250 GB egress, 500 Realtime connections and no 7-day-idle pause. **Recommended before the post** mainly for backups and egress.

---

## D. Database backup (safe, read-only; nothing has been run)

**Facts checked on this machine:**

- `npx supabase db dump` **needs Docker**, because it runs `pg_dump` inside the Supabase Postgres image. **Docker and `pg_dump` are not installed here.**
- The project is **not linked** locally, so `--linked` fails ("Cannot find project ref"). Use `--db-url` instead (no link or login needed).

### Option 1 (recommended): Supabase CLI with Docker Desktop

1. Install Docker Desktop and start it.
2. **Supabase → your project → Connect → Session pooler:** copy the URI (`postgresql://postgres.letfxefyqxxrfujpwtri:[YOUR-PASSWORD]@<pooler-host>:5432/postgres`).
   - If you don't know the DB password, reset it in **Database → Settings**. The app doesn't use it (it uses API keys), so resetting is safe.
3. **In PowerShell**, from a folder **outside the repo** (e.g. `C:\Users\ACER\JaoPor-backups`). The password isn't saved to history:

```powershell
$db = Read-Host "Session pooler URI (with password)" -MaskInput
$d = Get-Date -Format yyyyMMdd
npx supabase db dump --db-url $db -f "roles-$d.sql" --role-only
npx supabase db dump --db-url $db -f "schema-$d.sql"
npx supabase db dump --db-url $db -f "data-$d.sql" --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
Remove-Variable db
```

### Option 2: plain `pg_dump` (no Docker)

Install the **PostgreSQL 17** command-line tools (the server is Postgres 17.6), then:

```powershell
$db = Read-Host "Session pooler URI (with password)" -MaskInput
pg_dump --dbname=$db --format=custom --no-owner --file="jaopor-$(Get-Date -Format yyyyMMdd).dump"
Remove-Variable db
```

This includes Supabase's internal schemas, which is fine for an emergency copy. Restoring it into a different project needs cleanup, which is why Option 1 is preferred.

### What it produces

| File             | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `roles-*.sql`    | Custom database roles, **without passwords**                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `schema-*.sql`   | Tables, functions, triggers, RLS policies, grants for your schemas (`public`, `private`); Supabase-internal schemas are excluded                                                                                                                                                                                                                                                                                                                                     |
| `data-*.sql`     | **Every row in `public`, `private`, `auth`, `storage` (metadata).** Includes:<br>• `auth.users` (emails, names);<br>• `auth.identities`;<br>• **`auth.sessions` / `auth.refresh_tokens`** (live session tokens);<br>• profiles, contacts (LINE IDs, emails), **chat messages**, reports;<br>• `provider_connections` with **encrypted** provider keys (AES-256-GCM ciphertext; the decryption key `KEY_ENCRYPTION_SECRET` lives only in Vercel, **not** in the dump) |
| **Not included** | • storage **files** (logos, screenshots, avatars: only their metadata);<br>• Vercel environment variables;<br>• Auth provider settings (Google / GitHub client IDs and secrets);<br>• the API keys                                                                                                                                                                                                                                                                   |

### Where it's written, and how to keep it safe

- **Where:** in the current folder. Never run it inside the repo; if you do, `.gitignore` now ignores `/backups/`, `*.dump` and `*backup*.sql`, but don't rely on that.
- **It contains personal data and session tokens:**
  - **encrypt it right away** (e.g. 7-Zip AES-256 with encrypted file names: `7z a -p -mhe=on jaopor-YYYYMMDD.7z roles-*.sql schema-*.sql data-*.sql`);
  - then delete the plain `.sql` files;
  - keep one copy on this PC and one in a private cloud folder; never in email or chat.
- **Retention:** keep the last 3–4 dumps and delete older ones (account deletions must eventually disappear from backups too).
- **When:** before the launch post, before **every** migration (the analytics one included), and weekly during launch month. Or upgrade to Supabase Pro for automatic daily backups.

---

## E. Credential rotation checklists (owner; nothing rotated)

**Codebase check (2026-10-09):**

- the tracked files and git history,
- the local production build output (`.next/static`),

were all scanned for Google / Gemini / Stripe / GitHub / Supabase-secret / private-key patterns: **none found.** Only the public Supabase URL and publishable key are in `.env.example`.

### Google OAuth client secret (exposed in chat 2026-09-29)

1. **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs →** the Web client ending `…aftn.apps.googleusercontent.com`.
2. **Add secret** (Google allows two active secrets), then copy the new secret once.
3. **Supabase → Authentication → Sign In / Providers → Google:** paste the new secret and save. The client ID is unchanged.
4. **Test:** sign out, then sign in with Google on https://jaopor.vercel.app/th/login.
5. **Back in Google:** **disable**, then **delete** the old secret.
6. **Don't** paste the secret anywhere else (chat, repo, `.env` files committed to git).

### Gemini API key (exposed in chat 2026-09-30)

1. **Google AI Studio → API keys** (aistudio.google.com/apikey): **Create API key** in the same project.
2. **Restrict it:** Google Cloud Console → Credentials → the key → _API restrictions_: **Generative Language API only**. Application restriction: none (it's called from Vercel's servers).
3. **Vercel → Project jaopor → Settings → Environment Variables → `GEMINI_API_KEY`** (Production): replace the value, **Redeploy** production.
4. **Test:** on your project's edit page, press "✨ ช่วยเติมจากเว็บไซต์" and confirm it says the draft came from AI (not just the page).
5. **Delete the old key** in AI Studio / Cloud Console.
6. **Billing:** Cloud Console → Billing for that project should be **not linked** (free tier only). If billing is linked, set **Budgets & alerts** at a small amount.

---

## F. OAuth and sign-in production checklist (owner)

| #   | Where                                                                | Exact step                                                                                                                                                                                                                                                                                      | How to verify                                                                                           |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Google Auth Platform → **Branding**                                  | • App name **JaoPor**; logo (the 120×120 tile); support email.<br>• App home page `https://jaopor.vercel.app/th`; privacy `https://jaopor.vercel.app/th/privacy`; terms `https://jaopor.vercel.app/th/terms`.<br>• Authorized domains: `jaopor.vercel.app`, `letfxefyqxxrfujpwtri.supabase.co`. | Branding page saved                                                                                     |
| 2   | Google Auth Platform → **Audience**                                  | **Publish app** (Testing → In production). Scopes are only `email`, `profile`, `openid` (non-sensitive), so **no verification review is required to publish**. Brand verification (to show "JaoPor" instead of the Supabase domain) can be requested on the Branding page.                      | Sign in with a Google account **not** on the test-user list → no "Access blocked"                       |
| 3   | GitHub → Settings → Developer settings → **OAuth Apps** → "MRRMafia" | • Application name **JaoPor**;<br>• Homepage URL `https://jaopor.vercel.app`;<br>• upload the logo.<br><br>**Don't change** the callback URL (`https://letfxefyqxxrfujpwtri.supabase.co/auth/v1/callback`) or the client ID.                                                                    | The GitHub sign-in page says "continue to **JaoPor**" (I can re-check this with curl)                   |
| 4   | Supabase → Authentication → **Sign In / Providers**                  | **Allow manual linking: ON.** **Email: OFF** (no email users exist; the UI only offers Google / GitHub).                                                                                                                                                                                        | A Google user can press "เชื่อม GitHub" on the verify panel; `/auth/v1/settings` shows `"email": false` |
| 5   | Supabase → Authentication → **URL Configuration**                    | • **Site URL** `https://jaopor.vercel.app`.<br>• **Redirect URLs** exactly: `https://jaopor.vercel.app/**` and `http://localhost:3000/**`.                                                                                                                                                      | List shows only those two                                                                               |
| 6   | Same page                                                            | **Remove any wildcard** such as `https://*.vercel.app/**`, `https://*-gxcb06s-projects.vercel.app/**` or `**`. A broad `*.vercel.app` lets **any** Vercel site receive a sign-in code. If you need preview deployments to sign in, add only `https://jaopor-*-gxcb06s-projects.vercel.app/**`.  | No entry starting with `https://*.` or `**`                                                             |
| 7   | After 1–6                                                            | Sign in with Google and with GitHub from a **private window** on `/th/new`: you should land back on `/th/new` (or onboarding first for a new account), in Thai. Repeat on `/en/new`.                                                                                                            | Locale and return path kept (e2e already confirms the signed-out half)                                  |

**Production state verified on 2026-10-08/09 (before any of these changes):**

- Google sign-in shows "to continue to **letfxefyqxxrfujpwtri.supabase.co**";
- GitHub shows "continue to **MRRMafia**";
- `/auth/v1/settings` shows `email: true`, `google: true`, `github: true`;
- tokens are ES256.

The publishing status, manual linking and the allowlist aren't visible without dashboard access. **After you finish, tell me and I'll re-check what's publicly visible** (the GitHub name, the Email provider flag, the Google screen text).

---

## G. Uptime monitoring (minimum; nothing installed)

**Service:** UptimeRobot free (or Better Stack free). No code, and no user data leaves JaoPor.

| Monitor                     | URL                                             | Interval | Failure =                                                                                                                         | Why                                                                                                                                                                                              |
| --------------------------- | ----------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. App + database (keyword) | `https://jaopor.vercel.app/api/search?q=jaopor` | 5 min    | Status ≠ 200, **or** the body doesn't contain `"jaopor"` (keyword monitor), **or** > 10 s; alert after **2 consecutive** failures | `/api/search` queries Supabase on every call and returns **500** when the database fails. It catches a Vercel outage, a Hobby pause, a Supabase outage or restriction (402), and a broken deploy |
| 2. Deployment config        | `https://jaopor.vercel.app/api/health`          | 5 min    | Status ≠ 200 (it answers **503** when a server secret is missing or malformed)                                                    | Catches an env-var mistake after a redeploy or a key rotation                                                                                                                                    |
| 3. The page people land on  | `https://jaopor.vercel.app/th`                  | 5 min    | Status ≠ 200                                                                                                                      | Home is ISR-cached, so it stays up during a database blip. Monitor 1 is the one that sees the database                                                                                           |

**Where the alert goes:**

- **email (`jaopordev@gmail.com`) + the UptimeRobot mobile app** (push);
- optionally a Telegram / Discord / Slack webhook if you use one.

LINE Notify no longer exists, so use email + app.

**What to look at during launch week:**

- the monitors' **uptime %** and **response time** graph;
- a rising response time on monitor 1 means Supabase is under load;
- a 402 / 5xx means check Supabase Usage and Vercel Usage immediately.

> **Note:** `jaopor` in the keyword is the project's slug. If you rename it, update the keyword (any word from a listed project works).

---

## H. Anonymous write endpoints: review (no migration added)

| Endpoint                 | Current rate limit                                                                                                                 | Legitimate usage                                                                                                                                | Abuse scenario                                                                                                                                                                                                            | Persistence cost today                                                                                                                                        | Minimum safe limit                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/profile-view` | **None.** Each request with a new random `vid` inserts **a new row**; duplicates are ignored only for the same (profile, day, vid) | 1 row per viewer browser per profile per day. Today ≈ 44 rows in 8 days (8 profiles). Read back only for the last **7 days** ("คนดูโปรไฟล์คุณ") | A script posts random `vid`s for one profile → **unbounded rows** + an inflated view count. 1 M requests ≈ 1 M rows ≈ **150–200 MB** (30–40 % of the 500 MB Free DB), plus 1 M Vercel invocations (the whole Hobby month) | 1 upsert per call; rows kept **forever** (no retention)                                                                                                       | **≤ 1,000 stored viewers per profile per day** (a profile with more real viewers is a good problem; the count is capped) |
| `POST /api/live/ping`    | **None** (before this pass)                                                                                                        | One per visible tab per minute, **only when the live map is on**                                                                                | A flood inflates the live count and writes rows (pruned after 10 min) + invocations                                                                                                                                       | **Now zero DB cost:** with the live map off (default since this pass), the route returns 204 before touching the database. Only the Vercel invocation remains | n/a while off. If re-enabled: ~2 per minute per session hash, enforced server-side                                       |

**Smallest robust mitigation proposed (not implemented; code only, no migration):**

1. **`/api/profile-view`:** before the upsert, count today's rows for that profile (one indexed `count head` on the existing primary key `(profile_id, day, viewer_hash)`) and skip at ≥ 1,000. This bounds growth to `profiles × 1,000 rows/day` whatever the attacker does.
2. **Retention:** the nightly cron deletes `profile_views` older than 30 days (only 7 are ever read). This is the retention period the /privacy page should state (wording below, needs owner approval).
3. **Invocation floods on any endpoint:** a Vercel Firewall custom rule (Hobby allows 3) or rate-limit rule on `/api/profile-view` + `/api/live/ping` + `/api/collect` (e.g. 60 requests/min per IP → deny); **Attack Mode** as the emergency switch.
4. **Later (needs a /privacy change):** derive the anonymous viewer from a daily HMAC of IP + user agent (like the snippet) instead of a client-sent id, so random ids can't inflate the count.

**Proposed /privacy bullet for profile views** (for approval; not applied):

- **TH:** "เมื่อมีคนเปิดโปรไฟล์ของคุณ เรานับจำนวนผู้เข้าชมต่อวัน (เก็บเพียงค่าแฮชของรหัสสุ่มในเบราว์เซอร์ผู้ชม ภายใต้คีย์ที่เปลี่ยนทุกวัน ไม่เก็บ IP) เพื่อแสดง 'คนดูโปรไฟล์คุณ' ให้คุณเห็นคนเดียว และลบอัตโนมัติหลัง 30 วัน"
- **EN:** "When someone opens your profile we count daily viewers (only a hash of a random ID in the viewer's browser, under a key that changes daily; no IP) to show you 'people who viewed your profile'. Only you see it, and it's deleted automatically after 30 days."

---

## I. Launch-week operator checklist (about 10 minutes a day)

| #   | Check                 | Where (real signal available today)                                                                                                                                                                         | Healthy                                                                |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Uptime                | UptimeRobot app (after §G)                                                                                                                                                                                  | 100 %, no alerts overnight                                             |
| 2   | Vercel usage          | Vercel → Usage: **Fluid Active CPU**, **Function Invocations**, **Fast Data Transfer**                                                                                                                      | Hobby: CPU < 2 h and invocations < 500 k for the month by mid-week     |
| 3   | Supabase usage        | Supabase → Organization → Usage: **Egress**, **Cached egress**, **Realtime messages**, **Storage**, **DB size**                                                                                             | Egress < 3 GB, Realtime ≈ 0 (map off)                                  |
| 4   | Errors                | Vercel → Project → **Observability** (Functions: error rate, top failing routes) and **Logs** filtered to Error (last hour on Hobby)                                                                        | No new 5xx route; `[source connect]`, `[collect]`, `[cron]` lines rare |
| 5   | Auth failures         | Supabase → Authentication → **Logs** (filter `status: 429` and `error`); new users: SQL `select count(*) from auth.users where created_at > now() - interval '1 day';`                                      | No 429s; sign-ups growing                                              |
| 6   | Nightly sync          | SQL: `select max(last_synced_at) at time zone 'Asia/Bangkok' from public.startups where verification_status = 'verified';`                                                                                  | Today, ≈ 03:00–04:00                                                   |
| 7   | Reports               | SQL: `select created_at, target_type, reason, status from public.reports order by created_at desc limit 20;`                                                                                                | Every new report looked at within a day                                |
| 8   | New projects          | SQL: `select created_at, name, slug, website_url, status from public.startups where created_at > now() - interval '1 day' order by created_at desc;`                                                        | Real projects; hide spam (status `hidden` via SQL)                     |
| 9   | Verification failures | SQL: `select provider, status, count(*) from public.provider_connections group by 1,2 order by 1,2;` (plus `pending` JaoPor snippets that never activated); once analytics ships: its `verify_result` query | `active` growing; few stuck `pending`                                  |

(SQL runs in Supabase → SQL Editor. All read-only.)

---

## J. JaoPor's own launch state (manual; **not done**, no evidence yet)

| Task                                              | How                                                                                                          | Evidence that it's done                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| ☐ Add the JaoPor description                      | Dashboard → JaoPor → Edit → เกี่ยวกับ                                                                        | `/th/startup/jaopor` shows it                                             |
| ☐ Fix "ตอนรับ" → "ต้อนรับ" in the founder message | Same edit page                                                                                               | The page text                                                             |
| ☐ Press "เริ่มนับ" (visitor snippet)              | Edit → ยืนยันตัวเลข → เว็บไซต์ → เริ่มนับ (the snippet is already in the site layout as project 105)         | `provider_connections` has `jaopor` for startup 105, `pending` → `active` |
| ☐ Reconnect GitHub build proof                    | Edit → ยืนยันตัวเลข → GitHub (sign in with GitHub, or link it after manual linking is on)                    | `provider_connections` has `github` `active`; build numbers on the page   |
| ☐ Verify "Owner Verified"                         | Happens when our server finds the snippet on the site                                                        | `startups.owner_verified_at` not null for id 105; the badge on the page   |
| ☐ Verify visitor counting                         | Visit the site from another device, wait for the nightly rollup                                              | `traffic_snapshots` rows for 105; "ผู้เข้าชม" on the page                 |
| ☐ Refresh the Facebook Sharing Debugger           | developers.facebook.com/tools/debug → `https://jaopor.vercel.app/th` and `/th/startup/jaopor` → Scrape Again | The preview card shows the current title and image                        |

**State on 2026-10-09:**

- JaoPor (105) has only `stripe: active`;
- no `jaopor` or `github` connection;
- 1 published project in total.

---

## K. Gate results (2026-10-09)

See PROGRESS.md for the final numbers:

- typecheck, lint, unit tests, build;
- local + production e2e;
- RLS smoke (138 checks, rolled back);
- the secret scans.

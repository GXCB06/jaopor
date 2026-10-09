# Add-project funnel analytics: design

Date: 2026-10-08 · Status: **design only, waiting for the owner's approval.** No migration has been applied and no code has been written.

> **The SQL to approve is in [ADD_STARTUP_ANALYTICS_MIGRATION.md](ADD_STARTUP_ANALYTICS_MIGRATION.md)**, which supersedes the §9 draft below. The draft's direct server writes would have failed, because the Data API doesn't expose the `analytics` schema; the final version uses service-role-only functions instead.

Goal: learn, from behaviour rather than opinion, where founders drop out of Add-project and whether they come back to add proof. The method is first-party, minimal, and privacy-preserving.

**What exists today:** 1 real project and 6 profiles. The value of this system is in the weeks after the launch post, not today, so it should be live before the post goes out.

---

## 1. Current Add-project journey (from the code, `99341c8` → `826c60c`)

| #   | Step ID           | Screen / route                                                                       | Entry condition                                                                                                                              | Completion condition                                                     | Abandonment means                                | Important error states                                                                                                                                                                                    |
| --- | ----------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `gate`            | `/new` → `/login?next=/new`                                                          | Signed-out visitor clicks "+ เพิ่มผลงาน" (header, hero, bottom search, dashboard, categories, Olympics, welcome banner, search "no results") | Signs in with Google / GitHub                                            | Leaves the login page                            | OAuth error (`/login?error=auth`)                                                                                                                                                                         |
| 1   | `onboarding`      | `/onboarding?next=/new` (**quick mode**: username + province, one screen)            | New account without a username                                                                                                               | `saveProfile` succeeds → back to `/new`                                  | Leaves onboarding                                | `handle_taken`, `handle_invalid`, save failed                                                                                                                                                             |
| 2   | `details`         | `/new` step 1 (link, name, category, one-liner, province, logo; live card preview)   | Signed in with a username                                                                                                                    | "เผยแพร่และไปต่อ" inserts the project (**it is public now**)             | Leaves before a successful insert                | `invalid_link`, `already_listed` (same website, button disabled), `limit_reached` (5 projects, shown up front), `province_missing`, `logo_too_big`, `slug_taken`, `server`                                |
| 3   | `verify_choose`   | `/new` step 2: chooser tiles                                                         | Project created                                                                                                                              | A tile is chosen (website / Stripe / RevenueCat / GitHub / analytics)    | "ข้ามไปก่อน", or leaves                          | none                                                                                                                                                                                                      |
| 4   | `verify_connect`  | `/new` step 2: the chosen source's form → `POST /api/startups/{id}/sources/{source}` | A tile is chosen                                                                                                                             | `ok: true` (the snippet counts only once the owner check finds the code) | Gives up after an error, or leaves               | `invalid_key`, `not_read_only`, `missing_permission`, `rate_limited`, `upstream`, `not_found`, `domain_mismatch`, `not_owner`, `no_github_identity`, `no_website`, `duplicate_listing`, snippet `missing` |
| 5   | `finish`          | "ไปที่หน้าผลงาน" / "ข้ามไปก่อน" → `/startup/{slug}?new=1` or `?verified=1`           | Step 2 shown                                                                                                                                 | The profile opens                                                        | (the project already exists, so nothing is lost) | none                                                                                                                                                                                                      |
| 6   | `improve` (later) | Owner checklist "3 ขั้นต่อไป" → `/dashboard/{id}/edit`                               | Any later visit                                                                                                                              | Description, screenshot and a number from a connected source all present | Never completes                                  | Edit save errors (`slug_taken`, province, etc.)                                                                                                                                                           |

Notes that shape the design:

- **Step 2 is also reachable outside the wizard:** the edit page's ยืนยันตัวเลข section uses the same VerifyPanel and the same API route. Proof added later (step 6) is therefore visible on the server whatever the screen.
- **Much of the funnel already exists as data:**
  - `startups.created_at` (step 2 done);
  - `provider_connections.created_at` (step 4 done);
  - `startups.description` / `startup_screenshots` / `proof_level` (step 6);
  - `profiles.handle` (step 1).

  Only **intent and failure** (opened, chose, failed, skipped) are invisible today.

- The wizard keeps a session draft (`jaopor:draft:new-startup`), so a refresh or language switch resumes the same attempt. A new tab starts a new attempt.

## 2. User funnel

```
opened /new (signed in)                 add_opened            ┐ new events
  → details done (project created)      startups.created_at   │ existing data
  → chose a proof tile                  verify_chose          │ new
  → connected a source (ok)             provider_connections  │ existing data (+ verify_result for failures)
  → finished (went to the profile)      add_finished          │ new
  → came back and completed the page    description + shot + proof_level > 0   existing data
```

**Abandonment rates:**

- opened → created: attempts with `add_opened` and no project after 24 h;
- created → chose: projects with no `verify_chose`;
- chose → connected: a choice but no connection, split by the last `verify_result` error code;
- **return:** a connection or description added more than 24 h after creation.

**Time:** `add_opened` → `startups.created_at` → first connection.

**Pre-sign-in steps (0–1):** counted only as far as they're server-visible. Login page views are not tracked: signed-out tracking would need cookies or IP-based IDs, which this design refuses. Onboarding is measured by its outcome (`profiles.handle` set, with the quick flag).

## 3. Proposed events (the minimum)

| Event           | Fires when                                            | Required properties                                                                                                                        | Must NOT be stored                                                 | Duplicates                                                      | Where                                       |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------- |
| `add_opened`    | Step 1 renders for a signed-in user, once per attempt | `attempt_id`                                                                                                                               | the referring page, URL, query string                              | Idempotent: unique per attempt                                  | Client (RPC)                                |
| `add_failed`    | Step 1 submit is refused or the insert errors         | `attempt_id`, `code` ∈ {invalid_link, already_listed, limit_reached, province_missing, category_missing, logo_too_big, slug_taken, server} | the link, name, one-liner, file name, error text                   | Unique per attempt + code (we want "hit it", not a click count) | Client (RPC)                                |
| `add_created`   | The insert succeeds                                   | `attempt_id`, `startup_id`                                                                                                                 | any field value                                                    | Unique per attempt                                              | Client (RPC); truth = `startups.created_at` |
| `verify_chose`  | A chooser tile is selected                            | `attempt_id`, `startup_id`, `choice` ∈ {website, stripe, revenuecat, github, analytics}                                                    | none beyond these                                                  | Unique per attempt + choice                                     | Client (RPC)                                |
| `verify_result` | The sources route answers (wizard **or** edit page)   | `startup_id`, `source`, `ok`, `code` (error code or null)                                                                                  | the key, key hint, account names, numbers, URLs, provider messages | Not deduplicated (each try is a fact); capped by the rate limit | **Server** (route, service role)            |
| `add_finished`  | "ไปที่หน้าผลงาน" or "ข้ามไปก่อน"                      | `attempt_id`, `startup_id`, `skipped` (bool)                                                                                               | none                                                               | Unique per attempt                                              | Client (RPC)                                |

**Deliberately not tracked:**

- button hovers or field focus;
- typing;
- scroll depth;
- page views outside Add-project;
- signed-out visitors;
- the auto-fill result (it would expose which sites are read);
- anything on public pages.

## 4. Event schema

One table, `analytics.funnel_events`, in its **own schema that the API doesn't expose**: clients can't reach it at all, not even with a policy mistake.

| Column       | Type                                             | Notes                                                                                             |
| ------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `id`         | `bigint identity`                                |                                                                                                   |
| `user_id`    | `uuid` → `auth.users`, **on delete cascade**     | Deleting the account deletes its events                                                           |
| `attempt_id` | `uuid` null                                      | Generated in the browser per wizard attempt and kept in the session draft; null for server events |
| `startup_id` | `bigint` → `startups`, **on delete set null**    |                                                                                                   |
| `event`      | `text` check in the 6 names                      |                                                                                                   |
| `props`      | `jsonb` check `octet_length(props::text) <= 200` | Only whitelisted keys, enforced by the logging function                                           |
| `created_at` | `timestamptz default now()`                      | UTC; reports convert to Asia/Bangkok                                                              |

Indexes: `(event, created_at)`, `(startup_id)`, and a partial unique index for the once-per-attempt events.

**Retention: 180 days.** Deleted by the existing daily Vercel cron (`/api/cron/sync`, service role), since the project has no `pg_cron`.

## 5. Privacy model

- **No IP, user agent, referrer, URL, cookie or fingerprint is stored.** PostgREST doesn't write the request IP into rows, and the function never reads request headers.
- **No form contents:** only fixed codes and enums. The logging function **rejects** any property key or value outside the whitelist instead of storing it.
- **No verification details:** no keys, key hints, account IDs, repo names, domains, numbers or provider messages, only `source`, `ok` and the error **code**.
- **Identity:**
  - `user_id` is the only personal link, and it's needed to tell one founder retrying from five founders failing.
  - Reports aggregate by event and count distinct users; they never list user IDs.
  - Deleting an account removes its rows (cascade).
- **Disclosure:** add one bullet to `/privacy` §1 (wording for the owner to approve, as with every privacy change): "เมื่อคุณเพิ่มผลงาน เราบันทึกว่าแต่ละขั้นสำเร็จหรือไม่ (ไม่บันทึกสิ่งที่คุณพิมพ์) เพื่อปรับให้ใช้ง่ายขึ้น ลบอัตโนมัติใน 180 วัน".

## 6. RLS / security model

- **Schema `analytics`:**
  - not in the API's exposed schemas;
  - `revoke all` from `anon` and `authenticated`;
  - RLS enabled with **no policies** (deny-all, belt and braces).
- **Client writes go through one function,** `public.log_add_event(p_attempt uuid, p_event text, p_startup bigint, p_props jsonb)`:
  - `security definer`, `search_path = ''`, granted to `authenticated` only (not `anon`).
  - It takes `user_id` from `auth.uid()`, never from the caller.
  - It accepts only the client events (`add_opened`, `add_failed`, `add_created`, `verify_chose`, `add_finished`).
  - It checks that `p_startup`, when given, is **owned by the caller**.
  - It validates `p_props` against the per-event whitelist.
  - **It never raises** on bad input or a hit limit; it returns silently, so a misbehaving client learns nothing and the UI is never blocked.
  - Rate limit: at most 100 events per user per 24 h (a count under an advisory lock, like `private.take_rate`, but silent).
- **Server writes:** `verify_result` is inserted by the sources route with the service role (it already runs there and knows the outcome).
- **Reading:**
  - No client can read anything.
  - The owner reads aggregates through SQL in the Supabase dashboard or MCP (queries in §8).
  - An admin page is a later option (it would need an admin role, which doesn't exist today).
- **Leak check:**
  - Another user can't log events for your project (ownership check) or read yours (no access).
  - Events never contain field contents or verification details, so even a database dump reveals only which steps a user reached.

## 7. Performance

- **Fire and forget.** The client helper calls the RPC without `await` on the user's path, in a `try/catch` that swallows everything. If Supabase is slow or the function is missing, Add-project behaves exactly as today.
- **Small volume:** at most about 6 rows per attempt, one tiny insert each (plus a 24 h count on an indexed column). Server-side `verify_result` is one insert after the connect call has already answered; it's not awaited before responding.
- **No new round trip on page load:** `add_opened` is sent after first paint, from an effect.
- **No blocking dependency:** the insert has no foreign-key path that can fail in a user-visible way, and the RPC returns void.

## 8. Recommended implementation

**Options:**

| Option                                                     | Pros                                                                                                            | Cons                                                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A. No analytics                                            | Zero work                                                                                                       | Decisions stay guesses; the launch post's traffic is wasted as evidence                                                    |
| **B. Lightweight first-party funnel events (recommended)** | About 6 events, 1 table, data stays in our database, no cookie banner, easy to delete, joins with real outcomes | A little SQL for reports; no dashboards out of the box                                                                     |
| C. Full analytics platform (PostHog, Mixpanel…)            | Dashboards, session replay                                                                                      | A third-party processor (privacy-policy change, consent questions), scripts on every page, overkill for the current volume |

**B, in this order:**

1. Migration (§9) + smoke tests T137–T143 (§10).
2. `src/lib/analytics/add-funnel.ts`: `logAddEvent(event, props)`, fire-and-forget, typed per event; the attempt ID kept in the wizard's session draft.
3. Wire it into:
   - `StartupWizard` (opened / failed / created / finished);
   - `VerifyChooser` (chose);
   - the sources route (`verify_result`, server).
4. Delete rows older than 180 days in the daily cron.
5. The privacy bullet (owner approval first).
6. Reports (saved SQL):

```sql
-- Funnel for attempts started in the last 30 days (Bangkok dates).
with a as (
  select attempt_id, user_id, min(created_at) as opened
  from analytics.funnel_events
  where event = 'add_opened' and created_at > now() - interval '30 days'
  group by 1, 2
), c as (
  select distinct attempt_id, startup_id from analytics.funnel_events where event = 'add_created'
)
select
  count(*)                                                         as opened,
  count(c.startup_id)                                              as created,
  count(*) filter (where exists (select 1 from analytics.funnel_events e
                    where e.attempt_id = a.attempt_id and e.event = 'verify_chose')) as chose,
  count(*) filter (where exists (select 1 from public.provider_connections p
                    where p.startup_id = c.startup_id))            as connected,
  count(*) filter (where exists (select 1 from analytics.funnel_events e
                    where e.attempt_id = a.attempt_id and e.event = 'add_finished')) as finished,
  count(distinct a.user_id)                                        as founders
from a left join c using (attempt_id);

-- Why step 1 fails, and why connections fail.
select props->>'code' code, count(distinct attempt_id) from analytics.funnel_events
where event = 'add_failed' group by 1 order by 2 desc;
select props->>'source' source, props->>'code' code, count(*) from analytics.funnel_events
where event = 'verify_result' and (props->>'ok')::boolean = false group by 1, 2 order by 3 desc;
```

## 9. Migration SQL (draft, not applied)

```sql
-- Add-project funnel events (design: docs/ADD_STARTUP_ANALYTICS_DESIGN.md). Owner approval required.
create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;

create table analytics.funnel_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid,
  startup_id bigint references public.startups (id) on delete set null,
  event text not null check (event in
    ('add_opened', 'add_failed', 'add_created', 'verify_chose', 'add_finished', 'verify_result')),
  props jsonb not null default '{}' check (jsonb_typeof(props) = 'object' and octet_length(props::text) <= 200),
  created_at timestamptz not null default now()
);
alter table analytics.funnel_events enable row level security; -- no policies: deny all clients
revoke all on analytics.funnel_events from public, anon, authenticated;
create index funnel_events_event_time_idx on analytics.funnel_events (event, created_at);
create index funnel_events_startup_idx on analytics.funnel_events (startup_id);
create index funnel_events_user_time_idx on analytics.funnel_events (user_id, created_at);
-- Once per attempt (+ code / choice): retries and double clicks don't inflate the funnel.
create unique index funnel_events_once_idx on analytics.funnel_events
  (attempt_id, event, coalesce(props->>'code', ''), coalesce(props->>'choice', ''))
  where attempt_id is not null;

-- The only client entry point. Silent on anything unexpected: never blocks or informs the UI.
create or replace function public.log_add_event(
  p_attempt uuid, p_event text, p_startup bigint default null, p_props jsonb default '{}'
) returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  allowed text[];
  k text;
begin
  if me is null or p_attempt is null or p_props is null or jsonb_typeof(p_props) <> 'object' then return; end if;
  allowed := case p_event
    when 'add_opened'   then array[]::text[]
    when 'add_failed'   then array['code']
    when 'add_created'  then array[]::text[]
    when 'verify_chose' then array['choice']
    when 'add_finished' then array['skipped']
    else null end;
  if allowed is null then return; end if;                       -- unknown or server-only event
  for k in select jsonb_object_keys(p_props) loop
    if not (k = any (allowed)) then return; end if;             -- unexpected property: drop it all
  end loop;
  if p_event = 'add_failed' and coalesce(p_props->>'code', '') not in
     ('invalid_link', 'already_listed', 'limit_reached', 'province_missing', 'category_missing',
      'logo_too_big', 'slug_taken', 'server') then return; end if;
  if p_event = 'verify_chose' and coalesce(p_props->>'choice', '') not in
     ('website', 'stripe', 'revenuecat', 'github', 'analytics') then return; end if;
  if p_event = 'add_finished' and jsonb_typeof(p_props->'skipped') is distinct from 'boolean' then return; end if;
  if p_startup is not null and not exists
     (select 1 from public.startups s where s.id = p_startup and s.owner_id = me) then return; end if;
  if p_event in ('add_created', 'verify_chose', 'add_finished') and p_startup is null then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(me::text || ':funnel', 0));
  if (select count(*) from analytics.funnel_events
      where user_id = me and created_at > now() - interval '1 day') >= 100 then return; end if;
  insert into analytics.funnel_events (user_id, attempt_id, startup_id, event, props)
  values (me, p_attempt, p_startup, p_event, p_props)
  on conflict do nothing;
end; $$;
revoke execute on function public.log_add_event(uuid, text, bigint, jsonb) from public, anon;
grant execute on function public.log_add_event(uuid, text, bigint, jsonb) to authenticated;

-- Server-side (service role) writes and the daily cleanup.
grant usage on schema analytics to service_role;
grant insert, select, delete on analytics.funnel_events to service_role;
```

The server inserts `verify_result` rows with `props = {"source": …, "ok": …, "code": …}` from a typed helper whose values are the `SourceId` and `ProviderErrorCode` enums, never free text.

## 10. Tests required

**RLS smoke** (`supabase/tests/rls_smoke.sql`, T137–T143):

| ID   | Check                                                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T137 | `authenticated` and `anon` have no table privileges on `analytics.funnel_events`, and no usage on the schema                                                 |
| T138 | `anon` can't execute `log_add_event`; `authenticated` can                                                                                                    |
| T139 | A valid `add_opened` inserts one row with `user_id = auth.uid()`; repeating it inserts nothing (once per attempt)                                            |
| T140 | Unknown event, server-only event (`verify_result`), extra property, bad code / choice: nothing inserted, no error raised                                     |
| T141 | `p_startup` owned by someone else: nothing inserted                                                                                                          |
| T142 | The 101st event within 24 h: nothing inserted, no error                                                                                                      |
| T143 | Deleting the user removes their rows; deleting the project keeps the rows with `startup_id = null`. The function is `security definer` with `search_path=""` |

**Unit (Vitest):**

- `logAddEvent` never throws and never awaits on the caller (a rejected RPC is swallowed);
- event and property types match the SQL whitelist (a shared constant tested against both);
- the server helper maps `ProviderError` codes only.

**Manual / e2e:**

- signed-in flows can't be automated yet (OAuth);
- after deploy, one real attempt on production by the owner, then the funnel query (§8) shows `opened = 1, created = 1…`.

## 11. Future analytics opportunities (not now)

- **Entry point:** a `from` query on the "+ เพิ่มผลงาน" links (header / hero / dashboard / Olympics…) stored as an enum on `add_opened`, to see which entry converts.
- **Owner-checklist completion over time** ("3 ขั้นต่อไป") from existing columns, as a weekly SQL report.
- **The snippet owner check:** found or missing per platform. Needs a "which tool" choice in the help list; only if snippet failures dominate.
- **A small admin page** with the three queries above, once an admin role exists.
- **Signed-out top of funnel** (landing → "+ เพิ่มผลงาน" clicks): only with an aggregate, cookie-free counter (like the live map), never per-person tracking.

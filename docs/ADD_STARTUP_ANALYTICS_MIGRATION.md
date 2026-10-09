# Add-project funnel analytics: final migration for review

Date: 2026-10-08 · Status: **for the owner's review. Not applied anywhere; no code written.**

The design and its reasoning are in [ADD_STARTUP_ANALYTICS_DESIGN.md](ADD_STARTUP_ANALYTICS_DESIGN.md). This file is the version to approve, and it replaces the draft in that file's §9.

## What changed from the draft (and why)

1. **Server writes and cleanup go through functions.**
   - The draft let the server write to `analytics.funnel_events` directly, but the server talks to the database through the Data API, which can't reach a schema it doesn't expose. The draft would have failed silently.
   - Now there are two service-role-only functions: `public.log_verify_result` and `public.prune_funnel_events`.
   - The service role gets **no** table privileges at all.
2. **The client function lives in `private`, with a thin `public` wrapper.** This is the same pattern as `private.take_rate`, and it keeps the database advisor free of "security-definer function callable by signed-in users" warnings.
3. **Every function catches all errors and returns.** An analytics failure can never surface as an error.
4. **Separate caps:**
   - at most 100 client events per user per 24 h (server events no longer count toward it);
   - at most 50 verification results per project per 24 h.

## 1. Event schema

| Event           | Written by                                                                | When                                                           | Stored properties (nothing else is accepted)                                                                                                                                                                                                                                                                                                        | Linked to              |
| --------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `add_opened`    | Browser (`public.log_add_event`)                                          | Add-project step 1 shown to a signed-in user, once per attempt | none                                                                                                                                                                                                                                                                                                                                                | user, attempt          |
| `add_failed`    | Browser                                                                   | Step 1 refused or the insert failed                            | `code` ∈ `invalid_link`, `already_listed`, `limit_reached`, `province_missing`, `category_missing`, `logo_too_big`, `slug_taken`, `server`                                                                                                                                                                                                          | user, attempt          |
| `add_created`   | Browser                                                                   | The project was created                                        | none                                                                                                                                                                                                                                                                                                                                                | user, attempt, project |
| `verify_chose`  | Browser                                                                   | A verification tile was picked                                 | `choice` ∈ `website`, `stripe`, `revenuecat`, `github`, `analytics`                                                                                                                                                                                                                                                                                 | user, attempt, project |
| `add_finished`  | Browser                                                                   | "ไปที่หน้าผลงาน" or "ข้ามไปก่อน"                               | `skipped` (true / false)                                                                                                                                                                                                                                                                                                                            | user, attempt, project |
| `verify_result` | Server (`public.log_verify_result`), after the connect route has answered | Each connect attempt, from the wizard or the edit page         | `source` ∈ `stripe`, `revenuecat`, `jaopor`, `plausible`, `umami`, `cloudflare`, `github`; `ok` (true / false); `code` (null when ok, else one of `invalid_key`, `not_read_only`, `missing_permission`, `rate_limited`, `upstream`, `not_found`, `domain_mismatch`, `not_owner`, `no_github_identity`, `no_website`, `duplicate_listing`, `server`) | user, project          |

`attempt_id` is a random UUID made in the browser when the wizard starts. It's kept in the wizard's existing session draft, so a refresh or a language switch continues the same attempt.

## 2. Exactly what data is stored

One row per event in `analytics.funnel_events`:

| Column       | Example                                          | Personal?                                                 |
| ------------ | ------------------------------------------------ | --------------------------------------------------------- |
| `id`         | 1042                                             | no                                                        |
| `user_id`    | the founder's account id (uuid)                  | **yes**: the only personal link; deleted with the account |
| `attempt_id` | random uuid per wizard attempt                   | no (random, not derived from anything)                    |
| `startup_id` | 107                                              | the project, already public                               |
| `event`      | `verify_chose`                                   | no                                                        |
| `props`      | `{"choice":"stripe"}` (≤ 200 bytes, whitelisted) | no                                                        |
| `created_at` | `2026-10-15 03:12:44+00`                         | no                                                        |

**Never stored:**

- IP address, user agent, referrer, URL or cookies;
- anything typed: link, name, one-liner, file names, error text;
- API keys or key hints, account / repo / domain names, numbers, provider messages.

**Retention:**

- 180 days (deleted by the nightly cron through `public.prune_funnel_events()`);
- immediately when the account is deleted (cascade);
- when a project is deleted, its rows lose `startup_id` (set null).

## 3. RLS and security model

- **The `analytics` schema:**
  - isn't exposed by the Data API;
  - `anon` and `authenticated` have no usage on it and no privileges on the table;
  - RLS is on with **no policies** (deny-all, even if the schema were exposed by mistake).
- **No role can read the table through the API, including the service role.** The owner reads aggregates in the Supabase SQL editor or MCP.
- **Client writes:** only `public.log_add_event` → `private.log_add_event` (security definer, `search_path = ''`):
  - `user_id` always comes from `auth.uid()`, never from the caller;
  - signed-in only (`anon` can't execute it);
  - only the 5 client events; `verify_result` is refused from the browser;
  - property keys and values are checked against the whitelist; anything unexpected stores **nothing**;
  - `startup_id` must belong to the caller;
  - capped at 100 client events per user per 24 h (per-user advisory lock);
  - it never raises and returns `void`.
- **Server writes:** `public.log_verify_result`, executable **only by the service role**:
  - it validates source, ok / code and ownership;
  - capped at 50 per project per 24 h;
  - it never raises.
- **Cleanup:** `public.prune_funnel_events()`, service role only.

## 4. Final migration SQL

File to create: `supabase/migrations/<timestamp>_add_funnel_events.sql`.

> **Checked by:** review only.
>
> **Not checked:** it hasn't been run anywhere, including a rolled-back transaction on production, because you asked not to apply it.
>
> **After approval, applying it follows the usual steps:**
>
> 1. `apply_migration`.
> 2. The security and performance advisors.
> 3. RLS smoke T137–T145.
> 4. Regenerate the types.

```sql
-- Add-project funnel events. Design: docs/ADD_STARTUP_ANALYTICS_DESIGN.md
-- Reviewed version: docs/ADD_STARTUP_ANALYTICS_MIGRATION.md (owner approval required).

-- 1. A schema the Data API doesn't expose, and the one table.
create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;

create table analytics.funnel_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  attempt_id  uuid,
  startup_id  bigint references public.startups (id) on delete set null,
  event       text not null check (event in
                ('add_opened', 'add_failed', 'add_created', 'verify_chose', 'add_finished', 'verify_result')),
  props       jsonb not null default '{}'::jsonb
                check (jsonb_typeof(props) = 'object' and octet_length(props::text) <= 200),
  created_at  timestamptz not null default now()
);

alter table analytics.funnel_events enable row level security; -- no policies: every client is denied
revoke all on table analytics.funnel_events from public, anon, authenticated;

create index funnel_events_event_time_idx on analytics.funnel_events (event, created_at);
create index funnel_events_startup_idx    on analytics.funnel_events (startup_id);
create index funnel_events_user_time_idx  on analytics.funnel_events (user_id, created_at);
-- Once per attempt (+ code / choice): double clicks, retries and refreshes don't inflate the funnel.
create unique index funnel_events_once_idx on analytics.funnel_events
  (attempt_id, event, coalesce(props ->> 'code', ''), coalesce(props ->> 'choice', ''))
  where attempt_id is not null;

-- 2. Browser events. The only client entry point; silent on anything unexpected.
create or replace function private.log_add_event(
  p_attempt uuid, p_event text, p_startup bigint, p_props jsonb
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  allowed text[];
  k text;
begin
  if me is null or p_attempt is null or p_props is null or jsonb_typeof(p_props) <> 'object' then
    return;
  end if;
  allowed := case p_event
    when 'add_opened'   then array[]::text[]
    when 'add_failed'   then array['code']
    when 'add_created'  then array[]::text[]
    when 'verify_chose' then array['choice']
    when 'add_finished' then array['skipped']
  end;
  if allowed is null then return; end if;                 -- unknown or server-only event
  for k in select jsonb_object_keys(p_props) loop
    if not (k = any (allowed)) then return; end if;       -- unexpected property: store nothing
  end loop;
  if p_event = 'add_failed' and coalesce(p_props ->> 'code', '') not in
     ('invalid_link', 'already_listed', 'limit_reached', 'province_missing', 'category_missing',
      'logo_too_big', 'slug_taken', 'server') then
    return;
  end if;
  if p_event = 'verify_chose' and coalesce(p_props ->> 'choice', '') not in
     ('website', 'stripe', 'revenuecat', 'github', 'analytics') then
    return;
  end if;
  if p_event = 'add_finished' and jsonb_typeof(p_props -> 'skipped') is distinct from 'boolean' then
    return;
  end if;
  if p_event in ('add_created', 'verify_chose', 'add_finished') and p_startup is null then
    return;
  end if;
  if p_startup is not null and not exists
     (select 1 from public.startups s where s.id = p_startup and s.owner_id = me) then
    return;                                               -- not the caller's project
  end if;
  -- At most 100 browser events per user per 24 h (serialised per user; silent when reached).
  perform pg_advisory_xact_lock(hashtextextended(me::text || ':funnel', 0));
  if (select count(*) from analytics.funnel_events
      where user_id = me and event <> 'verify_result'
        and created_at > now() - interval '1 day') >= 100 then
    return;
  end if;
  insert into analytics.funnel_events (user_id, attempt_id, startup_id, event, props)
  values (me, p_attempt, p_startup, p_event, p_props)
  on conflict do nothing;                                 -- already logged for this attempt
exception when others then
  return;                                                 -- analytics never surfaces an error
end;
$$;

create or replace function public.log_add_event(
  p_attempt uuid, p_event text, p_startup bigint default null, p_props jsonb default '{}'::jsonb
) returns void
language sql security invoker set search_path = ''
as $$ select private.log_add_event(p_attempt, p_event, p_startup, p_props); $$;

revoke all on function private.log_add_event(uuid, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function private.log_add_event(uuid, text, bigint, jsonb) to authenticated;
revoke all on function public.log_add_event(uuid, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.log_add_event(uuid, text, bigint, jsonb) to authenticated;

-- 3. Verification results, from the server (service role) after the connect route has answered.
create or replace function public.log_verify_result(
  p_user uuid, p_startup bigint, p_source text, p_ok boolean, p_code text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_user is null or p_startup is null or p_ok is null then return; end if;
  if coalesce(p_source, '') not in
     ('stripe', 'revenuecat', 'jaopor', 'plausible', 'umami', 'cloudflare', 'github') then
    return;
  end if;
  if p_ok and p_code is not null then return; end if;
  if not p_ok and coalesce(p_code, '') not in
     ('invalid_key', 'not_read_only', 'missing_permission', 'rate_limited', 'upstream', 'not_found',
      'domain_mismatch', 'not_owner', 'no_github_identity', 'no_website', 'duplicate_listing', 'server') then
    return;
  end if;
  if not exists (select 1 from public.startups s where s.id = p_startup and s.owner_id = p_user) then
    return;
  end if;
  -- Each try is a fact, but at most 50 per project per 24 h.
  perform pg_advisory_xact_lock(hashtextextended(p_startup::text || ':verify', 0));
  if (select count(*) from analytics.funnel_events
      where startup_id = p_startup and event = 'verify_result'
        and created_at > now() - interval '1 day') >= 50 then
    return;
  end if;
  insert into analytics.funnel_events (user_id, startup_id, event, props)
  values (p_user, p_startup, 'verify_result',
          jsonb_build_object('source', p_source, 'ok', p_ok, 'code', p_code));
exception when others then
  return;
end;
$$;

revoke all on function public.log_verify_result(uuid, bigint, text, boolean, text) from public, anon, authenticated;
grant execute on function public.log_verify_result(uuid, bigint, text, boolean, text) to service_role;

-- 4. 180-day retention, called by the nightly cron (service role).
create or replace function public.prune_funnel_events() returns integer
language sql security definer set search_path = ''
as $$
  with gone as (
    delete from analytics.funnel_events where created_at < now() - interval '180 days' returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function public.prune_funnel_events() from public, anon, authenticated;
grant execute on function public.prune_funnel_events() to service_role;
```

**Rollback** (if ever needed; it removes all funnel data):

```sql
drop function if exists public.log_add_event(uuid, text, bigint, jsonb);
drop function if exists private.log_add_event(uuid, text, bigint, jsonb);
drop function if exists public.log_verify_result(uuid, bigint, text, boolean, text);
drop function if exists public.prune_funnel_events();
drop schema if exists analytics cascade;
```

## 5. Duplicate and replayed events

| Case                                                        | What happens                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Double click, network retry, the same request sent twice    | Same `attempt_id` + event (+ code / choice) → the unique index rejects it → `on conflict do nothing`. One row                                                                                                                                                                                          |
| Page refresh or language switch mid-wizard                  | `attempt_id` comes from the session draft → same attempt → no new `add_opened`                                                                                                                                                                                                                         |
| The same error hit five times                               | One `add_failed` row per code per attempt (we want "hit it", not a click count)                                                                                                                                                                                                                        |
| A new tab                                                   | A new attempt (counted as another opening). Reports also count **distinct founders**, so one person opening 3 tabs reads as 3 attempts by 1 founder                                                                                                                                                    |
| A signed-in user replaying the RPC with fresh `attempt_id`s | At most 100 rows a day, only for their own projects, only whitelisted values. The funnel's "created" and "connected" come from the real `startups` / `provider_connections` rows, so fake events can't invent conversions; they can only add noise to "opened", visible as one user with many attempts |
| `verify_result`                                             | Not deduplicated (each connect attempt is a real fact); capped at 50 per project per day                                                                                                                                                                                                               |

## 6. Analytics can never block Add-project

- **Browser:**
  - `logAddEvent()` calls the RPC **without `await`**, inside `try / catch`, with both promise outcomes swallowed.
  - Nothing in the UI reads its result.
  - `add_opened` is sent from an effect after the first paint.
- **If the database is slow:** the event simply arrives late or not at all.
- **If the function is missing** (migration not applied or rolled back): the RPC 404 is swallowed.
- **Database:**
  - the functions return `void` and catch every error;
  - there's no trigger on `startups` or `provider_connections`;
  - the foreign keys only cascade or set null, so they can never stop a project or account from being deleted.
- **Server:**
  - `verify_result` is logged with Next's `after()`, **after** the connect response has been sent;
  - it's wrapped in `try / catch` (logs only the error name).
- **Kill switch:** `revoke execute on function public.log_add_event(...) from authenticated;` stops all browser logging instantly, and the UI is unaffected.

## 7. Tests (RLS smoke T137–T145, run after applying)

| ID   | Check                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T137 | `anon` / `authenticated`: no usage on schema `analytics`, no privileges on the table; RLS on with 0 policies                                                             |
| T138 | Execute rights: both `log_add_event` functions are callable by `authenticated` and not by `anon`; `log_verify_result` and `prune_funnel_events` by `service_role` only   |
| T139 | A valid `add_opened` inserts one row with `user_id = auth.uid()`; repeating it inserts nothing                                                                           |
| T140 | Unknown event, `verify_result` from the browser, an extra property, a bad code or choice, missing `skipped`, `add_created` without a project: nothing inserted, no error |
| T141 | Someone else's project: nothing inserted                                                                                                                                 |
| T142 | The 101st browser event in 24 h is not inserted; `verify_result` rows don't count toward it                                                                              |
| T143 | `log_verify_result`: valid → 1 row; bad source or code, ok-with-code, a foreign owner → 0 rows; the 51st per project per day → not inserted                              |
| T144 | `prune_funnel_events()` deletes only rows older than 180 days                                                                                                            |
| T145 | Deleting the user removes their rows; deleting the project keeps rows with `startup_id = null`; all three definer functions have `search_path = ''`                      |

Plus unit tests:

- `logAddEvent` never throws or awaits;
- the TypeScript event and code lists equal the SQL whitelists (one shared constant, tested).

## 8. Proposed /privacy wording (for approval)

**Where:** a new bullet in **§2 "Project and profile information you enter"**, plus the "Last updated" date.

**Thai (`Privacy.sections.1.items.4.t`):**

> เมื่อคุณเพิ่มผลงาน เราบันทึกว่าคุณผ่านแต่ละขั้นหรือไม่ (เช่น เปิดหน้าเพิ่มผลงาน สร้างผลงานสำเร็จ เลือกวิธียืนยันตัวเลข) และประเภทของข้อผิดพลาดถ้ามี โดยผูกกับบัญชีของคุณ เพื่อหาว่าขั้นไหนใช้ยากแล้วปรับให้ง่ายขึ้น เราไม่บันทึกสิ่งที่คุณพิมพ์ ลิงก์ หรือคีย์ ข้อมูลนี้ไม่แสดงต่อใคร และลบอัตโนมัติหลัง 180 วัน หรือทันทีเมื่อบัญชีของคุณถูกลบ

**English:**

> When you add a project, we record which steps you completed (for example: opened the form, created the project, chose a way to verify your numbers) and the type of error if one happened, linked to your account, so we can find the hard steps and make them easier. We don't record what you type, links or keys. This isn't shown to anyone and is deleted automatically after 180 days, or right away when your account is deleted.

**Updated date:** "อัปเดตล่าสุด: <launch date>" / "Last updated: <launch date>".

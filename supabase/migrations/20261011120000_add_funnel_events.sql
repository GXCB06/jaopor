-- Add-project funnel events (first-party, no cookies). Design and reasoning:
-- docs/ADD_STARTUP_ANALYTICS_DESIGN.md · reviewed migration: docs/ADD_STARTUP_ANALYTICS_MIGRATION.md
--
-- Review fixes applied vs. the version in ADD_STARTUP_ANALYTICS_MIGRATION.md §4:
--   1. `verify_chose.choice` whitelist is metric-first (revenue | traffic | build), matching the A2
--      VerifyPanel chooser (lib/sources/catalog.ts METRICS). The old list (website/stripe/…) was
--      source-based and no longer matched what the UI emits. Sources are recorded in verify_result.
--   2. The schema and table are also revoked from `service_role`, so §3's "no role can read the
--      table through the API, including the service role" holds literally. The service role still
--      writes/reads only through the SECURITY DEFINER functions below.
--
-- NOT APPLIED. Apply only after owner approval, then run the advisors, RLS smoke T137–T145, and
-- regenerate the types (src/lib/supabase/database.types.ts).

-- 1. A schema the Data API doesn't expose, and the one table.
create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated, service_role;

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
revoke all on table analytics.funnel_events from public, anon, authenticated, service_role;

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
     ('revenue', 'traffic', 'build') then
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

-- Rollback (removes all funnel data):
--   drop function if exists public.log_add_event(uuid, text, bigint, jsonb);
--   drop function if exists private.log_add_event(uuid, text, bigint, jsonb);
--   drop function if exists public.log_verify_result(uuid, bigint, text, boolean, text);
--   drop function if exists public.prune_funnel_events();
--   drop schema if exists analytics cascade;

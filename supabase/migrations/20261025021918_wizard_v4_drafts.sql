-- Add-startup wizard v4 (Design.md §5, owner 2026-10-25). Owner-approved and applied 2026-10-25
-- (remote version 20261025030932) after a rolled-back dry-run on production (RLS smoke 248 lines,
-- no BAD; T191-T193 good). The stored SQL matched this file (md5) before this header was updated.
--
-- 1. A new project starts as a private draft: clients may now set `status` on insert, limited to
--    'published' or 'private' (the moderators' 'hidden' stays server-only, as on update in
--    startups_owner_status). The wizard publishes it at the last step.
-- 2. Funnel: a new browser event `add_step` (entering step 2 / 3 / 4), recorded with the existing
--    `choice` property ('details' | 'media' | 'verify') so the per-attempt unique index
--    funnel_events_once_idx keeps one row per step without changing it.
--
-- Rollback (as a NEW migration): revoke insert (status) on public.startups from authenticated;
-- drop trigger startups_insert_status on public.startups; drop function private.startups_insert_status();
-- restore the previous funnel_events_event_check and private.log_add_event (20261011120000).

-- 1. drafts -----------------------------------------------------------------------------------------

grant insert (status) on public.startups to authenticated;

create or replace function private.startups_insert_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and new.status not in ('published', 'private') then
    raise exception 'a new project is published or a private draft' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger startups_insert_status
  before insert on public.startups
  for each row execute function private.startups_insert_status();

-- 2. funnel: add_step --------------------------------------------------------------------------------

alter table analytics.funnel_events
  drop constraint funnel_events_event_check,
  add constraint funnel_events_event_check check (event in
    ('add_opened', 'add_failed', 'add_created', 'add_step', 'verify_chose', 'add_finished',
     'verify_result'));

create or replace function private.log_add_event(
  p_attempt uuid, p_event text, p_startup bigint, p_props jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
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
    when 'add_step'     then array['choice']
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
  if p_event = 'add_step' and coalesce(p_props ->> 'choice', '') not in
     ('details', 'media', 'verify') then
    return;
  end if;
  if p_event = 'verify_chose' and coalesce(p_props ->> 'choice', '') not in
     ('revenue', 'traffic', 'build') then
    return;
  end if;
  if p_event = 'add_finished' and jsonb_typeof(p_props -> 'skipped') is distinct from 'boolean' then
    return;
  end if;
  if p_event in ('add_created', 'add_step', 'verify_chose', 'add_finished') and p_startup is null then
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

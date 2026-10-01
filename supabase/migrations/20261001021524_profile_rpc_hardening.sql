-- Phase 9a follow-up: advisor WARNs 0028/0029 (SECURITY DEFINER functions callable from the browser).
-- The masked profile reads stay SECURITY DEFINER (they must read the visibility-controlled columns)
-- but are now SERVER-ONLY: execute is granted to service_role, and the server passes the viewer's
-- user id (from the verified session) instead of relying on auth.uid().

-- Visibility check for an explicit viewer (null = signed out). can_see() wraps it for RLS.
create or replace function private.can_see_as(owner uuid, field text, viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select viewer = owner
    or case coalesce(
      (select p.field_visibility ->> field from public.profiles p where p.id = owner), 'public')
      when 'public' then true
      when 'members' then viewer is not null
      else false
    end;
$$;
revoke execute on function private.can_see_as(uuid, text, uuid) from public;
grant execute on function private.can_see_as(uuid, text, uuid) to anon, authenticated, service_role;

create or replace function private.can_see(owner uuid, field text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_see_as(owner, field, (select auth.uid()));
$$;

-- get_profile(handle) → get_profile(handle, viewer), server only.
drop function public.get_profile(text);
create function public.get_profile(p_handle text, p_viewer uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'handle', p.handle, 'display_name', p.display_name, 'avatar_url', p.avatar_url,
    'x_handle', p.x_handle, 'headline', p.headline, 'status', p.status,
    'created_at', p.created_at,
    'bio', case when private.can_see_as(p.id, 'bio', p_viewer) then p.bio end,
    'province', case when private.can_see_as(p.id, 'province', p_viewer) then p.province end,
    'social_links', case when private.can_see_as(p.id, 'social_links', p_viewer) then p.social_links end,
    'looking_for', case when private.can_see_as(p.id, 'looking_for', p_viewer) then p.looking_for end,
    'followers', (select count(*) from public.follows f where f.following_id = p.id),
    'following', (select count(*) from public.follows f where f.follower_id = p.id)
  )
  from public.profiles p
  where p.handle = lower(p_handle);
$$;
revoke execute on function public.get_profile(text, uuid) from public, anon, authenticated;
grant execute on function public.get_profile(text, uuid) to service_role;

-- profile_activity(user, from, to) → (…, viewer), server only.
drop function public.profile_activity(uuid, date, date);
create function public.profile_activity(p_user uuid, p_from date, p_to date, p_viewer uuid default null)
returns table (day date, score integer)
language sql
stable
security definer
set search_path = ''
as $$
  select a.day, a.score from private.user_activity_days a
  where a.user_id = p_user and a.day between p_from and p_to
    and private.can_see_as(p_user, 'activity', p_viewer)
    and p_to - p_from <= 400
  order by a.day;
$$;
revoke execute on function public.profile_activity(uuid, date, date, uuid) from public, anon, authenticated;
grant execute on function public.profile_activity(uuid, date, date, uuid) to service_role;

-- The owner's own full row is read by server code with the service role (no RPC needed).
drop function public.get_my_profile();

-- Username availability only needs the public `handle`/`id` columns: plain SECURITY INVOKER.
create or replace function public.handle_available(p_handle text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select lower(p_handle) ~ '^[a-z0-9_]{3,30}$'
    and lower(p_handle) <> all (array[
      'admin', 'administrator', 'api', 'app', 'auth', 'builders', 'categories', 'category',
      'dashboard', 'en', 'help', 'jaopor', 'login', 'logout', 'me', 'new', 'null', 'olympics',
      'privacy', 'province', 'root', 'settings', 'signin', 'signup', 'startup', 'startups',
      'support', 'system', 'terms', 'th', 'u', 'undefined', 'www'])
    and not exists (
      select 1 from public.profiles p
      where p.handle = lower(p_handle)
        and p.id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
    );
$$;

-- Advisor INFO 0001: covering indexes for the new foreign keys.
create index profiles_province_idx on public.profiles (province);
create index startup_members_invited_by_idx on public.startup_members (invited_by);
create index user_reports_reported_idx on public.user_reports (reported_id);

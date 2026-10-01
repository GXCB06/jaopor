-- Phase 9a: builder profiles & networking (docs/SPEC.md "Phase 9"). DRAFT — shown to the user
-- before applying. Profiles are built on proof; contact details only after an accepted request.
--
-- Decisions (Project.md §6):
--   * The existing `profiles.handle` IS the username (same 3–30 [a-z0-9_] rule, now also blocks
--     reserved words). No second column.
--   * X stays in `profiles.x_handle`; `social_links` holds the other networks (https URLs).
--   * Visibility-controlled profile fields (bio, province, social_links, looking_for) are NOT
--     selectable by clients; they're read through get_profile() (masked by field_visibility) or
--     get_my_profile() (owner). Child tables (skills, positions) apply the same rule in RLS.
--   * Badges are computed in TypeScript, not stored.

-- ---------------------------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------------------------
alter table public.profiles
  add constraint profiles_handle_reserved check (
    handle <> all (array[
      'admin', 'administrator', 'api', 'app', 'auth', 'builders', 'categories', 'category',
      'dashboard', 'en', 'help', 'jaopor', 'login', 'logout', 'me', 'new', 'null', 'olympics',
      'privacy', 'province', 'root', 'settings', 'signin', 'signup', 'startup', 'startups',
      'support', 'system', 'terms', 'th', 'u', 'undefined', 'www'
    ])
  ),
  add column headline text check (char_length(headline) <= 80),
  add column bio text check (char_length(bio) <= 280),
  add column province text references public.provinces (slug) on update cascade,
  add column status text not null default 'networking'
    check (status in ('looking_cofounder', 'open_to_work', 'networking', 'busy')),
  add column looking_for jsonb not null default '{}'::jsonb,
  add column social_links jsonb not null default '{}'::jsonb,
  add column show_in_directory boolean not null default true,
  add column field_visibility jsonb not null default '{}'::jsonb;

-- Shape checks for the jsonb columns (a trigger, same pattern as startups_validate_vocab).
create or replace function private.profiles_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  k text;
  v jsonb;
  ok boolean;
begin
  -- looking_for {roles[], offer, commitment, deal, location, industries[]}
  if jsonb_typeof(new.looking_for) <> 'object' then
    raise exception 'looking_for must be an object' using errcode = '23514';
  end if;
  for k, v in select key, value from jsonb_each(new.looking_for) loop
    -- (assigned first: inside IF, PL/pgSQL would end the condition at the CASE's first THEN)
    ok := case k
      when 'roles' then jsonb_typeof(v) = 'array' and jsonb_array_length(v) <= 7
        and not exists (select 1 from jsonb_array_elements_text(v) e
          where e <> all (array['engineering', 'product', 'design', 'growth', 'sales', 'ops', 'ai']))
      when 'offer' then jsonb_typeof(v) = 'string' and char_length(v #>> '{}') <= 200
      when 'commitment' then (v #>> '{}') = any (array['full_time', 'part_time', 'weekends', 'flexible'])
      when 'deal' then (v #>> '{}') = any (array['equity', 'salary', 'equity_salary', 'revenue_share', 'tbd'])
      when 'location' then (v #>> '{}') = any (array['remote', 'onsite', 'hybrid'])
      when 'industries' then jsonb_typeof(v) = 'array' and jsonb_array_length(v) <= 5
        and not exists (select 1 from jsonb_array_elements_text(v) e
          where e <> all (array['ai', 'saas', 'developer-tools', 'fintech', 'marketing', 'ecommerce', 'productivity', 'design', 'no-code', 'analytics', 'education', 'health', 'community', 'content', 'crypto', 'support', 'entertainment', 'games', 'green-tech', 'iot', 'legal', 'marketplace', 'mobile', 'news', 'real-estate', 'hr', 'sales', 'security', 'social', 'travel', 'utilities', 'line-oa', 'food', 'agritech', 'local-sme', 'logistics', 'other']))
      else false
    end;
    if not coalesce(ok, false) then
      raise exception 'invalid looking_for.%', k using errcode = '23514';
    end if;
  end loop;

  -- social_links {linkedin, github, facebook, youtube, tiktok, website}: https URLs only
  if jsonb_typeof(new.social_links) <> 'object' then
    raise exception 'social_links must be an object' using errcode = '23514';
  end if;
  for k, v in select key, value from jsonb_each(new.social_links) loop
    if k <> all (array['linkedin', 'github', 'facebook', 'youtube', 'tiktok', 'website'])
       or jsonb_typeof(v) <> 'string'
       or (v #>> '{}') !~ '^https://[^\s]{4,200}$' then
      raise exception 'invalid social_links.%', k using errcode = '23514';
    end if;
  end loop;

  -- field_visibility {field: public | members | hidden}
  if jsonb_typeof(new.field_visibility) <> 'object' then
    raise exception 'field_visibility must be an object' using errcode = '23514';
  end if;
  for k, v in select key, value from jsonb_each(new.field_visibility) loop
    if k <> all (array['bio', 'province', 'social_links', 'looking_for', 'positions', 'skills', 'activity'])
       or (v #>> '{}') <> all (array['public', 'members', 'hidden']) then
      raise exception 'invalid field_visibility.%', k using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;
revoke execute on function private.profiles_validate() from public, anon, authenticated;

create trigger profiles_validate
  before insert or update on public.profiles
  for each row execute function private.profiles_validate();

-- Column grants: clients read only the always-public columns; the owner edits the new fields.
revoke select on public.profiles from anon, authenticated;
grant select (id, handle, display_name, avatar_url, x_handle, headline, status, show_in_directory,
  created_at, updated_at) on public.profiles to anon, authenticated;
grant update (headline, bio, province, status, looking_for, social_links, show_in_directory,
  field_visibility) on public.profiles to authenticated;

-- Can the current viewer see `field` of `owner`'s profile? (public / members = signed in / hidden)
create or replace function private.can_see(owner uuid, field text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = owner
    or case coalesce(
      (select p.field_visibility ->> field from public.profiles p where p.id = owner), 'public')
      when 'public' then true
      when 'members' then (select auth.uid()) is not null
      else false
    end;
$$;
grant usage on schema private to anon, authenticated;
revoke execute on function private.can_see(uuid, text) from public;
grant execute on function private.can_see(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. private_contacts: only the owner, and people whose request the owner accepted
-- ---------------------------------------------------------------------------------------------
create table public.private_contacts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  line_id text check (line_id ~ '^[A-Za-z0-9._@-]{1,50}$'),
  email text check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------
-- 3. skills (vocabulary = src/lib/config/skills.ts; config.test.ts checks the list)
-- ---------------------------------------------------------------------------------------------
create table public.profile_skills (
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_slug text not null check (skill_slug = any (array[
    -- Engineering
    'frontend', 'backend', 'fullstack', 'mobile-dev', 'devops', 'data-engineering', 'security',
    'qa', 'embedded', 'game-dev', 'web3-dev', 'line-dev',
    -- Product
    'product-management', 'ux-research', 'no-code', 'project-management', 'technical-writing',
    -- Design
    'ui-design', 'ux-design', 'graphic-design', 'brand-design', 'motion-design', '3d-design',
    -- Growth / Marketing
    'seo', 'content-marketing', 'social-media', 'performance-ads', 'community-building',
    'copywriting', 'video-production', 'influencer-marketing', 'email-marketing',
    -- Sales
    'b2b-sales', 'partnerships', 'customer-success', 'fundraising',
    -- Ops / Finance
    'operations', 'finance', 'accounting', 'legal', 'hr', 'supply-chain',
    -- AI
    'prompt-engineering', 'llm-apps', 'ai-agents', 'machine-learning', 'computer-vision',
    'data-science', 'ai-automation'
  ])),
  is_superpower boolean not null default false,
  position smallint not null default 0 check (position between 0 and 99),
  primary key (user_id, skill_slug)
);

-- ---------------------------------------------------------------------------------------------
-- 4. positions (experience timeline)
-- ---------------------------------------------------------------------------------------------
create table public.positions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  company text check (char_length(company) <= 80),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  description text check (char_length(description) <= 200),
  position smallint not null default 0 check (position between 0 and 99),
  created_at timestamptz not null default now()
);
create index positions_user_idx on public.positions (user_id);

-- Max 20 skills (3 superpowers) and 20 positions per user.
create or replace function private.profile_list_limits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'profile_skills' then
    if (select count(*) from public.profile_skills s
        where s.user_id = new.user_id and s.skill_slug <> new.skill_slug) >= 20 then
      raise exception 'at most 20 skills' using errcode = '23514';
    end if;
    if new.is_superpower and (select count(*) from public.profile_skills s
        where s.user_id = new.user_id and s.skill_slug <> new.skill_slug and s.is_superpower) >= 3 then
      raise exception 'at most 3 superpowers' using errcode = '23514';
    end if;
  elsif tg_table_name = 'positions' then
    if tg_op = 'INSERT' and (select count(*) from public.positions p where p.user_id = new.user_id) >= 20 then
      raise exception 'at most 20 positions' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function private.profile_list_limits() from public, anon, authenticated;
create trigger profile_skills_limits before insert or update on public.profile_skills
  for each row execute function private.profile_list_limits();
create trigger positions_limits before insert on public.positions
  for each row execute function private.profile_list_limits();

-- ---------------------------------------------------------------------------------------------
-- 5. startup_members: both sides must agree
-- ---------------------------------------------------------------------------------------------
create table public.startup_members (
  startup_id bigint not null references public.startups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('founder', 'cofounder', 'maker', 'contributor')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  invited_by uuid not null references public.profiles (id) on delete cascade,
  -- The member's own "pinned works" order on their profile (null = not pinned; max 6 in the app).
  pinned_position smallint check (pinned_position between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (startup_id, user_id)
);
create index startup_members_user_idx on public.startup_members (user_id);

-- Startup owner regardless of the caller's RLS (a member may answer an invite to a draft).
create or replace function private.startup_owner(p_startup bigint)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.owner_id from public.startups s where s.id = p_startup;
$$;
revoke execute on function private.startup_owner(bigint) from public;
grant execute on function private.startup_owner(bigint) to authenticated;

-- Owner invites (member accepts) or member asks (owner approves). Only the other side confirms.
-- SECURITY INVOKER on purpose: `current_user` must be the caller's role. Checks apply to client
-- roles only; server code and the founder trigger (table owner) bypass them.
create or replace function private.startup_members_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  owner uuid;
begin
  if current_user not in ('anon', 'authenticated') then
    return coalesce(new, old);
  end if;
  owner := private.startup_owner(coalesce(new.startup_id, old.startup_id));

  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.invited_by <> me or new.role = 'founder'
       or not ((me = owner and new.user_id <> me) or (new.user_id = me and me <> owner)) then
      raise exception 'invalid membership request' using errcode = '42501';
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.startup_id <> old.startup_id or new.user_id <> old.user_id
       or new.invited_by <> old.invited_by or new.created_at <> old.created_at then
      raise exception 'membership keys are fixed' using errcode = '42501';
    end if;
    if new.status <> old.status and not (
      old.status = 'pending' and new.status in ('confirmed', 'declined')
      and me = case when old.invited_by = owner then old.user_id else owner end
    ) then
      raise exception 'only the other side can answer' using errcode = '42501';
    end if;
    if new.role <> old.role and (me <> owner or old.role = 'founder' or new.role = 'founder') then
      raise exception 'only the owner changes roles' using errcode = '42501';
    end if;
    if new.pinned_position is distinct from old.pinned_position and me <> old.user_id then
      raise exception 'only the member pins' using errcode = '42501';
    end if;
    new.updated_at := now();
    return new;
  else -- DELETE: either side may leave / remove, but the owner stays founder while they own it
    if owner is not null and old.user_id = owner then
      raise exception 'the owner stays a member' using errcode = '42501';
    end if;
    return old;
  end if;
end;
$$;
revoke execute on function private.startup_members_guard() from public;
create trigger startup_members_guard before insert or update or delete on public.startup_members
  for each row execute function private.startup_members_guard();

-- Every startup owner is its confirmed founder (existing rows now, new startups by trigger).
insert into public.startup_members (startup_id, user_id, role, status, invited_by)
select s.id, s.owner_id, 'founder', 'confirmed', s.owner_id from public.startups s
on conflict do nothing;

create or replace function private.startups_add_founder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.startup_members (startup_id, user_id, role, status, invited_by)
  values (new.id, new.owner_id, 'founder', 'confirmed', new.owner_id)
  on conflict do nothing;
  return null;
end;
$$;
revoke execute on function private.startups_add_founder() from public, anon, authenticated;
create trigger startups_add_founder after insert on public.startups
  for each row execute function private.startups_add_founder();

-- ---------------------------------------------------------------------------------------------
-- 6. follows
-- ---------------------------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id);

-- ---------------------------------------------------------------------------------------------
-- 7. contact_requests: signed in, 5 new per sender per day, 1 pending per pair
-- ---------------------------------------------------------------------------------------------
create table public.contact_requests (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null check (topic in ('cofounder', 'job', 'collab', 'other')),
  message text not null check (char_length(message) between 1 and 500),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_id <> to_id)
);
create unique index contact_requests_one_pending_per_pair
  on public.contact_requests (least(from_id, to_id), greatest(from_id, to_id))
  where status = 'pending';
create index contact_requests_to_idx on public.contact_requests (to_id, status);
create index contact_requests_from_day_idx on public.contact_requests (from_id, created_at);

-- SECURITY INVOKER on purpose (see startup_members_guard); the sender can read their own rows.
create or replace function private.contact_requests_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.from_id <> me or new.status <> 'pending' then
      raise exception 'invalid request' using errcode = '42501';
    end if;
    if (select count(*) from public.contact_requests r
        where r.from_id = me and r.created_at > now() - interval '1 day') >= 5 then
      raise exception 'daily request limit reached' using errcode = '54000';
    end if;
    if exists (select 1 from public.contact_requests r
               where r.from_id = new.to_id and r.to_id = me and r.status = 'blocked'
                  or r.from_id = me and r.to_id = new.to_id and r.status = 'blocked') then
      raise exception 'blocked' using errcode = '42501';
    end if;
    new.created_at := now();
    new.responded_at := null;
    return new;
  end if;
  -- UPDATE: only the recipient answers; nothing else changes.
  if me <> old.to_id or new.from_id <> old.from_id or new.to_id <> old.to_id
     or new.topic <> old.topic or new.message <> old.message or new.created_at <> old.created_at
     or not (
       (old.status = 'pending' and new.status in ('accepted', 'declined', 'blocked'))
       or (old.status in ('accepted', 'declined') and new.status = 'blocked')
     ) then
    raise exception 'only the recipient answers a request' using errcode = '42501';
  end if;
  new.responded_at := now();
  return new;
end;
$$;
revoke execute on function private.contact_requests_guard() from public;
create trigger contact_requests_guard before insert or update on public.contact_requests
  for each row execute function private.contact_requests_guard();

-- Has `a` accepted a request with `b` (either direction)? Used by private_contacts RLS.
create or replace function private.contact_accepted(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.contact_requests r
    where r.status = 'accepted'
      and ((r.from_id = a and r.to_id = b) or (r.from_id = b and r.to_id = a))
  );
$$;
revoke execute on function private.contact_accepted(uuid, uuid) from public;
grant execute on function private.contact_accepted(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 8. profile_views (server writes; unique per viewer per day; no IPs), reports
-- ---------------------------------------------------------------------------------------------
create table public.profile_views (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  viewer_hash bytea not null,
  primary key (profile_id, day, viewer_hash)
);

create table public.user_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('spam', 'fake', 'harassment', 'impersonation', 'other')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (reporter_id, reported_id),
  check (reporter_id <> reported_id)
);

-- ---------------------------------------------------------------------------------------------
-- 9. Activity heatmap: daily commits per startup (GitHub sync) + a per-user daily rollup
-- ---------------------------------------------------------------------------------------------
create table public.build_activity (
  startup_id bigint not null references public.startups (id) on delete cascade,
  day date not null,
  commits integer not null check (commits >= 0),
  primary key (startup_id, day)
);

-- Refreshed by the daily cron (refresh_activity), never computed per request.
create materialized view private.user_activity_days as
select m.user_id, d.day, sum(d.score)::integer as score
from public.startup_members m
join (
  select b.startup_id, b.day, b.commits as score from public.build_activity b where b.commits > 0
  union all
  select r.startup_id, r.day, 1 from public.revenue_snapshots r where r.revenue_cents > 0
) d on d.startup_id = m.startup_id
join public.startups s on s.id = m.startup_id and s.status = 'published' and not s.is_demo
where m.status = 'confirmed'
group by m.user_id, d.day;
create unique index user_activity_days_pk on private.user_activity_days (user_id, day);

create or replace function public.refresh_activity()
returns void
language sql
security definer
set search_path = ''
as $$
  refresh materialized view concurrently private.user_activity_days;
$$;
revoke execute on function public.refresh_activity() from public, anon, authenticated;
grant execute on function public.refresh_activity() to service_role;

create or replace function public.profile_activity(p_user uuid, p_from date, p_to date)
returns table (day date, score integer)
language sql
stable
security definer
set search_path = ''
as $$
  select a.day, a.score from private.user_activity_days a
  where a.user_id = p_user and a.day between p_from and p_to
    and private.can_see(p_user, 'activity')
    and p_to - p_from <= 400
  order by a.day;
$$;
revoke execute on function public.profile_activity(uuid, date, date) from public;
grant execute on function public.profile_activity(uuid, date, date) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 10. Reading profiles
-- ---------------------------------------------------------------------------------------------
-- Public profile by handle, controlled fields masked by field_visibility.
create or replace function public.get_profile(p_handle text)
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
    'bio', case when private.can_see(p.id, 'bio') then p.bio end,
    'province', case when private.can_see(p.id, 'province') then p.province end,
    'social_links', case when private.can_see(p.id, 'social_links') then p.social_links end,
    'looking_for', case when private.can_see(p.id, 'looking_for') then p.looking_for end,
    'followers', (select count(*) from public.follows f where f.following_id = p.id),
    'following', (select count(*) from public.follows f where f.follower_id = p.id)
  )
  from public.profiles p
  where p.handle = lower(p_handle);
$$;
revoke execute on function public.get_profile(text) from public;
grant execute on function public.get_profile(text) to anon, authenticated;

-- The signed-in user's full row (editor, dashboard).
create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles p where p.id = (select auth.uid());
$$;
revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- Username availability for the onboarding / editor check (no row data leaks).
create or replace function public.handle_available(p_handle text)
returns boolean
language sql
stable
security definer
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
      where p.handle = lower(p_handle) and p.id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
    );
$$;
revoke execute on function public.handle_available(text) from public;
grant execute on function public.handle_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 11. RLS + grants
-- ---------------------------------------------------------------------------------------------
alter table public.private_contacts enable row level security;
alter table public.profile_skills enable row level security;
alter table public.positions enable row level security;
alter table public.startup_members enable row level security;
alter table public.follows enable row level security;
alter table public.contact_requests enable row level security;
alter table public.profile_views enable row level security;
alter table public.user_reports enable row level security;
alter table public.build_activity enable row level security;

revoke all on public.private_contacts, public.profile_skills, public.positions,
  public.startup_members, public.follows, public.contact_requests, public.profile_views,
  public.user_reports, public.build_activity from anon, authenticated;
grant select, insert, update, delete on public.private_contacts, public.profile_skills,
  public.positions, public.startup_members, public.follows, public.contact_requests,
  public.profile_views, public.user_reports, public.build_activity to service_role;

-- private_contacts: owner + accepted counterpart read; owner writes
grant select, insert, update, delete on public.private_contacts to authenticated;
create policy "contacts: owner or accepted contact reads" on public.private_contacts
  for select to authenticated
  using ((select auth.uid()) = user_id or private.contact_accepted((select auth.uid()), user_id));
create policy "contacts: owner inserts" on public.private_contacts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "contacts: owner updates" on public.private_contacts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "contacts: owner deletes" on public.private_contacts
  for delete to authenticated using ((select auth.uid()) = user_id);

-- profile_skills / positions: read per field_visibility; owner writes
grant select on public.profile_skills, public.positions to anon, authenticated;
grant insert, update, delete on public.profile_skills, public.positions to authenticated;
create policy "skills: visible per settings" on public.profile_skills
  for select to anon, authenticated using (private.can_see(user_id, 'skills'));
create policy "skills: owner inserts" on public.profile_skills
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "skills: owner updates" on public.profile_skills
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "skills: owner deletes" on public.profile_skills
  for delete to authenticated using ((select auth.uid()) = user_id);
create policy "positions: visible per settings" on public.positions
  for select to anon, authenticated using (private.can_see(user_id, 'positions'));
create policy "positions: owner inserts" on public.positions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "positions: owner updates" on public.positions
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "positions: owner deletes" on public.positions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- startup_members: confirmed are public; pending/declined only to the two sides
grant select on public.startup_members to anon, authenticated;
grant insert (startup_id, user_id, role, invited_by) on public.startup_members to authenticated;
grant update (role, status, pinned_position) on public.startup_members to authenticated;
grant delete on public.startup_members to authenticated;
create policy "members: confirmed public, pending to both sides" on public.startup_members
  for select to anon, authenticated using (
    status = 'confirmed'
    or (select auth.uid()) = user_id
    or exists (select 1 from public.startups s
               where s.id = startup_id and s.owner_id = (select auth.uid()))
  );
create policy "members: owner invites or member asks" on public.startup_members
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    or exists (select 1 from public.startups s
               where s.id = startup_id and s.owner_id = (select auth.uid()))
  );
create policy "members: either side updates" on public.startup_members
  for update to authenticated using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.startups s
               where s.id = startup_id and s.owner_id = (select auth.uid()))
  );
create policy "members: either side removes" on public.startup_members
  for delete to authenticated using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.startups s
               where s.id = startup_id and s.owner_id = (select auth.uid()))
  );

-- follows: public counts; you follow/unfollow as yourself
grant select on public.follows to anon, authenticated;
grant insert (follower_id, following_id), delete on public.follows to authenticated;
create policy "follows are public" on public.follows for select to anon, authenticated using (true);
create policy "follow as yourself" on public.follows
  for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy "unfollow as yourself" on public.follows
  for delete to authenticated using ((select auth.uid()) = follower_id);

-- contact_requests: the two sides only
grant select, delete on public.contact_requests to authenticated;
grant insert (from_id, to_id, topic, message) on public.contact_requests to authenticated;
grant update (status) on public.contact_requests to authenticated;
create policy "requests: both sides read" on public.contact_requests
  for select to authenticated
  using ((select auth.uid()) in (from_id, to_id));
create policy "requests: send as yourself" on public.contact_requests
  for insert to authenticated with check ((select auth.uid()) = from_id);
create policy "requests: recipient answers" on public.contact_requests
  for update to authenticated using ((select auth.uid()) = to_id)
  with check ((select auth.uid()) = to_id);
create policy "requests: sender withdraws a pending one" on public.contact_requests
  for delete to authenticated using ((select auth.uid()) = from_id and status = 'pending');

-- profile_views: the owner reads counts; only the server writes
grant select on public.profile_views to authenticated;
create policy "views: owner reads" on public.profile_views
  for select to authenticated using ((select auth.uid()) = profile_id);

-- user_reports: write-only for users
grant insert (reporter_id, reported_id, reason, note) on public.user_reports to authenticated;
create policy "reports: file as yourself" on public.user_reports
  for insert to authenticated with check ((select auth.uid()) = reporter_id);

-- build_activity: build proof of visible startups is public; server writes
grant select on public.build_activity to anon, authenticated;
create policy "activity of visible startups is public" on public.build_activity
  for select to anon, authenticated using (
    exists (select 1 from public.startups s where s.id = startup_id)
  );

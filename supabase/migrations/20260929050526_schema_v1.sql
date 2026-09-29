-- MRRMafia schema v1 (Phase 1a launch).
-- Access model:
--   * Public (anon + authenticated) can READ profiles, published startups and their revenue snapshots.
--   * Founders can create/edit their own startups — but never the verified metric columns.
--   * Verified metrics, provider keys and snapshots are written ONLY by server code using the secret key.
-- New projects don't expose public tables to the Data API automatically, so every grant is explicit.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers (private schema = not reachable through the Data API)
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one per auth user, created automatically on sign-up
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text check (char_length(display_name) <= 80),
  avatar_url text check (char_length(avatar_url) <= 500),
  x_handle text check (x_handle ~ '^[A-Za-z0-9_]{1,15}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

-- Runs as the table owner so it can insert while the new user has no session yet.
-- Only reads the provider's display name/avatar (not used for any authorization).
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80),
    left(new.raw_user_meta_data ->> 'avatar_url', 500)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- startups
-- ---------------------------------------------------------------------------
create sequence private.founding_number_seq;

create table public.startups (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$'),
  name text not null check (char_length(name) between 1 and 80),
  website_url text not null check (website_url ~ '^https?://' and char_length(website_url) <= 300),
  logo_path text check (char_length(logo_path) <= 300),
  tagline text check (char_length(tagline) <= 140),
  description text check (char_length(description) <= 2000),
  category text not null default 'other' check (category in (
    'ai', 'saas', 'developer-tools', 'fintech', 'marketing', 'ecommerce', 'productivity',
    'education', 'health', 'content', 'design', 'analytics', 'mobile', 'other'
  )),
  country text not null default 'TH' check (country ~ '^[A-Z]{2}$'),
  province text check (char_length(province) <= 60),
  founded_on date,
  ai_tools text[] not null default '{}' check (
    ai_tools <@ array['claude-code', 'opencode', 'cursor', 'codex', 'windsurf', 'lovable', 'v0', 'replit', 'bolt', 'other']::text[]
  ),
  tech_stack text[] not null default '{}' check (cardinality(tech_stack) <= 20),
  marketing_channels text[] not null default '{}' check (cardinality(marketing_channels) <= 10),
  audience text check (audience in ('b2b', 'b2c', 'both')),
  value_proposition text check (char_length(value_proposition) <= 300),
  problem_solved text check (char_length(problem_solved) <= 300),
  pricing text check (char_length(pricing) <= 300),
  team_size text check (team_size in ('solo', '2-5', '6-20', '20+')),
  funding text check (funding in ('bootstrapped', 'angel', 'vc')),
  founder_message text check (char_length(founder_message) <= 500),
  status text not null default 'published' check (status in ('published', 'hidden')),
  founding_number integer unique,

  -- Verified metrics: written by server sync only (no UPDATE grant for these columns).
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'error')),
  verified_provider text check (verified_provider in ('stripe')),
  mrr_cents bigint check (mrr_cents >= 0),
  revenue_30d_cents bigint check (revenue_30d_cents >= 0),
  revenue_prev_30d_cents bigint check (revenue_prev_30d_cents >= 0),
  revenue_all_time_cents bigint check (revenue_all_time_cents >= 0),
  active_subscriptions integer check (active_subscriptions >= 0),
  customers integer check (customers >= 0),
  last_synced_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index startups_owner_id_idx on public.startups (owner_id);
create index startups_leaderboard_idx on public.startups (mrr_cents desc nulls last) where status = 'published' and verification_status = 'verified';
create index startups_created_at_idx on public.startups (created_at desc) where status = 'published';
create index startups_ai_tools_idx on public.startups using gin (ai_tools);

create trigger startups_set_updated_at
before update on public.startups
for each row execute function private.set_updated_at();

-- Founding Mafia badge for the first 100 startups; also caps listings per founder (anti-spam).
create or replace function private.startups_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n bigint;
begin
  if (select count(*) from public.startups where owner_id = new.owner_id) >= 5 then
    raise exception 'limit of 5 startups per founder reached' using errcode = 'P0001';
  end if;
  n := nextval('private.founding_number_seq');
  new.founding_number := case when n <= 100 then n else null end;
  return new;
end;
$$;

revoke execute on function private.startups_before_insert() from public, anon, authenticated;

create trigger startups_before_insert
before insert on public.startups
for each row execute function private.startups_before_insert();

-- ---------------------------------------------------------------------------
-- provider_connections: encrypted read-only keys. No client access at all.
-- ---------------------------------------------------------------------------
create table public.provider_connections (
  id bigint generated always as identity primary key,
  startup_id bigint not null references public.startups (id) on delete cascade,
  provider text not null check (provider in ('stripe')),
  encrypted_key text not null,
  key_hint text check (char_length(key_hint) <= 12),
  account_name text check (char_length(account_name) <= 120),
  status text not null default 'active' check (status in ('active', 'error', 'revoked')),
  last_error text check (char_length(last_error) <= 500),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (startup_id, provider)
);

create trigger provider_connections_set_updated_at
before update on public.provider_connections
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- revenue_snapshots: one row per startup per day (for the 30-day chart)
-- ---------------------------------------------------------------------------
create table public.revenue_snapshots (
  startup_id bigint not null references public.startups (id) on delete cascade,
  day date not null,
  revenue_cents bigint not null default 0 check (revenue_cents >= 0),
  mrr_cents bigint check (mrr_cents >= 0),
  primary key (startup_id, day)
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.startups enable row level security;
alter table public.provider_connections enable row level security;
alter table public.revenue_snapshots enable row level security;

-- profiles
create policy "profiles are public"
on public.profiles for select
to anon, authenticated
using (true);

create policy "users update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- startups
create policy "published startups are public"
on public.startups for select
to anon, authenticated
using (status = 'published');

create policy "owners see own startups"
on public.startups for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "owners create startups"
on public.startups for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "owners update own startups"
on public.startups for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "owners delete own startups"
on public.startups for delete
to authenticated
using ((select auth.uid()) = owner_id);

-- provider_connections: RLS on, deliberately NO policies → only the secret (service) key can touch it.

-- revenue_snapshots
create policy "snapshots of published startups are public"
on public.revenue_snapshots for select
to anon, authenticated
using (
  exists (
    select 1 from public.startups s
    where s.id = startup_id and s.status = 'published'
  )
);

create policy "owners see own snapshots"
on public.revenue_snapshots for select
to authenticated
using (
  exists (
    select 1 from public.startups s
    where s.id = startup_id and s.owner_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Grants (Data API exposure) — least privilege
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.startups, public.provider_connections, public.revenue_snapshots from anon, authenticated;

grant select on public.profiles, public.startups, public.revenue_snapshots to anon, authenticated;

grant update (handle, display_name, avatar_url, x_handle) on public.profiles to authenticated;

grant insert (
  owner_id, slug, name, website_url, logo_path, tagline, description, category, country, province,
  founded_on, ai_tools, tech_stack, marketing_channels, audience, value_proposition, problem_solved,
  pricing, team_size, funding, founder_message
) on public.startups to authenticated;

grant update (
  slug, name, website_url, logo_path, tagline, description, category, country, province,
  founded_on, ai_tools, tech_stack, marketing_channels, audience, value_proposition, problem_solved,
  pricing, team_size, funding, founder_message
) on public.startups to authenticated;

grant delete on public.startups to authenticated;

grant select, insert, update, delete on public.profiles, public.startups, public.provider_connections, public.revenue_snapshots to service_role;
grant usage on sequence private.founding_number_seq to service_role;

-- ---------------------------------------------------------------------------
-- Storage: public logo bucket; founders upload only into their own folder (<uid>/...)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Public bucket = files are served by URL without a policy. This SELECT policy only lets founders
-- list their own folder (needed for upsert); it deliberately does NOT allow listing everyone's files.
create policy "founders list own logos"
on storage.objects for select
to authenticated
using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "founders upload own logos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "founders update own logos"
on storage.objects for update
to authenticated
using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "founders delete own logos"
on storage.objects for delete
to authenticated
using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

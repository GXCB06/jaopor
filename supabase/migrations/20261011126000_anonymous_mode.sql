-- Anonymous mode (owner request 2026-10-11; TrustMRR pattern, Design.md §5 Anonymous projects).
-- A project can be listed without its identity: visitors see its verified numbers, category,
-- province, description and founder, but NOT its name, logo, links (website, App Store, Google
-- Play, LINE OA, GitHub), repo, demo video, screenshots or its old URLs.
--
-- How: while is_anonymous, the real identity lives in private.startup_identity (no client
-- access; the owner reads it through public.startup_identity()), and the public columns hold
-- placeholders: name 'Anonymous', slug 'anon-<10 hex>', the rest null ('anonymous/project' for
-- github_repo, so build proof still counts). Every existing public read path therefore shows
-- nothing identifying, without any per-surface filter. A write to an identity column while
-- anonymous (the edit form, the GitHub sync) is diverted into the stash; turning the mode off
-- restores everything, old URLs included.
--
-- NOT APPLIED. Apply only with the owner's approval, BEFORE 20261011130000_disclosure_levels
-- (that one grants is_anonymous to anon). Then advisors, RLS smoke (T162–T170), regenerate types.

-- 1. The switch. Owners set it on insert (wizard) or update (edit page).
alter table public.startups add column is_anonymous boolean not null default false;
grant insert (is_anonymous), update (is_anonymous) on public.startups to authenticated;

-- An anonymous project shows no link; its links live in the stash (which keeps the rule).
alter table public.startups drop constraint startups_has_a_link;
alter table public.startups add constraint startups_has_a_link check (
  is_anonymous or num_nonnulls(website_url, app_store_url, play_store_url, line_url, github_url) >= 1
);

-- 2. The stash. One row per anonymous project; its slug stays reserved for the project.
-- The same checks as the public columns (the real values are validated here from now on).
create table private.startup_identity (
  startup_id bigint primary key
    references public.startups (id) on delete cascade deferrable initially deferred,
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$'),
  name text not null check (char_length(name) between 1 and 80),
  logo_path text check (char_length(logo_path) <= 300),
  website_url text check (website_url ~ '^https?://' and char_length(website_url) <= 300),
  app_store_url text check (app_store_url ~ '^https://apps\.apple\.com/' and char_length(app_store_url) <= 300),
  play_store_url text check (play_store_url ~ '^https://play\.google\.com/store/apps/details\?id=' and char_length(play_store_url) <= 300),
  line_url text check (line_url ~ '^https://(lin\.ee|line\.me|page\.line\.me)/' and char_length(line_url) <= 300),
  github_url text check (github_url ~ '^https://github\.com/[A-Za-z0-9-]{1,39}(/[A-Za-z0-9._-]{1,100})?/?$'),
  github_repo text check (github_repo ~ '^[A-Za-z0-9-]{1,39}/[A-Za-z0-9._-]{1,100}$'),
  demo_video_url text check (
    char_length(demo_video_url) <= 300
    and demo_video_url ~ '^https://(www\.)?(youtube\.com/(watch\?v=|shorts/)|youtu\.be/|loom\.com/share/|tiktok\.com/@[A-Za-z0-9._]+/video/)[A-Za-z0-9_-]'
  ),
  old_slugs text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint startup_identity_has_a_link check (
    num_nonnulls(website_url, app_store_url, play_store_url, line_url, github_url) >= 1
  )
);
alter table private.startup_identity enable row level security;
revoke all on private.startup_identity from public, anon, authenticated;

create or replace function private.anon_slug()
returns text language sql volatile set search_path = '' as $$
  select 'anon-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
$$;
revoke execute on function private.anon_slug() from public, anon, authenticated;

-- 3. The trigger (named to run first among the BEFORE triggers on startups).
create or replace function private.startups_anonymity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  st private.startup_identity;
  repo text;
begin
  -- The placeholder slug shape belongs to anonymous projects only (the UI recognises it).
  -- Raised as a unique violation so the wizard's "slug taken → add a suffix" path handles it.
  if not new.is_anonymous and new.slug ~ '^anon-[0-9a-f]{10}$'
     and (tg_op = 'INSERT' or new.slug is distinct from old.slug) then
    raise exception 'slug % is reserved', new.slug using errcode = '23505';
  end if;

  if tg_op = 'INSERT' or not old.is_anonymous then
    if not new.is_anonymous then
      return new;
    end if;
    -- Going anonymous (or created anonymous): stash the identity, then mask it. The real slug
    -- must still be free, since the unique index only sees the placeholder from here on.
    if exists (select 1 from public.startups s where s.slug = new.slug and s.id <> new.id)
       or exists (select 1 from public.startup_slug_history h
                  where h.slug = new.slug and h.startup_id <> new.id)
       or exists (select 1 from private.startup_identity i
                  where i.slug = new.slug and i.startup_id <> new.id) then
      raise exception 'slug % is reserved', new.slug using errcode = '23505';
    end if;
    insert into private.startup_identity as i
      (startup_id, slug, name, logo_path, website_url, app_store_url, play_store_url, line_url,
       github_url, github_repo, demo_video_url, old_slugs)
    values
      (new.id, new.slug, new.name, new.logo_path, new.website_url, new.app_store_url,
       new.play_store_url, new.line_url, new.github_url, new.github_repo, new.demo_video_url,
       case when tg_op = 'INSERT' then '{}'::text[] else coalesce(
         (select array_agg(h.slug) from public.startup_slug_history h where h.startup_id = new.id),
         '{}') end)
    on conflict (startup_id) do update set
      slug = excluded.slug, name = excluded.name, logo_path = excluded.logo_path,
      website_url = excluded.website_url, app_store_url = excluded.app_store_url,
      play_store_url = excluded.play_store_url, line_url = excluded.line_url,
      github_url = excluded.github_url, github_repo = excluded.github_repo,
      demo_video_url = excluded.demo_video_url, old_slugs = excluded.old_slugs,
      updated_at = now();
    -- Old URLs would lead from the real name to the anonymous page: they go into the stash.
    if tg_op = 'UPDATE' then
      delete from public.startup_slug_history where startup_id = new.id;
    end if;
    new.slug := private.anon_slug();
    new.name := 'Anonymous';
    new.logo_path := null;
    new.website_url := null;
    new.app_store_url := null;
    new.play_store_url := null;
    new.line_url := null;
    new.github_url := null;
    new.github_repo := case when new.github_repo is null then null else 'anonymous/project' end;
    new.demo_video_url := null;
    return new;
  end if;

  select * into st from private.startup_identity where startup_id = new.id;

  if not new.is_anonymous then
    -- Turning it off: the stash comes back (a value changed in this same update wins).
    if found then
      new.slug := case when new.slug is distinct from old.slug then new.slug else st.slug end;
      new.name := case when new.name is distinct from old.name then new.name else st.name end;
      new.logo_path := coalesce(new.logo_path, st.logo_path);
      new.website_url := coalesce(new.website_url, st.website_url);
      new.app_store_url := coalesce(new.app_store_url, st.app_store_url);
      new.play_store_url := coalesce(new.play_store_url, st.play_store_url);
      new.line_url := coalesce(new.line_url, st.line_url);
      new.github_url := coalesce(new.github_url, st.github_url);
      new.github_repo := case when new.github_repo is distinct from old.github_repo
                              then new.github_repo else st.github_repo end;
      new.demo_video_url := coalesce(new.demo_video_url, st.demo_video_url);
      delete from private.startup_identity where startup_id = new.id;
      insert into public.startup_slug_history (slug, startup_id)
        select s, new.id from unnest(st.old_slugs) s where s <> new.slug
        on conflict (slug) do nothing;
    end if;
    return new;
  end if;

  -- Still anonymous: identity writes go to the stash, the placeholders stay.
  if new.slug is distinct from old.slug then
    if exists (select 1 from public.startups s where s.slug = new.slug and s.id <> new.id)
       or exists (select 1 from public.startup_slug_history h
                  where h.slug = new.slug and h.startup_id <> new.id)
       or exists (select 1 from private.startup_identity i
                  where i.slug = new.slug and i.startup_id <> new.id)
       or new.slug ~ '^anon-' then
      raise exception 'slug % is reserved', new.slug using errcode = '23505';
    end if;
  end if;
  if found then
    update private.startup_identity set
      slug = case when new.slug is distinct from old.slug then new.slug else slug end,
      name = case when new.name is distinct from old.name then new.name else name end,
      logo_path = case when new.logo_path is distinct from old.logo_path then new.logo_path else logo_path end,
      website_url = case when new.website_url is distinct from old.website_url then new.website_url else website_url end,
      app_store_url = case when new.app_store_url is distinct from old.app_store_url then new.app_store_url else app_store_url end,
      play_store_url = case when new.play_store_url is distinct from old.play_store_url then new.play_store_url else play_store_url end,
      line_url = case when new.line_url is distinct from old.line_url then new.line_url else line_url end,
      github_url = case when new.github_url is distinct from old.github_url then new.github_url else github_url end,
      github_repo = case when new.github_repo is distinct from old.github_repo then new.github_repo else github_repo end,
      demo_video_url = case when new.demo_video_url is distinct from old.demo_video_url then new.demo_video_url else demo_video_url end,
      updated_at = now()
    where startup_id = new.id;
    -- A new real website voids the snippet proof (same rule as startups_reset_owner_verified).
    if new.website_url is distinct from old.website_url then
      new.owner_verified_at := null;
    end if;
  end if;
  new.slug := old.slug;
  new.name := old.name;
  new.logo_path := old.logo_path;
  new.website_url := old.website_url;
  new.app_store_url := old.app_store_url;
  new.play_store_url := old.play_store_url;
  new.line_url := old.line_url;
  new.github_url := old.github_url;
  -- Build proof keeps counting while a repo is connected (the sync clears it on disconnect).
  repo := case when new.github_repo is distinct from old.github_repo then new.github_repo
               else st.github_repo end;
  new.github_repo := case when repo is null then null else 'anonymous/project' end;
  new.demo_video_url := old.demo_video_url;
  return new;
end; $$;
revoke execute on function private.startups_anonymity() from public, anon, authenticated;
create trigger startups_anonymity
  before insert or update on public.startups
  for each row execute function private.startups_anonymity();

-- 4. Existing triggers that must ignore the masking itself.
-- 4a. Masking or unmasking is not a change of website: the snippet proof stays.
create or replace function private.startups_reset_owner_verified()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.is_anonymous is distinct from old.is_anonymous then
    return new;
  end if;
  if new.website_url is distinct from old.website_url then
    new.owner_verified_at := null;
  end if;
  return new;
end; $$;
revoke execute on function private.startups_reset_owner_verified() from public, anon, authenticated;

-- 4b. The anonymous slug must never become an "old URL" of the named project, nor the real
--     slug an old URL of the anonymous one (the stash keeps the history instead).
create or replace function private.startups_remember_slug()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_anonymous or old.is_anonymous then
    return new;
  end if;
  if new.slug is distinct from old.slug then
    insert into public.startup_slug_history (slug, startup_id) values (old.slug, old.id)
      on conflict (slug) do update set startup_id = excluded.startup_id, renamed_at = now();
    delete from public.startup_slug_history where slug = new.slug;
  end if;
  return new;
end; $$;
revoke execute on function private.startups_remember_slug() from public, anon, authenticated;

-- 4c. A slug held by an anonymous project's stash is reserved for it.
create or replace function private.startups_reserve_old_slugs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.startup_slug_history h
             where h.slug = new.slug and h.startup_id <> new.id)
     or exists (select 1 from private.startup_identity i
                where i.slug = new.slug and i.startup_id <> new.id) then
    raise exception 'slug % is reserved', new.slug using errcode = '23505';
  end if;
  return new;
end; $$;
revoke execute on function private.startups_reserve_old_slugs() from public, anon, authenticated;

-- 5. Screenshots show the product: hidden from visitors while anonymous (owners still see them).
drop policy "screenshots of visible startups are readable" on public.startup_screenshots;
create policy "screenshots of visible startups are readable"
on public.startup_screenshots for select
to anon, authenticated
using (
  exists (
    select 1 from public.startups s
    where s.id = startup_id
      and ((s.status = 'published' and not s.is_anonymous) or s.owner_id = (select auth.uid()))
  )
);

-- 6. The real identity, for the owner (edit page, dashboard) and the server (traffic snippet,
--    connecting sources). Anyone else gets no row.
create or replace function public.startup_identity(p_startup bigint)
returns table (
  slug text, name text, logo_path text, website_url text, app_store_url text,
  play_store_url text, line_url text, github_url text, github_repo text, demo_video_url text
)
language sql stable security definer set search_path = '' as $$
  select i.slug, i.name, i.logo_path, i.website_url, i.app_store_url, i.play_store_url,
         i.line_url, i.github_url, i.github_repo, i.demo_video_url
  from private.startup_identity i
  join public.startups s on s.id = i.startup_id
  where i.startup_id = p_startup
    and (s.owner_id = (select auth.uid()) or (select auth.role()) = 'service_role');
$$;
revoke all on function public.startup_identity(bigint) from public, anon;
grant execute on function public.startup_identity(bigint) to authenticated, service_role;

-- 7. One business, one listing: the server's duplicate check must see anonymous websites too.
create or replace function public.owner_anonymous_websites(p_owner uuid)
returns table (startup_id bigint, name text, website_url text)
language sql stable security definer set search_path = '' as $$
  select i.startup_id, i.name, i.website_url
  from private.startup_identity i
  join public.startups s on s.id = i.startup_id
  where s.owner_id = p_owner and i.website_url is not null;
$$;
revoke all on function public.owner_anonymous_websites(uuid) from public, anon, authenticated;
grant execute on function public.owner_anonymous_websites(uuid) to service_role;

-- Rollback (only while no project is anonymous):
--   drop function public.owner_anonymous_websites(uuid); drop function public.startup_identity(bigint);
--   drop trigger startups_anonymity on public.startups; drop function private.startups_anonymity();
--   drop function private.anon_slug(); drop table private.startup_identity;
--   re-run the three functions from 20261005162816_owner_verified / 20261008061335_slug_history
--   and the screenshot policy from 20260930052136_spec_phase1_vocab;
--   restore startups_has_a_link without "is_anonymous or"; alter table public.startups drop column is_anonymous;

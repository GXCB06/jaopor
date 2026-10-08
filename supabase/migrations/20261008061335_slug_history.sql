-- Editable project links (owner-approved 2026-10-08) that keep old links working (UX audit S-9).
-- 1) Every rename remembers the old slug; /startup/{old} then redirects to the new one.
-- 2) An old slug stays reserved for its project, so nobody else can take it and receive its
--    traffic (shared posts, README badges, OG cards).

create table public.startup_slug_history (
  slug text primary key check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$'),
  startup_id bigint not null references public.startups (id) on delete cascade,
  renamed_at timestamptz not null default now()
);
create index startup_slug_history_startup_idx on public.startup_slug_history (startup_id);

alter table public.startup_slug_history enable row level security;
-- Old slugs were public URLs; they stay readable while the project is published. No client writes.
create policy "old slugs of published projects are public"
  on public.startup_slug_history for select to anon, authenticated
  using (exists (select 1 from public.startups s
                 where s.id = startup_id and s.status = 'published'));
revoke insert, update, delete on public.startup_slug_history from anon, authenticated;

-- Before insert / slug update: refuse a slug another project used before (as a unique violation,
-- so the wizard's existing "slug taken → retry with a suffix" path handles it). Security definer:
-- the check must also see old slugs of hidden projects, which the select policy hides.
create or replace function private.startups_reserve_old_slugs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.startup_slug_history h
             where h.slug = new.slug and h.startup_id <> new.id) then
    raise exception 'slug % is reserved', new.slug using errcode = '23505';
  end if;
  return new;
end; $$;
revoke execute on function private.startups_reserve_old_slugs() from public, anon, authenticated;
create trigger startups_reserve_old_slugs
  before insert or update of slug on public.startups
  for each row execute function private.startups_reserve_old_slugs();

-- After a rename: remember the old slug; taking back one of its own old slugs makes it live again.
create or replace function private.startups_remember_slug()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.slug is distinct from old.slug then
    insert into public.startup_slug_history (slug, startup_id) values (old.slug, old.id)
      on conflict (slug) do update set startup_id = excluded.startup_id, renamed_at = now();
    delete from public.startup_slug_history where slug = new.slug;
  end if;
  return new;
end; $$;
revoke execute on function private.startups_remember_slug() from public, anon, authenticated;
create trigger startups_remember_slug
  after update of slug on public.startups
  for each row execute function private.startups_remember_slug();

-- Applied 2026-10-15 (owner: "go"; remote 20261015160000).
-- Claim flow ("อ้างสิทธิ์ผลงาน"). Design (Project.md §7): imported/unclaimed listings carry an
-- `unclaimed` flag and a system owner; a founder proves ownership with a read-only credential and the
-- listing transfers to them. The transfer itself is done server-side with the service key (the app
-- first proves ownership through a source connector), so no client can claim anything on its own.
--
-- Why a system owner (not a null owner_id): once an owner is set, the transfer column stays NOT NULL
-- and every existing RLS policy, join and `owner_id === userId` check keeps working unchanged. The
-- account has no login; it only ever owns listings between import and claim.

-- System owner: a real auth user, so `profiles.id → auth.users.id` holds and the on-auth-user trigger
-- creates its profile. The minimal column set mirrors supabase/tests/rls_smoke.sql (proven on this
-- project). Fixed id so migrations and tooling can reference it.
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values (
  '00000000-0000-4000-a000-000000000001',
  'system@jaopor.local',
  '{"full_name":"JaoPor"}',
  'authenticated',
  'authenticated'
)
on conflict (id) do nothing;

alter table public.startups
  add column unclaimed boolean not null default false;

-- Imported listings get no founding number and don't count toward the 5-projects-per-founder cap
-- (same treatment as demo rows). Only the service key can set `unclaimed` — it is not in any client
-- INSERT/UPDATE column grant, so a founder can never mark a row unclaimed or clear the flag by hand.
create or replace function private.startups_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if new.is_demo or new.unclaimed then
    new.founding_number := null;
    return new;
  end if;

  if (select count(*) from public.startups
      where owner_id = new.owner_id and not is_demo and not unclaimed) >= 5 then
    raise exception 'limit of 5 startups per founder reached' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('mrrmafia.founding_number'));
  n := coalesce((select max(founding_number) from public.startups), 0) + 1;
  new.founding_number := case when n <= 100 then n else null end;
  return new;
end;
$$;

revoke execute on function private.startups_before_insert() from public, anon, authenticated;

-- Find imported listings to claim, newest first.
create index startups_unclaimed_idx on public.startups (created_at desc) where unclaimed;

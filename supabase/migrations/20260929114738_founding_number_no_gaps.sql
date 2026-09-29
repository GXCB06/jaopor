-- Founding Mafia numbers without gaps from FAILED inserts.
-- v1 used nextval() in a BEFORE INSERT trigger: sequences don't roll back, so every insert that
-- then failed (e.g. duplicate slug) burned a number (#2–#4 were lost on 2026-09-29).
-- Now: next number = highest assigned + 1, serialized with a transaction-scoped advisory lock.
-- Numbers of deleted startups are not reused (a badge never moves to someone else).

create or replace function private.startups_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if (select count(*) from public.startups where owner_id = new.owner_id) >= 5 then
    raise exception 'limit of 5 startups per founder reached' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('mrrmafia.founding_number'));
  n := coalesce((select max(founding_number) from public.startups), 0) + 1;
  new.founding_number := case when n <= 100 then n else null end;
  return new;
end;
$$;

revoke execute on function private.startups_before_insert() from public, anon, authenticated;

-- The sequence is no longer used.
drop sequence if exists private.founding_number_seq;

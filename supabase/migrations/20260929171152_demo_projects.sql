-- Demo projects (Design.md §5 "Demo projects"): sample rows that fill the site before launch.
-- * `is_demo` is server-only: no INSERT/UPDATE grant to authenticated, so founders can't mark or
--   unmark a project; the table-level SELECT grant already exposes it for the "Demo" label.
-- * Demo rows take no founding number (the first-100 badge stays for real founders) and don't
--   count toward the 5-projects-per-founder limit.
-- Remove them all with: delete from public.startups where is_demo;

alter table public.startups
  add column is_demo boolean not null default false;

create or replace function private.startups_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if new.is_demo then
    new.founding_number := null;
    return new;
  end if;

  if (select count(*) from public.startups
      where owner_id = new.owner_id and not is_demo) >= 5 then
    raise exception 'limit of 5 startups per founder reached' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('mrrmafia.founding_number'));
  n := coalesce((select max(founding_number) from public.startups), 0) + 1;
  new.founding_number := case when n <= 100 then n else null end;
  return new;
end;
$$;

revoke execute on function private.startups_before_insert() from public, anon, authenticated;

-- Owner "hide for now" (UX audit S-10, owner-approved 2026-10-08).
-- A third status, 'private': only the owner sees it (every public query and policy already
-- filters status = 'published'). Moderation's 'hidden' stays a moderator decision.
alter table public.startups drop constraint startups_status_check;
alter table public.startups add constraint startups_status_check
  check (status in ('published', 'private', 'hidden'));
grant update (status) on public.startups to authenticated;

-- Clients may only switch between published and private, and never undo a moderator's hidden.
create or replace function private.startups_owner_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status and current_user in ('authenticated', 'anon') then
    if old.status = 'hidden' or new.status not in ('published', 'private') then
      raise exception 'owners can only publish or make a project private'
        using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;
revoke execute on function private.startups_owner_status() from public, anon, authenticated;
create trigger startups_owner_status
  before update of status on public.startups
  for each row execute function private.startups_owner_status();

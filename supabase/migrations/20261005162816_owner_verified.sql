-- First-user fixes, round 3: make verified worth it (Design.md §5 Owner verified, verified first).
--
-- owner_verified_at: when our server last found this project's JaoPor snippet (its permanent
-- startup id) in the HTML of its listed website (checkOwner in lib/sources/sync.ts). Proves the
-- lister can edit that page, with no business data. Written by the server only: like every
-- verified number, no client grant. ANY change to website_url clears it (even http→https, a
-- trailing slash or letter case: the proof was for the old address), so the snippet stops
-- counting until it is re-checked.
alter table public.startups add column owner_verified_at timestamptz;

-- proof_level orders lists ("verified first"). Generated, so it can never disagree with the
-- columns it is computed from (all of them server-written: no client grant). Demo projects are 0.
--   3  verified revenue (Stripe / RevenueCat, read from the provider)
--   2  build proof (GitHub: a public repo owned by the signed-in GitHub account)
--   1  site proof: Owner verified (our snippet found on the site) or an analytics account for the
--      site connected. Visitor counts never rank higher than this: anyone can send events to a
--      snippet or an analytics endpoint, so visitor numbers are counted, not verified.
--   0  nothing
alter table public.startups
  add column proof_level smallint not null generated always as (
    case
      when is_demo then 0
      when verification_status = 'verified' then 3
      when build_commits is not null then 2
      when owner_verified_at is not null or visitors_30d is not null then 1
      else 0
    end
  ) stored;

create index startups_proof_level_idx
  on public.startups (proof_level desc, created_at desc);

create or replace function private.startups_reset_owner_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.website_url is distinct from old.website_url then
    new.owner_verified_at := null;
  end if;
  return new;
end;
$$;

revoke execute on function private.startups_reset_owner_verified() from public, anon, authenticated;

create trigger startups_reset_owner_verified
  before update of website_url on public.startups
  for each row
  execute function private.startups_reset_owner_verified();

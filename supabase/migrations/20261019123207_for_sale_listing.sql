-- For-sale listing v1 (Design.md "Proposal — For-sale listing", v2 + owner decisions 2026-10-19).
-- Owner-approved and applied 2026-10-19 (remote version 20261019132206) after a rolled-back dry-run
-- on production (RLS smoke 245 lines, no BAD). The stored SQL matched this file (md5) before this
-- header line was updated.
--
-- What it adds:
--   1. startups: the owner's raw listing fields (for_sale, asking_price_thb, sale_note), two
--      server-only fields (listed_for_sale_at, sale_hidden) and four public_* copies that a trigger
--      fills only while the listing is public. Clients read only the public_* copies, so the price
--      of an unlisted or moderator-hidden project never leaves the database (the same split as the
--      disclosure levels' public_* columns).
--   2. private.listing_moderation (why a moderator hid a listing) and private.listing_views
--      (one row per viewer per day, hashed, no IP). No client access to either.
--   3. contact_requests: topic 'buy' + startup_id. A 'buy' request must name a public listing owned
--      by the recipient.
--   4. reports: target type 'listing'.
--   5. Server-key-only functions: record_listing_view, listing_stats, listing_for_owner,
--      moderate_listing. The app checks who is asking (owner / moderator allow-list) first, like
--      startup_identity() since 20261011127000.
--
-- One rule decides "public listing": for_sale and not sale_hidden and status = 'published'.
--
-- Rollback (if ever needed, as a NEW migration):
--   drop function public.moderate_listing(bigint, boolean, text, uuid),
--     public.listing_for_owner(bigint), public.listing_stats(bigint),
--     public.record_listing_view(bigint, bytea);
--   drop trigger contact_requests_buy_check on public.contact_requests;
--   drop function private.contact_requests_buy_check();
--   (contact_requests / reports: restore the old topic and target_type checks after deleting
--    'buy' / 'listing' rows; drop column contact_requests.startup_id)
--   drop table private.listing_views, private.listing_moderation;
--   drop trigger startups_public_listing on public.startups;
--   drop function private.startups_public_listing();
--   alter table public.startups drop column for_sale, ... (the nine columns below).

-- 1. startups -------------------------------------------------------------------------------------

alter table public.startups
  add column for_sale boolean not null default false,
  add column asking_price_thb integer
    check (asking_price_thb between 1 and 1000000000),
  add column sale_note text check (char_length(sale_note) <= 280),
  add column listed_for_sale_at timestamptz,
  add column sale_hidden boolean not null default false,
  add column public_for_sale boolean not null default false,
  add column public_asking_price_thb integer,
  add column public_sale_note text,
  add column public_listed_for_sale_at timestamptz,
  add constraint startups_for_sale_needs_price
    check (not for_sale or asking_price_thb is not null);

comment on column public.startups.sale_hidden is
  'Set only by public.moderate_listing (server key). Hides the listing, not the project.';
comment on column public.startups.public_for_sale is
  'Trigger-maintained: for_sale and not sale_hidden and status = published.';

-- Owners edit the switch, price and note through the existing row policy
-- "owners update own startups". Everyone reads only the public copies. No insert grant: a project
-- is created unlisted and listed from the edit page.
grant update (for_sale, asking_price_thb, sale_note) on public.startups to authenticated;
grant select (public_for_sale, public_asking_price_thb, public_sale_note, public_listed_for_sale_at)
  on public.startups to anon, authenticated;

-- Fires after startups_owner_status (status is final by then) and before startups_public_metrics
-- (BEFORE triggers run in name order).
create or replace function private.startups_public_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.for_sale then
    new.listed_for_sale_at := null;
  elsif tg_op = 'INSERT' or not old.for_sale then
    new.listed_for_sale_at := now();
  else
    new.listed_for_sale_at := old.listed_for_sale_at;
  end if;

  if new.for_sale and not new.sale_hidden and new.status = 'published' then
    new.public_for_sale := true;
    new.public_asking_price_thb := new.asking_price_thb;
    new.public_sale_note := new.sale_note;
    new.public_listed_for_sale_at := new.listed_for_sale_at;
  else
    new.public_for_sale := false;
    new.public_asking_price_thb := null;
    new.public_sale_note := null;
    new.public_listed_for_sale_at := null;
  end if;
  return new;
end;
$$;

create trigger startups_public_listing
  before insert or update on public.startups
  for each row execute function private.startups_public_listing();

-- Directory "for sale" filter, newest listing first.
create index startups_for_sale_idx on public.startups (public_listed_for_sale_at desc)
  where public_for_sale;

-- 2. private tables -------------------------------------------------------------------------------

create table private.listing_moderation (
  startup_id bigint primary key references public.startups (id) on delete cascade,
  hidden_at timestamptz not null default now(),
  reason text not null check (char_length(reason) between 1 and 500),
  moderator_id uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index listing_moderation_moderator_idx on private.listing_moderation (moderator_id);
alter table private.listing_moderation enable row level security;
revoke all on private.listing_moderation from public, anon, authenticated;

create table private.listing_views (
  startup_id bigint not null references public.startups (id) on delete cascade,
  day date not null,
  viewer_hash bytea not null,
  primary key (startup_id, day, viewer_hash)
);
alter table private.listing_views enable row level security;
revoke all on private.listing_views from public, anon, authenticated;

-- 3. contact_requests: "ติดต่อผู้ขาย" ------------------------------------------------------------

alter table public.contact_requests
  drop constraint contact_requests_topic_check,
  add constraint contact_requests_topic_check
    check (topic in ('cofounder', 'job', 'collab', 'other', 'buy')),
  add column startup_id bigint references public.startups (id) on delete set null,
  add constraint contact_requests_startup_only_for_buy
    check (startup_id is null or topic = 'buy');

grant insert (startup_id) on public.contact_requests to authenticated;

-- FK lookups on project delete, and the "interested" count.
create index contact_requests_startup_idx on public.contact_requests (startup_id, from_id);

-- Runs as the caller, so it sees startups through RLS like the sender does. The existing
-- contact_requests_guard still applies (sender = you, pending, 5 a day, blocks).
create or replace function private.contact_requests_buy_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.topic = 'buy' and not exists (
    select 1 from public.startups s
    where s.id = new.startup_id and s.owner_id = new.to_id and s.public_for_sale
  ) then
    raise exception 'a buy request needs a public listing owned by the recipient'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger contact_requests_buy_check
  before insert on public.contact_requests
  for each row execute function private.contact_requests_buy_check();

-- 4. reports --------------------------------------------------------------------------------------

alter table public.reports
  drop constraint reports_target_type_check,
  add constraint reports_target_type_check
    check (target_type in ('post', 'comment', 'user', 'message', 'listing'));

-- 5. server-key-only functions --------------------------------------------------------------------

-- Beacon route: counts a view only while the listing is public. Day in UTC, like profile_views.
create or replace function public.record_listing_view(p_startup bigint, p_viewer_hash bytea)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.listing_views (startup_id, day, viewer_hash)
  select s.id, current_date, p_viewer_hash
  from public.startups s
  where s.id = p_startup and s.public_for_sale
  on conflict do nothing;
$$;

-- Numbers only, counted since the current listing started (re-listing starts again).
create or replace function public.listing_stats(p_startup bigint)
returns table (views bigint, interested bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from private.listing_views v
      where v.startup_id = s.id and v.day >= (s.listed_for_sale_at at time zone 'utc')::date),
    (select count(distinct r.from_id) from public.contact_requests r
      where r.startup_id = s.id and r.topic = 'buy' and r.created_at >= s.listed_for_sale_at)
  from public.startups s
  where s.id = p_startup and s.listed_for_sale_at is not null;
$$;

-- The owner's edit page (after the app checks ownership): raw fields + a moderator's reason.
create or replace function public.listing_for_owner(p_startup bigint)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'for_sale', s.for_sale,
    'asking_price_thb', s.asking_price_thb,
    'sale_note', s.sale_note,
    'listed_for_sale_at', s.listed_for_sale_at,
    'sale_hidden', s.sale_hidden,
    'hidden_at', m.hidden_at,
    'hidden_reason', m.reason
  )
  from public.startups s
  left join private.listing_moderation m on m.startup_id = s.id
  where s.id = p_startup;
$$;

-- Moderator hide / unhide (after the app checks MODERATOR_USER_IDS). One transaction for the flag
-- and the reason. The owner's switch never clears a hide; only this does.
create or replace function public.moderate_listing(
  p_startup bigint, p_hide boolean, p_reason text, p_moderator uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_hide then
    if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then
      raise exception 'a reason (1-500 characters) is required' using errcode = '22023';
    end if;
    update public.startups set sale_hidden = true where id = p_startup;
    if not found then
      raise exception 'no such project' using errcode = 'P0002';
    end if;
    insert into private.listing_moderation as m (startup_id, reason, moderator_id)
    values (p_startup, btrim(p_reason), p_moderator)
    on conflict (startup_id) do update
      set reason = excluded.reason, moderator_id = excluded.moderator_id, updated_at = now();
  else
    update public.startups set sale_hidden = false where id = p_startup;
    delete from private.listing_moderation where startup_id = p_startup;
  end if;
end;
$$;

revoke all on function public.record_listing_view(bigint, bytea) from public, anon, authenticated;
revoke all on function public.listing_stats(bigint) from public, anon, authenticated;
revoke all on function public.listing_for_owner(bigint) from public, anon, authenticated;
revoke all on function public.moderate_listing(bigint, boolean, text, uuid)
  from public, anon, authenticated;
grant execute on function public.record_listing_view(bigint, bytea) to service_role;
grant execute on function public.listing_stats(bigint) to service_role;
grant execute on function public.listing_for_owner(bigint) to service_role;
grant execute on function public.moderate_listing(bigint, boolean, text, uuid) to service_role;

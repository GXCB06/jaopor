-- DRAFT — shown to the user before applying.
-- 1) In-app notifications (Phase 9, user decision 2026-10-01: in-app first, Resend later).
-- 2) Live-visitor heartbeat fallback (Phase 8, user decision: keep counting when Realtime is
--    unavailable or at its connection limit; automatic cleanup).

-- ---------------------------------------------------------------------------------------------
-- 1. notifications
-- ---------------------------------------------------------------------------------------------
-- Channel-agnostic: one row per event per recipient. The request/accept logic only writes rows
-- here (via triggers); delivery is separate. Email later = a worker that reads rows where
-- email_sent_at is null and sets it — no change to contact_requests or its triggers.
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('request_received', 'request_accepted')),
  actor_id uuid references public.profiles (id) on delete set null,
  request_id bigint references public.contact_requests (id) on delete cascade,
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_actor_idx on public.notifications (actor_id);
create index notifications_request_idx on public.notifications (request_id);

-- New request → the recipient. Accepted → both sides (each sees the other as the actor).
create or replace function private.contact_requests_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, kind, actor_id, request_id)
    values (new.to_id, 'request_received', new.from_id, new.id);
  elsif new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.notifications (user_id, kind, actor_id, request_id)
    values (new.from_id, 'request_accepted', new.to_id, new.id),
           (new.to_id, 'request_accepted', new.from_id, new.id);
  end if;
  return null;
end;
$$;
revoke execute on function private.contact_requests_notify() from public, anon, authenticated;
create trigger contact_requests_notify after insert or update of status on public.contact_requests
  for each row execute function private.contact_requests_notify();

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, insert, update, delete on public.notifications to service_role;
create policy "notifications: owner reads" on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "notifications: owner marks read" on public.notifications
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "notifications: owner deletes" on public.notifications
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------------------------
-- 2. live_pings: anonymous heartbeats, server-written only, kept 10 minutes
-- ---------------------------------------------------------------------------------------------
-- session_hash = HMAC(daily server key, random browser id): not reversible, changes every day,
-- never an IP. Only coarse location (country, province slug) and the page path are kept.
create table public.live_pings (
  session_hash bytea primary key,
  path text not null check (char_length(path) <= 200),
  country text check (country ~ '^[A-Z]{2}$'),
  province text references public.provinces (slug) on delete set null,
  device text check (device in ('mobile', 'desktop')),
  last_seen timestamptz not null default now()
);
create index live_pings_last_seen_idx on public.live_pings (last_seen);
create index live_pings_province_idx on public.live_pings (province);

alter table public.live_pings enable row level security;
revoke all on public.live_pings from anon, authenticated;
grant select, insert, update, delete on public.live_pings to service_role;

-- Cleanup (TTL): called by the ping route (at most once a minute) and the daily cron.
create or replace function public.prune_live_pings()
returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.live_pings where last_seen < now() - interval '10 minutes' returning 1
  )
  select count(*)::integer from gone;
$$;
revoke execute on function public.prune_live_pings() from public, anon, authenticated;
grant execute on function public.prune_live_pings() to service_role;

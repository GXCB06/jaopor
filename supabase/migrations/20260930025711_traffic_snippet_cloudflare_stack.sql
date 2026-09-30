-- More ways to verify visitors (Design.md §5 VerifyPanel) + GitHub stack detection.
-- * `jaopor`: our own one-line snippet. Visitors are counted in `pixel_visitors` as daily,
--   per-project HMAC hashes (no IP, no cookie); the daily cron rolls them up into
--   traffic_snapshots and deletes rows older than yesterday.
-- * `cloudflare`: Cloudflare Web Analytics via an "Account Analytics: Read" API token.
-- * `startups.build_stack`: stack detected from the connected GitHub repo (server-only; the
--   owner's own `tech_stack` is never overwritten).
-- * provider_connections.status gains 'pending' (snippet installed, no visit seen yet).

alter table public.provider_connections drop constraint provider_connections_provider_check;
alter table public.provider_connections add constraint provider_connections_provider_check check (
  provider in ('stripe', 'revenuecat', 'plausible', 'umami', 'cloudflare', 'jaopor', 'github')
);

alter table public.provider_connections drop constraint provider_connections_status_check;
alter table public.provider_connections add constraint provider_connections_status_check check (
  status in ('pending', 'active', 'error', 'revoked')
);

drop index public.provider_connections_one_traffic_idx;
create unique index provider_connections_one_traffic_idx
  on public.provider_connections (startup_id)
  where provider in ('plausible', 'umami', 'cloudflare', 'jaopor');

alter table public.startups drop constraint startups_traffic_provider_check;
alter table public.startups add constraint startups_traffic_provider_check check (
  traffic_provider in ('plausible', 'umami', 'cloudflare', 'jaopor')
);

-- Server-only (no INSERT/UPDATE grant to authenticated), like the other verified columns.
alter table public.startups
  add column build_stack text[] not null default '{}'
  check (cardinality(build_stack) <= 20);

create table public.pixel_visitors (
  startup_id bigint not null references public.startups (id) on delete cascade,
  day date not null,
  -- HMAC(day key, startup | ip | user agent): a new key every UTC day, so hashes can't be
  -- linked across days; rows are deleted once rolled up.
  visitor_hash bytea not null,
  -- HMAC(day key, startup | ip /24 or /48): caps how many visitors one network can add.
  net_hash bytea not null,
  primary key (startup_id, day, visitor_hash)
);

create index pixel_visitors_net_idx on public.pixel_visitors (startup_id, day, net_hash);

-- Written and read only by the server (service role). RLS on with no policies = no client access.
alter table public.pixel_visitors enable row level security;
revoke all on public.pixel_visitors from anon, authenticated;
grant select, insert, delete on public.pixel_visitors to service_role;

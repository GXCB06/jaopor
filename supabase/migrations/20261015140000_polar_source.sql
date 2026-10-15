-- Applied 2026-10-15 (owner: "go"; remote 20261015140000).
-- Polar as a revenue source (owner request; /add-payment-provider). The founder pastes a
-- read-only Organization Access Token (OAT); the server proves it cannot write before storing it.
-- Ownership is the credential itself (like Stripe/RevenueCat): no domain to match.

-- 1. A revenue provider like the others (one revenue source per project).
alter table public.provider_connections drop constraint provider_connections_provider_check;
alter table public.provider_connections add constraint provider_connections_provider_check check (
  provider in ('stripe', 'revenuecat', 'polar', 'plausible', 'umami', 'cloudflare', 'ga4', 'jaopor', 'github')
);

drop index public.provider_connections_one_revenue_idx;
create unique index provider_connections_one_revenue_idx
  on public.provider_connections (startup_id)
  where provider in ('stripe', 'revenuecat', 'polar');

alter table public.startups drop constraint startups_verified_provider_check;
alter table public.startups add constraint startups_verified_provider_check check (
  verified_provider in ('stripe', 'revenuecat', 'polar')
);

-- 2. The add-project funnel records Polar verify results too (log_verify_result source whitelist;
--    body otherwise unchanged from 20261011125000_ga4_traffic_source).
create or replace function public.log_verify_result(
  p_user uuid, p_startup bigint, p_source text, p_ok boolean, p_code text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_user is null or p_startup is null or p_ok is null then return; end if;
  if coalesce(p_source, '') not in
     ('stripe', 'revenuecat', 'polar', 'jaopor', 'plausible', 'umami', 'cloudflare', 'ga4', 'github') then
    return;
  end if;
  if p_ok and p_code is not null then return; end if;
  if not p_ok and coalesce(p_code, '') not in
     ('invalid_key', 'not_read_only', 'missing_permission', 'rate_limited', 'upstream', 'not_found',
      'domain_mismatch', 'not_owner', 'no_github_identity', 'no_website', 'duplicate_listing', 'server') then
    return;
  end if;
  if not exists (select 1 from public.startups s where s.id = p_startup and s.owner_id = p_user) then
    return;
  end if;
  -- Each try is a fact, but at most 50 per project per 24 h.
  perform pg_advisory_xact_lock(hashtextextended(p_startup::text || ':verify', 0));
  if (select count(*) from analytics.funnel_events
      where startup_id = p_startup and event = 'verify_result'
        and created_at > now() - interval '1 day') >= 50 then
    return;
  end if;
  insert into analytics.funnel_events (user_id, startup_id, event, props)
  values (p_user, p_startup, 'verify_result',
          jsonb_build_object('source', p_source, 'ok', p_ok, 'code', p_code));
exception when others then
  return;
end;
$$;

revoke all on function public.log_verify_result(uuid, bigint, text, boolean, text) from public, anon, authenticated;
grant execute on function public.log_verify_result(uuid, bigint, text, boolean, text) to service_role;

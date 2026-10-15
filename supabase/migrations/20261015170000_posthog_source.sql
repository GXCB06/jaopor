-- Applied 2026-10-15 (owner: "go"; remote 20261015170000).
-- PostHog as a visitor source (owner decision 2026-10-15; /add-payment-provider). The founder pastes a
-- read-only personal API key (phx_…); the server proves it cannot write (a PATCH to the project must be
-- refused) and that the project's authorized URL is the project's own website before storing it.
-- Visitors = PostHog "visitors", counted (not audited), like GA4/Cloudflare.

-- 1. A traffic provider like the others (one traffic source per project). PostHog is *not* revenue, so
--    the one-revenue index and startups_verified_provider_check are unchanged from 20261015140000.
alter table public.provider_connections drop constraint provider_connections_provider_check;
alter table public.provider_connections add constraint provider_connections_provider_check check (
  provider in ('stripe', 'revenuecat', 'polar', 'jaopor', 'plausible', 'umami', 'cloudflare', 'ga4', 'posthog', 'github')
);

-- 2. The add-project funnel records PostHog verify results too (log_verify_result source whitelist;
--    body otherwise unchanged from 20261015140000_polar_source).
create or replace function public.log_verify_result(
  p_user uuid, p_startup bigint, p_source text, p_ok boolean, p_code text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_user is null or p_startup is null or p_ok is null then return; end if;
  if coalesce(p_source, '') not in
     ('stripe', 'revenuecat', 'polar', 'jaopor', 'plausible', 'umami', 'cloudflare', 'ga4', 'posthog', 'github') then
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

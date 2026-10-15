-- Owner decision 2026-10-15: a verified source shows its real numbers and graph by default.
--
-- 20261011130000_disclosure_levels.sql starts a first-time revenue / users connection at `badge`
-- (O1), so a freshly verified Stripe / RevenueCat showed only a badge — no figures, no chart, which
-- read as "the numbers from my API key can't be shown". The owner asked for the figures to show
-- once a source is verified; the C9 control still lets them move any group to band / growth / badge
-- / private afterwards.
--
-- Only the O1 defaults change (revenue, users: badge -> exact; traffic / build were already exact).
-- The function is recreated in full because `create or replace` replaces the whole body, and it
-- MUST keep `security definer`: 20261015180000_fix_public_metrics_trigger.sql set that so the
-- trigger can call the revoked private.disclosure_band / disclosure_growth / disclosure_level
-- helpers without a 42501. A plain recreate (the 20261011130000 text) would silently reset it to
-- invoker and bring the bug back.
--
-- Existing rows keep their stored metric_disclosure: this only changes the next first-time
-- connection. Owners can flip an existing project in Product settings (the C9 control).
--
-- Applied: (pending owner approval).
create or replace function private.startups_public_metrics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d jsonb := coalesce(new.metric_disclosure, '{}'::jsonb);
  k text;
  v jsonb;
  money_edges numeric[] := array[1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  count_edges numeric[] := array[10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000,
                                 100000, 250000, 500000, 1000000];
  has_rev boolean := new.verification_status = 'verified';
  has_users boolean := new.active_users is not null;
  has_traffic boolean := new.visitors_30d is not null;
  has_build boolean := new.build_commits is not null;
  fx numeric;
  fx_day date;
  mrr_band numeric[];
  rev_band numeric[];
  users_band numeric[];
  visitors_band numeric[];
  commits_band numeric[];
  rev_growth integer;
  visitors_growth integer;
  lvl text;
begin
  -- Validate (same shape rule as profiles.field_visibility).
  if jsonb_typeof(d) <> 'object' then
    raise exception 'metric_disclosure must be an object' using errcode = 'check_violation';
  end if;
  for k, v in select * from jsonb_each(d) loop
    if k not in ('revenue', 'users', 'traffic', 'build')
       or jsonb_typeof(v) <> 'string'
       or v #>> '{}' not in ('exact', 'band', 'growth', 'badge', 'private') then
      raise exception 'metric_disclosure: bad entry %', k using errcode = 'check_violation';
    end if;
  end loop;

  -- O1: a group connected for the first time gets its default; an existing choice is kept.
  -- 2026-10-15: every group defaults to `exact`, so a verified source shows its numbers.
  if has_rev and not d ? 'revenue' then d := d || '{"revenue": "exact"}'; end if;
  if has_users and not d ? 'users' then d := d || '{"users": "exact"}'; end if;
  if has_traffic and not d ? 'traffic' then d := d || '{"traffic": "exact"}'; end if;
  if has_build and not d ? 'build' then d := d || '{"build": "exact"}'; end if;
  new.metric_disclosure := d;

  -- O5: the stored rate of the sync day (or the latest before it); never a live call.
  select f.usd_thb, f.day into fx, fx_day
  from public.fx_rates f
  where f.day <= coalesce(new.last_synced_at, now())::date
  order by f.day desc
  limit 1;

  mrr_band := case when fx is not null and new.mrr_cents is not null
                   then private.disclosure_band(new.mrr_cents / 100.0 * fx, money_edges) end;
  rev_band := case when fx is not null and new.revenue_30d_cents is not null
                   then private.disclosure_band(new.revenue_30d_cents / 100.0 * fx, money_edges) end;
  users_band := private.disclosure_band(new.active_users, count_edges);
  visitors_band := private.disclosure_band(new.visitors_30d, count_edges);
  commits_band := private.disclosure_band(new.build_commits, count_edges);
  rev_growth := private.disclosure_growth(new.revenue_30d_cents, new.revenue_prev_30d_cents);
  visitors_growth := private.disclosure_growth(new.visitors_30d, new.visitors_prev_30d);

  -- Revenue group.
  lvl := private.disclosure_level(has_rev, d ->> 'revenue', rev_growth is not null,
                                  mrr_band is not null or rev_band is not null);
  new.public_revenue_level := lvl;
  new.public_verified_provider := case when lvl is not null then new.verified_provider end;
  new.public_last_synced_at := case when lvl is not null then new.last_synced_at end;
  new.public_mrr_cents := case when lvl = 'exact' then new.mrr_cents end;
  new.public_revenue_30d_cents := case when lvl = 'exact' then new.revenue_30d_cents end;
  new.public_revenue_prev_30d_cents := case when lvl = 'exact' then new.revenue_prev_30d_cents end;
  new.public_revenue_all_time_cents := case when lvl = 'exact' then new.revenue_all_time_cents end;
  new.public_active_subscriptions := case when lvl = 'exact' then new.active_subscriptions end;
  new.public_customers := case when lvl = 'exact' then new.customers end;
  new.public_mrr_band_lo_thb := case when lvl = 'band' then mrr_band[1] end;
  new.public_mrr_band_hi_thb := case when lvl = 'band' then mrr_band[2] end;
  new.public_revenue_30d_band_lo_thb := case when lvl = 'band' then rev_band[1] end;
  new.public_revenue_30d_band_hi_thb := case when lvl = 'band' then rev_band[2] end;
  new.public_band_fx_day := case when lvl = 'band' then fx_day end;
  new.public_revenue_growth_pct := case when lvl in ('exact', 'growth') then rev_growth end;

  -- Users group (no previous period stored: `growth` always falls back to `badge`).
  lvl := private.disclosure_level(has_users, d ->> 'users', false, users_band is not null);
  new.public_users_level := lvl;
  new.public_active_users := case when lvl = 'exact' then new.active_users end;
  new.public_active_users_band_lo := case when lvl = 'band' then users_band[1] end;
  new.public_active_users_band_hi := case when lvl = 'band' then users_band[2] end;

  -- Traffic group.
  lvl := private.disclosure_level(has_traffic, d ->> 'traffic', visitors_growth is not null,
                                  visitors_band is not null);
  new.public_traffic_level := lvl;
  new.public_traffic_provider := case when lvl is not null then new.traffic_provider end;
  new.public_traffic_synced_at := case when lvl is not null then new.traffic_synced_at end;
  new.public_visitors_30d := case when lvl = 'exact' then new.visitors_30d end;
  new.public_visitors_prev_30d := case when lvl = 'exact' then new.visitors_prev_30d end;
  new.public_visitors_band_lo := case when lvl = 'band' then visitors_band[1] end;
  new.public_visitors_band_hi := case when lvl = 'band' then visitors_band[2] end;
  new.public_visitors_growth_pct := case when lvl in ('exact', 'growth') then visitors_growth end;

  -- Build group (no previous period stored: `growth` falls back to `badge`).
  lvl := private.disclosure_level(has_build, d ->> 'build', false, commits_band is not null);
  new.public_build_level := lvl;
  new.public_github_repo := case when lvl is not null then new.github_repo end;
  new.public_build_synced_at := case when lvl is not null then new.build_synced_at end;
  new.public_build_commits := case when lvl = 'exact' then new.build_commits end;
  new.public_build_ai_commits := case when lvl = 'exact' then new.build_ai_commits end;
  new.public_build_stars := case when lvl = 'exact' then new.build_stars end;
  new.public_build_first_commit_at := case when lvl = 'exact' then new.build_first_commit_at end;
  new.public_build_stack := case when lvl is not null then coalesce(new.build_stack, '{}') else '{}' end;
  new.public_build_commits_band_lo := case when lvl = 'band' then commits_band[1] end;
  new.public_build_commits_band_hi := case when lvl = 'band' then commits_band[2] end;

  -- Public proof level (mirrors proof_level; O2: a private group doesn't count).
  new.public_proof_level := case
    when new.is_demo then 0
    when new.public_revenue_level is not null then 3
    when new.public_build_level is not null then 2
    when new.owner_verified_at is not null or new.public_traffic_level is not null then 1
    else 0
  end;

  return new;
end;
$$;

revoke all on function private.startups_public_metrics() from public, anon, authenticated;

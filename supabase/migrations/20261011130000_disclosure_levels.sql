-- R2 privacy-first proof: per-group disclosure levels (docs/DISCLOSURE_SPEC.md, Design.md §7
-- "Disclosure levels", src/lib/disclosure.ts). Owner decisions 2026-10-11: O1 new revenue / users
-- connections start at `badge`, traffic / build at `exact`; O2 `private` hides the figure AND the
-- badge and doesn't count toward the public proof level; O3 visitors are never told when a level
-- changed; O4 precomputed `public_*` columns (not a masking view: the spike showed an invoker view
-- can't read revoked columns and an owner-rights view bypasses RLS); O5 money bands in THB from
-- the stored daily fx_rates row (no FX call on write), other groups in their own units.
--
-- Requires 20261011126000_anonymous_mode (is_anonymous is in the column grant below).
-- Applied 2026-10-15 (owner: "go"). It was gated behind the 14 Oct post and the owner's explicit approval; run the
-- advisors, RLS smoke T146–T160, and regenerate src/lib/supabase/database.types.ts.
--
-- DEPLOY ORDER (important): this migration revokes the raw metric columns from anon and
-- authenticated. Any client query that selects them, including `select *` and `insert … returning
-- *`, fails with "permission denied" afterwards. Ship the code that reads `public_*` (and the owner
-- dashboard's get_my_startup_metrics) FIRST, then apply this.
--
-- How it works:
--   * startups.metric_disclosure: {group: level}; groups revenue | users | traffic | build,
--     levels exact | band | growth | badge | private. Owners may update it (column grant + the
--     existing "owners update own startups" policy); a BEFORE trigger validates it.
--   * The same BEFORE INSERT/UPDATE trigger computes every public_* column from the raw columns,
--     the level and the stored FX rate. Clients have no write grant on public_*, and because the
--     trigger overwrites them on every write, not even the service role can desync them.
--   * anon / authenticated lose SELECT on the raw metric columns (and on metric_disclosure and
--     proof_level) and get SELECT on public_* instead. RLS on startups is unchanged.
--   * Snapshots (revenue_snapshots, traffic_snapshots, build_activity) are public only when the
--     group's public level is `exact`; owners still read their own.
--   * search_startups, province_leaderboard and the heatmap read public_* (exact only).

-- ---------------------------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------------------------
alter table public.startups
  add column metric_disclosure jsonb not null default '{}'::jsonb,
  -- proof (O2: private groups don't count)
  add column public_proof_level smallint not null default 0,
  -- revenue group (null level = not verified, or private: visitors can't tell which)
  add column public_revenue_level text,
  add column public_verified_provider text,
  add column public_last_synced_at timestamptz,
  add column public_mrr_cents bigint,
  add column public_revenue_30d_cents bigint,
  add column public_revenue_prev_30d_cents bigint,
  add column public_revenue_all_time_cents bigint,
  add column public_active_subscriptions integer,
  add column public_customers integer,
  add column public_mrr_band_lo_thb bigint,
  add column public_mrr_band_hi_thb bigint,
  add column public_revenue_30d_band_lo_thb bigint,
  add column public_revenue_30d_band_hi_thb bigint,
  add column public_band_fx_day date,
  add column public_revenue_growth_pct integer,
  -- users group
  add column public_users_level text,
  add column public_active_users integer,
  add column public_active_users_band_lo integer,
  add column public_active_users_band_hi integer,
  -- traffic group (counted, never "verified")
  add column public_traffic_level text,
  add column public_traffic_provider text,
  add column public_traffic_synced_at timestamptz,
  add column public_visitors_30d integer,
  add column public_visitors_prev_30d integer,
  add column public_visitors_band_lo integer,
  add column public_visitors_band_hi integer,
  add column public_visitors_growth_pct integer,
  -- build group
  add column public_build_level text,
  add column public_github_repo text,
  add column public_build_synced_at timestamptz,
  add column public_build_commits integer,
  add column public_build_ai_commits integer,
  add column public_build_stars integer,
  add column public_build_first_commit_at timestamptz,
  add column public_build_stack text[] not null default '{}',
  add column public_build_commits_band_lo integer,
  add column public_build_commits_band_hi integer;

alter table public.startups
  add constraint startups_public_levels_check check (
    (public_revenue_level is null or public_revenue_level in ('exact', 'band', 'growth', 'badge'))
    and (public_users_level is null or public_users_level in ('exact', 'band', 'growth', 'badge'))
    and (public_traffic_level is null or public_traffic_level in ('exact', 'band', 'growth', 'badge'))
    and (public_build_level is null or public_build_level in ('exact', 'band', 'growth', 'badge'))
  );

create index startups_public_proof_level_idx
  on public.startups (public_proof_level desc, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- 2. Helpers (pure, immutable). Ladders and rounding mirror src/lib/disclosure.ts.
-- ---------------------------------------------------------------------------------------------
create or replace function private.disclosure_band(p_value numeric, p_edges numeric[])
returns numeric[]           -- {lo, hi}; hi null = "over lo"; null when there is no value
language plpgsql immutable
set search_path = ''
as $$
declare
  i int;
begin
  if p_value is null or p_value < 0 then return null; end if;
  if p_value < p_edges[1] then return array[0, p_edges[1]]; end if;
  for i in 1 .. array_length(p_edges, 1) - 1 loop
    if p_value < p_edges[i + 1] then return array[p_edges[i], p_edges[i + 1]]; end if;
  end loop;
  return array[p_edges[array_length(p_edges, 1)], null];
end;
$$;

create or replace function private.disclosure_growth(p_cur numeric, p_prev numeric)
returns integer             -- whole percent, half away from zero; null without a previous period > 0
language sql immutable
set search_path = ''
as $$
  select case
    when p_cur is null or p_prev is null or p_prev <= 0 then null
    else (sign((p_cur - p_prev) / p_prev) * round(abs((p_cur - p_prev) / p_prev * 100)))::integer
  end;
$$;

-- Effective public level for a group: null when there is no data or the owner chose private;
-- `growth` without a usable previous period falls back to `badge`; `band` without a band
-- (e.g. no FX rate for money) also falls back to `badge`, so a raw value is never the fallback.
create or replace function private.disclosure_level(
  p_has_data boolean, p_level text, p_has_growth boolean, p_has_band boolean
) returns text
language sql immutable
set search_path = ''
as $$
  select case
    when not p_has_data or p_level = 'private' then null
    when p_level = 'growth' and not p_has_growth then 'badge'
    when p_level = 'band' and not p_has_band then 'badge'
    else coalesce(p_level, 'exact')
  end;
$$;

revoke all on function private.disclosure_band(numeric, numeric[]) from public, anon, authenticated;
revoke all on function private.disclosure_growth(numeric, numeric) from public, anon, authenticated;
revoke all on function private.disclosure_level(boolean, text, boolean, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. The trigger: validate metric_disclosure, apply O1 defaults on a first connection, and
--    compute every public_* column. SECURITY INVOKER: it only reads fx_rates (public) and
--    rewrites NEW; it can't be used to reach anything the writer couldn't already.
-- ---------------------------------------------------------------------------------------------
create or replace function private.startups_public_metrics()
returns trigger
language plpgsql
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
  if has_rev and not d ? 'revenue' then d := d || '{"revenue": "badge"}'; end if;
  if has_users and not d ? 'users' then d := d || '{"users": "badge"}'; end if;
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

-- ---------------------------------------------------------------------------------------------
-- 4. Backfill: existing projects keep showing what they show today (exact for every group that
--    has data), then every row is recomputed. updated_at is left alone (not a real edit).
-- ---------------------------------------------------------------------------------------------
update public.startups set metric_disclosure =
    (case when verification_status = 'verified' then '{"revenue": "exact"}'::jsonb else '{}'::jsonb end)
  || (case when active_users is not null then '{"users": "exact"}'::jsonb else '{}'::jsonb end)
  || (case when visitors_30d is not null then '{"traffic": "exact"}'::jsonb else '{}'::jsonb end)
  || (case when build_commits is not null then '{"build": "exact"}'::jsonb else '{}'::jsonb end);

create trigger startups_public_metrics
  before insert or update on public.startups
  for each row execute function private.startups_public_metrics();

alter table public.startups disable trigger startups_set_updated_at;
update public.startups set metric_disclosure = metric_disclosure;   -- fires the trigger per row
alter table public.startups enable trigger startups_set_updated_at;

-- ---------------------------------------------------------------------------------------------
-- 5. Grants: no raw metric column is readable by anon / authenticated.
-- ---------------------------------------------------------------------------------------------
revoke select on public.startups from anon, authenticated;
grant select (
  id, owner_id, slug, name, website_url, logo_path, tagline, description, category, country,
  province, founded_on, ai_tools, marketing_channels, audience, value_proposition, problem_solved,
  pricing_note, team_size, funding, founder_message, status, founding_number, created_at,
  updated_at, app_store_url, play_store_url, line_url, github_url, looking_for, build_story,
  is_demo, tech_stack, pricing_amount, pricing_currency, pricing_period, demo_video_url,
  founder_role, owner_verified_at,
  -- From 20261011126000_anonymous_mode (apply that one first).
  is_anonymous,
  public_proof_level,
  public_revenue_level, public_verified_provider, public_last_synced_at, public_mrr_cents,
  public_revenue_30d_cents, public_revenue_prev_30d_cents, public_revenue_all_time_cents,
  public_active_subscriptions, public_customers, public_mrr_band_lo_thb, public_mrr_band_hi_thb,
  public_revenue_30d_band_lo_thb, public_revenue_30d_band_hi_thb, public_band_fx_day,
  public_revenue_growth_pct,
  public_users_level, public_active_users, public_active_users_band_lo, public_active_users_band_hi,
  public_traffic_level, public_traffic_provider, public_traffic_synced_at, public_visitors_30d,
  public_visitors_prev_30d, public_visitors_band_lo, public_visitors_band_hi,
  public_visitors_growth_pct,
  public_build_level, public_github_repo, public_build_synced_at, public_build_commits,
  public_build_ai_commits, public_build_stars, public_build_first_commit_at, public_build_stack,
  public_build_commits_band_lo, public_build_commits_band_hi
) on public.startups to anon, authenticated;
-- Not granted (raw): verification_status, verified_provider, mrr_cents, revenue_30d_cents,
-- revenue_prev_30d_cents, revenue_all_time_cents, active_subscriptions, customers, last_synced_at,
-- active_users, traffic_provider, visitors_30d, visitors_prev_30d, traffic_synced_at, github_repo,
-- build_first_commit_at, build_commits, build_ai_commits, build_stars, build_synced_at,
-- build_stack, proof_level, metric_disclosure.

-- The owner chooses the levels (row access: the existing "owners update own startups" policy).
grant update (metric_disclosure) on public.startups to authenticated;

-- Owners read their own raw numbers and levels (dashboard, settings, verify step).
create or replace function public.get_my_startup_metrics(p_startup bigint)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'metric_disclosure', s.metric_disclosure,
    'verification_status', s.verification_status, 'verified_provider', s.verified_provider,
    'mrr_cents', s.mrr_cents, 'revenue_30d_cents', s.revenue_30d_cents,
    'revenue_prev_30d_cents', s.revenue_prev_30d_cents,
    'revenue_all_time_cents', s.revenue_all_time_cents,
    'active_subscriptions', s.active_subscriptions, 'customers', s.customers,
    'last_synced_at', s.last_synced_at, 'active_users', s.active_users,
    'traffic_provider', s.traffic_provider, 'visitors_30d', s.visitors_30d,
    'visitors_prev_30d', s.visitors_prev_30d, 'traffic_synced_at', s.traffic_synced_at,
    'github_repo', s.github_repo, 'build_commits', s.build_commits,
    'build_ai_commits', s.build_ai_commits, 'build_stars', s.build_stars,
    'build_first_commit_at', s.build_first_commit_at, 'build_synced_at', s.build_synced_at,
    'build_stack', s.build_stack, 'proof_level', s.proof_level
  )
  from public.startups s
  where s.id = p_startup
    and s.owner_id = (select auth.uid());   -- someone else's id → null, never an error that leaks
$$;

revoke all on function public.get_my_startup_metrics(bigint) from public, anon;
grant execute on function public.get_my_startup_metrics(bigint) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 6. Snapshots: public only at `exact`; owners always see their own.
-- ---------------------------------------------------------------------------------------------
drop policy if exists "anon sees snapshots of published startups" on public.revenue_snapshots;
drop policy if exists "users see snapshots of published and own startups" on public.revenue_snapshots;
create policy "revenue history is public only at exact; owners see own"
  on public.revenue_snapshots for select to anon, authenticated
  using (exists (
    select 1 from public.startups s
    where s.id = revenue_snapshots.startup_id
      and ((s.status = 'published' and s.public_revenue_level = 'exact')
           or s.owner_id = (select auth.uid()))
  ));

drop policy if exists "traffic of published startups is public, owners see own" on public.traffic_snapshots;
create policy "traffic history is public only at exact; owners see own"
  on public.traffic_snapshots for select to anon, authenticated
  using (exists (
    select 1 from public.startups s
    where s.id = traffic_snapshots.startup_id
      and ((s.status = 'published' and s.public_traffic_level = 'exact')
           or s.owner_id = (select auth.uid()))
  ));

drop policy if exists "activity of visible startups is public" on public.build_activity;
create policy "build history is public only at exact; owners see own"
  on public.build_activity for select to anon, authenticated
  using (exists (
    select 1 from public.startups s
    where s.id = build_activity.startup_id
      and (s.public_build_level = 'exact' or s.owner_id = (select auth.uid()))
  ));

-- ---------------------------------------------------------------------------------------------
-- 7. RPCs and the heatmap read public_* only.
-- ---------------------------------------------------------------------------------------------
create or replace function public.search_startups(q text, max_rows integer default 6)
returns table (
  id bigint, slug text, name text, tagline text, logo_path text, category text,
  verification_status text, verified_provider text, is_demo boolean, mrr_cents bigint
)
language sql stable
set search_path = ''
as $$
  with raw as (
    select lower(btrim(left(coalesce(q, ''), 60))) as t
  ),
  term as (
    -- LIKE wildcards typed by the user are literal characters, not patterns.
    select raw.t, esc.e || '%' as prefix, '%' || esc.e || '%' as pattern
    from raw,
      lateral (
        select replace(replace(replace(raw.t, '\', '\\'), '%', '\%'), '_', '\_') as e
      ) esc
  )
  select s.id, s.slug, s.name, s.tagline, s.logo_path, s.category,
         case when s.public_revenue_level is not null then 'verified' else 'unverified' end,
         s.public_verified_provider, s.is_demo, s.public_mrr_cents
  from public.startups s, term
  where s.status = 'published'
    and term.t <> ''
    and (
      s.name ilike term.pattern
      or s.slug ilike term.pattern
      or s.tagline ilike term.pattern
      or s.description ilike term.pattern
      or extensions.similarity(lower(s.name), term.t) > 0.3
    )
  order by
    lower(s.name) = term.t desc,
    lower(s.name) like term.prefix desc,
    (s.public_revenue_level is not null and not s.is_demo) desc,
    s.public_mrr_cents desc nulls last,          -- exact only: a hidden value never orders
    extensions.similarity(lower(s.name), term.t) desc,
    s.id
  limit least(greatest(coalesce(max_rows, 6), 1), 20);
$$;

create or replace function public.province_leaderboard(metric text default 'revenue', region text default null)
returns table (province text, region_slug text, startups bigint, total numeric, top jsonb)
language sql stable
set search_path = ''
as $$
  with vals as (
    select
      s.province,
      p.region,
      s.slug,
      s.name,
      s.logo_path,
      -- exact levels only (the public_* value is null otherwise): spec §6 Olympics.
      (case province_leaderboard.metric
        when 'revenue' then s.public_revenue_all_time_cents
        when 'mrr' then s.public_mrr_cents
        when 'visitors' then s.public_visitors_30d
        when 'commits' then s.public_build_commits
      end)::numeric as value
    from public.startups s
    join public.provinces p on p.slug = s.province
    where s.status = 'published'
      and not s.is_demo
      and (province_leaderboard.region is null or p.region = province_leaderboard.region)
  ),
  ranked as (
    select
      v.*,
      row_number() over (partition by v.province order by v.value desc, v.name) as rn
    from vals v
    where v.value is not null
  )
  select
    r.province,
    min(r.region) as region_slug,
    count(*) as startups,
    sum(r.value) as total,
    jsonb_agg(
      jsonb_build_object(
        'slug', r.slug,
        'name', r.name,
        'logo_path', r.logo_path,
        'value', r.value
      )
      order by r.rn
    ) filter (where r.rn <= 5) as top
  from ranked r
  group by r.province
  order by total desc, startups desc, r.province;
$$;

-- Heatmap: a revenue or commit day counts only when that group is public at `exact` (a revenue
-- day is itself a disclosure). Read only by the definer functions profile_activity /
-- refresh_activity, so no grants.
drop materialized view if exists private.user_activity_days;
create materialized view private.user_activity_days as
  select x.user_id, x.day, sum(x.score)::integer as score
  from (
    select m.user_id, d.day, d.score
    from public.startup_members m
    join (
      select b.startup_id, b.day, b.commits as score, 'build'::text as grp
      from public.build_activity b
      where b.commits > 0
      union all
      select r.startup_id, r.day, 1, 'revenue'::text
      from public.revenue_snapshots r
      where r.revenue_cents > 0
    ) d on d.startup_id = m.startup_id
    join public.startups s on s.id = m.startup_id
      and s.status = 'published'
      and not s.is_demo
      and case d.grp
            when 'build' then s.public_build_level = 'exact'
            else s.public_revenue_level = 'exact'
          end
    where m.status = 'confirmed'
    union all
    select p.author_id, (p.created_at at time zone 'UTC')::date, 1
    from public.posts p
    join public.startups s on s.id = p.startup_id and s.status = 'published' and not s.is_demo
    where not p.is_auto and p.hidden_at is null
  ) x
  group by x.user_id, x.day;
create unique index user_activity_days_pk on private.user_activity_days (user_id, day);
revoke all on private.user_activity_days from public, anon, authenticated;

-- Rollback (restores today's exposure; drop the new columns last):
--   grant select on public.startups to anon, authenticated;
--   revoke update (metric_disclosure) on public.startups from authenticated;
--   drop trigger if exists startups_public_metrics on public.startups;
--   drop function if exists private.startups_public_metrics();
--   drop function if exists public.get_my_startup_metrics(bigint);
--   restore the three snapshot policies, search_startups, province_leaderboard and
--   private.user_activity_days from migrations 20260929055857, 20260929125125, 20260930155147,
--   20260930102108, 20260930144541 and 20261001092434;
--   alter table public.startups drop constraint startups_public_levels_check,
--     drop column metric_disclosure, drop column public_proof_level, … (every public_* column).

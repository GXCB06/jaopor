-- Spec 6.7 Province Olympics: rank provinces by the sum of one verified metric.
--
--   metric: 'revenue' (all-time, USD cents) | 'mrr' (USD cents) | 'visitors' (30 days) | 'commits'
--   region: one of the 6 region slugs, or null for all.
--
-- Only numbers we verified count: revenue/MRR need verification_status = 'verified'; visitors
-- and commits only exist when synced from a connected source. Demo projects never count
-- (same rule as category_counts). Provinces without a single number are left out; the page lists
-- them from lib/config/provinces.ts as "not yet".
--
-- Output column is region_slug (an IN and an OUT parameter can't share the name `region`).
-- security invoker: anon only sees published rows (startups RLS), so drafts can't leak into sums.

create or replace function public.province_leaderboard(
  metric text default 'revenue',
  region text default null
)
returns table (
  province text,
  region_slug text,
  startups bigint,
  total numeric,
  top jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with vals as (
    select
      s.province,
      p.region,
      s.slug,
      s.name,
      s.logo_path,
      (case province_leaderboard.metric
        when 'revenue' then
          case when s.verification_status = 'verified' then s.revenue_all_time_cents end
        when 'mrr' then
          case when s.verification_status = 'verified' then s.mrr_cents end
        when 'visitors' then s.visitors_30d
        when 'commits' then s.build_commits
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

revoke execute on function public.province_leaderboard(text, text) from public;
grant execute on function public.province_leaderboard(text, text)
  to anon, authenticated, service_role;

-- Spec Phase 5 (6.6 Categories): startup count per category in one grouped query.
-- Counts listed (published) projects; demo projects (sample data) are excluded, as agreed for
-- counts and totals. security invoker → RLS applies (anon sees published rows only).
create or replace function public.category_counts()
returns table (category text, startups bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.category, count(*) as startups
  from public.startups s
  where s.status = 'published' and not s.is_demo
  group by s.category;
$$;

revoke execute on function public.category_counts() from public;
grant execute on function public.category_counts() to anon, authenticated, service_role;

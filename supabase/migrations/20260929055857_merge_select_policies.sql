-- Performance advisor: one permissive SELECT policy per role instead of two (each extra policy runs per row).
-- Same access as schema_v1: anon sees published rows; signed-in users see published rows + their own.

drop policy "published startups are public" on public.startups;
drop policy "owners see own startups" on public.startups;

create policy "anon sees published startups"
on public.startups for select
to anon
using (status = 'published');

create policy "users see published and own startups"
on public.startups for select
to authenticated
using (status = 'published' or (select auth.uid()) = owner_id);

drop policy "snapshots of published startups are public" on public.revenue_snapshots;
drop policy "owners see own snapshots" on public.revenue_snapshots;

create policy "anon sees snapshots of published startups"
on public.revenue_snapshots for select
to anon
using (
  exists (
    select 1 from public.startups s
    where s.id = startup_id and s.status = 'published'
  )
);

create policy "users see snapshots of published and own startups"
on public.revenue_snapshots for select
to authenticated
using (
  exists (
    select 1 from public.startups s
    where s.id = startup_id
      and (s.status = 'published' or s.owner_id = (select auth.uid()))
  )
);

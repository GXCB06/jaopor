-- Bug fix for spec_phase1_vocab: in the screenshot storage policies the unqualified `name` inside
-- `exists (select … from public.startups s …)` resolved to startups.name (the project name), not
-- the object path, so every owner upload was rejected (Storage 400). Qualify it as objects.name.
drop policy "owners list own screenshots" on storage.objects;
drop policy "owners upload own screenshots" on storage.objects;
drop policy "owners update own screenshots" on storage.objects;
drop policy "owners delete own screenshots" on storage.objects;

create policy "owners list own screenshots"
on storage.objects for select
to authenticated
using (
  bucket_id = 'screenshots'
  and exists (
    select 1 from public.startups s
    where s.id::text = (storage.foldername(objects.name))[1] and s.owner_id = (select auth.uid())
  )
);

create policy "owners upload own screenshots"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'screenshots'
  and exists (
    select 1 from public.startups s
    where s.id::text = (storage.foldername(objects.name))[1] and s.owner_id = (select auth.uid())
  )
);

create policy "owners update own screenshots"
on storage.objects for update
to authenticated
using (
  bucket_id = 'screenshots'
  and exists (
    select 1 from public.startups s
    where s.id::text = (storage.foldername(objects.name))[1] and s.owner_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'screenshots'
  and exists (
    select 1 from public.startups s
    where s.id::text = (storage.foldername(objects.name))[1] and s.owner_id = (select auth.uid())
  )
);

create policy "owners delete own screenshots"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'screenshots'
  and exists (
    select 1 from public.startups s
    where s.id::text = (storage.foldername(objects.name))[1] and s.owner_id = (select auth.uid())
  )
);

-- NOT APPLIED YET: the owner applies this and regenerates database.types.ts (the hand-written
-- `saves` entry in src/lib/supabase/database.types.ts matches what `supabase gen types` produces).
--
-- Saves / bookmarks ("ที่บันทึกไว้", Phase 9d). One row per (user, project): a signed-in person
-- keeps a project to look at later.
--  * Private by design: a user reads, inserts and deletes ONLY their own rows. Nobody can see who
--    else saved what — there is no public read policy.
--  * Saving is idempotent (`on conflict do nothing` at the call site) and un-saving is a plain
--    delete, so the action can be tapped twice without error.
--  * Both foreign keys cascade: deleting a user or a project removes its saves.

create table public.saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  startup_id bigint not null references public.startups (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, startup_id)
);

-- Newest-first list per user (the /dashboard/saved page) and a lookup by project.
create index saves_user_created_idx on public.saves (user_id, created_at desc);
create index saves_startup_id_idx on public.saves (startup_id);

alter table public.saves enable row level security;

create policy "users read own saves" on public.saves
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users save for themselves" on public.saves
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users delete own saves" on public.saves
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Least privilege (Data API): authenticated users get exactly select/insert/delete on their rows;
-- anon has no access at all; the service role (cron, admin tooling) gets everything.
revoke all on public.saves from anon, authenticated;
grant select, insert, delete on public.saves to authenticated;
grant select, insert, update, delete on public.saves to service_role;

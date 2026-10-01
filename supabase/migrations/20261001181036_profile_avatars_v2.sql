-- NOT APPLIED. Profile photos (owner request 2026-10-02): people can upload their own photo
-- instead of only the one Google / GitHub gave at sign-up. Replaces the unapplied, unpushed draft
-- 20261001175557_profile_avatars after the owner's security review checklist (2026-10-02);
-- production facts below were checked on the live schema that day.
--
-- Privilege model on public.profiles (verified): `authenticated` has NO table-level UPDATE (the
-- table ACL is postgres + service_role only), column-level UPDATE on 12 columns incl. avatar_url,
-- and is a member of no other role. So the column REVOKE in §2 is effective (RLS smoke T105).
--
--  1. Bucket 'avatars': public read, WebP or JPEG (Safari can't encode WebP), 1 MB. Fails closed if
--     a bucket with that id already exists with another configuration. Restrictive policies make
--     every client write to it impossible, even if a broad permissive policy is added later; the
--     server action uploads with the service role.
--  2. profiles.avatar_url is no longer client-writable. Until now any signed-in user could point it
--     at any URL, which every visitor's browser would then load (tracking pixel / offensive image).
--  3. A CHECK constraint limits avatar_url to Google / GitHub photo hosts or a file in THIS
--     profile's own folder of our bucket, for every writer (service role included). Sign-up only
--     copies a photo URL that passes the same rule (user metadata is user-editable).
--  4. A replaced / removed photo and the photo of a deleted account are queued in storage_cleanup,
--     only ever for this profile's own folder; external URLs are never queued.
--  5. Photo changes are rate-limited: 20 a day per person (private.take_rate).

-- 1. Bucket ------------------------------------------------------------------------------------
do $$
declare
  b record;
begin
  select public, file_size_limit, allowed_mime_types into b
  from storage.buckets where id = 'avatars';
  if found and not (
    b.public
    and b.file_size_limit = 1048576
    and b.allowed_mime_types @> array['image/webp', 'image/jpeg']
    and b.allowed_mime_types <@ array['image/webp', 'image/jpeg']
  ) then
    raise exception 'storage bucket "avatars" already exists with a different configuration (public=%, file_size_limit=%, allowed_mime_types=%); fix or remove it by hand first',
      b.public, b.file_size_limit, b.allowed_mime_types;
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Restrictive = ANDed with every permissive policy, so no future policy can open client writes here.
-- (Public read of a public bucket goes through the public URL, not RLS; listing stays closed.)
create policy "avatars: no client inserts" on storage.objects
  as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'avatars');
create policy "avatars: no client updates" on storage.objects
  as restrictive for update to anon, authenticated
  using (bucket_id <> 'avatars')
  with check (bucket_id <> 'avatars');
create policy "avatars: no client deletes" on storage.objects
  as restrictive for delete to anon, authenticated
  using (bucket_id <> 'avatars');

-- 2. Column privilege (the other 11 columns of the original grant stay writable) ---------------
revoke update (avatar_url) on public.profiles from authenticated;

-- 3. Allowed photo sources ---------------------------------------------------------------------
-- [!-~]+ = printable ASCII without spaces; length stays capped at 500 by profiles_avatar_url_check
-- (Postgres regex repetition counts stop at 255). Production on 2026-10-02: 3 × lh3.googleusercontent.com,
-- 1 × avatars.githubusercontent.com, all valid under this rule.
alter table public.profiles add constraint profiles_avatar_url_source check (
  avatar_url is null
  or avatar_url ~ '^https://lh[0-9]+\.googleusercontent\.com/[!-~]+$'
  or avatar_url ~ '^https://avatars\.githubusercontent\.com/[!-~]+$'
  or avatar_url ~ (
    '^https://letfxefyqxxrfujpwtri\.supabase\.co/storage/v1/object/public/avatars/'
    || id::text
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$'
  )
);

-- Sign-up: copy the provider photo only when it passes the same rule (otherwise initials).
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  photo text := new.raw_user_meta_data ->> 'avatar_url';
begin
  if photo is null
     or char_length(photo) > 500
     or photo !~ '^https://(lh[0-9]+\.googleusercontent\.com|avatars\.githubusercontent\.com)/[!-~]+$' then
    photo := null;
  end if;
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80),
    photo
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. Cleanup of this profile's own files only ---------------------------------------------------
create or replace function private.profiles_queue_avatar_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_path text;
begin
  if old.avatar_url is null then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.avatar_url is not distinct from old.avatar_url then
    return null;
  end if;
  -- Exactly our bucket's public URL, in this profile's folder; anything else (Google, GitHub,
  -- look-alikes) gives null and is never queued.
  old_path := substring(old.avatar_url from
    '^https://letfxefyqxxrfujpwtri\.supabase\.co/storage/v1/object/public/avatars/('
    || old.id::text
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:webp|jpg))$');
  if old_path is not null then
    insert into public.storage_cleanup (bucket, path) values ('avatars', old_path)
    on conflict do nothing;
  end if;
  return null;
end;
$$;
revoke execute on function private.profiles_queue_avatar_cleanup() from public, anon, authenticated;
create trigger profiles_queue_avatar_cleanup after update of avatar_url or delete on public.profiles
  for each row execute function private.profiles_queue_avatar_cleanup();

-- 5. Rate limit: 20 photo changes a day (the server action calls this with the user's session) --
alter table private.rate_events drop constraint rate_events_kind_check;
alter table private.rate_events add constraint rate_events_kind_check
  check (kind in ('post', 'comment', 'message', 'avatar'));

create or replace function public.take_avatar_change()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.take_rate('avatar', 20);
$$;
revoke execute on function public.take_avatar_change() from public, anon;
grant execute on function public.take_avatar_change() to authenticated;

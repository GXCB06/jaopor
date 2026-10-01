-- NOT APPLIED. Profile photos (owner request 2026-10-02): people can upload their own photo
-- instead of only the one Google / GitHub gave at sign-up.
--
--  1. Bucket 'avatars': public read, WebP or JPEG (Safari can't encode WebP), 1 MB. Clients get NO
--     storage policies: the server action checks the file (signature bytes, size), uploads it with
--     the service role to avatars/{user_id}/{uuid}.webp|jpg and sets profiles.avatar_url.
--  2. profiles.avatar_url is no longer client-writable. Until now any signed-in user could point it
--     at any https URL, and every visitor's browser would load that address (tracking pixel /
--     offensive image). Now it only ever holds the sign-in photo or a file in our bucket.
--  3. A replaced or removed photo, and the photo of a deleted account, is queued in
--     storage_cleanup (Phase 10 table; the daily cron drains it, and the action drains the old
--     file right away), so old photos don't stay reachable by URL.

-- 1. Bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- 2. Column privilege (the other columns of 20260929050526's grant stay writable)
revoke update (avatar_url) on public.profiles from authenticated;

-- 3. Cleanup of our own files only (sign-in photos live at Google / GitHub)
create or replace function private.profiles_queue_avatar_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  marker constant text := '/storage/v1/object/public/avatars/';
  old_path text;
begin
  if old.avatar_url is null or position(marker in old.avatar_url) = 0 then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.avatar_url is not distinct from old.avatar_url then
    return null;
  end if;
  old_path := substr(old.avatar_url, position(marker in old.avatar_url) + length(marker));
  -- Only paths the server writes: {user_id}/{uuid}.webp|jpg
  if old_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$' then
    insert into public.storage_cleanup (bucket, path) values ('avatars', old_path)
    on conflict do nothing;
  end if;
  return null;
end;
$$;
revoke execute on function private.profiles_queue_avatar_cleanup() from public, anon, authenticated;
create trigger profiles_queue_avatar_cleanup after update of avatar_url or delete on public.profiles
  for each row execute function private.profiles_queue_avatar_cleanup();

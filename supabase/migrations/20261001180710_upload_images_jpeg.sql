-- Screenshots and post images may also be JPEG. The browser re-encodes uploads to WebP, but Safari
-- (macOS, and every browser on iOS) can't encode WebP from a canvas, so it falls back to JPEG
-- (src/lib/webp.ts). Until now the buckets and the path checks accepted only .webp, so uploads
-- from an iPhone always failed.
--  1. `screenshots` and `post-images` buckets accept image/jpeg as well as image/webp.
--  2. startup_screenshots.path and post_images.path accept {id}/{uuid}.webp or .jpg.
-- Storage policies check only the folder, not the extension, so they stay as they are.

-- 1. Buckets (size limit unchanged: 3 MB).
update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg']
where id in ('screenshots', 'post-images');

-- 2. Path checks (existing rows are all .webp, so re-validating them passes).
alter table public.startup_screenshots
  drop constraint startup_screenshots_path_check,
  add constraint startup_screenshots_path_check
    check (path ~ '^[0-9]{1,18}/[0-9a-f-]{36}\.(webp|jpg)$');

alter table public.post_images
  drop constraint post_images_path_check,
  add constraint post_images_path_check
    check (path ~ '^[0-9]{1,18}/[0-9a-f-]{36}\.(webp|jpg)$');

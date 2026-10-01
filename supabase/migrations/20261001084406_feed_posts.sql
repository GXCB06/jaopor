-- DRAFT, not applied. Phase 10 (docs/SPEC.md §12): product updates feed.
--  1. posts            build-in-public updates tied to a startup (+ auto milestone posts)
--  2. post_images      up to 4 WebP images per post (bucket "post-images", {post_id}/{uuid}.webp)
--  3. post_likes       one like per user per post; likes_count kept by trigger
--  4. post_comments    one level of replies, soft delete; comments_count kept by trigger
--  5. reports          one table for post / comment / user reports (copies user_reports rows)
--  6. notifications    + post_like / post_comment kinds
--  7. activity heatmap counts posts
--
-- Security model (same as Phase 9):
--  * Guard triggers are SECURITY INVOKER and only check client roles (anon / authenticated);
--    server code (service role) and definer triggers bypass them.
--  * Clients can't write link_preview, is_auto, milestone_key, hidden_at or the counters
--    (column grants). The server fetches link previews (SSRF-guarded) and writes them with the
--    service role; the milestone job inserts auto posts with the service role.
--  * Milestone posts are never created by clients (type 'milestone' requires is_auto).

-- ---------------------------------------------------------------------------------------------
-- 1. posts
-- ---------------------------------------------------------------------------------------------
create table public.posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles (id) on delete cascade,
  startup_id bigint not null references public.startups (id) on delete cascade,
  type text not null check (type in ('feature', 'launch', 'lesson', 'feedback', 'milestone')),
  body text not null check (char_length(body) between 1 and 500),
  link_url text check (link_url ~ '^https?://' and char_length(link_url) <= 500),
  link_preview jsonb check (link_preview is null or jsonb_typeof(link_preview) = 'object'),
  is_auto boolean not null default false,
  milestone_key text unique check (char_length(milestone_key) <= 80),
  -- Copied from the startup on insert (and kept in sync below) for fast feed filters.
  province text references public.provinces (slug) on delete set null,
  category text,
  likes_count integer not null default 0 check (likes_count >= 0),
  comments_count integer not null default 0 check (comments_count >= 0),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  hidden_at timestamptz,
  -- Auto posts are exactly the milestone posts, and only they carry a milestone key.
  check (is_auto = (type = 'milestone')),
  check (is_auto = (milestone_key is not null))
);
create index posts_feed_idx on public.posts (created_at desc, id desc) where hidden_at is null;
create index posts_startup_idx on public.posts (startup_id, created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_province_idx on public.posts (province, created_at desc) where province is not null;
create index posts_category_idx on public.posts (category, created_at desc);
create index posts_type_idx on public.posts (type, created_at desc);

-- Is `p_user` a confirmed member of `p_startup`? (definer: members of draft startups too)
create or replace function private.is_confirmed_member(p_startup bigint, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.startup_members m
    where m.startup_id = p_startup and m.user_id = p_user and m.status = 'confirmed'
  );
$$;
revoke execute on function private.is_confirmed_member(bigint, uuid) from public;
grant execute on function private.is_confirmed_member(bigint, uuid) to authenticated;

-- Province / category always come from the startup, for every role.
create or replace function private.posts_copy_startup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select s.province, s.category into new.province, new.category
  from public.startups s where s.id = new.startup_id;
  return new;
end;
$$;
revoke execute on function private.posts_copy_startup() from public, anon, authenticated;
create trigger posts_copy_startup before insert or update of startup_id on public.posts
  for each row execute function private.posts_copy_startup();

-- Keep the copies in sync when a startup changes province or category.
create or replace function private.startups_sync_posts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts p set province = new.province, category = new.category
  where p.startup_id = new.id;
  return null;
end;
$$;
revoke execute on function private.startups_sync_posts() from public, anon, authenticated;
create trigger startups_sync_posts after update of province, category on public.startups
  for each row when (old.province is distinct from new.province
                     or old.category is distinct from new.category)
  execute function private.startups_sync_posts();

-- Client rules: author = me, confirmed member, 5 posts a day, edits within 15 minutes.
create or replace function private.posts_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if me is null or new.author_id <> me
       or not private.is_confirmed_member(new.startup_id, me) then
      raise exception 'not a confirmed member of this startup' using errcode = '42501';
    end if;
    if (select count(*) from public.posts p
        where p.author_id = me and not p.is_auto
          and p.created_at > now() - interval '1 day') >= 5 then
      raise exception 'daily post limit reached' using errcode = '54000';
    end if;
    new.created_at := now();
    new.edited_at := null;
    return new;
  end if;
  -- UPDATE (column grants allow body / link_url only): the author, within 15 minutes.
  if me is null or old.author_id <> me then
    raise exception 'only the author edits a post' using errcode = '42501';
  end if;
  if old.is_auto or old.created_at < now() - interval '15 minutes' then
    raise exception 'the edit window has closed' using errcode = '42501';
  end if;
  new.edited_at := now();
  if new.link_url is distinct from old.link_url then
    new.link_preview := null; -- the server fetches a fresh preview
  end if;
  return new;
end;
$$;
revoke execute on function private.posts_guard() from public;
create trigger posts_guard before insert or update on public.posts
  for each row execute function private.posts_guard();

alter table public.posts enable row level security;
revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert (author_id, startup_id, type, body, link_url) on public.posts to authenticated;
grant update (body, link_url) on public.posts to authenticated;
grant delete on public.posts to authenticated;
grant select, insert, update, delete on public.posts to service_role;

-- Visible = not hidden and the startup is published; authors always see their own.
create policy "posts: visible to everyone" on public.posts
  for select to anon, authenticated
  using (
    (hidden_at is null
      and exists (select 1 from public.startups s
                  where s.id = startup_id and s.status = 'published'))
    or author_id = (select auth.uid())
  );
create policy "posts: members post" on public.posts
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and type <> 'milestone'
    and private.is_confirmed_member(startup_id, (select auth.uid()))
  );
create policy "posts: author edits" on public.posts
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));
create policy "posts: author deletes" on public.posts
  for delete to authenticated
  using (author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 2. post_images + storage bucket "post-images"
-- ---------------------------------------------------------------------------------------------
create table public.post_images (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  path text not null unique check (path ~ '^[0-9]{1,18}/[0-9a-f-]{36}\.webp$'),
  width integer not null check (width between 1 and 4000),
  height integer not null check (height between 1 and 4000),
  position smallint not null default 0 check (position between 0 and 3),
  constraint post_images_path_in_own_folder check (split_part(path, '/', 1) = post_id::text),
  unique (post_id, position)
);

create or replace function private.post_images_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.post_images where post_id = new.post_id) >= 4 then
    raise exception 'max 4 images per post' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function private.post_images_limit() from public, anon, authenticated;
create trigger post_images_limit before insert on public.post_images
  for each row execute function private.post_images_limit();

alter table public.post_images enable row level security;
revoke all on public.post_images from anon, authenticated;
grant select on public.post_images to anon, authenticated;
grant insert (post_id, path, width, height, position), delete on public.post_images to authenticated;
grant select, insert, update, delete on public.post_images to service_role;

-- Readable when the post is (the posts policy applies inside the subquery).
create policy "post_images: visible with the post" on public.post_images
  for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "post_images: author adds while editable" on public.post_images
  for insert to authenticated
  with check (exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id = (select auth.uid())
      and p.created_at > now() - interval '15 minutes'
  ));
create policy "post_images: author removes" on public.post_images
  for delete to authenticated
  using (exists (
    select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 3145728, array['image/webp'])
on conflict (id) do nothing;

-- Objects live at {post_id}/{uuid}.webp; only the post's author writes there (objects.name is
-- qualified on purpose, see 20260930085756_fix_screenshot_storage_policies).
create policy "post authors upload images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and exists (
      select 1 from public.posts p
      where p.id::text = (storage.foldername(objects.name))[1]
        and p.author_id = (select auth.uid())
        and p.created_at > now() - interval '15 minutes'
    )
  );
create policy "post authors delete images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-images'
    and exists (
      select 1 from public.posts p
      where p.id::text = (storage.foldername(objects.name))[1]
        and p.author_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------------------------
-- 3. post_likes
-- ---------------------------------------------------------------------------------------------
create table public.post_likes (
  post_id bigint not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes (user_id);

alter table public.post_likes enable row level security;
revoke all on public.post_likes from anon, authenticated;
grant select, delete on public.post_likes to authenticated;
grant insert (post_id, user_id) on public.post_likes to authenticated;
grant select, insert, update, delete on public.post_likes to service_role;

-- Who liked what stays private; the public sees likes_count. I see my own likes.
create policy "post_likes: own rows" on public.post_likes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "post_likes: like a visible post" on public.post_likes
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.posts p where p.id = post_id));
create policy "post_likes: unlike" on public.post_likes
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 4. post_comments
-- ---------------------------------------------------------------------------------------------
create table public.post_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id bigint references public.post_comments (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- A deleted comment keeps its place in the thread ("ความคิดเห็นถูกลบ") but loses its text.
  check ((deleted_at is null and char_length(body) between 1 and 500)
         or (deleted_at is not null and body = ''))
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);
create index post_comments_parent_idx on public.post_comments (parent_id);
create index post_comments_author_idx on public.post_comments (author_id, created_at);

create or replace function private.post_comments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  parent public.post_comments;
begin
  if tg_op = 'INSERT' then
    if new.parent_id is not null then
      select * into parent from public.post_comments c where c.id = new.parent_id;
      -- One level of replies: a reply's parent is a top-level comment of the same post.
      if parent.id is null or parent.post_id <> new.post_id or parent.parent_id is not null then
        raise exception 'replies go one level deep' using errcode = '23514';
      end if;
    end if;
    if current_user in ('anon', 'authenticated') then
      if me is null or new.author_id <> me then
        raise exception 'invalid comment' using errcode = '42501';
      end if;
      if (select count(*) from public.post_comments c
          where c.author_id = me and c.created_at > now() - interval '1 day') >= 30 then
        raise exception 'daily comment limit reached' using errcode = '54000';
      end if;
      new.created_at := now();
      new.deleted_at := null;
    end if;
    return new;
  end if;
  -- UPDATE (column grant: deleted_at only) = soft delete by the author, one way.
  if current_user in ('anon', 'authenticated') then
    if me is null or old.author_id <> me or old.deleted_at is not null
       or new.deleted_at is null then
      raise exception 'only the author deletes a comment' using errcode = '42501';
    end if;
    new.deleted_at := now();
  end if;
  if new.deleted_at is not null then
    new.body := '';
  end if;
  return new;
end;
$$;
revoke execute on function private.post_comments_guard() from public;
create trigger post_comments_guard before insert or update on public.post_comments
  for each row execute function private.post_comments_guard();

alter table public.post_comments enable row level security;
revoke all on public.post_comments from anon, authenticated;
grant select on public.post_comments to anon, authenticated;
grant insert (post_id, author_id, parent_id, body) on public.post_comments to authenticated;
grant update (deleted_at) on public.post_comments to authenticated;
grant select, insert, update, delete on public.post_comments to service_role;

create policy "post_comments: visible with the post" on public.post_comments
  for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "post_comments: signed-in users comment" on public.post_comments
  for insert to authenticated
  with check (author_id = (select auth.uid())
              and exists (select 1 from public.posts p where p.id = post_id));
create policy "post_comments: author soft-deletes" on public.post_comments
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- Counters (definer: they update posts, which clients can't)
-- ---------------------------------------------------------------------------------------------
create or replace function private.post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  else
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;
revoke execute on function private.post_likes_count() from public, anon, authenticated;
create trigger post_likes_count after insert or delete on public.post_likes
  for each row execute function private.post_likes_count();

-- comments_count = live (not deleted) comments, replies included.
create or replace function private.post_comments_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      update public.posts set comments_count = greatest(comments_count - 1, 0)
      where id = new.post_id;
    end if;
  elsif old.deleted_at is null then
    update public.posts set comments_count = greatest(comments_count - 1, 0)
    where id = old.post_id;
  end if;
  return null;
end;
$$;
revoke execute on function private.post_comments_count() from public, anon, authenticated;
create trigger post_comments_count after insert or update of deleted_at or delete
  on public.post_comments
  for each row execute function private.post_comments_count();

-- ---------------------------------------------------------------------------------------------
-- 5. reports (post / comment / user). user_reports rows are copied; the app switches to this
--    table in the same deploy, and user_reports is dropped in a later migration.
-- ---------------------------------------------------------------------------------------------
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'user')),
  target_id text not null check (char_length(target_id) <= 40),
  reason text not null check (reason in ('spam', 'fake', 'harassment', 'impersonation', 'other')),
  note text check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_open_idx on public.reports (created_at) where status = 'open';

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant insert (reporter_id, target_type, target_id, reason, note) on public.reports to authenticated;
grant select, insert, update, delete on public.reports to service_role;
-- Write-only for clients: reporters can't read reports (not even their own).
create policy "reports: file as myself" on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid())
              and not (target_type = 'user' and target_id = (select auth.uid())::text));

insert into public.reports (reporter_id, target_type, target_id, reason, note, created_at)
select r.reporter_id, 'user', r.reported_id::text, r.reason, r.note, r.created_at
from public.user_reports r
on conflict do nothing;

-- ---------------------------------------------------------------------------------------------
-- 6. notifications: likes and comments on my posts (never for my own actions)
-- ---------------------------------------------------------------------------------------------
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('request_received', 'request_accepted', 'post_like', 'post_comment'));
alter table public.notifications
  add column post_id bigint references public.posts (id) on delete cascade,
  add column comment_id bigint references public.post_comments (id) on delete cascade;
create index notifications_post_idx on public.notifications (post_id);
create index notifications_comment_idx on public.notifications (comment_id);
-- Like → unlike → like again notifies once.
create unique index notifications_one_like_per_actor
  on public.notifications (user_id, actor_id, post_id) where kind = 'post_like';

create or replace function private.post_likes_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  select p.author_id into author from public.posts p where p.id = new.post_id;
  if author is not null and author <> new.user_id then
    insert into public.notifications (user_id, kind, actor_id, post_id)
    values (author, 'post_like', new.user_id, new.post_id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;
revoke execute on function private.post_likes_notify() from public, anon, authenticated;
create trigger post_likes_notify after insert on public.post_likes
  for each row execute function private.post_likes_notify();

-- A comment notifies the post author; a reply also notifies the parent comment's author.
create or replace function private.post_comments_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
  parent_author uuid;
begin
  select p.author_id into post_author from public.posts p where p.id = new.post_id;
  if post_author is not null and post_author <> new.author_id then
    insert into public.notifications (user_id, kind, actor_id, post_id, comment_id)
    values (post_author, 'post_comment', new.author_id, new.post_id, new.id);
  end if;
  if new.parent_id is not null then
    select c.author_id into parent_author from public.post_comments c where c.id = new.parent_id;
    if parent_author is not null and parent_author <> new.author_id
       and parent_author is distinct from post_author then
      insert into public.notifications (user_id, kind, actor_id, post_id, comment_id)
      values (parent_author, 'post_comment', new.author_id, new.post_id, new.id);
    end if;
  end if;
  return null;
end;
$$;
revoke execute on function private.post_comments_notify() from public, anon, authenticated;
create trigger post_comments_notify after insert on public.post_comments
  for each row execute function private.post_comments_notify();

-- ---------------------------------------------------------------------------------------------
-- 7. Activity heatmap: posts count as activity (1 per post, UTC days like the other sources,
--    auto milestones excluded)
-- ---------------------------------------------------------------------------------------------
drop materialized view private.user_activity_days;
create materialized view private.user_activity_days as
select x.user_id, x.day, sum(x.score)::integer as score
from (
  select m.user_id, d.day, d.score
  from public.startup_members m
  join (
    select b.startup_id, b.day, b.commits as score from public.build_activity b where b.commits > 0
    union all
    select r.startup_id, r.day, 1 from public.revenue_snapshots r where r.revenue_cents > 0
  ) d on d.startup_id = m.startup_id
  join public.startups s on s.id = m.startup_id and s.status = 'published' and not s.is_demo
  where m.status = 'confirmed'
  union all
  select p.author_id, (p.created_at at time zone 'UTC')::date, 1
  from public.posts p
  where not p.is_auto and p.hidden_at is null
) x
group by x.user_id, x.day;
create unique index user_activity_days_pk on private.user_activity_days (user_id, day);

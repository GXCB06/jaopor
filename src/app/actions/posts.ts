"use server";

import { getLinkPreview } from "@/lib/net/link-preview";
import {
  MAX_COMMENT_BODY,
  MAX_POST_BODY,
  isManualPostType,
  normalizeLink,
  postErrorKey,
} from "@/lib/posts";
import { drainStorageCleanup } from "@/lib/storage-cleanup";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Phase 10b post actions. Every write goes through the user's own Supabase client, so RLS, the
// column grants and the guard triggers of migration feed_posts decide what's allowed (member
// only, 5 posts / 30 comments a day, 15-minute edits, visible posts only). The service role is
// used only for what clients may not write: the link preview, and deleting queued image files.

export type PostResult =
  { ok: true; id: number } | { ok: false; error: string };
export type Result = { ok: true } | { ok: false; error: string };

const REASONS = ["spam", "fake", "harassment", "impersonation", "other"];

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** Fetch the Open Graph preview and store it, unless the link changed meanwhile. */
async function attachPreview(postId: number, link: string) {
  const preview = await getLinkPreview(link);
  if (!preview) return;
  await createAdminClient()
    .from("posts")
    .update({ link_preview: preview as unknown as Json })
    .eq("id", postId)
    .eq("link_url", link);
}

export async function createPost(input: {
  startupId: number;
  type: string;
  body: string;
  link?: string;
}): Promise<PostResult> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  const body = input.body.trim();
  if (!body || body.length > MAX_POST_BODY) return { ok: false, error: "body" };
  if (!isManualPostType(input.type)) return { ok: false, error: "invalid" };
  if (!Number.isSafeInteger(input.startupId))
    return { ok: false, error: "invalid" };
  const link = input.link?.trim() ? normalizeLink(input.link) : null;
  if (input.link?.trim() && !link) return { ok: false, error: "link" };

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      startup_id: input.startupId,
      type: input.type,
      body,
      link_url: link,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: postErrorKey(error?.code) };
  if (link) await attachPreview(data.id, link).catch(() => {});
  return { ok: true, id: data.id };
}

export async function editPost(
  id: number,
  input: { body: string; link?: string },
): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  const body = input.body.trim();
  if (!body || body.length > MAX_POST_BODY) return { ok: false, error: "body" };
  const link = input.link?.trim() ? normalizeLink(input.link) : null;
  if (input.link?.trim() && !link) return { ok: false, error: "link" };

  const { data: before } = await supabase
    .from("posts")
    .select("link_url")
    .eq("id", id)
    .maybeSingle();
  const { error, count } = await supabase
    .from("posts")
    .update({ body, link_url: link }, { count: "exact" })
    .eq("id", id);
  if (error) return { ok: false, error: postErrorKey(error.code) };
  if (!count) return { ok: false, error: "forbidden" };
  if (link && link !== before?.link_url)
    await attachPreview(id, link).catch(() => {});
  return { ok: true };
}

/** Deletes my post; its image files are removed from Storage right away. */
export async function deletePost(id: number): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  const { data: images } = await supabase
    .from("post_images")
    .select("path")
    .eq("post_id", id);
  const { error, count } = await supabase
    .from("posts")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("author_id", user.id);
  if (error) return { ok: false, error: postErrorKey(error.code) };
  if (!count) return { ok: false, error: "forbidden" };
  const paths = (images ?? []).map((i) => i.path);
  if (paths.length) await drainStorageCleanup({ paths }).catch(() => {});
  return { ok: true };
}

/** After the browser uploaded images for a new post: drop files whose row insert failed. */
export async function cleanupPostUpload(paths: string[]): Promise<void> {
  const { user } = await me();
  if (!user || !paths.length) return;
  const own = paths.filter((p) => /^[0-9]{1,18}\/[0-9a-f-]{36}\.(webp|jpg)$/.test(p));
  const admin = createAdminClient();
  // Only files of my own posts that have no image row.
  const ids = [...new Set(own.map((p) => Number(p.split("/")[0])))];
  const { data: posts } = await admin
    .from("posts")
    .select("id")
    .in("id", ids)
    .eq("author_id", user.id);
  const mine = new Set((posts ?? []).map((p) => String(p.id)));
  const { data: rows } = await admin
    .from("post_images")
    .select("path")
    .in("path", own);
  const used = new Set((rows ?? []).map((r) => r.path));
  const orphans = own.filter((p) => mine.has(p.split("/")[0]) && !used.has(p));
  if (orphans.length) await admin.storage.from("post-images").remove(orphans);
}

export async function setLike(postId: number, like: boolean): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  const { error } = like
    ? await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: user.id })
    : await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
  if (error && error.code !== "23505")
    return { ok: false, error: postErrorKey(error.code) };
  return { ok: true };
}

export async function addComment(input: {
  postId: number;
  body: string;
  parentId?: number | null;
}): Promise<PostResult> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  const body = input.body.trim();
  if (!body || body.length > MAX_COMMENT_BODY)
    return { ok: false, error: "body" };
  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: input.postId,
      author_id: user.id,
      parent_id: input.parentId ?? null,
      body,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: postErrorKey(error?.code) };
  return { ok: true, id: data.id };
}

export async function deleteComment(id: number): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  const { error, count } = await supabase
    .from("post_comments")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id);
  if (error) return { ok: false, error: postErrorKey(error.code) };
  if (!count) return { ok: false, error: "forbidden" };
  return { ok: true };
}

/** One report per person per target (post, comment, user or message); reporting twice is fine.
 * A message can only be reported by someone in its conversation (enforced by the reports policy). */
export async function reportTarget(input: {
  type: "post" | "comment" | "user" | "message";
  id: string;
  reason: string;
  note?: string;
}): Promise<Result> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  if (!["post", "comment", "user", "message"].includes(input.type))
    return { ok: false, error: "invalid" };
  if (!REASONS.includes(input.reason)) return { ok: false, error: "invalid" };
  const id = input.id.trim();
  const valid =
    input.type === "user"
      ? /^[0-9a-f-]{36}$/.test(id)
      : /^[0-9]{1,18}$/.test(id);
  if (!valid) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: input.type,
    target_id: id,
    reason: input.reason,
    note: input.note?.trim().slice(0, 500) || null,
  });
  if (error && error.code !== "23505")
    return { ok: false, error: postErrorKey(error.code) };
  return { ok: true };
}

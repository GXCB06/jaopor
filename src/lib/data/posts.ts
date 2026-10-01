import "server-only";
import { cache } from "react";
import type { LinkPreview } from "@/lib/og-parse";
import type { PostType } from "@/lib/posts";
import { logoUrl } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

// Phase 10 reads. The viewer's own client, so RLS decides visibility (hidden posts and posts on
// unpublished startups only for their author) and post_likes returns only my likes.
// Embeds name their foreign keys: post_likes / startup_members are join tables, so an unnamed
// posts→profiles or posts→startups embed would be ambiguous (PGRST201, see 2026-10-01 outage).

const POST_SELECT = `id, author_id, startup_id, type, body, link_url, link_preview, is_auto,
  likes_count, comments_count, created_at, edited_at, hidden_at, province,
  author:profiles!posts_author_id_fkey(handle, display_name, avatar_url),
  startup:startups!posts_startup_id_fkey(id, slug, name, logo_path, verified_provider,
    verification_status, is_demo),
  images:post_images(id, path, width, height, position)`;

export type PostView = {
  id: number;
  authorId: string;
  type: PostType;
  body: string;
  linkUrl: string | null;
  preview: LinkPreview | null;
  isAuto: boolean;
  likes: number;
  comments: number;
  createdAt: string;
  editedAt: string | null;
  hidden: boolean;
  province: string | null;
  author: { handle: string | null; name: string; avatarUrl: string | null };
  startup: {
    id: number;
    slug: string;
    name: string;
    /** Resolved on the server (lib/supabase/public is server-only); cards also render in the client feed list. */
    logoUrl: string | null;
    verifiedSource: string | null;
  };
  images: { id: number; path: string; width: number; height: number }[];
  liked: boolean;
};

type Row = {
  id: number;
  author_id: string;
  type: string;
  body: string;
  link_url: string | null;
  link_preview: unknown;
  is_auto: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  edited_at: string | null;
  hidden_at: string | null;
  province: string | null;
  author: {
    handle: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  startup: {
    id: number;
    slug: string;
    name: string;
    logo_path: string | null;
    verified_provider: string | null;
    verification_status: string;
    is_demo: boolean;
  } | null;
  images: {
    id: number;
    path: string;
    width: number;
    height: number;
    position: number;
  }[];
};

function toView(r: Row, liked: Set<number>): PostView | null {
  if (!r.startup) return null;
  return {
    id: r.id,
    authorId: r.author_id,
    type: r.type as PostType,
    body: r.body,
    linkUrl: r.link_url,
    preview: (r.link_preview as LinkPreview | null) ?? null,
    isAuto: r.is_auto,
    likes: r.likes_count,
    comments: r.comments_count,
    createdAt: r.created_at,
    editedAt: r.edited_at,
    hidden: r.hidden_at !== null,
    province: r.province,
    author: {
      handle: r.author?.handle ?? null,
      name: r.author?.display_name ?? r.author?.handle ?? "—",
      avatarUrl: r.author?.avatar_url ?? null,
    },
    startup: {
      id: r.startup.id,
      slug: r.startup.slug,
      name: r.startup.name,
      logoUrl: logoUrl(r.startup.logo_path),
      verifiedSource:
        r.startup.verification_status === "verified" && !r.startup.is_demo
          ? r.startup.verified_provider
          : null,
    },
    images: [...r.images].sort((a, b) => a.position - b.position),
    liked: liked.has(r.id),
  };
}

export const viewerId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims.sub as string | undefined) ?? null;
});

async function myLikes(ids: number[]): Promise<Set<number>> {
  if (!ids.length || !(await viewerId())) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("post_likes")
    .select("post_id")
    .in("post_id", ids);
  return new Set((data ?? []).map((l) => l.post_id));
}

export const getPost = cache(async (id: number): Promise<PostView | null> => {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getPost: ${error.message}`);
  if (!data) return null;
  return toView(data as unknown as Row, await myLikes([id]));
});

/** Newest first; `before` = cursor (created_at of the last post shown). */
export async function listPosts(opts: {
  authorId?: string;
  authorIds?: string[];
  notAuthor?: string;
  startupId?: number;
  type?: PostType;
  province?: string;
  category?: string;
  /** Only posts created at or after this time. */
  since?: string;
  limit?: number;
  before?: string;
}): Promise<PostView[]> {
  if (opts.authorIds && !opts.authorIds.length) return [];
  const supabase = await createClient();
  let q = supabase
    .from("posts")
    .select(POST_SELECT)
    .is("hidden_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(opts.limit ?? 20);
  if (opts.authorId) q = q.eq("author_id", opts.authorId);
  if (opts.authorIds) q = q.in("author_id", opts.authorIds);
  if (opts.notAuthor) q = q.neq("author_id", opts.notAuthor);
  if (opts.startupId) q = q.eq("startup_id", opts.startupId);
  if (opts.type) q = q.eq("type", opts.type);
  if (opts.province) q = q.eq("province", opts.province);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.since) q = q.gte("created_at", opts.since);
  if (opts.before) q = q.lt("created_at", opts.before);
  const { data, error } = await q;
  if (error) throw new Error(`listPosts: ${error.message}`);
  const rows = (data ?? []) as unknown as Row[];
  const liked = await myLikes(rows.map((r) => r.id));
  return rows
    .map((r) => toView(r, liked))
    .filter((p): p is PostView => p !== null);
}

export type CommentView = {
  id: number;
  parentId: number | null;
  body: string;
  createdAt: string;
  deleted: boolean;
  authorId: string | null;
  author: {
    handle: string | null;
    name: string;
    avatarUrl: string | null;
  } | null;
};

export async function getComments(postId: number): Promise<CommentView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_comments")
    .select(
      `id, parent_id, body, created_at, deleted_at, author_id,
       author:profiles!post_comments_author_id_fkey(handle, display_name, avatar_url)`,
    )
    .eq("post_id", postId)
    .order("created_at");
  if (error) throw new Error(`getComments: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id,
    parentId: c.parent_id,
    body: c.body,
    createdAt: c.created_at,
    deleted: c.deleted_at !== null,
    authorId: c.author_id,
    author:
      c.deleted_at === null && c.author
        ? {
            handle: c.author.handle,
            name: c.author.display_name ?? c.author.handle ?? "—",
            avatarUrl: c.author.avatar_url,
          }
        : null,
  }));
}

/** First live top-level comment of each feedback post (the card shows it under the post). */
export async function firstComments(
  postIds: number[],
): Promise<Map<number, CommentView>> {
  if (!postIds.length) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("post_comments")
    .select(
      `id, post_id, parent_id, body, created_at, deleted_at, author_id,
       author:profiles!post_comments_author_id_fkey(handle, display_name, avatar_url)`,
    )
    .in("post_id", postIds)
    .is("parent_id", null)
    .is("deleted_at", null)
    .order("created_at");
  const out = new Map<number, CommentView>();
  for (const c of data ?? []) {
    if (out.has(c.post_id)) continue;
    out.set(c.post_id, {
      id: c.id,
      parentId: null,
      body: c.body,
      createdAt: c.created_at,
      deleted: false,
      authorId: c.author_id,
      author: c.author
        ? {
            handle: c.author.handle,
            name: c.author.display_name ?? c.author.handle ?? "—",
            avatarUrl: c.author.avatar_url,
          }
        : null,
    });
  }
  return out;
}

/** My confirmed startups, for the composer's picker. */
export async function myPostableStartups(): Promise<
  { id: number; name: string }[]
> {
  const viewer = await viewerId();
  if (!viewer) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("startup_members")
    .select("startup:startups(id, name)")
    .eq("user_id", viewer)
    .eq("status", "confirmed");
  return (data ?? [])
    .map((m) => m.startup)
    .filter((s): s is { id: number; name: string } => Boolean(s));
}

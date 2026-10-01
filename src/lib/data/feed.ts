import "server-only";
import { sortBuilders, type DirectoryBuilder } from "@/lib/builders";
import { listBuilders } from "@/lib/data/builder";
import {
  firstComments,
  listPosts,
  viewerId,
  type CommentView,
  type PostView,
} from "@/lib/data/posts";
import {
  FEED_PAGE_SIZE,
  POPULAR_DAYS,
  WAITING_DAYS,
  rankPopular,
  type FeedFilters,
} from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

// Phase 10c /feed reads (the viewer's own client, so RLS decides visibility and likes are mine).
// latest / following page by time (cursor = created_at of the last post); popular and waiting
// are ranked or filtered in TypeScript over a bounded window and page by offset ("o:<n>").

export type FeedPage = {
  posts: PostView[];
  /** First comment of each feedback post on the page (shown under the card). */
  firstComments: Record<number, CommentView>;
  next: string | null;
};

const daysAgo = (n: number, now: number) =>
  new Date(now - n * 86_400_000).toISOString();
const WINDOW = 300; // posts considered for popular / waiting

async function followingIds(viewer: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewer);
  return (data ?? []).map((f) => f.following_id);
}

/** Feedback posts (last 14 days, not mine) I haven't commented on yet, oldest-answered first. */
async function waitingPosts(
  viewer: string | null,
  f: FeedFilters,
  now: number,
) {
  const candidates = await listPosts({
    type: "feedback",
    province: f.province,
    category: f.category,
    since: daysAgo(WAITING_DAYS, now),
    notAuthor: viewer ?? undefined,
    limit: WINDOW,
  });
  let mine = new Set<number>();
  if (viewer && candidates.length) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("post_comments")
      .select("post_id")
      .eq("author_id", viewer)
      .in(
        "post_id",
        candidates.map((p) => p.id),
      );
    mine = new Set((data ?? []).map((c) => c.post_id));
  }
  return candidates
    .filter((p) => (viewer ? !mine.has(p.id) : p.comments === 0))
    .sort(
      (a, b) =>
        a.comments - b.comments || b.createdAt.localeCompare(a.createdAt),
    );
}

export async function feedPage(
  f: FeedFilters,
  cursor: string | null,
  now: number,
): Promise<FeedPage> {
  const viewer = await viewerId();
  const offset = cursor?.startsWith("o:")
    ? Math.max(0, Number(cursor.slice(2)) || 0)
    : 0;
  const before = cursor && !cursor.startsWith("o:") ? cursor : undefined;
  let posts: PostView[];
  let next: string | null = null;

  if (f.waiting || f.view === "popular") {
    const all = f.waiting
      ? await waitingPosts(viewer, f, now)
      : rankPopular(
          await listPosts({
            type: f.type,
            province: f.province,
            category: f.category,
            since: daysAgo(POPULAR_DAYS, now),
            limit: WINDOW,
          }),
          now,
        );
    posts = all.slice(offset, offset + FEED_PAGE_SIZE);
    if (all.length > offset + FEED_PAGE_SIZE)
      next = `o:${offset + FEED_PAGE_SIZE}`;
  } else {
    const authorIds =
      f.view === "following"
        ? viewer
          ? await followingIds(viewer)
          : []
        : undefined;
    const page = await listPosts({
      authorIds,
      type: f.type,
      province: f.province,
      category: f.category,
      before,
      limit: FEED_PAGE_SIZE + 1,
    });
    posts = page.slice(0, FEED_PAGE_SIZE);
    if (page.length > FEED_PAGE_SIZE) next = posts[posts.length - 1].createdAt;
  }

  const comments = await firstComments(
    posts.filter((p) => p.type === "feedback").map((p) => p.id),
  );
  return { posts, firstComments: Object.fromEntries(comments), next };
}

export type FeedRail = {
  signedIn: boolean;
  follow: DirectoryBuilder[];
  active: {
    slug: string;
    name: string;
    logoPath: string | null;
    count: number;
  }[];
  waiting: number;
};

export async function feedRail(now: number): Promise<FeedRail> {
  const viewer = await viewerId();
  const supabase = await createClient();
  const [builders, followed, recent, waiting] = await Promise.all([
    // Who-to-follow is a side panel: a failure there must not take the feed down.
    listBuilders().catch(() => [] as DirectoryBuilder[]),
    viewer ? followingIds(viewer) : Promise.resolve([]),
    supabase
      .from("posts")
      .select("startup:startups!posts_startup_id_fkey(slug, name, logo_path)")
      .is("hidden_at", null)
      .eq("is_auto", false)
      .gte("created_at", daysAgo(7, now))
      .limit(500),
    waitingPosts(viewer, { view: "latest", waiting: true }, now),
  ]);

  const skip = new Set([...followed, viewer ?? ""]);
  const follow = sortBuilders(builders.filter((b) => !skip.has(b.id))).slice(
    0,
    3,
  );

  const counts = new Map<string, FeedRail["active"][number]>();
  for (const r of recent.data ?? []) {
    const s = r.startup;
    if (!s) continue;
    const cur = counts.get(s.slug);
    if (cur) cur.count++;
    else
      counts.set(s.slug, {
        slug: s.slug,
        name: s.name,
        logoPath: s.logo_path,
        count: 1,
      });
  }
  const active = [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return { signedIn: viewer !== null, follow, active, waiting: waiting.length };
}

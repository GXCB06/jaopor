"use client";

import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import type { FeedPage } from "@/lib/data/feed";
import { PostCard } from "./PostCard";

/** Design.md §5 Feed center column: the PostCards, then "โหลดเพิ่ม" appending the next page. */
export function FeedList({
  initial,
  query,
  viewerId,
  now,
  variant = "feed",
}: {
  initial: FeedPage;
  /** The page's filters as URL parameters (sent with every "โหลดเพิ่ม"). */
  query: Record<string, string>;
  viewerId: string | null;
  now: number;
  variant?: "feed" | "profile";
}) {
  const t = useTranslations("Feed");
  const [pages, setPages] = useState<FeedPage[]>([initial]);
  const [busy, setBusy] = useState(false);
  const next = pages[pages.length - 1].next;
  const posts = pages.flatMap((p) => p.posts);
  const comments = Object.assign(
    {},
    ...pages.map((p) => p.firstComments),
  ) as FeedPage["firstComments"];

  async function more() {
    if (!next) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/feed?${new URLSearchParams({ ...query, cursor: next })}`,
      );
      if (!res.ok) throw new Error(String(res.status));
      const page = (await res.json()) as FeedPage;
      // A post can move between pages while reading (popular ranking): show it once.
      const seen = new Set(posts.map((p) => p.id));
      setPages((cur) => [
        ...cur,
        { ...page, posts: page.posts.filter((p) => !seen.has(p.id)) },
      ]);
    } catch {
      toast.error(t("loadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          viewerId={viewerId}
          variant={variant}
          firstComment={comments[p.id]}
          now={now}
        />
      ))}
      {next && (
        <button
          type="button"
          onClick={more}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-caption text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
        >
          {busy && (
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          )}
          {t("loadMore")}
        </button>
      )}
    </div>
  );
}

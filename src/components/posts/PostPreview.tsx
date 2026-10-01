import { HeartIcon, MessageCircleIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PostView } from "@/lib/data/posts";
import { parseMilestoneKey } from "@/lib/milestones";
import { timeAgo } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { PostTypeChip } from "./bits";

/**
 * Design.md §5 PostPreview: a compact, non-interactive post (startup page "อัปเดตล่าสุด", which is
 * cached for everyone): type, time, three lines of text, counts; the whole card opens the post.
 */
export function PostPreview({ post, now }: { post: PostView; now: number }) {
  const t = useTranslations("Posts");
  const locale = useLocale();
  const ms =
    post.type === "milestone" ? parseMilestoneKey(post.milestoneKey) : null;
  const body = ms
    ? t(`milestone.${ms.family}`, {
        name: post.startup.name,
        amount: ms.level.toLocaleString("en"),
      })
    : post.body;
  return (
    <Link
      href={`/post/${post.id}`}
      className={cn(
        "flex h-full flex-col gap-2.5 rounded-xl border p-4 transition-colors hover:border-foreground/20",
        ms ? "border-warning/40 bg-warning/5" : "bg-card",
      )}
    >
      <span className="flex items-center justify-between gap-2 text-2xs text-faint">
        <span className="truncate">
          {post.author.name} · {timeAgo(post.createdAt, locale, now)}
        </span>
        <PostTypeChip type={post.type} />
      </span>
      <span
        className={cn(
          "line-clamp-3 text-caption leading-relaxed",
          ms && "font-extrabold",
        )}
      >
        {body}
      </span>
      <span className="mt-auto flex items-center gap-3 text-2xs text-muted-foreground tabular-nums">
        <span className="inline-flex items-center gap-1">
          <HeartIcon className="size-3.5" aria-hidden="true" />
          {post.likes}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircleIcon className="size-3.5" aria-hidden="true" />
          {post.comments}
        </span>
        {post.images.length > 0 && (
          <span>{t("imageCount", { n: post.images.length })}</span>
        )}
      </span>
    </Link>
  );
}

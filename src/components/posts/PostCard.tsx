import { BadgeCheckIcon, MessageCircleIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { StartupLogo } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import { getProvince } from "@/lib/config/provinces";
import type { CommentView, PostView } from "@/lib/data/posts";
import { timeAgo } from "@/lib/posts";
import { publicEnv } from "@/lib/public-env";
import { shareLinks } from "@/lib/share";
import { SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { cn } from "@/lib/utils";
import { Avatar, LinkCard, PostImages, PostTypeChip } from "./bits";
import { LikeButton } from "./LikeButton";
import { PostMenu } from "./PostMenu";

/**
 * Design.md §5 PostCard. `feed` shows the person and the startup, `profile` shows the startup
 * (the person is the page), `page` is the single-post page (no link to itself).
 */
export function PostCard({
  post,
  viewerId,
  variant = "feed",
  firstComment,
  now,
}: {
  post: PostView;
  viewerId: string | null;
  variant?: "feed" | "profile" | "page";
  firstComment?: CommentView;
  /** Server render time, so "5 นาทีที่แล้ว" matches between server and client. */
  now: number;
}) {
  const t = useTranslations("Posts");
  const locale = useLocale();
  const isAuthor = viewerId === post.authorId;
  const milestone = post.type === "milestone";
  const province = getProvince(post.province);
  const path = `/post/${post.id}`;
  const url = `${publicEnv.siteUrl}/${locale}${path}`;
  const share = shareLinks(url, post.body.slice(0, 120));
  const loginHref = `/login?next=${encodeURIComponent(`/${locale}${path}`)}`;
  const source = isSource(post.startup.verifiedSource)
    ? SOURCE_NAME[post.startup.verifiedSource]
    : null;
  const when = (
    <Link href={path} className="hover:underline">
      <time dateTime={post.createdAt}>
        {timeAgo(post.createdAt, locale, now)}
      </time>
    </Link>
  );

  return (
    <article
      className={cn(
        "space-y-3 rounded-xl border p-5",
        milestone ? "border-warning/40 bg-warning/5" : "bg-card",
      )}
    >
      <header className="flex items-center gap-2.5 text-caption text-faint">
        {variant === "profile" ? (
          <>
            <StartupLogo
              name={post.startup.name}
              src={post.startup.logoUrl}
              size={22}
            />
            <span className="min-w-0 flex-1 truncate">
              <Link
                href={`/startup/${post.startup.slug}`}
                className="font-semibold text-foreground hover:underline"
              >
                {post.startup.name}
              </Link>{" "}
              · {when}
            </span>
          </>
        ) : (
          <>
            {milestone ? (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-warning/40 bg-warning/10 text-sm font-extrabold text-warning">
                ฿
              </span>
            ) : post.author.handle ? (
              <Link
                href={`/u/${post.author.handle}`}
                aria-label={post.author.name}
              >
                <Avatar name={post.author.name} src={post.author.avatarUrl} />
              </Link>
            ) : (
              <Avatar name={post.author.name} src={post.author.avatarUrl} />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-muted-foreground">
                {t.rich("byline", {
                  name: () =>
                    post.author.handle ? (
                      <Link
                        href={`/u/${post.author.handle}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {post.author.name}
                      </Link>
                    ) : (
                      <b className="text-foreground">{post.author.name}</b>
                    ),
                  startup: () => (
                    <Link
                      href={`/startup/${post.startup.slug}`}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {post.startup.name}
                    </Link>
                  ),
                })}
              </span>
              <span className="block truncate">
                {when}
                {milestone
                  ? ` · ${t("auto")}`
                  : province
                    ? ` · ${localizedName(province, locale)}`
                    : ""}
                {post.editedAt && !milestone ? ` · ${t("edited")}` : ""}
              </span>
            </span>
          </>
        )}
        <PostTypeChip type={post.type} />
      </header>

      {post.hidden && (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-caption text-warning">
          {t("hiddenNote")}
        </p>
      )}

      <p
        className={cn(
          "break-words whitespace-pre-line",
          milestone
            ? "text-base leading-snug font-extrabold"
            : "text-sm leading-relaxed",
        )}
      >
        {post.body}
      </p>

      {milestone && source && (
        <p className="flex items-center gap-1.5 text-caption text-positive">
          <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
          {t("verifiedVia", { source })}
        </p>
      )}

      {post.linkUrl && <LinkCard url={post.linkUrl} preview={post.preview} />}
      <PostImages images={post.images} />

      {firstComment?.author && (
        <div className="flex gap-2.5 rounded-lg bg-secondary p-3">
          <Avatar
            name={firstComment.author.name}
            src={firstComment.author.avatarUrl}
            size={28}
          />
          <p className="min-w-0 text-caption leading-relaxed">
            <b className="block">{firstComment.author.name}</b>
            <span className="line-clamp-3 text-muted-foreground">
              {firstComment.body}
            </span>
          </p>
        </div>
      )}

      {post.type === "feedback" && variant !== "page" && (
        // Phones: the feedback button gets its own row so the footer stays on one line.
        <Link
          href={`${path}#comment-box`}
          className="flex h-9 items-center justify-center rounded-md border border-info/50 text-caption font-semibold text-info hover:bg-info/10 sm:hidden"
        >
          {t("giveFeedback")}
        </Link>
      )}

      <footer className="flex items-center gap-1 text-caption text-muted-foreground">
        <LikeButton
          postId={post.id}
          initialLiked={post.liked}
          initialCount={post.likes}
          signedIn={viewerId !== null}
          loginHref={loginHref}
          disabled={post.hidden}
        />
        <Link
          href={`${path}#comments`}
          aria-label={t("commentCount", { n: post.comments })}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 tabular-nums hover:bg-accent hover:text-foreground"
        >
          <MessageCircleIcon className="size-4" aria-hidden="true" />
          {post.comments}
        </Link>
        <span className="flex-1" />
        {post.type === "feedback" && variant !== "page" && (
          <Link
            href={`${path}#comment-box`}
            className="hidden h-8 items-center rounded-md border border-info/50 px-3 font-semibold text-info hover:bg-info/10 sm:inline-flex"
          >
            {t("giveFeedback")}
          </Link>
        )}
        {!post.hidden && (
          <>
            <a
              href={share.line}
              target="_blank"
              rel="noopener"
              aria-label={t("shareLine")}
              className="inline-flex h-8 items-center rounded-md border px-2.5 whitespace-nowrap hover:bg-accent hover:text-foreground"
            >
              <span className="sm:hidden">LINE</span>
              <span className="hidden sm:inline">{t("shareLine")}</span>
            </a>
            <a
              href={share.x}
              target="_blank"
              rel="noopener"
              aria-label={t("shareX")}
              className="inline-flex size-8 items-center justify-center rounded-md border hover:bg-accent hover:text-foreground"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-3 fill-current"
                aria-hidden="true"
              >
                <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z" />
              </svg>
            </a>
          </>
        )}
        <PostMenu
          post={{
            id: post.id,
            body: post.body,
            linkUrl: post.linkUrl,
            createdAt: post.createdAt,
            isAuto: post.isAuto,
          }}
          isAuthor={isAuthor}
          signedIn={viewerId !== null}
          afterDeleteHref={variant === "page" ? "/dashboard" : undefined}
        />
      </footer>
    </article>
  );
}

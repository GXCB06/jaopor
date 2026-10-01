import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CommentThread } from "@/components/posts/CommentThread";
import { PostCard } from "@/components/posts/PostCard";
import { Link } from "@/i18n/navigation";
import { getComments, getPost, viewerId } from "@/lib/data/posts";
import { renderNow } from "@/lib/posts";

type Props = PageProps<"/[locale]/post/[id]">;

const postId = (raw: string) => (/^[0-9]{1,18}$/.test(raw) ? Number(raw) : 0);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const post = await getPost(postId(id));
  if (!post || post.hidden) return { robots: { index: false } };
  const t = await getTranslations({ locale, namespace: "Posts" });
  const title = t("metaTitle", {
    name: post.author.name,
    startup: post.startup.name,
  });
  return {
    title,
    description: post.body.slice(0, 160),
    alternates: { canonical: `/${locale}/post/${post.id}` },
    openGraph: { title, description: post.body.slice(0, 200), type: "article" },
  };
}

// Design.md §5 Post page: breadcrumb, the PostCard, then the comment thread.
export default async function PostPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const post = await getPost(postId(id));
  if (!post) notFound();
  const [t, viewer, comments] = await Promise.all([
    getTranslations("Posts"),
    viewerId(),
    getComments(post.id),
  ]);
  const now = renderNow();
  const loginHref = `/login?next=${encodeURIComponent(`/${locale}/post/${post.id}`)}`;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-6 pb-16">
      <nav
        aria-label={t("breadcrumb")}
        className="flex gap-2 text-2xs text-faint"
      >
        <Link href="/" className="hover:text-foreground">
          JaoPor
        </Link>
        <span aria-hidden="true">›</span>
        <Link
          href={`/startup/${post.startup.slug}`}
          className="hover:text-foreground"
        >
          {post.startup.name}
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-foreground">{t("breadcrumbPost")}</span>
      </nav>
      <PostCard post={post} viewerId={viewer} variant="page" now={now} />
      <CommentThread
        postId={post.id}
        comments={comments}
        viewerId={viewer}
        loginHref={loginHref}
        canComment={!post.hidden}
        now={now}
      />
    </main>
  );
}

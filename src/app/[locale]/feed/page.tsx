import { SlidersHorizontalIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FollowButton } from "@/components/builder/FollowButton";
import { Avatar } from "@/components/posts/bits";
import { Composer } from "@/components/posts/Composer";
import { FeedList } from "@/components/posts/FeedList";
import { StartupLogo } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { CATEGORY_LIST } from "@/lib/config/categories";
import { localizedName } from "@/lib/config/localized";
import {
  PROVINCE_LIST,
  REGION_LIST,
  getProvince,
} from "@/lib/config/provinces";
import { feedPage, feedRail } from "@/lib/data/feed";
import { myPostableStartups, viewerId } from "@/lib/data/posts";
import { FEED_VIEWS, feedQuery, parseFeedFilters } from "@/lib/feed";
import { POST_TYPES, renderNow } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import { logoUrl } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/feed">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Feed" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: { canonical: `/${locale}/feed` },
  };
}

const TYPE_TEXT: Record<string, string> = {
  feature: "text-brand-text",
  launch: "text-positive",
  milestone: "text-warning",
  lesson: "text-muted-foreground",
  feedback: "text-info",
};
const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-caption";

// Design.md §5 Feed: filters · composer + posts + โหลดเพิ่ม · right rail.
export default async function FeedPage({
  params,
  searchParams,
}: PageProps<"/[locale]/feed">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const f = parseFeedFilters(await searchParams);
  const now = renderNow();
  const viewer = await viewerId();
  const supabase = await createClient();
  const [t, tp, page, rail, startups, me] = await Promise.all([
    getTranslations("Feed"),
    getTranslations("Posts"),
    feedPage(f, null, now),
    feedRail(now),
    myPostableStartups(),
    viewer
      ? supabase
          .from("profiles")
          .select("handle, display_name, avatar_url")
          .eq("id", viewer)
          .maybeSingle()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);
  const href = (patch: Parameters<typeof feedQuery>[1]) => ({
    pathname: "/feed" as const,
    query: feedQuery(f, patch),
  });
  const activeFilters = [f.type, f.province, f.category].filter(Boolean).length;

  const empty =
    f.view === "following" && !viewer ? (
      <>
        {t("emptyFollowingSignedOut")}{" "}
        <Link
          href={{
            pathname: "/login",
            query: { next: `/${locale}/feed?view=following` },
          }}
          className="text-brand-text hover:underline"
        >
          {tp("signIn")}
        </Link>
      </>
    ) : f.view === "following" ? (
      <>
        {t("emptyFollowing")}{" "}
        <Link href="/builders" className="text-brand-text hover:underline">
          {t("findBuilders")}
        </Link>
      </>
    ) : f.waiting ? (
      t("emptyWaiting")
    ) : (
      t("empty")
    );

  const filters = (
    <div className="hidden space-y-6 peer-checked:block lg:block">
      <div className="space-y-2.5">
        <p className="text-2xs tracking-wider text-faint uppercase">
          {t("type")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={href({ type: undefined, waiting: undefined })}
            aria-current={!f.type ? "true" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-caption",
              !f.type
                ? "border-foreground bg-foreground font-bold text-background"
                : "hover:bg-accent",
            )}
          >
            {t("allTypes")}
          </Link>
          {POST_TYPES.map((x) => (
            <Link
              key={x}
              href={href({ type: x, waiting: undefined })}
              aria-current={f.type === x ? "true" : undefined}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-caption",
                f.type === x
                  ? "border-foreground bg-foreground font-bold text-background"
                  : cn(TYPE_TEXT[x], "hover:bg-accent"),
              )}
            >
              {tp(`types.${x}`)}
            </Link>
          ))}
        </div>
      </div>
      <form action={`/${locale}/feed`} method="get" className="space-y-4">
        {Object.entries(
          feedQuery(f, { province: undefined, category: undefined }),
        ).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="block space-y-2">
          <span className="block text-2xs tracking-wider text-faint uppercase">
            {t("province")}
          </span>
          <select
            name="province"
            defaultValue={f.province ?? ""}
            className={selectCls}
          >
            <option value="">{t("allProvinces")}</option>
            {REGION_LIST.map((r) => (
              <optgroup key={r.slug} label={localizedName(r, locale)}>
                {PROVINCE_LIST.filter((p) => p.region === r.slug).map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {localizedName(p, locale)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="block text-2xs tracking-wider text-faint uppercase">
            {t("category")}
          </span>
          <select
            name="category"
            defaultValue={f.category ?? ""}
            className={selectCls}
          >
            <option value="">{t("allCategories")}</option>
            {CATEGORY_LIST.map((c) => (
              <option key={c.slug} value={c.slug}>
                {localizedName(c, locale)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("apply")}
        </button>
      </form>
    </div>
  );

  return (
    <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 pt-8 pb-16 lg:grid-cols-[12.5rem_minmax(0,1fr)] xl:grid-cols-[12.5rem_minmax(0,40rem)_minmax(0,1fr)]">
      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold">{t("title")}</h1>
          <p className="text-caption text-muted-foreground">{t("subline")}</p>
        </div>
        <nav
          aria-label={t("views")}
          className="-mx-4 flex gap-1 overflow-x-auto px-4 text-sm lg:mx-0 lg:flex-col lg:gap-0.5 lg:px-0"
        >
          {FEED_VIEWS.map((v) => {
            const active = f.view === v && !f.waiting;
            return (
              <Link
                key={v}
                href={href({
                  view: v === "latest" ? undefined : v,
                  waiting: undefined,
                })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 shrink-0 items-center rounded-lg px-3 whitespace-nowrap",
                  active
                    ? "bg-secondary font-bold text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {t(`view.${v}`)}
              </Link>
            );
          })}
        </nav>
        <input
          type="checkbox"
          id="feed-filters-toggle"
          defaultChecked={activeFilters > 0}
          className="peer sr-only"
        />
        <label
          htmlFor="feed-filters-toggle"
          className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground peer-focus-visible:text-foreground lg:hidden"
        >
          <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
          {t("filters")}
          {activeFilters > 0 && (
            <span className="rounded-full bg-secondary px-1.5 text-2xs tabular-nums">
              {activeFilters}
            </span>
          )}
        </label>
        {filters}
      </aside>

      <section aria-label={t("title")} className="min-w-0 space-y-4">
        <Composer
          me={
            me
              ? {
                  name: me.display_name ?? me.handle ?? "",
                  avatarUrl: me.avatar_url,
                }
              : null
          }
          startups={startups}
          loginHref={`/login?next=/${locale}/feed`}
        />
        {f.waiting && (
          <p className="rounded-lg border border-info/40 bg-info/10 px-3 py-2 text-caption text-info">
            {t("waitingNote")}{" "}
            <Link
              href={href({ waiting: undefined })}
              className="font-semibold underline"
            >
              {t("clear")}
            </Link>
          </p>
        )}
        {page.posts.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-caption text-muted-foreground">
            {empty}
          </p>
        ) : (
          <FeedList
            initial={page}
            query={feedQuery(f)}
            viewerId={viewer}
            now={now}
          />
        )}
      </section>

      {/* lg: under the posts in the second column; xl: its own right column (Figma is 1440 wide). */}
      <aside className="min-w-0 space-y-5 lg:col-start-2 xl:col-start-auto">
        {rail.follow.length > 0 && (
          <section className="space-y-4 rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-extrabold">{t("whoToFollow")}</h2>
            <ul className="space-y-3">
              {rail.follow.map((b) => {
                const province = b.province
                  ? getProvince(b.province)
                  : undefined;
                return (
                  <li key={b.id} className="flex items-center gap-3">
                    <Link href={`/u/${b.handle}`} aria-label={b.name}>
                      <Avatar name={b.name} src={b.avatarUrl} />
                    </Link>
                    <span className="min-w-0 flex-1">
                      <Link
                        href={`/u/${b.handle}`}
                        className="block truncate text-caption font-bold hover:underline"
                      >
                        {b.name}
                      </Link>
                      <span className="block truncate text-2xs text-faint">
                        {[
                          b.headline,
                          province && localizedName(province, locale),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {/* The rail is ~240px wide: a one-line dot + label instead of the pill. */}
                      {b.status === "looking_cofounder" && (
                        <span className="mt-0.5 flex items-center gap-1 truncate text-2xs font-semibold text-positive">
                          <span
                            aria-hidden="true"
                            className="size-1.5 shrink-0 rounded-full bg-positive"
                          />
                          <span className="truncate">
                            {t("lookingCofounder")}
                          </span>
                        </span>
                      )}
                    </span>
                    {b.id !== viewer && (
                      <FollowButton
                        targetId={b.id}
                        handle={b.handle}
                        signedIn={rail.signedIn}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            <Link
              href="/builders"
              className="block text-2xs text-brand-text hover:underline"
            >
              {t("seeAllBuilders")} →
            </Link>
          </section>
        )}

        {rail.active.length > 0 && (
          <section className="space-y-3.5 rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-extrabold">{t("mostActive")}</h2>
            <ul className="space-y-3">
              {rail.active.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/startup/${s.slug}`}
                    className="flex items-center gap-3 text-caption hover:underline"
                  >
                    <StartupLogo
                      name={s.name}
                      src={logoUrl(s.logoPath)}
                      size={28}
                    />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="text-faint tabular-nums">
                      {t("postCount", { n: s.count })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {rail.waiting > 0 && (
          <section className="space-y-2.5 rounded-2xl border border-info/40 bg-info/10 p-5">
            <h2 className="text-sm font-extrabold">{t("waitingTitle")}</h2>
            <p className="text-caption leading-relaxed text-info">
              {rail.signedIn
                ? t("waitingBody", { n: rail.waiting })
                : t("waitingBodySignedOut", { n: rail.waiting })}
            </p>
            <Link
              href={{ pathname: "/feed", query: { waiting: "1" } }}
              className="flex h-10 items-center justify-center rounded-lg bg-primary text-caption font-bold text-primary-foreground hover:opacity-90"
            >
              {t("waitingCta")}
            </Link>
          </section>
        )}
      </aside>
    </main>
  );
}

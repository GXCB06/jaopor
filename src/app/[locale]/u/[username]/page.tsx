import {
  BriefcaseIcon,
  FlameIcon,
  GlobeIcon,
  LinkIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PencilIcon,
  PlusIcon,
  RocketIcon,
  ShieldCheckIcon,
  StarIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileActions } from "@/components/builder/ProfileActions";
import { ProfileViewBeacon } from "@/components/builder/ProfileViewBeacon";
import { StatusPill } from "@/components/builder/StatusPill";
import { ReportDialog } from "@/components/builder/ReportDialog";
import { ProfileChartTabs } from "@/components/builder/ProfileChartTabs";
import { toolbarButton } from "@/components/builder/toolbar";
import { Card } from "@/components/core/Card";
import { PostCard } from "@/components/posts/PostCard";
import { GrowthValue, Money, StartupLogo } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { PersonPhoto } from "@/components/PersonPhoto";
import {
  badges,
  currentRole,
  heatmapGrid,
  monthStarts,
  monthsBuilding,
  streak,
  type Badge,
} from "@/lib/builder";
import { categoryName } from "@/lib/config/display";
import { localizedName } from "@/lib/config/localized";
import { getProvince, getRegion } from "@/lib/config/provinces";
import { getSkill } from "@/lib/config/skills";
import { aiToolLabel, isAiTool } from "@/lib/config/stack";
import {
  getBuilderRevenue,
  getBuilderCounts,
  getPublicProfile,
  getBuilderPage,
  type BuilderWork,
} from "@/lib/data/builder";
import { listPosts } from "@/lib/data/posts";
import { getThbPerUsd } from "@/lib/data/fx";
import { getProvinceLeaderboard } from "@/lib/data/startups";
import { growthPct } from "@/lib/format";
import { DEFAULT_METRIC, provinceRank } from "@/lib/olympics";
import { renderNow } from "@/lib/posts";
import { SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { logoUrl } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";

type Props = PageProps<"/[locale]/u/[username]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params;
  const p = await getPublicProfile(username.toLowerCase());
  if (!p) return {};
  const name = p.display_name ?? p.handle;
  return {
    title: `${name} (@${p.handle})`,
    description: p.headline ?? p.bio ?? undefined,
    alternates: { canonical: `/${locale}/u/${p.handle}` },
  };
}

const STATUS_DOT: Record<string, string> = {
  looking_cofounder: "bg-positive",
  open_to_work: "bg-positive",
  networking: "bg-brand",
  busy: "bg-faint",
};

const isVerified = (s: BuilderWork) =>
  s.verification_status === "verified" && !s.is_demo;

// Design.md §6 Builder profile (/u/[username], also /@username; Phase 9b, docs/design/profile.png):
// sticky sidebar (who, actions, info, badges, skills, tools) + main column (looking-for card,
// proof strip, pinned works, activity heatmap, experience | recent activity). Visitors never see
// an empty section; the owner sees dashed "+ เพิ่ม…" prompts.
export default async function BuilderProfilePage({
  params,
  searchParams,
}: Props) {
  const { locale, username } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const handle = username.toLowerCase();
  const profile = await getPublicProfile(handle);
  if (!profile) notFound();

  const yearParam = Number(Array.isArray(sp.year) ? sp.year[0] : sp.year);
  const thisYear = new Date().getUTCFullYear();
  const year = yearParam === thisYear - 1 ? yearParam : null;
  const [t, page, thbPerUsd, olympics, counts, posts] = await Promise.all([
    getTranslations("Builder"),
    getBuilderPage(profile, year),
    getThbPerUsd(),
    getProvinceLeaderboard(DEFAULT_METRIC),
    getBuilderCounts(profile.id),
    listPosts({ authorId: profile.id, limit: 4 }),
  ]);
  const { isOwner, works } = page;
  const revenue = await getBuilderRevenue(works);
  const now = renderNow();
  const name = profile.display_name ?? profile.handle;
  const province = getProvince(profile.province);
  const rank = province ? provinceRank(olympics, province.slug) : null;
  const role = currentRole(page.positions);
  const socials = profile.social_links ?? {};
  const lf = profile.looking_for ?? {};

  // Proof strip (verified numbers only; zero / unverified stats are hidden).
  const verified = works.filter(isVerified);
  const mrrCents = verified.reduce((s, w) => s + (w.mrr_cents ?? 0), 0);
  const revenueCents = verified.reduce(
    (s, w) => s + (w.revenue_all_time_cents ?? 0),
    0,
  );
  // Demo projects carry sample numbers: never count them as this person's.
  const real = works.filter((w) => !w.is_demo);
  const commits = real.reduce((s, w) => s + (w.build_commits ?? 0), 0);
  const stars = real.reduce((s, w) => s + (w.build_stars ?? 0), 0);
  const months = monthsBuilding(
    real.map((w) => w.build_first_commit_at ?? w.created_at),
  );
  const mrrThb = thbPerUsd ? (mrrCents / 100) * thbPerUsd : 0;
  const activeDays = page.activity.filter((a) => a.score > 0).map((a) => a.day);
  const earned = badges({
    userNumber: page.userNumber,
    verifiedWorks: verified.length,
    mrrThb,
    streak: streak(activeDays),
  });

  // Pinned works: the owner's order; otherwise the strongest 6.
  const pinned = works
    .filter((w) => w.pinned !== null)
    .sort((a, b) => a.pinned! - b.pinned!);
  const showAll = sp.works === "all";
  const ordered = [
    ...pinned,
    ...[...works]
      .filter((w) => w.pinned === null)
      .sort(
        (a, b) =>
          (b.mrr_cents ?? 0) - (a.mrr_cents ?? 0) ||
          b.created_at.localeCompare(a.created_at),
      ),
  ];
  const shown = showAll ? ordered : ordered.slice(0, 4);

  // Heatmap.
  const end = year ? new Date(Date.UTC(year, 11, 31)) : new Date();
  const grid = heatmapGrid(page.activity, end);
  const monthFmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en", {
    month: "short",
  });
  const totalActivity = page.activity.reduce((s, a) => s + a.score, 0);

  const dateFmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en", {
    month: "short",
    year: "numeric",
  });

  const empty = (section: string, label: string) =>
    isOwner ? (
      <Link
        href={`/dashboard/profile#${section}`}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand/50 px-4 py-6 text-caption text-brand-text hover:bg-brand/5"
      >
        <PlusIcon className="size-4" aria-hidden="true" />
        {label}
      </Link>
    ) : null;

  const editLink = (section: string) =>
    isOwner ? (
      <Link
        href={`/dashboard/profile#${section}`}
        className="inline-flex items-center gap-1 text-2xs font-normal text-faint hover:text-foreground"
      >
        <PencilIcon className="size-3" aria-hidden="true" />
        {t("edit")}
      </Link>
    ) : null;

  const infoRow = (
    icon: React.ReactNode,
    body: React.ReactNode,
    key: string,
  ) => (
    <li key={key} className="flex min-w-0 items-center gap-2.5 text-caption">
      <span className="shrink-0 text-faint">{icon}</span>
      <span className="min-w-0 truncate">{body}</span>
    </li>
  );
  const ext = "hover:text-foreground hover:underline";
  const contactHref = page.viewer
    ? { pathname: `/u/${profile.handle}`, query: { contact: "1" } }
    : {
        pathname: "/login",
        // Back to this profile with the request form open, in the same language.
        query: { next: `/${locale}/u/${profile.handle}?contact=1` },
      };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-16">
      <ProfileViewBeacon profileId={profile.id} />
      <nav
        aria-label={t("breadcrumb")}
        className="mb-6 flex min-w-0 gap-2 text-2xs text-faint"
      >
        <Link href="/" className="hover:text-foreground">
          JaoPor
        </Link>
        <span aria-hidden="true">›</span>
        <Link href="/builders" className="hover:text-foreground">
          {t("breadcrumbBuilders")}
        </Link>
        <span aria-hidden="true">›</span>
        <span className="truncate text-foreground">{name}</span>
      </nav>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[296px_minmax(0,1fr)] lg:gap-12">
        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <div className="relative w-fit">
            <span className="flex size-36 items-center justify-center overflow-hidden rounded-full border bg-secondary text-4xl font-bold text-muted-foreground uppercase lg:size-60 lg:text-7xl">
              <PersonPhoto
                src={profile.avatar_url}
                fallback={name.slice(0, 2)}
              />
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "absolute right-3 bottom-3 size-6 rounded-full border-4 border-background lg:right-6 lg:bottom-6 lg:size-8",
                STATUS_DOT[profile.status] ?? "bg-faint",
              )}
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            <p className="text-sm text-faint">@{profile.handle}</p>
            {works.length > 0 && (
              <p className="text-caption text-muted-foreground tabular-nums">
                {[
                  t("proofWorks", { n: works.length }),
                  verified.length > 0 &&
                    t("proofVerified", { n: verified.length }),
                  months !== null &&
                    months > 0 &&
                    t("proofMonths", { n: months }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {profile.headline && (
              <p className="text-sm text-muted-foreground">
                {profile.headline}
              </p>
            )}
            <StatusPill status={profile.status} />
            {profile.bio && (
              <p className="pt-1 text-body leading-relaxed">{profile.bio}</p>
            )}
            {editLink("basics")}
          </div>

          <ProfileActions
            profileId={profile.id}
            handle={profile.handle}
            name={name}
            signedIn={Boolean(page.viewer)}
            isOwner={isOwner}
            following={page.following}
            requestStatus={page.lastRequest?.status ?? null}
            openRequest={sp.contact === "1" && Boolean(page.viewer) && !isOwner}
          />

          <p className="flex items-center gap-2 text-caption text-muted-foreground">
            <UsersIcon className="size-4 text-faint" aria-hidden="true" />
            <b className="text-foreground tabular-nums">
              {profile.followers}
            </b>{" "}
            {t("followers")}
            {counts.newFollowers > 0 && (
              <span className="text-positive tabular-nums">
                {t("followersGrowth", { n: counts.newFollowers })}
              </span>
            )}{" "}
            ·{" "}
            <b className="text-foreground tabular-nums">{profile.following}</b>{" "}
            {t("following")}
          </p>

          <ul className="space-y-2.5">
            {province &&
              infoRow(
                <MapPinIcon className="size-4" aria-hidden="true" />,
                <Link href={`/province/${province.slug}`} className={ext}>
                  {localizedName(province, locale)}
                  <span className="text-faint">
                    {rank
                      ? ` · ${t("provinceRank", { rank, region: localizedName(getRegion(province.region), locale) })}`
                      : ""}
                  </span>
                </Link>,
                "province",
              )}
            {role &&
              infoRow(
                <BriefcaseIcon className="size-4" aria-hidden="true" />,
                role.company ? `${role.title} @ ${role.company}` : role.title,
                "role",
              )}
            {socials.website &&
              infoRow(
                <GlobeIcon className="size-4" aria-hidden="true" />,
                <a
                  href={socials.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={ext}
                >
                  {socials.website.replace(/^https:\/\/(www\.)?/, "")}
                </a>,
                "website",
              )}
            {profile.x_handle &&
              infoRow(
                <span className="text-sm font-bold">𝕏</span>,
                <a
                  href={`https://x.com/${profile.x_handle}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={ext}
                >
                  @{profile.x_handle}
                </a>,
                "x",
              )}
            {(
              ["linkedin", "github", "facebook", "youtube", "tiktok"] as const
            ).map((k) =>
              socials[k]
                ? infoRow(
                    <LinkIcon className="size-4" aria-hidden="true" />,
                    <a
                      href={socials[k]}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className={ext}
                    >
                      {t(`social.${k}`)}
                    </a>,
                    k,
                  )
                : null,
            )}
            {page.contacts && (page.contacts.line_id || page.contacts.email) ? (
              <>
                {page.contacts.line_id &&
                  infoRow(
                    <MessageCircleIcon className="size-4" aria-hidden="true" />,
                    `LINE: ${page.contacts.line_id}`,
                    "line",
                  )}
                {page.contacts.email &&
                  infoRow(
                    <MailIcon className="size-4" aria-hidden="true" />,
                    <a href={`mailto:${page.contacts.email}`} className={ext}>
                      {page.contacts.email}
                    </a>,
                    "email",
                  )}
              </>
            ) : (
              !isOwner &&
              infoRow(
                <LockIcon className="size-4" aria-hidden="true" />,
                <Link
                  href={contactHref}
                  className="text-brand-text hover:underline"
                >
                  {t("askContacts")}
                </Link>,
                "locked",
              )
            )}
          </ul>

          {earned.length > 0 && (
            <section className="space-y-3 border-t pt-5">
              <h2 className="text-sm font-bold">{t("badgesTitle")}</h2>
              <ul className="grid grid-cols-4 gap-2 text-center">
                {earned.map((b) => (
                  <BadgeItem key={b.key} badge={b} label={badgeLabel(t, b)} />
                ))}
              </ul>
            </section>
          )}

          {page.skills.length > 0 ? (
            <section className="space-y-3 border-t pt-5">
              <h2 className="flex items-center justify-between gap-2 text-sm font-bold">
                {t("skillsTitle")}
                {editLink("skills")}
              </h2>
              {[true, false].map((top) => {
                const list = page.skills.filter((s) => s.is_superpower === top);
                return list.length ? (
                  <ul key={String(top)} className="flex flex-wrap gap-1.5">
                    {list.map((s) => {
                      const def = getSkill(s.skill_slug);
                      if (!def) return null;
                      return (
                        <li
                          key={s.skill_slug}
                          className={cn(
                            "rounded-full border",
                            top
                              ? "border-brand bg-brand/15 px-3 py-1 text-caption font-bold text-brand-text"
                              : "bg-card px-2.5 py-0.5 text-2xs text-muted-foreground",
                          )}
                        >
                          {localizedName(def, locale)}
                        </li>
                      );
                    })}
                  </ul>
                ) : null;
              })}
            </section>
          ) : (
            empty("skills", t("addSkills"))
          )}

          {(() => {
            const tools = [...new Set(works.flatMap((w) => w.ai_tools))].filter(
              isAiTool,
            );
            return tools.length ? (
              <section className="space-y-3 border-t pt-5">
                <h2 className="text-sm font-bold">{t("builtWith")}</h2>
                <ul className="flex flex-wrap gap-1.5">
                  {tools.map((tool) => (
                    <li
                      key={tool}
                      className="rounded-full border bg-secondary px-2.5 py-0.5 text-caption"
                    >
                      {aiToolLabel(tool, locale)}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null;
          })()}

          {page.viewer && !isOwner && (
            <ReportDialog targetType="user" targetId={profile.id} />
          )}
        </aside>

        {/* Main */}
        <div className="min-w-0 space-y-8">
          {(profile.status === "looking_cofounder" ||
            profile.status === "open_to_work") &&
            (lf.roles?.length || lf.offer || lf.deal || lf.commitment) && (
              <Card className="space-y-4 border-brand/50 bg-brand/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-bold">
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full bg-positive"
                    />
                    {t(`status.${profile.status}`)}
                    {editLink("status")}
                  </h2>
                  {!isOwner && (
                    <Link
                      href={contactHref}
                      className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-xs font-semibold text-white hover:opacity-90"
                    >
                      {t("sendRequest")} →
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {(lf.roles?.length || lf.industries?.length) && (
                    <div className="rounded-lg border bg-background/40 p-3">
                      <p className="mb-2 text-2xs text-faint">{t("wants")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {lf.roles?.map((r) => (
                          <span
                            key={r}
                            className="rounded-full border px-2 py-0.5 text-2xs"
                          >
                            {t(`roles.${r}`)}
                          </span>
                        ))}
                        {lf.industries?.map((c) => (
                          <span
                            key={c}
                            className="rounded-full border px-2 py-0.5 text-2xs text-muted-foreground"
                          >
                            {categoryName(c, locale)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {lf.offer && (
                    <div className="rounded-lg border bg-background/40 p-3">
                      <p className="mb-2 text-2xs text-faint">{t("offers")}</p>
                      <p className="text-caption">{lf.offer}</p>
                    </div>
                  )}
                  {(lf.deal || lf.commitment || lf.location) && (
                    <div className="rounded-lg border bg-background/40 p-3">
                      <p className="mb-2 text-2xs text-faint">{t("deal")}</p>
                      <p className="text-caption">
                        {[
                          lf.deal && t(`deals.${lf.deal}`),
                          lf.commitment && t(`commitments.${lf.commitment}`),
                          lf.location && t(`locations.${lf.location}`),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

          {/* Proof strip (verified numbers only; zero tiles hidden) */}
          {(() => {
            const stats = [
              mrrCents > 0 && {
                k: "mrr",
                label: t("statMrrTotal"),
                value: <Money cents={mrrCents} thbPerUsd={thbPerUsd} />,
                note: t("statMrrNote", { n: verified.length }),
              },
              revenueCents > 0 && {
                k: "revenue",
                label: t("statRevenueTotal"),
                value: <Money cents={revenueCents} thbPerUsd={thbPerUsd} />,
                note: t("statRevenueNote"),
              },
              stars + commits > 0 && {
                k: "github",
                label: "GitHub",
                value: (
                  <span className="inline-flex items-center gap-1.5">
                    <StarIcon
                      className="size-5 fill-current"
                      aria-hidden="true"
                    />
                    {stars.toLocaleString("en")}
                  </span>
                ),
                note: commits > 0 ? t("commits", { n: commits }) : "",
              },
              counts.posts6m > 0 && {
                k: "posts",
                label: t("statPosts"),
                value: <>{counts.posts6m}</>,
                note: t("statPostsNote"),
              },
            ].filter(Boolean) as {
              k: string;
              label: string;
              value: React.ReactNode;
              note: string;
            }[];
            return stats.length ? (
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {stats.map((s) => (
                  <li key={s.k}>
                    <Card className="h-full space-y-2 p-4">
                      <p className="truncate text-2xs tracking-wider text-faint uppercase">
                        {s.label}
                      </p>
                      <p className="text-2xl font-extrabold tabular-nums">
                        {s.value}
                      </p>
                      {s.note && (
                        <p className="truncate text-2xs text-faint">{s.note}</p>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            ) : null;
          })()}

          {/* Revenue | activity (Design.md §6 Builder profile v2) */}
          {revenue || totalActivity > 0 || isOwner ? (
            <Card className="rounded-2xl px-4 py-5 sm:px-6">
              <ProfileChartTabs
                revenue={revenue}
                thbPerUsd={thbPerUsd}
                sources={(revenue?.sources ?? [])
                  .filter(isSource)
                  .map((x) => SOURCE_NAME[x])
                  .join(", ")}
                revenueEmpty={
                  isOwner ? (
                    <div className="space-y-2 rounded-xl border border-dashed px-4 py-8 text-center text-caption text-muted-foreground">
                      <p>{t("revenueEmptyOwner")}</p>
                      <Link
                        href="/dashboard/startups"
                        className="font-semibold text-brand-text hover:underline"
                      >
                        {t("revenueEmptyCta")} →
                      </Link>
                    </div>
                  ) : null
                }
                activityActions={
                  <nav aria-label={t("year")} className="flex gap-1">
                    {[null, ...(page.hasLastYear ? [thisYear - 1] : [])].map(
                      (y) => (
                        <Link
                          key={y ?? "now"}
                          href={{
                            pathname: `/u/${profile.handle}`,
                            query: y ? { year: String(y) } : {},
                          }}
                          scroll={false}
                          aria-current={year === y ? "page" : undefined}
                          className={toolbarButton(year === y)}
                        >
                          {y ?? thisYear}
                        </Link>
                      ),
                    )}
                  </nav>
                }
                activity={
                  <section className="space-y-3">
                    <h2 className="text-xl font-extrabold tabular-nums">
                      {t("activityTitle", { n: totalActivity })}
                    </h2>
                    <div className="overflow-x-auto pb-1">
                      <div className="min-w-[640px]">
                        <div className="relative ml-6 h-4 text-3xs text-faint">
                          {monthStarts(grid).map((m) => (
                            <span
                              key={`${m.week}-${m.month}`}
                              className="absolute"
                              style={{ left: `${(m.week / 53) * 100}%` }}
                            >
                              {monthFmt.format(
                                new Date(Date.UTC(2026, m.month, 1)),
                              )}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <div className="grid w-5 grid-rows-7 gap-[3px] text-3xs text-faint">
                            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                              <span key={d} className="h-2.5 leading-[10px]">
                                {d % 2 === 0 ? t(`weekday.${d}`) : ""}
                              </span>
                            ))}
                          </div>
                          <div className="grid flex-1 grid-flow-col grid-cols-[repeat(53,minmax(0,1fr))] grid-rows-7 gap-[3px]">
                            {grid.flatMap((col) =>
                              col.map((cell) => (
                                <span
                                  key={cell.day}
                                  title={
                                    cell.future
                                      ? undefined
                                      : t("cellTitle", {
                                          day: cell.day,
                                          n: cell.score,
                                        })
                                  }
                                  className={cn(
                                    "aspect-square rounded-[2px]",
                                    cell.future
                                      ? "bg-transparent"
                                      : [
                                          "bg-secondary",
                                          "bg-brand/25",
                                          "bg-brand/50",
                                          "bg-brand/75",
                                          "bg-brand",
                                        ][cell.level],
                                  )}
                                />
                              )),
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-2xs text-faint">
                          <span>{t("activitySource")}</span>
                          <span className="flex items-center gap-1">
                            {t("less")}
                            {[
                              "bg-secondary",
                              "bg-brand/25",
                              "bg-brand/50",
                              "bg-brand/75",
                              "bg-brand",
                            ].map((c) => (
                              <span
                                key={c}
                                aria-hidden="true"
                                className={cn("size-2.5 rounded-[2px]", c)}
                              />
                            ))}
                            {t("more")}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isOwner && totalActivity === 0 && (
                      <p className="text-caption text-muted-foreground">
                        {t("activityEmptyOwner")}
                      </p>
                    )}
                  </section>
                }
              />
            </Card>
          ) : null}

          {/* Pinned works */}
          {shown.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  {t("pinnedTitle")}
                  {editLink("pinned")}
                </h2>
                {works.length > shown.length && (
                  <Link
                    href={{
                      pathname: `/u/${profile.handle}`,
                      query: { works: "all" },
                    }}
                    scroll={false}
                    className="text-caption text-muted-foreground hover:text-foreground"
                  >
                    {t("seeAllWorks", { n: works.length })} ›
                  </Link>
                )}
              </div>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {shown.map((w) => {
                  // The ✓ names the revenue provider, so it only shows with a verified revenue number.
                  const source =
                    isVerified(w) && isSource(w.verified_provider)
                      ? SOURCE_NAME[w.verified_provider]
                      : null;
                  return (
                    <li key={w.id}>
                      <Link
                        href={`/startup/${w.slug}`}
                        className="group block h-full"
                      >
                        <Card
                          interactive
                          className="flex h-full flex-col gap-3 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <StartupLogo
                              name={w.name}
                              src={logoUrl(w.logo_path)}
                              size={40}
                            />
                            <span className="min-w-0 flex-1 truncate font-semibold group-hover:underline">
                              {w.name}
                            </span>
                            {w.is_demo && (
                              <span className="shrink-0 rounded-sm border bg-secondary px-1.5 py-0.5 text-2xs text-muted-foreground">
                                {t("demo")}
                              </span>
                            )}
                            <span className="shrink-0 rounded-full border px-2 py-0.5 text-2xs">
                              {t(`roleLabel.${w.role}`)}
                            </span>
                          </div>
                          {w.tagline && (
                            <p className="line-clamp-2 text-caption text-muted-foreground">
                              {w.tagline}
                            </p>
                          )}
                          <div className="mt-auto flex items-center justify-between gap-2 text-caption">
                            {isVerified(w) && w.mrr_cents !== null ? (
                              <span className="flex items-center gap-2 font-bold tabular-nums">
                                <span>
                                  <Money
                                    cents={w.mrr_cents}
                                    thbPerUsd={thbPerUsd}
                                  />
                                  <span className="font-normal text-faint">
                                    {t("perMonthShort")}
                                  </span>
                                </span>
                                <GrowthValue
                                  pct={growthPct(
                                    w.revenue_30d_cents,
                                    w.revenue_prev_30d_cents,
                                  )}
                                />
                              </span>
                            ) : w.build_stars ? (
                              <span className="flex items-center gap-1.5 font-bold tabular-nums">
                                <StarIcon
                                  className="size-3.5 fill-current"
                                  aria-hidden="true"
                                />
                                {w.build_stars}
                                {w.build_commits ? (
                                  <span className="font-normal text-faint">
                                    {t("commits", { n: w.build_commits })}
                                  </span>
                                ) : null}
                              </span>
                            ) : w.visitors_30d !== null ? (
                              <span className="font-bold tabular-nums">
                                {t("visitors", { n: w.visitors_30d })}
                              </span>
                            ) : (
                              <span className="text-faint">
                                {t("unverified")}
                              </span>
                            )}
                            <span className="truncate text-2xs text-faint">
                              {source && (
                                <span className="text-positive">
                                  ✓ {source} ·{" "}
                                </span>
                              )}
                              {categoryName(w.category, locale)}
                            </span>
                          </div>
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            isOwner && (
              <Link
                href="/new"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand/50 px-4 py-6 text-caption text-brand-text hover:bg-brand/5"
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                {t("addWork")}
              </Link>
            )
          )}

          {/* Product updates (Phase 10) */}
          {posts.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-bold">{t("updatesTitle")}</h2>
                <Link
                  href="/feed"
                  className="text-caption text-muted-foreground hover:text-foreground"
                >
                  {t("seeFeed")} →
                </Link>
              </div>
              <div className="gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    viewerId={page.viewer}
                    variant="profile"
                    now={now}
                  />
                ))}
              </div>
            </section>
          ) : (
            isOwner && (
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand/50 px-4 py-6 text-caption text-brand-text hover:bg-brand/5"
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                {t("firstPost")}
              </Link>
            )
          )}

          {page.positions.length > 0 ? (
            <Card className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-base font-bold">
                {t("experienceTitle")}
                {editLink("experience")}
              </h2>
              <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {page.positions.map((p, i) => (
                  <li
                    key={p.id}
                    className={cn(
                      "space-y-1 border-l-2 pl-3.5",
                      i === 0 && !p.end_date
                        ? "border-brand"
                        : "border-border-strong",
                    )}
                  >
                    <p className="text-sm font-semibold">
                      {p.title}
                      {p.company && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {p.company}
                        </span>
                      )}
                    </p>
                    <p className="text-2xs text-faint">
                      {dateFmt.format(new Date(p.start_date))} –{" "}
                      {p.end_date
                        ? dateFmt.format(new Date(p.end_date))
                        : t("present")}
                    </p>
                    {p.description && (
                      <p className="text-caption text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </Card>
          ) : (
            empty("experience", t("addExperience"))
          )}
        </div>
      </div>
    </main>
  );
}

function badgeLabel(
  t: Awaited<ReturnType<typeof getTranslations<"Builder">>>,
  b: Badge,
): string {
  switch (b.key) {
    case "pioneer":
      return t("badge.pioneer", { n: b.n });
    case "verified":
      return t("badge.verified");
    case "mrr":
      return t("badge.mrr", { amount: b.level.toLocaleString("en") });
    case "streak":
      return t("badge.streak", { n: b.days });
  }
}

function BadgeItem({ badge, label }: { badge: Badge; label: string }) {
  const style = {
    pioneer: "border-brand/60 bg-brand/15 text-brand-text",
    verified: "border-positive/40 bg-positive/10 text-positive",
    mrr: "border-warning/40 bg-warning/10 text-warning",
    streak: "border-negative/40 bg-negative/10 text-negative",
  }[badge.key];
  const Icon = {
    pioneer: RocketIcon,
    verified: ShieldCheckIcon,
    mrr: TrendingUpIcon,
    streak: FlameIcon,
  }[badge.key];
  return (
    <li className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full border-2",
          style,
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="text-3xs leading-tight text-muted-foreground">
        {label}
      </span>
    </li>
  );
}

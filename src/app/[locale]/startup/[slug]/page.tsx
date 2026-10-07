import {
  ArrowUpRightIcon,
  ChevronRightIcon,
  FlaskConicalIcon,
  MapPinIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { VerifiedBadge } from "@/components/core/VerifiedBadge";
import {
  EmptyOwnerCard,
  OwnerBar,
  OwnerProvider,
  UnverifiedLine,
} from "@/components/profile/Owner";
import {
  LookingForBanner,
  ProjectLinks,
  TractionTiles,
} from "@/components/profile/ProjectBlocks";
import {
  InsightsGrid,
  FounderCard,
  StatCard,
  ChartStamp,
  FounderMessageCard,
} from "@/components/ProfileBlocks";
import { Card } from "@/components/core/Card";
import { MetricChart } from "@/components/MetricChart";
import { ScreenshotGallery } from "@/components/profile/ScreenshotGallery";
import { ShareStudio } from "@/components/share/ShareStudio";
import { FoundingBadge, Money, StartupLogo } from "@/components/StartupBits";
import { QuickSearchSection } from "@/components/search/QuickSearchSection";
import { StartupCard } from "@/components/StartupCard";
import { Link } from "@/i18n/navigation";
import { PersonPhoto } from "@/components/PersonPhoto";
import { PostPreview } from "@/components/posts/PostPreview";
import { listStartupPostsPublic } from "@/lib/data/posts";
import { renderNow } from "@/lib/posts";
import { getThbPerUsd } from "@/lib/data/fx";
import {
  getMoreStartups,
  getProvinceLeaderboard,
  getRank,
  getChartSeries,
  getScreenshots,
  getStartupBySlug,
} from "@/lib/data/startups";
import { money, moneyFull } from "@/lib/format";
import { projectLinks, websiteHost } from "@/lib/links";
import { publicEnv } from "@/lib/public-env";
import {
  badgeHtml,
  badgeMarkdown,
  projectCurrencySymbol,
  shareMetrics,
} from "@/lib/share";
import { SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { logoUrl } from "@/lib/supabase/public";
import { LiveViewersPill } from "@/components/live/LiveViewersPill";
import { provinceName } from "@/lib/config/display";
import { DEFAULT_METRIC, provinceRank } from "@/lib/olympics";

export const revalidate = 60;

// No slugs at build time: each profile is rendered on first visit, then cached (ISR, 60 s).
export async function generateStaticParams() {
  return [];
}

type Props = PageProps<"/[locale]/startup/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) return {};
  // Demo projects carry sample numbers: never put them in a title that gets shared.
  const verified =
    startup.verification_status === "verified" && !startup.is_demo;
  // Thai pages show baht, like the page itself (it used to say "$69 MRR" above "฿2,310").
  const thbPerUsd = locale === "th" && verified ? await getThbPerUsd() : null;
  const mrr = thbPerUsd
    ? money(startup.mrr_cents, { currency: "thb", thbPerUsd, full: true })
    : moneyFull(startup.mrr_cents);
  const title = verified ? `${startup.name} — ${mrr} MRR` : startup.name;
  const description = startup.tagline ?? startup.description?.slice(0, 200);
  // openGraph replaces the layout's object (shallow merge), so repeat siteName/type/locale here.
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/startup/${startup.slug}` },
    openGraph: {
      type: "website",
      siteName: "JaoPor",
      locale: locale === "th" ? "th_TH" : "en_US",
      title,
      description,
      url: `/${locale}/startup/${startup.slug}`,
    },
  };
}

/** Localized country name for an ISO 3166 alpha-2 code ("TH" → "ไทย" / "Thailand"). */
function countryName(code: string | null, locale: string): string {
  if (!code) return "";
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

// Design.md §6 /startup/[slug] (spec 6.4 order: header · stats · chart · screenshots · founder
// message · insights · more). Empty-state rule: visitors see data only, owners get "+ Add" prompts.
export default async function StartupPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();

  const verified = startup.verification_status === "verified";
  const [
    t,
    common,
    nav,
    sh,
    format,
    rank,
    series,
    shots,
    more,
    thbPerUsd,
    olympics,
    updates,
  ] = await Promise.all([
    getTranslations("Profile"),
    getTranslations("Common"),
    getTranslations("Nav"),
    getTranslations("Share"),
    getFormatter(),
    getRank(startup),
    getChartSeries(startup),
    getScreenshots(startup.id),
    getMoreStartups(startup, 6),
    getThbPerUsd(),
    startup.province
      ? getProvinceLeaderboard(DEFAULT_METRIC)
      : Promise.resolve([]),
    // Phase 10e: latest product updates (cookie-free, so the page stays cached).
    listStartupPostsPublic(startup.id, 3).catch(() => []),
  ]);
  const now = renderNow();
  // Spec 6.4 step 2: "📍 จังหวัด · อันดับ #X ในโอลิมปิก" → the province page.
  const provinceNameText = provinceName(startup.province, locale);
  const provinceRankNo = provinceRank(olympics, startup.province);
  const provinceLink = provinceNameText ? (
    <Link
      href={`/province/${startup.province}`}
      className="inline-flex max-w-full items-start gap-1 hover:text-foreground hover:underline"
    >
      <MapPinIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
      <span className="min-w-0 sm:truncate">
        {provinceRankNo
          ? t("provinceRank", {
              province: provinceNameText,
              rank: provinceRankNo,
            })
          : provinceNameText}
      </span>
    </Link>
  ) : null;
  const chartMetrics = (["revenue", "mrr", "visitors"] as const).filter(
    (m) => series[m] !== null,
  );

  // Share kit (Design.md §9): absolute URLs, verified numbers only.
  const url = `${publicEnv.siteUrl}/${locale}/startup/${startup.slug}`;
  const badgeSrc = `${publicEnv.siteUrl}/api/badge/${startup.slug}.svg`;
  const tagline = startup.tagline ? ` — ${startup.tagline}` : "";
  const metricsLine = shareMetrics(startup)
    .map((m) => `${sh(`metric.${m.id}`)} ${m.value}`)
    .join(" · ");
  const post = sh("post", {
    name: startup.name,
    tagline,
    metrics: metricsLine ? `${metricsLine}\n` : "",
    url,
  });
  const primary = projectLinks(startup)[0];
  const owner = startup.owner;
  const ownerName = owner?.display_name ?? owner?.handle ?? null;
  const verifiedSource =
    verified && !startup.is_demo && isSource(startup.verified_provider)
      ? SOURCE_NAME[startup.verified_provider]
      : null;
  const tractionFirst =
    !verified &&
    (startup.visitors_30d !== null || startup.build_commits !== null);

  return (
    <OwnerProvider ownerId={startup.owner_id} startupId={startup.id}>
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 pt-8">
        <nav
          aria-label="breadcrumb"
          className="flex items-center gap-1.5 text-2xs text-faint"
        >
          <Link href="/" className="hover:text-foreground">
            {common("brand")}
          </Link>
          <ChevronRightIcon className="size-3" aria-hidden="true" />
          <Link href="/startups" className="hover:text-foreground">
            {nav("startups")}
          </Link>
          <ChevronRightIcon className="size-3" aria-hidden="true" />
          <span className="truncate text-foreground">{startup.name}</span>
        </nav>

        <OwnerBar
          unverified={
            !verified &&
            !startup.is_demo &&
            startup.visitors_30d === null &&
            startup.build_commits === null
          }
        />

        <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-5">
            <StartupLogo
              name={startup.name}
              src={logoUrl(startup.logo_path)}
              size={72}
              className="rounded-2xl"
            />
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {startup.name}
                </h1>
                <FoundingBadge n={startup.founding_number} />
                {!startup.is_demo && (
                  <VerifiedBadge
                    source={verifiedSource}
                    ownerVerified={startup.owner_verified_at !== null}
                  />
                )}
              </div>
              <div className="max-w-2xl space-y-2 text-body text-muted-foreground">
                {startup.tagline ? (
                  <p>{startup.tagline}</p>
                ) : (
                  <EmptyOwnerCard
                    field="tagline"
                    label={t("tagline")}
                    className="w-fit"
                  />
                )}
                {startup.description ? (
                  <p className="whitespace-pre-line">{startup.description}</p>
                ) : (
                  <EmptyOwnerCard
                    field="description"
                    label={t("description")}
                    className="w-fit"
                  />
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ShareStudio
              slug={startup.slug}
              url={url}
              post={post}
              text={`${startup.name}${tagline}`}
              badgeHtml={badgeHtml(url, badgeSrc, startup.name)}
              badgeMarkdown={badgeMarkdown(url, badgeSrc, startup.name)}
              badgeSrc={badgeSrc}
              currencySymbol={projectCurrencySymbol(startup)}
            />
            {primary && (
              <a
                href={primary.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                {t("visit")}
                <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </header>

        <ProjectLinks startup={startup} skipFirst />
        <LiveViewersPill />
        <LookingForBanner startup={startup} />
        {startup.is_demo && (
          <p className="flex items-start gap-2 rounded-xl border border-dashed bg-card p-3 text-xs text-muted-foreground">
            <FlaskConicalIcon
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            {t("demoNotice")}
          </p>
        )}

        {/* A project without verified revenue leads with the numbers it does have (visitors, build). */}
        {tractionFirst && <TractionTiles startup={startup} />}

        {/* Spec 2.4: only tiles that have data; unverified numbers collapse into one muted line. */}
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
            {verified && (
              <StatCard
                label={t("allTime")}
                value={
                  <Money
                    cents={startup.revenue_all_time_cents}
                    thbPerUsd={thbPerUsd}
                    full
                  />
                }
                caption={rank ? t("rank", { rank }) : undefined}
              />
            )}
            {verified && (
              <StatCard
                label={t("mrr")}
                value={
                  <Money cents={startup.mrr_cents} thbPerUsd={thbPerUsd} full />
                }
                caption={t("subscriptions", {
                  count: startup.active_subscriptions ?? 0,
                })}
              />
            )}
            {ownerName && (
              // Spec 9b: the founder card opens the founder's public profile. Subtext = the role on
              // this project, else the founder's own headline, else their X handle.
              <FounderCard
                handle={owner?.handle ?? null}
                label={t("founder")}
                value={
                  <span className="flex items-center gap-2 text-base">
                    <PersonPhoto
                      src={owner?.avatar_url}
                      className="size-5 shrink-0 rounded-full object-cover"
                      fallback={null}
                    />
                    <span className="truncate">{ownerName}</span>
                  </span>
                }
                caption={
                  startup.founder_role ??
                  owner?.headline ??
                  (owner?.x_handle ? `@${owner.x_handle} · 𝕏` : undefined)
                }
              />
            )}
            {startup.founded_on || startup.country || startup.province ? (
              <StatCard
                label={startup.founded_on ? t("founded") : t("location")}
                value={
                  startup.founded_on ? (
                    <span className="text-lg">
                      {format.dateTime(new Date(startup.founded_on), {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  ) : (
                    <span className="text-lg">
                      {[
                        provinceName(startup.province, locale),
                        countryName(startup.country, locale),
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )
                }
                caption={
                  provinceLink ??
                  (startup.founded_on && startup.country
                    ? countryName(startup.country, locale)
                    : undefined)
                }
              />
            ) : (
              <EmptyOwnerCard field="founded" label={t("founded")} />
            )}
          </div>
          {!verified && !startup.is_demo && (
            <UnverifiedLine items={[t("allTime"), t("mrr")]} />
          )}
        </section>

        {/* Spec 6.4 step 3: chart card; nothing verified → owner-only prompt. */}
        {chartMetrics.length > 0 ? (
          <Card className="p-4 sm:p-6">
            <MetricChart
              series={series}
              thbPerUsd={thbPerUsd}
              stamps={Object.fromEntries(
                chartMetrics.map((m) => [
                  m,
                  <ChartStamp key={m} startup={startup} metric={m} />,
                ]),
              )}
            />
          </Card>
        ) : (
          <EmptyOwnerCard field="revenue" label={t("connectChart")} />
        )}

        {!tractionFirst && <TractionTiles startup={startup} />}

        {/* Spec 6.4 step 4: screenshots + demo video; owner prompt when empty. */}
        {shots.length > 0 || startup.demo_video_url ? (
          <ScreenshotGallery
            name={startup.name}
            domain={websiteHost(startup.website_url)}
            websiteUrl={startup.website_url}
            shots={shots}
            videoUrl={startup.demo_video_url}
          />
        ) : (
          <EmptyOwnerCard field="screenshots" label={t("screenshots")} />
        )}

        <FounderMessageCard startup={startup} />

        <div className="pt-3">
          <InsightsGrid startup={startup} />
        </div>

        {updates.length > 0 && (
          <section className="pt-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold">{t("latestUpdates")}</h2>
              <Link
                href="/feed"
                className="text-caption text-faint hover:text-foreground"
              >
                {t("seeFeed")} →
              </Link>
            </div>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {updates.map((p) => (
                <li key={p.id}>
                  <PostPreview post={p} now={now} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {more.length > 0 && (
          <section className="pt-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold">{t("moreStartups")}</h2>
              <Link
                href="/startups"
                className="text-caption text-faint hover:text-foreground"
              >
                {common("viewAll")} →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((s) => (
                <StartupCard
                  key={s.id}
                  startup={s}
                  large
                  thbPerUsd={thbPerUsd}
                />
              ))}
            </div>
          </section>
        )}
        <QuickSearchSection />
      </main>
    </OwnerProvider>
  );
}

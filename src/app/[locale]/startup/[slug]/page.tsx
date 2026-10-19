import {
  ArrowUpRightIcon,
  ChartColumnIcon,
  ChevronRightIcon,
  FlaskConicalIcon,
  MapPinIcon,
  EyeOffIcon,
  UsersIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { VerifiedBadge } from "@/components/core/VerifiedBadge";
import { syncedRecently } from "@/lib/motion/live";
import { ProjectName } from "@/components/core/ProjectName";
import { isTeamProject } from "@/lib/team";
import { isAnonymousSlug } from "@/lib/anonymous";
import { DisclosedStat, isNonExact } from "@/components/profile/DisclosedStat";
import {
  EmptyOwnerCard,
  OwnerBar,
  OwnerProvider,
  OwnerOnly,
  NoNumbersCard,
  UnverifiedLine,
} from "@/components/profile/Owner";
import {
  LookingForBanner,
  ProjectLinks,
  TractionTiles,
  tractionTiles,
  type TractionKey,
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
import { ClampedText } from "@/components/profile/ClampedText";
import { StickyIdentity } from "@/components/profile/StickyIdentity";
import { SectionTabs } from "@/components/profile/SectionTabs";
import { ShowMore } from "@/components/profile/ShowMore";
import { MetricHelp } from "@/components/core/MetricHelp";
import { ShareStudio } from "@/components/share/ShareStudio";
import { FoundingBadge, Money, StartupLogo } from "@/components/StartupBits";
import { QuickSearchSection } from "@/components/search/QuickSearchSection";
import { StartupCard } from "@/components/StartupCard";
import { Link } from "@/i18n/navigation";
import { PostPreview } from "@/components/posts/PostPreview";
import { listStartupPostsPublic } from "@/lib/data/posts";
import { renderNow } from "@/lib/posts";
import { getThbPerUsd } from "@/lib/data/fx";
import {
  getMoreStartups,
  getProvinceLeaderboard,
  getRank,
  getRenamedSlug,
  getChartSeries,
  getScreenshots,
  getStartupBySlug,
} from "@/lib/data/startups";
import { money, moneyFull } from "@/lib/format";
import { projectLinks, websiteHost } from "@/lib/links";
import { publicEnv } from "@/lib/public-env";
import { cn } from "@/lib/utils";
import {
  badgeHtml,
  badgeMarkdown,
  projectCurrencySymbol,
  shareMetrics,
} from "@/lib/share";
import { SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { logoUrl } from "@/lib/supabase/public";
import { LiveViewersPill } from "@/components/live/LiveViewersPill";
import { categoryName, provinceName } from "@/lib/config/display";
import { DEFAULT_METRIC, provinceRank } from "@/lib/olympics";
import { localeAlternates } from "@/lib/seo";

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
  // Demo projects carry sample numbers: never put them in a title that gets shared. R2: the MRR
  // goes in the title only when the owner shows it exact (mrr_cents is null otherwise).
  const verified =
    startup.verification_status === "verified" &&
    !startup.is_demo &&
    startup.mrr_cents !== null;
  // Thai pages show baht, like the page itself (it used to say "$69 MRR" above "฿2,310").
  const thbPerUsd = locale === "th" && verified ? await getThbPerUsd() : null;
  const mrr = thbPerUsd
    ? money(startup.mrr_cents, { currency: "thb", thbPerUsd, full: true })
    : moneyFull(startup.mrr_cents);
  // Anonymous projects (Design.md §5): never the placeholder "Anonymous" in a shared title.
  const name = isAnonymousSlug(startup.slug)
    ? (await getTranslations({ locale, namespace: "Anonymous" }))("name")
    : startup.name;
  const title = verified ? `${name} — ${mrr} MRR` : name;
  const description = startup.tagline ?? startup.description?.slice(0, 200);
  // openGraph replaces the layout's object (shallow merge), so repeat siteName/type/locale here.
  return {
    title,
    description,
    alternates: {
      ...localeAlternates(locale, `/startup/${startup.slug}`),
      // A Markdown twin for AI agents (Design.md §4 SEO).
      types: { "text/markdown": `/${locale}/startup/${startup.slug}/md` },
    },
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
  if (!startup) {
    // A renamed project: its old links (shared posts, QR codes) land on the new page (S-9).
    const moved = await getRenamedSlug(slug);
    if (moved) permanentRedirect(`/${locale}/startup/${moved}`);
    notFound();
  }

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
    an,
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
    getTranslations("Anonymous"),
  ]);
  // Design.md §5 Anonymous projects: the public row only holds placeholders.
  const anonymous = isAnonymousSlug(startup.slug);
  const displayName = anonymous ? an("name") : startup.name;
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
  // A project without verified revenue leads with the numbers it does have (visitors, build).
  // Owner request 2026-10-11: back to this layout (the Proof / Story split read worse).
  const tractionFirst =
    !verified &&
    (startup.visitors_30d !== null ||
      startup.build_commits !== null ||
      // R2: a group shown as a range, growth or badge is still a number to lead with.
      isNonExact(startup.disclosure.traffic) ||
      isNonExact(startup.disclosure.build));

  // Share kit (Design.md §9): absolute URLs, verified numbers only.
  const url = `${publicEnv.siteUrl}/${locale}/startup/${startup.slug}`;
  const badgeSrc = `${publicEnv.siteUrl}/api/badge/${startup.slug}.svg`;
  const tagline = startup.tagline ? ` — ${startup.tagline}` : "";
  const metricsLine = shareMetrics(startup)
    .map((m) => `${sh(`metric.${m.id}`)} ${m.value}`)
    .join(" · ");
  const post = sh("post", {
    name: displayName,
    tagline,
    metrics: metricsLine ? `${metricsLine}\n` : "",
    url,
  });
  const primary = projectLinks(startup)[0];
  const owner = startup.owner;
  const ownerName = owner?.display_name ?? owner?.handle ?? null;
  // The role on this project, else the founder's headline, else their X handle.
  const founderCaption =
    startup.founder_role ??
    owner?.headline ??
    (owner?.x_handle ? `@${owner.x_handle} · 𝕏` : null);
  const traction = await tractionTiles(startup);
  const verifiedSource =
    verified && !startup.is_demo && isSource(startup.verified_provider)
      ? SOURCE_NAME[startup.verified_provider]
      : null;

  // Design.md §5 Profile layout, no public numbers yet: the early-stage / upgrade card.
  const noNumbers =
    !startup.is_demo &&
    !verified &&
    !tractionFirst &&
    !isNonExact(startup.disclosure.revenue);

  // Design.md §5 Profile layout v3 (owner 2026-10-13): four key cards under the header, like
  // TrustMRR: two numbers, the founder, the founding date.
  // MRR above the money received so far, explained per source inside the MRR card's ⓘ: Stripe's
  // is our own calculation (lib/revenue/metrics.ts: active + past_due, list price, per month, no
  // coupons, no trials); RevenueCat's is RevenueCat's own figure. Nothing for any other source.
  const mrrAboveRevenue =
    startup.mrr_cents !== null &&
    startup.revenue_all_time_cents !== null &&
    startup.mrr_cents > startup.revenue_all_time_cents
      ? startup.verified_provider === "stripe" ||
        startup.verified_provider === "polar"
        ? t("mrrAboveRevenueStripe")
        : startup.verified_provider === "revenuecat"
          ? t("mrrAboveRevenueRevenueCat")
          : null
      : null;
  const keyNumbers: { key: string; node: React.ReactNode }[] = [];
  if (verified && startup.revenue_all_time_cents !== null)
    keyNumbers.push({
      key: "allTime",
      node: (
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
          help={
            verifiedSource && (
              <MetricHelp label={t("help", { label: t("allTime") })}>
                {t("allTimeHelp", { source: verifiedSource })}
              </MetricHelp>
            )
          }
        />
      ),
    });
  if (verified && startup.mrr_cents !== null)
    keyNumbers.push({
      key: "mrr",
      node: (
        <StatCard
          label={t("mrr")}
          value={<Money cents={startup.mrr_cents} thbPerUsd={thbPerUsd} full />}
          caption={t("subscriptions", {
            count: startup.active_subscriptions ?? 0,
          })}
          help={
            verifiedSource && (
              <MetricHelp label={t("help", { label: t("mrr") })}>
                <span className="block">
                  {t("mrrHelp", { source: verifiedSource })}
                </span>
                {mrrAboveRevenue ? (
                  <span className="block">{mrrAboveRevenue}</span>
                ) : (
                  startup.verified_provider === "stripe" && (
                    <span className="block">{t("mrrHelpStripe")}</span>
                  )
                )}
              </MetricHelp>
            )
          }
        />
      ),
    });
  // R2 (Design.md §7 Disclosure levels): revenue shown as a range, growth or badge.
  if (!startup.is_demo && isNonExact(startup.disclosure.revenue))
    keyNumbers.push({
      key: "revenueDisclosed",
      node: (
        <DisclosedStat
          label={t("mrr")}
          growthLabel={t("revenue30d")}
          d={startup.disclosure.revenue}
          unit="thb"
          band={
            startup.disclosure.revenue.band ?? startup.disclosure.revenue30dBand
          }
        />
      ),
    });
  // No verified revenue: the next public numbers fill the two slots (and leave the tiles below).
  const borrowed: TractionKey[] = [];
  for (const key of ["visitors", "build", "users"] as const) {
    if (keyNumbers.length >= 2) break;
    const tile = traction.find((x) => x.key === key);
    if (tile?.card) {
      keyNumbers.push({ key, node: tile.card });
      borrowed.push(key);
    }
  }
  // Long month from sm, short on a 2-up phone row ("September 2026" didn't fit at 375 px).
  const foundedText = startup.founded_on ? (
    <>
      <span className="sm:hidden">
        {format.dateTime(new Date(startup.founded_on), {
          month: "short",
          year: "numeric",
        })}
      </span>
      <span className="max-sm:hidden">
        {format.dateTime(new Date(startup.founded_on), {
          month: "long",
          year: "numeric",
        })}
      </span>
    </>
  ) : null;
  const placeText =
    provinceNameText ??
    (startup.country ? countryName(startup.country, locale) : null);

  return (
    <OwnerProvider ownerId={startup.owner_id} startupId={startup.id}>
      <main className="mx-auto w-full max-w-page space-y-6 px-4 pt-8">
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
          <span className="truncate text-foreground">
            <ProjectName name={startup.name} slug={startup.slug} />
          </span>
        </nav>

        <OwnerBar
          done={{
            story: Boolean(startup.description) || startup.is_demo,
            shots:
              shots.length > 0 ||
              Boolean(startup.demo_video_url) ||
              startup.is_demo,
            // Any number from a connected source counts (revenue, build proof, owner check, visitors).
            proof:
              verified ||
              startup.disclosure.build.level !== null ||
              startup.disclosure.traffic.level !== null ||
              startup.build_commits !== null ||
              startup.visitors_30d !== null ||
              startup.owner_verified_at !== null ||
              startup.is_demo,
          }}
        />

        <StickyIdentity watch="profile-identity">
          <StartupLogo
            name={startup.name}
            src={logoUrl(startup.logo_path)}
            size={28}
            className="rounded-md"
          />
          <p className="min-w-0 flex-1 truncate text-sm font-bold">
            <ProjectName name={startup.name} slug={startup.slug} />
          </p>
          {primary && (
            <a
              href={primary.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-primary px-3 text-caption font-medium text-primary-foreground hover:opacity-90"
            >
              {t("visit")}
              <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </StickyIdentity>

        {/* Design.md §5 Profile layout v3: header (who + what, Share and Visit on the right) →
            four key cards → chart → the story. */}
        <header className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div
              id="profile-identity"
              className="flex min-w-0 flex-1 items-start gap-4"
            >
              <StartupLogo
                name={startup.name}
                src={logoUrl(startup.logo_path)}
                size={64}
                className="size-14 shrink-0 rounded-2xl sm:size-16"
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
                  <ProjectName name={startup.name} slug={startup.slug} />
                </h1>
                {startup.tagline ? (
                  <p className="line-clamp-2 font-prose text-body leading-relaxed text-muted-foreground sm:line-clamp-none">
                    {startup.tagline}
                  </p>
                ) : (
                  <EmptyOwnerCard
                    field="tagline"
                    label={t("tagline")}
                    className="w-fit"
                  />
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 max-sm:[&>a]:flex-1">
              <ShareStudio
                slug={startup.slug}
                url={url}
                post={post}
                text={`${displayName}${tagline}`}
                badgeHtml={badgeHtml(url, badgeSrc, displayName)}
                badgeMarkdown={badgeMarkdown(url, badgeSrc, displayName)}
                badgeSrc={badgeSrc}
                currencySymbol={projectCurrencySymbol(startup)}
                proven={
                  (verified && !startup.is_demo) ||
                  startup.disclosure.build.level !== null
                }
              />
              {primary && (
                <a
                  href={primary.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  {t("visit")}
                  <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>

          {/* relative: the evidence-ladder note opens across this row (MetricHelp). */}
          <div className="relative flex flex-wrap items-center gap-2">
            <Link
              href={`/category/${startup.category}`}
              className="text-caption text-muted-foreground hover:text-foreground hover:underline"
            >
              {categoryName(startup.category, locale)}
            </Link>
            {anonymous && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs text-muted-foreground">
                <EyeOffIcon className="size-3" aria-hidden="true" />
                {an("badge")}
              </span>
            )}
            <FoundingBadge n={startup.founding_number} />
            {isTeamProject(startup.slug) && (
              // lib/team: the team's own project is listed, never ranked (audit 2026-10-12).
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs text-muted-foreground">
                <UsersIcon className="size-3" aria-hidden="true" />
                {t("teamProject")}
              </span>
            )}
            {!startup.is_demo && (
              <VerifiedBadge
                source={verifiedSource}
                ownerVerified={startup.owner_verified_at !== null}
                live={syncedRecently(startup.last_synced_at)}
              />
            )}
            {!startup.is_demo && (
              // C-4: what each kind of proof means, with this project's marked ✓.
              <MetricHelp label={t("ladder.button")}>
                <span className="block font-semibold text-foreground">
                  {t("ladder.title")}
                </span>
                {(
                  [
                    ["revenue", verified],
                    ["build", startup.build_commits !== null],
                    ["owner", startup.owner_verified_at !== null],
                    ["counted", startup.visitors_30d !== null],
                  ] as const
                ).map(([id, has]) => (
                  <span key={id} className="flex gap-2">
                    <span
                      aria-label={has ? t("ladder.has") : undefined}
                      className={cn(
                        "w-3 shrink-0",
                        has ? "text-positive" : "text-faint",
                      )}
                    >
                      {has ? "✓" : "·"}
                    </span>
                    <span>{t(`ladder.${id}`)}</span>
                  </span>
                ))}
              </MetricHelp>
            )}
            <LiveViewersPill />
            <ProjectLinks startup={startup} skipFirst />
          </div>
        </header>

        {anonymous && (
          <p className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-caption text-muted-foreground">
            <EyeOffIcon
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            {an("pageNote")}
          </p>
        )}
        {startup.is_demo && (
          <p className="flex items-start gap-2 rounded-xl border border-dashed bg-card p-3 text-xs text-muted-foreground">
            <FlaskConicalIcon
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            {t("demoNotice")}
          </p>
        )}

        <section
          id="numbers"
          aria-label={t("tabs.numbers")}
          className="space-y-3"
        >
          {/* relative: MetricHelp opens across the whole row, not inside one narrow card. */}
          <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
            {keyNumbers.slice(0, 2).map((x) => (
              <div key={x.key} className="min-w-0 [&>*]:h-full">
                {x.node}
              </div>
            ))}
            {ownerName &&
              (owner?.handle ? (
                // Spec 9b: the founder opens their public profile.
                <Link
                  href={`/u/${owner.handle}`}
                  className="group min-w-0 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <FounderCard
                    label={t("founder")}
                    name={ownerName}
                    avatar={owner.avatar_url ?? null}
                    caption={founderCaption}
                  />
                </Link>
              ) : (
                <FounderCard
                  label={t("founder")}
                  name={ownerName}
                  avatar={owner?.avatar_url ?? null}
                  caption={founderCaption}
                />
              ))}
            {foundedText || placeText ? (
              <StatCard
                label={foundedText ? t("founded") : t("location")}
                value={foundedText ?? placeText}
                valueClassName="text-xl sm:text-2xl"
                caption={
                  foundedText
                    ? (provinceLink ??
                      (placeText && (
                        <span className="inline-flex items-start gap-1">
                          <MapPinIcon
                            className="mt-0.5 size-3 shrink-0"
                            aria-hidden="true"
                          />
                          {placeText}
                        </span>
                      )))
                    : provinceRankNo
                      ? provinceLink
                      : undefined
                }
              />
            ) : (
              <EmptyOwnerCard field="founded" label={t("founded")} />
            )}
          </div>
          {noNumbers ? (
            <NoNumbersCard
              tryUrl={primary?.url ?? null}
              builderHandle={owner?.handle ?? null}
            />
          ) : (
            !verified &&
            !startup.is_demo && (
              <UnverifiedLine items={[t("allTime"), t("mrr")]} />
            )
          )}

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
          ) : startup.disclosure.revenue.level === "exact" ? (
            // Issue 3: exact figures, but not two days of history yet — say so (never the
            // "connect" prompt, which read as a failed sync).
            <Card className="flex flex-col items-center gap-2 p-6 text-center sm:p-8">
              <ChartColumnIcon
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold">{t("chartPendingTitle")}</p>
              <p className="max-w-md text-caption text-muted-foreground">
                {t("chartPendingBody")}
              </p>
            </Card>
          ) : startup.disclosure.revenue.level !== null ? (
            // Disclosed as a badge / range / growth: visitors see that instead; only the owner
            // needs to know their own choice is why the chart is hidden (issue 3).
            <OwnerOnly>
              <Card className="flex flex-col items-center gap-2 p-6 text-center sm:p-8">
                <ChartColumnIcon
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold">{t("chartHiddenTitle")}</p>
                <p className="max-w-md text-caption text-muted-foreground">
                  {t("chartHiddenBody")}
                </p>
              </Card>
            </OwnerOnly>
          ) : (
            // Nothing connected (or kept private): the owner's prompt to connect a source.
            <EmptyOwnerCard field="revenue" label={t("connectChart")} />
          )}
        </section>

        <div className="space-y-6">
          <SectionTabs
            label={t("tabs.label")}
            // Parts known to be empty are left out here (no row that shows and then goes);
            // the insights block is checked in the browser. The numbers are above the tabs.
            tabs={[
              ...(shots.length > 0 || startup.demo_video_url
                ? [{ id: "shots", label: t("tabs.shots") }]
                : []),
              ...(startup.description
                ? [{ id: "about", label: t("tabs.about") }]
                : []),
              { id: "insights", label: t("tabs.insights") },
              ...(updates.length > 0
                ? [{ id: "updates", label: t("tabs.updates") }]
                : []),
            ]}
          />

          <div id="shots" className="scroll-mt-40">
            {/* Screenshots right after the numbers (owner 2026-10-12: visuals early); owner prompt when empty. */}
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
          </div>

          <TractionTiles startup={startup} skip={borrowed} />

          {startup.description ? (
            <section id="about" className="scroll-mt-40 space-y-3 pt-2">
              <h2 className="text-lg font-bold tracking-tight">
                {t("aboutTitle", { name: displayName })}
              </h2>
              <div className="font-prose text-body leading-relaxed text-muted-foreground">
                <ClampedText
                  text={startup.description}
                  more={t("readMore")}
                  less={t("readLess")}
                />
              </div>
            </section>
          ) : (
            // Visitors see nothing here (no lone heading); the owner gets the prompt.
            <div id="about" className="scroll-mt-40">
              <EmptyOwnerCard
                field="description"
                label={t("description")}
                className="w-fit"
              />
            </div>
          )}

          <LookingForBanner startup={startup} />

          <FounderMessageCard startup={startup} />

          {/* Shorter page (owner 2026-10-12): the first part of the insights, then "show all". */}
          <div id="insights" className="scroll-mt-40">
            <ShowMore more={t("insightsMore")} less={t("insightsLess")}>
              <div className="pt-3">
                <InsightsGrid startup={startup} />
              </div>
            </ShowMore>
          </div>

          {updates.length > 0 && (
            <section id="updates" className="scroll-mt-40 pt-3">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold">{t("latestUpdates")}</h2>
                <Link
                  href="/feed"
                  className="text-caption text-faint hover:text-foreground"
                >
                  {t("seeFeed")} →
                </Link>
              </div>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {updates.map((p) => (
                  <li key={p.id}>
                    <PostPreview post={p} now={now} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

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

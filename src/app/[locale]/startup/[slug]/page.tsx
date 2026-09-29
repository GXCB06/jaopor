import { ArrowUpRightIcon, ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import {
  EmptyValue,
  OwnerBar,
  OwnerProvider,
} from "@/components/profile/Owner";
import {
  LookingForBanner,
  ProjectLinks,
  TractionTiles,
} from "@/components/profile/ProjectBlocks";
import {
  InsightsGrid,
  StatTile,
  VerifiedStamp,
} from "@/components/ProfileBlocks";
import { RevenueChart } from "@/components/RevenueChart";
import { ShareStudio } from "@/components/share/ShareStudio";
import { FoundingBadge, StartupLogo } from "@/components/StartupBits";
import { StartupCard } from "@/components/StartupCard";
import { Link } from "@/i18n/navigation";
import {
  getMoreStartups,
  getRank,
  getRevenueSeries,
  getStartupBySlug,
} from "@/lib/data/startups";
import { moneyFull } from "@/lib/format";
import { projectLinks } from "@/lib/links";
import { publicEnv } from "@/lib/public-env";
import { badgeHtml, shareMetrics } from "@/lib/share";
import { logoUrl } from "@/lib/supabase/public";

export const revalidate = 60;

// No slugs at build time: each profile is rendered on first visit, then cached (ISR, 60 s).
export async function generateStaticParams() {
  return [];
}

type Props = PageProps<"/[locale]/startup/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) return {};
  const verified = startup.verification_status === "verified";
  const title = verified
    ? `${startup.name} — ${moneyFull(startup.mrr_cents)} MRR`
    : startup.name;
  return { title, description: startup.tagline ?? undefined };
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

// Design.md §6 /startup/[slug] (Figma "Startup Public Profile") + §5 InfoCard: every section is
// always shown; empty ones invite the owner to "+ Add" and read "Not added" for visitors.
export default async function StartupPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();

  const verified = startup.verification_status === "verified";
  const [t, common, nav, sh, format, rank, series, more] = await Promise.all([
    getTranslations("Profile"),
    getTranslations("Common"),
    getTranslations("Nav"),
    getTranslations("Share"),
    getFormatter(),
    getRank(startup),
    verified && startup.verified_provider === "stripe"
      ? getRevenueSeries(startup.id, 120)
      : Promise.resolve([]),
    getMoreStartups(startup, 6),
  ]);

  // Share kit (Design.md §9): absolute URLs, verified numbers only.
  const url = `${publicEnv.siteUrl}/${locale}/startup/${startup.slug}`;
  const badgeSrc = `${publicEnv.siteUrl}/api/badge/${startup.slug}`;
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
  const notVerified = (
    <EmptyValue field="revenue" visitorText={common("notVerified")} />
  );
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

        <OwnerBar />

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
              </div>
              <div className="max-w-2xl space-y-2 text-body text-muted-foreground">
                {startup.tagline ? (
                  <p>{startup.tagline}</p>
                ) : (
                  <EmptyValue field="tagline" visitorText="" />
                )}
                {startup.description ? (
                  <p className="whitespace-pre-line">{startup.description}</p>
                ) : (
                  <EmptyValue field="description" visitorText="" />
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
        <LookingForBanner startup={startup} />

        {/* A project without verified revenue leads with the numbers it does have (visitors, build). */}
        {tractionFirst && <TractionTiles startup={startup} />}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile
            label={t("allTime")}
            value={verified ? moneyFull(startup.revenue_all_time_cents) : "–"}
            caption={
              verified ? (rank ? t("rank", { rank }) : undefined) : notVerified
            }
          />
          <StatTile
            label={t("mrr")}
            value={verified ? moneyFull(startup.mrr_cents) : "–"}
            caption={
              verified
                ? t("subscriptions", {
                    count: startup.active_subscriptions ?? 0,
                  })
                : notVerified
            }
          />
          <StatTile
            label={t("founder")}
            value={
              ownerName ? (
                <span className="flex items-center gap-2 text-base">
                  {owner?.avatar_url ? (
                    <Image
                      src={owner.avatar_url}
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 rounded-full"
                    />
                  ) : null}
                  <span className="truncate">{ownerName}</span>
                </span>
              ) : (
                "–"
              )
            }
            caption={owner?.x_handle ? `@${owner.x_handle} · 𝕏` : undefined}
          />
          <StatTile
            label={t("founded")}
            value={
              startup.founded_on ? (
                <span className="text-lg">
                  {format.dateTime(new Date(startup.founded_on), {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              ) : (
                "–"
              )
            }
            caption={
              startup.country || startup.province ? (
                [startup.province, countryName(startup.country, locale)]
                  .filter(Boolean)
                  .join(", ")
              ) : (
                <EmptyValue field="founded" />
              )
            }
          />
        </section>

        {series.length > 0 && (
          <section className="rounded-xl border bg-card p-4 sm:p-6">
            <RevenueChart series={series} />
          </section>
        )}
        {startup.verification_status !== "unverified" && (
          <VerifiedStamp startup={startup} />
        )}

        {!tractionFirst && <TractionTiles startup={startup} />}

        <div className="pt-3">
          <InsightsGrid startup={startup} />
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
                <StartupCard key={s.id} startup={s} large />
              ))}
            </div>
          </section>
        )}
      </main>
    </OwnerProvider>
  );
}

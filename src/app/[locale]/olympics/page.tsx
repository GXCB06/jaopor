import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  TrophyIcon,
  XIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/core/Card";
import { MetricSwitch } from "@/components/olympics/MetricSwitch";
import { OlympicsMap } from "@/components/olympics/OlympicsMap";
import { OlympicValue } from "@/components/olympics/OlympicValue";
import { Podium } from "@/components/olympics/Podium";
import { ProvinceFinder } from "@/components/olympics/ProvinceFinder";
import { RegionStandings } from "@/components/olympics/RegionStandings";
import { ShareBoardButton } from "@/components/olympics/ShareBoardButton";
import { StandingsTable } from "@/components/olympics/StandingsTable";
import { QuickSearchSection } from "@/components/search/QuickSearchSection";
import { Link } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import {
  PROVINCE_LIST,
  REGION_LIST,
  getRegion,
  type Region,
} from "@/lib/config/provinces";
import { getThbPerUsd } from "@/lib/data/fx";
import { getProvinceLeaderboard } from "@/lib/data/startups";
import {
  DEFAULT_METRIC,
  boardSummary,
  emptyProvinces,
  parseMetric,
  parseRegion,
  regionStandings,
} from "@/lib/olympics";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/olympics">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Olympics" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: `/${locale}/olympics` },
  };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Design.md §6 Olympics page (redesign 2026-09-30, user: "one of our selling points"):
// event hero with live totals + clickable map · metric switch · podium (empty places invite a
// submission) · standings table from #4 · side panel (regions, "where is my province?") · the
// provinces still open, grouped by region. Metric and region live in the URL.
export default async function OlympicsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/olympics">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const metric = parseMetric(one(sp.metric));
  const region = parseRegion(one(sp.region));

  const [t, common, all, thbPerUsd] = await Promise.all([
    getTranslations("Olympics"),
    getTranslations("Common"),
    getProvinceLeaderboard(metric),
    getThbPerUsd(),
  ]);
  const board = region ? all.filter((r) => r.region === region) : all;
  const summary = boardSummary(board);
  const regions = regionStandings(all);
  const open = emptyProvinces(board, region);
  const metricName = t(`metrics.${metric}`);
  const scope = region
    ? localizedName(getRegion(region), locale)
    : t("nationwide");
  const regionNames = Object.fromEntries(
    REGION_LIST.map((r) => [r.slug, localizedName(r, locale)]),
  ) as Record<Region, string>;
  const clearHref = {
    pathname: "/olympics" as const,
    query: metric !== DEFAULT_METRIC ? { metric } : {},
  };

  const stat = (value: React.ReactNode, label: string) => (
    <div className="min-w-0">
      <div className="truncate text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
        {value}
      </div>
      <div className="truncate text-2xs tracking-wider text-faint uppercase">
        {label}
      </div>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-6">
      <nav
        aria-label="breadcrumb"
        className="mb-4 flex items-center gap-1.5 text-2xs text-faint"
      >
        <Link href="/" className="hover:text-foreground">
          {common("brand")}
        </Link>
        <ChevronRightIcon className="size-3" aria-hidden="true" />
        <span className="text-foreground">{t("title")}</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-card">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_20%,color-mix(in_oklab,var(--brand)_16%,transparent),transparent_70%)]"
        />
        <div className="relative grid gap-6 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 px-2.5 py-1 text-2xs font-bold tracking-wider text-brand-text uppercase">
              <TrophyIcon className="size-3.5" aria-hidden="true" />
              {t("eyebrow", { year: new Date().getFullYear() })}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-2 max-w-xl text-body text-muted-foreground">
              {t("subtitle")}
            </p>
            <div className="mt-6 grid max-w-lg grid-cols-3 gap-4 border-t pt-5">
              {stat(
                <>
                  {summary.provinces}
                  <span className="text-sm font-medium text-faint">
                    /
                    {region
                      ? open.length + summary.provinces
                      : PROVINCE_LIST.length}
                  </span>
                </>,
                t("statProvinces"),
              )}
              {stat(summary.startups, t("statProjects"))}
              {stat(
                <OlympicValue
                  value={summary.total}
                  metric={metric}
                  thbPerUsd={thbPerUsd}
                />,
                t("statTotal", { metric: metricName }),
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <PlusIcon className="size-3.5" aria-hidden="true" />
                {t("ctaCompete")}
              </Link>
              <ShareBoardButton text={t("shareText")} />
            </div>
          </div>
          <figure className="mx-auto flex flex-col items-center gap-2">
            <div className="h-44 sm:h-64 md:h-80">
              <OlympicsMap
                active={regions
                  .filter((r) => r.total > 0 || r.provinces > 0)
                  .map((r) => r.region)}
                selected={region}
                metric={metric}
                names={regionNames}
              />
            </div>
            <figcaption className="text-2xs text-faint">
              {t("mapHint")}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Controls */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-full overflow-x-auto">
          <MetricSwitch metric={metric} region={region} />
        </div>
        {region && (
          <Link
            href={clearHref}
            scroll={false}
            className="inline-flex items-center gap-1.5 self-start rounded-full border bg-secondary px-2.5 py-1 text-caption hover:text-foreground sm:self-auto"
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ background: getRegion(region).color }}
            />
            {scope}
            <XIcon className="size-3" aria-hidden="true" />
            <span className="sr-only">{t("clearRegion")}</span>
          </Link>
        )}
      </div>

      {/* Podium */}
      <Card className="mt-4 p-4 pb-0 sm:p-6 sm:pb-0">
        <h2 className="mb-5 text-center text-xs font-semibold text-muted-foreground">
          {t("podiumTitle", { scope, metric: metricName })}
        </h2>
        <Podium top={board.slice(0, 3)} metric={metric} thbPerUsd={thbPerUsd} />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          {board.length > 3 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold">{t("restTitle")}</h2>
              <StandingsTable
                rows={board.slice(3)}
                startRank={4}
                leaderTotal={board[0].total}
                metric={metric}
                thbPerUsd={thbPerUsd}
              />
            </section>
          )}

          {open.length > 0 && (
            <details
              className="group rounded-xl border border-dashed bg-card"
              open={board.length <= 3}
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs hover:text-foreground sm:px-5 [&::-webkit-details-marker]:hidden">
                <ChevronDownIcon
                  className="size-3.5 shrink-0 text-faint transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
                <span className="font-semibold">
                  {t("emptyProvinces", { n: open.length })}
                </span>
              </summary>
              <div className="space-y-4 border-t px-4 py-4 sm:px-5">
                {REGION_LIST.filter((r) =>
                  open.some((p) => p.region === r.slug),
                ).map((r) => (
                  <div key={r.slug} className="space-y-2">
                    <h3 className="flex items-center gap-1.5 text-2xs font-semibold tracking-wider text-faint uppercase">
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full"
                        style={{ background: r.color }}
                      />
                      {localizedName(r, locale)}
                    </h3>
                    <ul className="flex flex-wrap gap-1.5">
                      {open
                        .filter((p) => p.region === r.slug)
                        .map((p) => (
                          <li key={p.slug}>
                            <Link
                              href={`/province/${p.slug}`}
                              className="inline-block rounded-full border bg-secondary px-2.5 py-0.5 text-2xs text-muted-foreground hover:text-foreground"
                            >
                              {localizedName(p, locale)}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
                <Link
                  href="/new"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  <PlusIcon className="size-3.5" aria-hidden="true" />
                  {t("ctaCompete")}
                </Link>
              </div>
            </details>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-2 px-1 text-xs font-semibold">
              {t("regionsTitle")}
            </h2>
            <RegionStandings
              standings={regions}
              selected={region}
              metric={metric}
              thbPerUsd={thbPerUsd}
            />
          </Card>
          <Card className="p-4">
            <ProvinceFinder />
          </Card>
        </aside>
      </div>

      <p className="mt-6 text-center text-2xs text-faint">{t("footnote")}</p>

      <QuickSearchSection />
    </main>
  );
}

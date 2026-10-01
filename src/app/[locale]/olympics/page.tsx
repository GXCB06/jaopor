import { ChevronRightIcon, FlameIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/core/Card";
import { MetricSwitch } from "@/components/olympics/MetricSwitch";
import { OlympicsBoard, RankChange } from "@/components/olympics/OlympicsBoard";
import { OlympicsMap } from "@/components/olympics/OlympicsMap";
import { OlympicValue } from "@/components/olympics/OlympicValue";
import { Podium } from "@/components/olympics/Podium";
import { ProvinceBadge } from "@/components/olympics/ProvinceBadge";
import { RegionStandings } from "@/components/olympics/RegionStandings";
import { ShareRankCard } from "@/components/olympics/ShareRankCard";
import { QuickSearchSection } from "@/components/search/QuickSearchSection";
import { Link } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import {
  PROVINCE_LIST,
  REGION_LIST,
  getProvince,
  type Region,
} from "@/lib/config/provinces";
import { getThbPerUsd } from "@/lib/data/fx";
import { getProvinceLeaderboard } from "@/lib/data/startups";
import {
  DEFAULT_METRIC,
  boardSummary,
  climbers,
  emptyProvinces,
  parseMetric,
  parseRegion,
  regionStandings,
} from "@/lib/olympics";
import { logoUrl } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";

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

const OPEN_CHIPS = 10;

// Design.md §6 Olympics page (v3, 2026-10-01: Claude Design structure + our open-spot podium and
// map): season header + national stats · podium cards · metric/region controls · your province +
// standings · sidebar (regions with map, climbers, share, how scoring works) · open provinces.
export default async function OlympicsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/olympics">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const metric = parseMetric(one(sp.metric));
  const region = parseRegion(one(sp.region));

  const [t, common, national, thbPerUsd] = await Promise.all([
    getTranslations("Olympics"),
    getTranslations("Common"),
    getProvinceLeaderboard(metric),
    getThbPerUsd(),
  ]);
  // Logo URLs resolved here: the board below is a client component.
  const board = (
    region ? await getProvinceLeaderboard(metric, region) : national
  ).map((r) => ({
    ...r,
    top: r.top.map((s) => ({ ...s, logo_url: logoUrl(s.logo_path) })),
  }));
  const summary = boardSummary(national);
  const regions = regionStandings(national);
  const rising = climbers(national);
  const open = emptyProvinces(board, region);
  const metricName = t(`metrics.${metric}`);
  const season = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH-u-ca-gregory" : "en",
    { month: "long", year: "numeric" },
  ).format(new Date());
  const regionNames = Object.fromEntries(
    REGION_LIST.map((r) => [r.slug, localizedName(r, locale)]),
  ) as Record<Region, string>;
  const ranks = Object.fromEntries(national.map((r) => [r.province, r.rank]));
  const regionHref = (r: Region | null) => ({
    pathname: "/olympics" as const,
    query: {
      ...(metric !== DEFAULT_METRIC && { metric }),
      ...(r && { region: r }),
    },
  });
  const chip = (active: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption whitespace-nowrap transition-colors",
      active
        ? "border-foreground/20 bg-secondary font-semibold text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );
  const value = (v: number) => (
    <OlympicValue value={v} metric={metric} thbPerUsd={thbPerUsd} />
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

      {/* Header: season + national stats */}
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-2xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-positive"
              />
              {t("updatedDaily")}
            </span>
            <span className="text-faint">{t("season", { season })}</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-xl text-body text-muted-foreground">
            {t("subtitle")}
          </p>
          {/* The header has no leaderboard link since Phase 10c (Figma 160-555): it lives here. */}
          <Link
            href={{ pathname: "/", hash: "leaderboard" }}
            className="mt-3 inline-flex items-center gap-1 text-caption font-semibold text-brand-text hover:underline"
          >
            {t("startupLeaderboard")} →
          </Link>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3">
          <Card className="min-w-36 p-3.5">
            <p className="text-2xs tracking-wider text-faint uppercase">
              {t("statProvinces")}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {summary.provinces}
              <span className="text-sm font-medium text-faint">
                {" "}
                / {PROVINCE_LIST.length}
              </span>
            </p>
          </Card>
          <Card className="min-w-36 p-3.5">
            <p className="truncate text-2xs tracking-wider text-faint uppercase">
              {t("statTotal", { metric: metricName })}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {value(summary.total)}
            </p>
          </Card>
        </div>
      </header>

      {/* Podium */}
      <section aria-label={t("podium")} className="mt-8">
        <Podium top={board.slice(0, 3)} metric={metric} thbPerUsd={thbPerUsd} />
      </section>

      {/* Controls */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="max-w-full shrink-0 overflow-x-auto">
          <MetricSwitch metric={metric} region={region} />
        </div>
        <nav
          aria-label={t("region")}
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0 lg:pb-0"
        >
          <Link
            href={regionHref(null)}
            scroll={false}
            aria-current={region === null ? "page" : undefined}
            className={chip(region === null)}
          >
            {t("allRegions")}
          </Link>
          {REGION_LIST.map((r) => (
            <Link
              key={r.slug}
              href={regionHref(r.slug)}
              scroll={false}
              aria-current={region === r.slug ? "page" : undefined}
              className={chip(region === r.slug)}
            >
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full"
                style={{ background: r.color }}
              />
              {localizedName(r, locale)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <OlympicsBoard board={board} metric={metric} thbPerUsd={thbPerUsd} />

          {open.length > 0 && (
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold">
                    {t("openTitle", { n: open.length })}
                  </h2>
                  <p className="mt-1 text-caption text-muted-foreground">
                    {t("openSub")}
                  </p>
                </div>
                <Link
                  href="/new"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  <PlusIcon className="size-3.5" aria-hidden="true" />
                  {t("addProject")}
                </Link>
              </div>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {open.slice(0, OPEN_CHIPS).map((p) => (
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
              {open.length > OPEN_CHIPS && (
                <details className="group mt-1.5">
                  <summary className="inline-block cursor-pointer list-none rounded-full border border-dashed px-2.5 py-0.5 text-2xs text-muted-foreground group-open:hidden hover:text-foreground [&::-webkit-details-marker]:hidden">
                    {t("moreProvinces", { n: open.length - OPEN_CHIPS })}
                  </summary>
                  <ul className="flex flex-wrap gap-1.5">
                    {open.slice(OPEN_CHIPS).map((p) => (
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
                </details>
              )}
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 text-xs font-semibold">{t("regionsTitle")}</h2>
            <div className="mb-3 flex h-36 justify-center">
              <OlympicsMap
                active={regions
                  .filter((r) => r.provinces > 0)
                  .map((r) => r.region)}
                selected={region}
                metric={metric}
                names={regionNames}
              />
            </div>
            <RegionStandings
              standings={regions}
              selected={region}
              metric={metric}
              thbPerUsd={thbPerUsd}
            />
          </Card>

          {rising.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold">
                <FlameIcon
                  className="size-3.5 text-warning"
                  aria-hidden="true"
                />
                {t("risingTitle")}
              </h2>
              <ul className="space-y-2">
                {rising.map((r) => {
                  const p = getProvince(r.province)!;
                  return (
                    <li key={r.province}>
                      <Link
                        href={`/province/${p.slug}`}
                        className="flex items-center gap-2.5 text-caption hover:underline"
                      >
                        <ProvinceBadge region={p.region} className="h-7 w-10" />
                        <span className="min-w-0 flex-1 truncate">
                          {localizedName(p, locale)}
                        </span>
                        <RankChange row={r} metric={metric} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <ShareRankCard ranks={ranks} />

          <Card className="p-4">
            <h2 className="text-xs font-semibold">{t("howTitle")}</h2>
            <p className="mt-1.5 text-caption leading-relaxed text-muted-foreground">
              {t("howBody")}
            </p>
          </Card>
        </aside>
      </div>

      <QuickSearchSection />
    </main>
  );
}

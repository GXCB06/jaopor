import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MetricSwitch } from "@/components/olympics/MetricSwitch";
import { ProvinceCard } from "@/components/olympics/ProvinceCard";
import { AddStartupButton, QuickSearch } from "@/components/search/QuickSearch";
import { QuickSearchSection } from "@/components/search/QuickSearchSection";
import { Link } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import { REGION_LIST } from "@/lib/config/provinces";
import { getThbPerUsd } from "@/lib/data/fx";
import { getProvinceLeaderboard } from "@/lib/data/startups";
import {
  DEFAULT_METRIC,
  emptyProvinces,
  parseMetric,
  parseRegion,
} from "@/lib/olympics";
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

// Design.md §6 Olympics page (spec 6.7): metric + region live in the URL; provinces with a
// verified number are ranked cards, the rest collapse into one "not yet" list.
export default async function OlympicsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/olympics">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const metric = parseMetric(one(sp.metric));
  const region = parseRegion(one(sp.region));

  const [t, common, ranked, thbPerUsd] = await Promise.all([
    getTranslations("Olympics"),
    getTranslations("Common"),
    getProvinceLeaderboard(metric, region),
    getThbPerUsd(),
  ]);
  const empty = emptyProvinces(ranked, region);

  const regionHref = (r: string | null) => ({
    pathname: "/olympics" as const,
    query: {
      ...(metric !== DEFAULT_METRIC && { metric }),
      ...(r && { region: r }),
    },
  });
  const chip = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption whitespace-nowrap transition-colors",
      active
        ? "border-foreground/20 bg-secondary font-semibold text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8">
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
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-body text-muted-foreground">
        {t("subtitle")}
      </p>
      <div className="mt-5 flex max-w-[640px] items-start gap-2">
        <QuickSearch />
        <AddStartupButton />
      </div>

      <div className="mt-8 space-y-3">
        <div className="max-w-full overflow-x-auto">
          <MetricSwitch metric={metric} region={region} />
        </div>
        <nav
          aria-label={t("region")}
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          <Link
            href={regionHref(null)}
            aria-current={region === null ? "page" : undefined}
            className={chip(region === null)}
            scroll={false}
          >
            {t("allRegions")}
          </Link>
          {REGION_LIST.map((r) => (
            <Link
              key={r.slug}
              href={regionHref(r.slug)}
              aria-current={region === r.slug ? "page" : undefined}
              className={chip(region === r.slug)}
              scroll={false}
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

      {ranked.length > 0 ? (
        <ol className="mt-5 space-y-3">
          {ranked.map((row, i) => (
            <li key={row.province}>
              <ProvinceCard
                row={row}
                rank={i + 1}
                metric={metric}
                thbPerUsd={thbPerUsd}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed bg-card px-5 py-10 text-center text-xs text-muted-foreground">
          {t("noneYet", { metric: t(`metrics.${metric}`) })}
        </p>
      )}

      {empty.length > 0 && (
        <details className="group mt-3 rounded-xl border bg-card">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs text-muted-foreground hover:text-foreground sm:px-5 [&::-webkit-details-marker]:hidden">
            <ChevronDownIcon
              className="size-3.5 shrink-0 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
            {t("emptyProvinces", { n: empty.length })}
          </summary>
          <div className="space-y-4 border-t px-4 py-4 sm:px-5">
            <ul className="flex flex-wrap gap-1.5">
              {empty.map((p) => (
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
            <AddStartupButton />
          </div>
        </details>
      )}

      <p className="mt-4 text-center text-2xs text-faint">{t("footnote")}</p>

      <QuickSearchSection />
    </main>
  );
}

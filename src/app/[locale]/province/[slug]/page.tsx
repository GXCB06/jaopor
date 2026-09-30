import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProvinceBadge, RegionChip } from "@/components/olympics/ProvinceBadge";
import { AddStartupButton, QuickSearch } from "@/components/search/QuickSearch";
import { QuickSearchSection } from "@/components/search/QuickSearchSection";
import { StartupCard } from "@/components/StartupCard";
import { Link } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import { PROVINCE_LIST, getProvince, getRegion } from "@/lib/config/provinces";
import { getThbPerUsd } from "@/lib/data/fx";
import { getProvinceLeaderboard, listStartups } from "@/lib/data/startups";
import { DEFAULT_METRIC, provinceRank } from "@/lib/olympics";

export const revalidate = 60;

// Rendered on first visit per province, then cached (ISR 60 s), like startup profiles.
export async function generateStaticParams() {
  return [];
}

type Props = PageProps<"/[locale]/province/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = getProvince(slug);
  if (!p) return {};
  const t = await getTranslations({ locale, namespace: "Province" });
  const name = localizedName(p, locale);
  return {
    title: t("title", { name }),
    description: t("subtitle", {
      name,
      region: localizedName(getRegion(p.region), locale),
    }),
    alternates: { canonical: `/${locale}/province/${p.slug}` },
  };
}

// Design.md §6 Province page (spec 6.7): the province's projects, its Olympics rank, and the other
// provinces of the same region.
export default async function ProvincePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = getProvince(slug);
  if (!p) notFound();

  const [t, o, common, { rows, total }, ranked, thbPerUsd] = await Promise.all([
    getTranslations("Province"),
    getTranslations("Olympics"),
    getTranslations("Common"),
    listStartups({ province: p.slug, sort: "mrr" }),
    getProvinceLeaderboard(DEFAULT_METRIC),
    getThbPerUsd(),
  ]);
  const name = localizedName(p, locale);
  const region = getRegion(p.region);
  const rank = provinceRank(ranked, p.slug);
  const nearby = PROVINCE_LIST.filter(
    (x) => x.region === p.region && x.slug !== p.slug,
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8">
      <nav
        aria-label="breadcrumb"
        className="mb-4 flex min-w-0 items-center gap-1.5 text-2xs text-faint"
      >
        <Link href="/" className="shrink-0 hover:text-foreground">
          {common("brand")}
        </Link>
        <ChevronRightIcon className="size-3 shrink-0" aria-hidden="true" />
        <Link href="/olympics" className="truncate hover:text-foreground">
          {o("title")}
        </Link>
        <ChevronRightIcon className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate text-foreground">{name}</span>
      </nav>

      <div className="flex items-center gap-3">
        <ProvinceBadge region={p.region} />
        <h1 className="min-w-0 text-2xl font-bold tracking-tight">
          {t("title", { name })}
        </h1>
      </div>
      <p className="mt-2 text-body text-muted-foreground">
        {t("subtitle", { name, region: localizedName(region, locale) })}
      </p>
      {rank && (
        <p className="mt-2">
          <Link
            href="/olympics"
            className="text-caption font-medium text-brand-text hover:underline"
          >
            {t("rankLine", { rank, metric: o(`metrics.${DEFAULT_METRIC}`) })}
          </Link>
        </p>
      )}
      <div className="mt-5 flex max-w-[640px] items-start gap-2">
        <QuickSearch />
        <AddStartupButton />
      </div>

      <p className="mt-8 mb-3 text-caption text-muted-foreground tabular-nums">
        {t("count", { count: total })}
      </p>
      {rows.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <li key={s.id} className="min-w-0">
              <StartupCard
                startup={s}
                large
                third="allTime"
                thbPerUsd={thbPerUsd}
                className="h-full"
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-5 py-10 text-center">
          <p className="text-xs text-muted-foreground">
            {t("empty", { name })}
          </p>
          <AddStartupButton />
        </div>
      )}
      {total > rows.length && (
        <p className="mt-3 text-center">
          <Link
            href={{ pathname: "/startups", query: { province: p.slug } }}
            className="text-caption text-brand-text hover:underline"
          >
            {t("seeAll", { n: total })}
          </Link>
        </p>
      )}

      <div className="mt-8 space-y-3">
        <Link
          href="/olympics"
          className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
          {t("back")}
        </Link>
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold">
            {t("nearby")}
            <RegionChip region={p.region} locale={locale} />
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {nearby.map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/province/${x.slug}`}
                  className="inline-block rounded-full border bg-secondary px-2.5 py-0.5 text-2xs text-muted-foreground hover:text-foreground"
                >
                  {localizedName(x, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <QuickSearchSection />
    </main>
  );
}

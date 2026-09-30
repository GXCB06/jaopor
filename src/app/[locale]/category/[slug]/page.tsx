import { ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AddStartupButton, QuickSearch } from "@/components/search/QuickSearch";
import { QuickSearchSection } from "@/components/search/QuickSearchSection";
import { StartupCard } from "@/components/StartupCard";
import { Link } from "@/i18n/navigation";
import {
  CATEGORY_LIST,
  getCategory,
  type Category,
} from "@/lib/config/categories";
import { localizedName } from "@/lib/config/localized";
import { getThbPerUsd } from "@/lib/data/fx";
import { getCategoryCounts, listStartups } from "@/lib/data/startups";

export const revalidate = 60;

// Rendered on first visit per category, then cached (ISR 60 s).
export async function generateStaticParams() {
  return [];
}

type Props = PageProps<"/[locale]/category/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = getCategory(slug);
  if (!c) return {};
  const t = await getTranslations({ locale, namespace: "Category" });
  return {
    title: t("title", { name: localizedName(c, locale) }),
    description: locale === "th" ? c.descTh : c.descEn,
    alternates: { canonical: `/${locale}/category/${c.slug}` },
  };
}

// Design.md §6 Category page (TrustMRR pattern, 2026-09-30): the category is the page's title, so a
// visitor always knows which topic they're in. Centred header · search · 3-column cards · other
// categories.
export default async function CategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const c = getCategory(slug);
  if (!c) notFound();

  const [t, cats, common, { rows, total }, counts, thbPerUsd] =
    await Promise.all([
      getTranslations("Category"),
      getTranslations("Categories"),
      getTranslations("Common"),
      listStartups({ category: c.slug as Category, sort: "mrr" }),
      getCategoryCounts(),
      getThbPerUsd(),
    ]);
  const name = localizedName(c, locale);
  const Icon = c.icon;
  const others = CATEGORY_LIST.filter((x) => x.slug !== c.slug)
    .map((x, order) => ({ ...x, order, count: counts[x.slug] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, 12);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8">
      <nav
        aria-label="breadcrumb"
        className="mb-6 flex min-w-0 items-center justify-center gap-1.5 text-caption text-faint"
      >
        <Link href="/" className="shrink-0 hover:text-foreground">
          {common("brand")}
        </Link>
        <ChevronRightIcon className="size-3 shrink-0" aria-hidden="true" />
        <Link href="/categories" className="shrink-0 hover:text-foreground">
          {cats("breadcrumb")}
        </Link>
        <ChevronRightIcon className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate text-foreground">{name}</span>
      </nav>

      <header className="mx-auto max-w-2xl text-center">
        <span
          aria-hidden="true"
          className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border bg-card text-foreground"
        >
          <Icon className="size-5" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("title", { name })}
        </h1>
        <p className="mt-3 text-body text-muted-foreground">
          {t.rich("subtitle", {
            desc: locale === "th" ? c.descTh : c.descEn,
            count: total,
            b: (chunk) => (
              <b className="font-bold text-foreground tabular-nums">{chunk}</b>
            ),
          })}
        </p>
      </header>
      <div className="mx-auto mt-6 flex max-w-[640px] items-start gap-2">
        <QuickSearch />
        <AddStartupButton />
      </div>

      <section className="mt-10">
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
          <p className="mt-4 text-center">
            <Link
              href={{ pathname: "/startups", query: { category: c.slug } }}
              className="text-caption text-brand-text hover:underline"
            >
              {t("seeAll", { n: total })}
            </Link>
          </p>
        )}
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xs font-semibold">{t("others")}</h2>
        <ul className="flex flex-wrap gap-1.5">
          {others.map(({ slug: s, icon: OtherIcon, count, ...x }) => (
            <li key={s}>
              <Link
                href={`/category/${s}`}
                className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-2.5 py-1 text-caption text-muted-foreground hover:text-foreground"
              >
                <OtherIcon className="size-3.5 shrink-0" aria-hidden="true" />
                {localizedName(x, locale)}
                {count > 0 && (
                  <span className="font-bold text-foreground tabular-nums">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/categories"
              className="inline-flex items-center rounded-full px-2.5 py-1 text-caption text-brand-text hover:underline"
            >
              {cats("breadcrumb")} →
            </Link>
          </li>
        </ul>
      </section>

      <QuickSearchSection />
    </main>
  );
}

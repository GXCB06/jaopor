import { ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { QuickSearchSection } from "@/components/search/QuickSearchSection";
import { Link } from "@/i18n/navigation";
import { CATEGORY_LIST } from "@/lib/config/categories";
import { localizedName } from "@/lib/config/localized";
import { getCategoryCounts } from "@/lib/data/startups";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/categories">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Categories" });
  return {
    title: t("title"),
    description: t("subtitle", { n: CATEGORY_LIST.length }),
  };
}

// Design.md §6 Categories page (spec 6.6, compact TrustMRR-style list, 2026-09-30): centred header,
// 4/2/1-column grid of one-line cards (icon · name + count · one-line description), busiest first,
// empty ones last and dimmed. Each card opens /category/{slug}.
export default async function CategoriesPage({
  params,
}: PageProps<"/[locale]/categories">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, common, counts] = await Promise.all([
    getTranslations("Categories"),
    getTranslations("Common"),
    getCategoryCounts(),
  ]);

  const cards = CATEGORY_LIST.map((c, order) => ({
    ...c,
    order,
    count: counts[c.slug] ?? 0,
  })).sort((a, b) => b.count - a.count || a.order - b.order);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-8">
      <nav
        aria-label="breadcrumb"
        className="mb-6 flex items-center justify-center gap-1.5 text-caption text-faint"
      >
        <Link href="/" className="hover:text-foreground">
          {common("brand")}
        </Link>
        <ChevronRightIcon className="size-3" aria-hidden="true" />
        <span className="text-foreground">{t("breadcrumb")}</span>
      </nav>
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-body text-muted-foreground">
          {t("subtitle", { n: CATEGORY_LIST.length })}
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ slug, icon: Icon, count, ...c }) => (
          <li key={slug} className="min-w-0">
            <Link
              href={`/category/${slug}`}
              className="group flex h-full min-w-0 items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-border-strong focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground group-hover:text-foreground",
                  count === 0 && "opacity-50",
                )}
              >
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span
                    className={cn(
                      "truncate text-sm font-semibold",
                      count === 0 && "text-muted-foreground",
                    )}
                  >
                    {localizedName(c, locale)}
                  </span>
                  {count > 0 && (
                    <span className="shrink-0 text-2xs font-bold text-brand-text tabular-nums">
                      {t("projects", { count })}
                    </span>
                  )}
                </span>
                <span className="block truncate text-caption text-muted-foreground">
                  {locale === "th" ? c.descTh : c.descEn}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <QuickSearchSection />
    </main>
  );
}

import { ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/core/Card";
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

// Design.md §6 Categories page (spec 6.6): every category with its project count, busiest first,
// empty ones last and dimmed. Each card opens the directory filtered to that category.
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
        className="mb-4 flex items-center gap-1.5 text-2xs text-faint"
      >
        <Link href="/" className="hover:text-foreground">
          {common("brand")}
        </Link>
        <ChevronRightIcon className="size-3" aria-hidden="true" />
        <span className="text-foreground">{t("breadcrumb")}</span>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 mb-6 text-body text-muted-foreground">
        {t("subtitle", { n: CATEGORY_LIST.length })}
      </p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ slug, icon: Icon, count, ...c }) => (
          <li key={slug}>
            <Link
              href={{ pathname: "/startups", query: { category: slug } }}
              className="group block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Card
                interactive
                // Empty categories are dimmed (spec) but stay readable: only the icon fades and
                // the name drops to muted text; text never loses contrast.
                className="flex h-full flex-col gap-3 p-4"
              >
                <span className="flex items-start justify-between gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground group-hover:text-foreground",
                      count === 0 && "opacity-40",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="rounded-full border bg-secondary px-2 py-0.5 text-2xs text-muted-foreground tabular-nums">
                    <span className="font-bold text-foreground">{count}</span>{" "}
                    {t("projects", { count })}
                  </span>
                </span>
                <span className="min-w-0 space-y-1">
                  <span
                    className={cn(
                      "block text-sm font-bold",
                      count === 0 && "text-muted-foreground",
                    )}
                  >
                    {localizedName(c, locale)}
                  </span>
                  <span className="line-clamp-2 text-caption text-muted-foreground">
                    {locale === "th" ? c.descTh : c.descEn}
                  </span>
                </span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <QuickSearchSection />
    </main>
  );
}

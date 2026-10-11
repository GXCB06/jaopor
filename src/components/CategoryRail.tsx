import { ChevronRightIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CATEGORY_LIST } from "@/lib/config/categories";
import { localizedName } from "@/lib/config/localized";
import { getCategoryCounts } from "@/lib/data/startups";

const SHOWN = 12;

/**
 * Design.md §5 CategoryRail (owner-approved 2026-10-12, pattern seen on ploykhong.app): one row of
 * category chips with icons under the home search. Categories that have projects come first (most
 * first), then the rest in list order; scrolls sideways on phones, wraps on wide screens.
 */
export async function CategoryRail() {
  const [t, locale, counts] = await Promise.all([
    getTranslations("Home"),
    getLocale(),
    getCategoryCounts().catch(() => ({}) as Record<string, number>),
  ]);
  const order = new Map(CATEGORY_LIST.map((c, i) => [c.slug, i]));
  const shown = [...CATEGORY_LIST]
    .filter((c) => c.slug !== "other")
    .sort(
      (a, b) =>
        (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0) ||
        order.get(a.slug)! - order.get(b.slug)!,
    )
    .slice(0, SHOWN);

  return (
    <nav
      aria-label={t("categoryRail")}
      className="-mx-4 mt-5 flex w-screen max-w-3xl [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-full sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
    >
      {shown.map((c) => {
        const Icon = c.icon;
        const n = counts[c.slug] ?? 0;
        return (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-caption whitespace-nowrap text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            {localizedName(c, locale)}
            {n > 0 && <span className="text-faint tabular-nums">{n}</span>}
          </Link>
        );
      })}
      <Link
        href="/categories"
        className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-1.5 text-caption font-semibold whitespace-nowrap text-brand-text hover:underline"
      >
        {t("allCategories")}
        <ChevronRightIcon className="size-3.5" aria-hidden="true" />
      </Link>
    </nav>
  );
}

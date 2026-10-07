import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CATEGORY_LIST } from "@/lib/config/categories";
import { localizedName } from "@/lib/config/localized";
import { cn } from "@/lib/utils";
import { AddStartupButton, QuickSearch } from "./QuickSearch";

/** Design.md §5 QuickSearch bottom section (spec 6.8): "หาผลงานอื่นต่อ" above the footer. */
export async function QuickSearchSection({
  chips = true,
}: {
  /** Home hides the category chips (its categories teaser already lists them). */
  chips?: boolean;
} = {}) {
  const [t, locale] = await Promise.all([
    getTranslations("Search"),
    getLocale(),
  ]);
  return (
    <section
      aria-labelledby="quicksearch-title"
      className="mt-16 border-t pt-12"
    >
      <div className="mx-auto max-w-[640px] space-y-4 text-center">
        <h2 id="quicksearch-title" className="text-sm text-muted-foreground">
          {t("sectionTitle")}
        </h2>
        <div className="flex items-start gap-2 text-left">
          <QuickSearch />
          <AddStartupButton />
        </div>
        <div
          className={cn(
            "flex flex-wrap justify-center gap-1.5",
            !chips && "hidden",
          )}
        >
          {CATEGORY_LIST.slice(0, 8).map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="rounded-full border bg-secondary px-2.5 py-0.5 text-2xs text-muted-foreground hover:text-foreground"
            >
              {localizedName(c, locale)}
            </Link>
          ))}
          <Link
            href="/olympics"
            className="rounded-full border border-brand/40 bg-secondary px-2.5 py-0.5 text-2xs text-brand-text hover:underline"
          >
            {t("olympicsChip")}
          </Link>
        </div>
      </div>
    </section>
  );
}

import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/core/Card";
import { Medal } from "@/components/core/Medal";
import { ProvinceBadge } from "@/components/olympics/ProvinceBadge";
import { Money } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { CATEGORY_LIST } from "@/lib/config/categories";
import { localizedName } from "@/lib/config/localized";
import { getProvince } from "@/lib/config/provinces";
import { getCategoryCounts, getProvinceLeaderboard } from "@/lib/data/startups";
import { DEFAULT_METRIC } from "@/lib/olympics";
import { cn } from "@/lib/utils";

/**
 * Design.md §5 HomeTeasers (spec 6.2): "สำรวจหมวดหมู่" (8 busiest categories as chips) and
 * "โอลิมปิกจังหวัด" (top 3 provinces). The Olympics card is left out while no province has a
 * verified number (empty-state rule); categories then take the full width.
 */
export async function HomeTeasers({ thbPerUsd }: { thbPerUsd: number | null }) {
  const [t, common, locale, counts, ranked] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Common"),
    getLocale(),
    getCategoryCounts(),
    getProvinceLeaderboard(DEFAULT_METRIC),
  ]);
  const top = CATEGORY_LIST.map((c, order) => ({
    ...c,
    order,
    count: counts[c.slug] ?? 0,
  }))
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, 8);
  const podium = ranked.slice(0, 3);

  const header = (title: string, href: string) => (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-sm font-bold">{title}</h2>
      <Link
        href={href}
        className="shrink-0 text-caption text-faint hover:text-foreground"
      >
        {common("viewAll")} ›
      </Link>
    </div>
  );

  return (
    <section
      className={cn("mt-9 grid gap-3", podium.length > 0 && "md:grid-cols-2")}
    >
      <Card className="p-5">
        {header(t("categoriesTeaser"), "/categories")}
        <ul className="flex flex-wrap gap-1.5">
          {top.map(({ slug, icon: Icon, count, ...c }) => (
            <li key={slug}>
              <Link
                href={{ pathname: "/startups", query: { category: slug } }}
                className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-2.5 py-1 text-caption text-muted-foreground hover:text-foreground"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                {localizedName(c, locale)}
                {count > 0 && (
                  <span className="font-bold text-foreground tabular-nums">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {podium.length > 0 && (
        <Card className="p-5">
          {header(t("olympicsTeaser"), "/olympics")}
          <ol className="space-y-2.5">
            {podium.map((row, i) => {
              const p = getProvince(row.province)!;
              return (
                <li key={row.province}>
                  <Link
                    href={`/province/${p.slug}`}
                    className="group flex items-center gap-3"
                  >
                    <Medal rank={i + 1} />
                    <ProvinceBadge region={p.region} className="h-8 w-11" />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold group-hover:underline">
                      {localizedName(p, locale)}
                    </span>
                    <span className="shrink-0 text-xs font-bold tabular-nums">
                      <Money cents={row.total} thbPerUsd={thbPerUsd} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-2xs text-faint">{t("olympicsTeaserSub")}</p>
        </Card>
      )}
    </section>
  );
}

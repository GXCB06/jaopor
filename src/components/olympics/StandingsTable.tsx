import { getLocale, getTranslations } from "next-intl/server";
import { StartupLogo } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import { getProvince, getRegion } from "@/lib/config/provinces";
import type { OlympicMetric, ProvinceRank } from "@/lib/olympics";
import { logoUrl } from "@/lib/supabase/public";
import { OlympicValue } from "./OlympicValue";

/**
 * Design.md §5 StandingsTable: ranks after the podium, one scannable row each (rank · province
 * with its region dot · top projects · share of the leader · total). Rows open the province page.
 */
export async function StandingsTable({
  rows,
  startRank,
  leaderTotal,
  metric,
  thbPerUsd,
}: {
  rows: ProvinceRank[];
  startRank: number;
  leaderTotal: number;
  metric: OlympicMetric;
  thbPerUsd: number | null;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("Olympics"),
    getLocale(),
  ]);
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full table-fixed text-left">
        <thead>
          <tr className="border-b text-2xs font-bold tracking-wider text-faint uppercase">
            <th className="w-12 py-2.5 pl-4 font-bold">#</th>
            <th className="px-3 py-2.5 font-bold">{t("province")}</th>
            <th className="hidden w-[30%] px-3 py-2.5 font-bold md:table-cell">
              {t("topProjects")}
            </th>
            <th className="w-28 py-2.5 pr-4 pl-3 text-right font-bold sm:w-36">
              {t(`metrics.${metric}`)}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const p = getProvince(row.province)!;
            const region = getRegion(p.region);
            const pct = leaderTotal > 0 ? (row.total / leaderTotal) * 100 : 0;
            return (
              <tr
                key={row.province}
                className="group relative border-b transition-colors last:border-b-0 hover:bg-accent/50"
              >
                <td className="py-3 pl-4 text-xs font-bold text-faint tabular-nums">
                  {startRank + i}
                </td>
                <td className="px-3 py-3">
                  {/* The row's link covers the whole row (after:absolute). */}
                  <Link
                    href={`/province/${p.slug}`}
                    className="flex min-w-0 items-center gap-2 after:absolute after:inset-0"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: region.color }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold group-hover:underline">
                        {localizedName(p, locale)}
                      </span>
                      <span className="block truncate text-2xs text-faint">
                        {localizedName(region, locale)} ·{" "}
                        {t("startups", { count: row.startups })}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-3 py-3 md:table-cell">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex shrink-0 -space-x-1.5">
                      {row.top.slice(0, 3).map((s) => (
                        <StartupLogo
                          key={s.slug}
                          name={s.name}
                          src={logoUrl(s.logo_path)}
                          size={20}
                          className="ring-2 ring-card"
                        />
                      ))}
                    </span>
                    <span className="truncate text-2xs text-muted-foreground">
                      {row.top[0]?.name}
                    </span>
                  </span>
                </td>
                <td className="py-3 pr-4 pl-3 text-right">
                  <span className="block text-xs font-bold tabular-nums">
                    <OlympicValue
                      value={row.total}
                      metric={metric}
                      thbPerUsd={thbPerUsd}
                    />
                  </span>
                  <span
                    aria-hidden="true"
                    className="mt-1.5 ml-auto block h-1 w-full max-w-24 overflow-hidden rounded-full bg-secondary"
                  >
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

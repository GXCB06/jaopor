import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import { getRegion, type Region } from "@/lib/config/provinces";
import {
  DEFAULT_METRIC,
  type OlympicMetric,
  type RegionStanding,
} from "@/lib/olympics";
import { cn } from "@/lib/utils";
import { OlympicValue } from "./OlympicValue";

/**
 * Design.md §5 RegionStandings ("ภาคไหนนำ"): all 6 regions ranked by their total with a bar in the
 * region colour and "{n}/{of} จังหวัด" coverage. Each row filters the board to that region
 * (the accessible twin of clicking the map); the selected one is marked.
 */
export async function RegionStandings({
  standings,
  selected,
  metric,
  thbPerUsd,
}: {
  standings: RegionStanding[];
  selected: Region | null;
  metric: OlympicMetric;
  thbPerUsd: number | null;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("Olympics"),
    getLocale(),
  ]);
  const max = Math.max(1, ...standings.map((s) => s.total));
  const href = (r: Region | null) => ({
    pathname: "/olympics" as const,
    query: {
      ...(metric !== DEFAULT_METRIC && { metric }),
      ...(r && { region: r }),
    },
  });

  return (
    <nav aria-label={t("region")}>
      <ul className="space-y-1">
        <li>
          <Link
            href={href(null)}
            scroll={false}
            aria-current={selected === null ? "page" : undefined}
            className={cn(
              "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-caption transition-colors hover:bg-accent",
              selected === null
                ? "bg-secondary font-semibold text-foreground"
                : "text-muted-foreground",
            )}
          >
            {t("allRegions")}
          </Link>
        </li>
        {standings.map((s) => {
          const r = getRegion(s.region);
          const on = selected === s.region;
          return (
            <li key={s.region}>
              <Link
                href={href(on ? null : s.region)}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-2.5 py-1.5 transition-colors hover:bg-accent",
                  on && "bg-secondary",
                )}
              >
                <span className="flex items-center gap-2 text-caption">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: r.color }}
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      on
                        ? "font-semibold text-foreground"
                        : "text-foreground/90",
                    )}
                  >
                    {localizedName(r, locale)}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">
                    {s.total > 0 ? (
                      <OlympicValue
                        value={s.total}
                        metric={metric}
                        thbPerUsd={thbPerUsd}
                      />
                    ) : (
                      <span className="font-normal text-faint">–</span>
                    )}
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-1 flex-1 overflow-hidden rounded-full bg-secondary"
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(s.total / max) * 100}%`,
                        background: r.color,
                      }}
                    />
                  </span>
                  <span className="shrink-0 text-2xs text-faint tabular-nums">
                    {t("coverage", { n: s.provinces, of: s.of })}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

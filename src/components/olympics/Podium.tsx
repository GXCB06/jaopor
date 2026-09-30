import { PlusIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { StartupLogo } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import { getProvince } from "@/lib/config/provinces";
import type { OlympicMetric, ProvinceRank } from "@/lib/olympics";
import { logoUrl } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";
import { OlympicValue } from "./OlympicValue";
import { ProvinceBadge } from "./ProvinceBadge";

// DOM order 1 · 2 · 3 (screen readers), shown 2 · 1 · 3 via `order`; pedestal height and medal tone per place (token colours, Design.md §5 Medal).
const PLACES = [
  { rank: 1, height: "h-24 sm:h-28", tone: "border-t-warning text-warning" },
  {
    rank: 2,
    height: "h-16 sm:h-20",
    tone: "border-t-muted-foreground text-muted-foreground",
  },
  {
    rank: 3,
    height: "h-11 sm:h-14",
    tone: "border-t-warning/60 text-warning/70",
  },
] as const;

/**
 * Design.md §5 Podium: the top 3 provinces on pedestals. An empty place is a dashed invitation
 * ("ว่าง — จังหวัดคุณ?" → /new), so a young board still reads as a race you can join.
 */
export async function Podium({
  top,
  metric,
  thbPerUsd,
}: {
  top: ProvinceRank[];
  metric: OlympicMetric;
  thbPerUsd: number | null;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("Olympics"),
    getLocale(),
  ]);

  return (
    <ol
      aria-label={t("podium")}
      className="grid grid-cols-3 items-end gap-2 sm:gap-4"
    >
      {PLACES.map(({ rank, height, tone }) => {
        const row = top[rank - 1];
        const p = row ? getProvince(row.province) : undefined;
        return (
          <li
            key={rank}
            className={cn(
              "flex min-w-0 flex-col",
              rank === 1 && "order-2",
              rank === 2 && "order-1",
              rank === 3 && "order-3",
            )}
          >
            {row && p ? (
              <Link
                href={`/province/${p.slug}`}
                className="group mb-2 flex min-w-0 flex-col items-center gap-1.5 text-center"
              >
                <ProvinceBadge
                  region={p.region}
                  className={cn(
                    "transition-transform group-hover:-translate-y-0.5",
                    rank === 1 ? "h-14 w-20" : "h-11 w-16",
                  )}
                />
                <span
                  className={cn(
                    "w-full truncate font-bold group-hover:underline",
                    rank === 1 ? "text-base" : "text-sm",
                  )}
                >
                  {localizedName(p, locale)}
                </span>
                <span
                  className={cn(
                    "font-bold tracking-tight tabular-nums",
                    rank === 1 ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
                  )}
                >
                  <OlympicValue
                    value={row.total}
                    metric={metric}
                    thbPerUsd={thbPerUsd}
                  />
                </span>
                <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                  <span className="flex -space-x-1.5">
                    {row.top.slice(0, 3).map((s) => (
                      <StartupLogo
                        key={s.slug}
                        name={s.name}
                        src={logoUrl(s.logo_path)}
                        size={16}
                        className="ring-2 ring-card"
                      />
                    ))}
                  </span>
                  <span className="hidden sm:inline">
                    {t("startups", { count: row.startups })}
                  </span>
                </span>
              </Link>
            ) : (
              <Link
                href="/new"
                className="mb-2 flex min-w-0 flex-col items-center gap-1.5 rounded-lg border border-dashed px-2 py-3 text-center text-muted-foreground transition-colors hover:border-brand/60 hover:text-brand-text"
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                <span className="text-caption font-semibold">
                  {t("openSpot")}
                </span>
                <span className="hidden text-2xs sm:block">
                  {t("openSpotHint")}
                </span>
              </Link>
            )}
            <div
              aria-hidden="true"
              className={cn(
                "flex items-start justify-center rounded-t-lg border border-t-4 bg-secondary pt-2 text-2xl font-extrabold tabular-nums dark:bg-black/40",
                height,
                tone,
              )}
            >
              {rank}
            </div>
            <span className="sr-only">{t("rank", { rank })}</span>
          </li>
        );
      })}
    </ol>
  );
}

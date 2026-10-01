import { PlusIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { StartupLogo } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import { getProvince, getRegion } from "@/lib/config/provinces";
import type { OlympicMetric, ProvinceRank } from "@/lib/olympics";
import { logoUrl } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";
import { OlympicValue } from "./OlympicValue";

// DOM order 1 · 2 · 3 (screen readers), shown 2 · 1 · 3 from md via `order`. Medal tones = tokens.
const PLACES = [
  {
    rank: 1,
    order: "md:order-2",
    ring: "border-warning text-warning",
    card: "border-warning/40 bg-warning/5 md:pb-7 md:pt-7",
  },
  {
    rank: 2,
    order: "md:order-1",
    ring: "border-muted-foreground text-muted-foreground",
    card: "",
  },
  {
    rank: 3,
    order: "md:order-3",
    ring: "border-warning/60 text-warning/70",
    card: "",
  },
] as const;

/**
 * Design.md §5 Podium (Olympics v3, Claude Design cards): one card per place — rank ring, region,
 * province name, project count, the total, and the province's top project. The leader's card is
 * taller with a gold edge. An empty place is a dashed "ที่ว่าง" invitation to /new.
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
      className="grid gap-3 md:grid-cols-3 md:items-end md:gap-4"
    >
      {PLACES.map(({ rank, order, ring, card }) => {
        const row = top[rank - 1];
        const p = row ? getProvince(row.province) : undefined;
        const ringEl = (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums",
              ring,
            )}
            aria-label={t("rank", { rank })}
          >
            {rank}
          </span>
        );
        if (!row || !p)
          return (
            <li key={rank} className={order}>
              <Link
                href="/new"
                className="flex min-h-40 flex-col justify-between rounded-xl border border-dashed p-5 text-muted-foreground transition-colors hover:border-brand/60 hover:text-brand-text"
              >
                {ringEl}
                <span>
                  <span className="flex items-center gap-1.5 text-base font-bold">
                    <PlusIcon className="size-4" aria-hidden="true" />
                    {t("openSpot")}
                  </span>
                  <span className="mt-1 block text-caption">
                    {t("openSpotHint")}
                  </span>
                </span>
              </Link>
            </li>
          );
        const region = getRegion(p.region);
        const best = row.top[0];
        return (
          <li key={rank} className={order}>
            <div
              className={cn(
                "rounded-xl border bg-card p-5 transition-colors hover:border-border-strong",
                card,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  {ringEl}
                  {rank === 1 && (
                    <span className="text-2xs font-bold tracking-wider text-warning uppercase">
                      {t("leader")}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full"
                    style={{ background: region.color }}
                  />
                  {localizedName(region, locale)}
                </span>
              </div>
              <Link href={`/province/${p.slug}`} className="group mt-4 block">
                <span
                  className={cn(
                    "block truncate font-bold tracking-tight group-hover:underline",
                    rank === 1 ? "text-3xl" : "text-2xl",
                  )}
                >
                  {localizedName(p, locale)}
                </span>
                <span className="mt-1 block text-caption text-faint">
                  {locale === "th" ? p.nameEn : p.nameTh} ·{" "}
                  {t("startups", { count: row.startups })}
                </span>
                <span
                  className={cn(
                    "mt-3 block font-bold tracking-tight tabular-nums",
                    rank === 1 ? "text-4xl" : "text-3xl",
                  )}
                >
                  <OlympicValue
                    value={row.total}
                    metric={metric}
                    thbPerUsd={thbPerUsd}
                  />
                </span>
              </Link>
              {best && (
                <Link
                  href={`/startup/${best.slug}`}
                  className="mt-4 flex items-center gap-2 border-t pt-3 text-caption hover:underline"
                >
                  <StartupLogo
                    name={best.name}
                    src={logoUrl(best.logo_path)}
                    size={18}
                  />
                  <span className="min-w-0 truncate text-muted-foreground">
                    {t("topProject")}{" "}
                    <b className="font-semibold text-foreground">{best.name}</b>
                  </span>
                  <span className="ml-auto shrink-0 text-faint tabular-nums">
                    <OlympicValue
                      value={best.value}
                      metric={metric}
                      thbPerUsd={thbPerUsd}
                    />
                  </span>
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

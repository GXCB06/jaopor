import { PlusIcon, TrophyIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Medal } from "@/components/core/Medal";
import { Link } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import { getProvince } from "@/lib/config/provinces";
import type { OlympicMetric, ProvinceRank } from "@/lib/olympics";
import { cn } from "@/lib/utils";
import { OlympicValue } from "./OlympicValue";
import { ProvinceBadge } from "./ProvinceBadge";

// DOM order 1 · 2 · 3 (screen readers), shown 2 · 1 · 3 at every width. Medal tones = tokens.
const PLACES = [
  {
    rank: 1,
    order: "order-2",
    height: "h-20 sm:h-28",
    tone: "border-warning/40 from-warning/15 to-warning/5",
    badge: "h-12 w-16 sm:h-14 sm:w-20",
  },
  {
    rank: 2,
    order: "order-1",
    height: "h-14 sm:h-20",
    tone: "from-secondary to-secondary/30",
    badge: "h-10 w-14",
  },
  {
    rank: 3,
    order: "order-3",
    height: "h-10 sm:h-14",
    tone: "from-secondary to-secondary/30",
    badge: "h-10 w-14",
  },
] as const;

/**
 * Design.md §5 Olympics v4 podium (owner 2026-10-13, from the reference image): three places on
 * flat steps, #1 in the middle and tallest. Each place: the province badge with its medal, the
 * name, and its total in a chip; the step shows the place number. Side by side on phones too.
 * An empty place is a dashed step inviting a project from another province.
 */
export async function PodiumSteps({
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
      className="mx-auto grid max-w-2xl grid-cols-3 items-end gap-2 border-b sm:gap-4"
    >
      {PLACES.map(({ rank, order, height, tone, badge }) => {
        const row = top[rank - 1];
        const p = row ? getProvince(row.province) : undefined;
        if (!row || !p)
          return (
            <li key={rank} className={cn("min-w-0", order)}>
              <Link
                href="/new"
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-t-xl border border-b-0 border-dashed px-1 text-center text-caption text-muted-foreground transition-colors hover:border-brand/60 hover:text-brand-text",
                  height,
                )}
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                {t("openSpot")}
              </Link>
            </li>
          );
        return (
          <li
            key={rank}
            aria-label={t("rank", { rank })}
            className={cn("min-w-0", order)}
          >
            <Link
              href={`/province/${p.slug}`}
              className="group flex flex-col items-center gap-1.5 px-1 pb-2 text-center"
            >
              {rank === 1 && (
                <TrophyIcon
                  className="size-5 text-warning"
                  aria-hidden="true"
                />
              )}
              <ProvinceBadge
                region={p.region}
                province={p.slug}
                className={cn("bg-card", badge)}
              />
              {/* The medal sits by the name, not on the map (it hid the south). */}
              <span className="flex max-w-full items-center gap-1.5">
                <span className="shrink-0">
                  <Medal rank={rank} />
                </span>
                <span className="truncate text-sm font-bold group-hover:underline">
                  {localizedName(p, locale)}
                </span>
              </span>
              <span className="max-w-full truncate rounded-full border bg-card px-2.5 py-0.5 text-caption font-bold tabular-nums">
                <OlympicValue
                  value={row.total}
                  metric={metric}
                  thbPerUsd={thbPerUsd}
                />
              </span>
            </Link>
            <div
              aria-hidden="true"
              className={cn(
                "flex justify-center rounded-t-xl border border-b-0 bg-linear-to-b pt-2 text-2xl font-extrabold text-faint tabular-nums sm:text-3xl",
                height,
                tone,
              )}
            >
              {rank}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

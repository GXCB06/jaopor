import { TrophyIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import { InView } from "@/components/core/InView";
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
 *
 * The podium is always on screen, for every metric: an unfilled place is a dashed step that invites
 * a project from another province (owner 2026-10-13: the podium used to vanish for the metrics no
 * province had yet, leaving a hole in the page). When fewer than three provinces qualify, a short
 * invitation with the add-project link sits under the steps. Places rise in once, staggered
 * (globals.css), and a metric / region switch remounts them so the transition replays.
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
  const filled = PLACES.filter(({ rank }) => {
    const row = top[rank - 1];
    return row && getProvince(row.province);
  }).length;

  return (
    <div>
      <InView mode="seen" settle={900}>
        <ol
          aria-label={t("podium")}
          className="mx-auto grid max-w-2xl grid-cols-3 items-end gap-2 border-b sm:gap-4"
        >
          {PLACES.map(({ rank, order, height, tone, badge }, i) => {
            const row = top[rank - 1];
            const p = row ? getProvince(row.province) : undefined;
            const style = { "--col": i } as CSSProperties;
            if (!row || !p)
              return (
                <li
                  key={rank}
                  style={style}
                  className={cn("podium-col min-w-0", order)}
                >
                  <Link
                    href="/new"
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-t-xl border border-b-0 border-dashed px-1 text-center text-caption transition-colors hover:border-brand/60 hover:text-brand-text",
                      height,
                    )}
                  >
                    <span className="text-2xs font-semibold tracking-wider text-faint uppercase">
                      {t("openSpot")}
                    </span>
                    <span className="font-semibold text-muted-foreground">
                      {t("podiumInviteShort")}
                    </span>
                  </Link>
                </li>
              );
            return (
              <li
                key={rank}
                style={style}
                aria-label={t("rank", { rank })}
                className={cn("podium-col min-w-0", order)}
              >
                <Link
                  href={`/province/${p.slug}`}
                  className="group flex flex-col items-center gap-1.5 px-1 pb-2 text-center"
                >
                  {rank === 1 && (
                    <TrophyIcon
                      className="size-5 text-warning transition-transform group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  )}
                  <ProvinceBadge
                    region={p.region}
                    province={p.slug}
                    className={cn(
                      "bg-card transition-transform group-hover:-translate-y-0.5",
                      rank === 1 && "ring-1 ring-warning/40",
                      badge,
                    )}
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
                    "flex justify-center rounded-t-xl border border-b-0 bg-linear-to-b pt-2 text-2xl font-extrabold text-faint tabular-nums transition-transform group-hover:-translate-y-0.5 sm:text-3xl",
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
      </InView>
      {filled < PLACES.length && (
        <p className="mx-auto mt-3 max-w-2xl text-center text-caption text-muted-foreground">
          <span className="font-semibold text-foreground">
            {t("podiumInviteTitle")}
          </span>
          {" — "}
          {t("podiumInviteBody")}{" "}
          <Link
            href="/new"
            className="font-semibold text-brand-text hover:underline"
          >
            {t("addProject")} →
          </Link>
        </p>
      )}
    </div>
  );
}

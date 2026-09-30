"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { REGION_LIST, type Region } from "@/lib/config/provinces";
import { DEFAULT_METRIC, type OlympicMetric } from "@/lib/olympics";
import { cn } from "@/lib/utils";
import { REGION_PATH } from "./ThailandMap";

/**
 * Design.md §5 OlympicsMap: the hero's big Thailand map. Regions with a number glow in their
 * region colour, empty ones stay neutral; clicking a region filters the board (clicking the
 * selected one clears it). Mouse nicety only: the RegionStandings list next to it is the
 * accessible control, so the SVG is aria-hidden.
 */
export function OlympicsMap({
  active,
  selected,
  metric,
  names,
}: {
  /** Regions that have at least one verified number for the metric. */
  active: Region[];
  selected: Region | null;
  metric: OlympicMetric;
  names: Record<Region, string>;
}) {
  const t = useTranslations("Olympics");
  const router = useRouter();
  const go = (r: Region) =>
    router.replace(
      {
        pathname: "/olympics",
        query: {
          ...(metric !== DEFAULT_METRIC && { metric }),
          ...(r !== selected && { region: r }),
        },
      },
      { scroll: false },
    );

  return (
    <svg
      viewBox="-2 -2 88 154"
      aria-hidden="true"
      className="h-full w-auto overflow-visible drop-shadow-[0_0_24px_color-mix(in_oklab,var(--brand)_18%,transparent)]"
    >
      {REGION_LIST.map((r) => {
        const on = active.includes(r.slug);
        const dim = selected !== null && selected !== r.slug;
        return (
          <path
            key={r.slug}
            d={REGION_PATH[r.slug]}
            onClick={() => go(r.slug)}
            className={cn(
              "cursor-pointer stroke-background stroke-[1.2] transition-[opacity,filter] duration-200 hover:brightness-125",
              !on && "fill-muted-foreground/25",
              dim && "opacity-35",
              selected === r.slug && "stroke-foreground stroke-[1.5]",
            )}
            style={on ? { fill: r.color } : undefined}
            strokeLinejoin="round"
          >
            <title>
              {on ? names[r.slug] : `${names[r.slug]} · ${t("regionEmpty")}`}
            </title>
          </path>
        );
      })}
    </svg>
  );
}

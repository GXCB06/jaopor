import { REGION_LIST, type Region } from "@/lib/config/provinces";
import { cn } from "@/lib/utils";

/**
 * Design.md §5 ProvinceBadge map: a hand-simplified Thailand silhouette split into the 6 official
 * regions (~150 points, projected lon/lat; not survey-accurate, never an official seal). The
 * highlighted region takes its `--region-*` colour; the rest are a neutral fill.
 */
export const REGION_PATH: Record<Region, string> = {
  north:
    "M26 0.5L28 1.5L32.5 3.5L39 9L39.5 15L36.5 21L38 26L33 28L28 30L23 29L19 32L16 33L10 31.5L4.5 29L2.5 22L0.5 19L4 11L7 8L12 8L18 5.5L22 3.5Z",
  northeast:
    "M38 26L44 26L48 23L54 26L60 22L65 21L71 28L75 31L74.5 39L79 45L83 51L82 60L79 61.5L73 61L65 61L58 62L56 62.5L52 63L46 63.5L40 61L41 56L40 50L43 45L44 39L39 33Z",
  central:
    "M38 26L39 33L44 39L43 45L40 50L41 56L40 61L38 63.5L36.5 67L36 70.5L33 70L30 70.5L27 71.5L27 68L26 63L25 58L21 51L18 45L20 40L19 32L23 29L28 30L33 28Z",
  east: "M56 62.5L52 68L50.5 74L51 79L55 84L56 88.5L52.5 83.5L49 80.5L44 78.5L40 78.5L36 78L36.5 74L36 70.5L36.5 67L38 63.5L40 61L46 63.5L52 63Z",
  west: "M4.5 29L10 31.5L16 33L19 32L20 40L18 45L21 51L25 58L26 63L27 68L27 71.5L27.5 76L26.5 80L25 87L22.5 93L20.5 95.5L18 95L21 90L23 87L19 81L18.5 75L16 69L11 62L9 54L13 43L12.5 38L9 34Z",
  south:
    "M20.5 95.5L19 101L19.5 106L21 111L26 112.5L28 116L30 121L32 129L33 133L37 136L40.5 136L45 140.5L48 144L45 147L40 148.5L38 143L33 140L29 140.5L27 139L24 135L21 130L17 126L14 124L11 123L10 119L9.5 115L11 109L13 105L14.5 101L18 95Z",
};

export function ThailandMap({
  highlight,
  className,
}: {
  highlight?: Region | null;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 84 150"
      aria-hidden="true"
      className={cn("h-full w-auto", className)}
    >
      {REGION_LIST.map((r) => (
        <path
          key={r.slug}
          d={REGION_PATH[r.slug]}
          className={cn(
            "stroke-card stroke-[1.5]",
            r.slug !== highlight && "fill-muted-foreground/30",
          )}
          style={r.slug === highlight ? { fill: r.color } : undefined}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

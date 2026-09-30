import { getRegion, type Region } from "@/lib/config/provinces";
import { localizedName } from "@/lib/config/localized";
import { cn } from "@/lib/utils";
import { ThailandMap } from "./ThailandMap";

/** Design.md §5 ProvinceBadge: 56×40 tile with the Thailand silhouette, the region highlighted. */
export function ProvinceBadge({
  region,
  className,
}: {
  region: Region;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border bg-background py-1",
        className,
      )}
    >
      <ThailandMap highlight={region} />
    </span>
  );
}

/** Region name with its colour dot (the colour never stands alone: Design.md §2 Region colours). */
export function RegionChip({
  region,
  locale,
  className,
}: {
  region: Region;
  locale: string;
  className?: string;
}) {
  const r = getRegion(region);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-secondary px-2 py-px text-2xs text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: r.color }}
      />
      {localizedName(r, locale)}
    </span>
  );
}

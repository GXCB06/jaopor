import { cn } from "@/lib/utils";

const TONE = [
  "text-warning border-warning", // gold
  "text-muted-foreground border-muted-foreground", // silver
  "text-warning/60 border-warning/60", // bronze
] as const;

/** Leaderboard rank 1-3 as a medal ring (SVG-free, token colours); replaces the medal emoji. */
export function Medal({ rank }: { rank: number }) {
  return (
    <span
      aria-label={String(rank)}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full border-2 text-2xs font-bold tabular-nums",
        TONE[rank - 1],
      )}
    >
      {rank}
    </span>
  );
}

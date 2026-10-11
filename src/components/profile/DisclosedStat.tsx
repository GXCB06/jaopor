import { useTranslations } from "next-intl";
import type { GroupDisclosure, PublicBand } from "@/lib/data/startup-columns";
import { StatCard } from "../ProfileBlocks";
import { GrowthValue } from "../StartupBits";
import { useBandLabel } from "./band-label";

/**
 * Design.md §7 Disclosure levels: the StatCard a visitor sees when the owner shows a group at
 * `band`, `growth` or `badge`. Renders nothing at `exact` (the caller shows the number) or when
 * the group isn't public (no data, or private: no badge either, O2).
 */
export function DisclosedStat({
  label,
  growthLabel,
  d,
  unit,
  band,
  className,
}: {
  label: string;
  /** Label for the growth level (e.g. "รายได้ 30 วัน", since growth compares 30-day revenue). */
  growthLabel?: string;
  d: GroupDisclosure;
  unit: "thb" | "count";
  /** The band to show (defaults to the group's band). */
  band?: PublicBand | null;
  className?: string;
}) {
  const t = useTranslations("Disclosure");
  const bandLabel = useBandLabel();
  if (!d.level || d.level === "exact") return null;
  const shownBand = band ?? d.band;
  if (d.level === "band" && shownBand)
    return (
      <StatCard
        label={label}
        value={
          // A range is longer than a figure: it wraps instead of being cut off (Design.md §5).
          <span className="block text-lg leading-snug whitespace-normal">
            {bandLabel(shownBand, unit)}
          </span>
        }
        caption={t("bandCaption")}
        className={className}
      />
    );
  if (d.level === "growth" && d.growthPct !== null)
    return (
      <StatCard
        label={growthLabel ?? label}
        value={<GrowthValue pct={d.growthPct} />}
        caption={t("growthCaption")}
        className={className}
      />
    );
  // `badge`, or a band / growth the database couldn't compute (it falls back to badge too).
  return (
    <StatCard
      label={label}
      value={<span className="text-positive">{t("badgeValue")}</span>}
      caption={t("badgeCaption")}
      className={className}
    />
  );
}

/** True when a group is public at band / growth / badge (so a DisclosedStat will render). */
export const isNonExact = (d: GroupDisclosure) =>
  d.level !== null && d.level !== "exact";

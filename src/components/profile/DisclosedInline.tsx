import { useTranslations } from "next-intl";
import type { GroupDisclosure } from "@/lib/data/startup-columns";
import { GrowthValue } from "../StartupBits";
import { useBandLabel } from "./band-label";

/**
 * Design.md §7 Disclosure levels, inline (one line in a list row): the range, the growth or the
 * verified badge. Nothing at `exact` (the caller shows the figure) or when the group isn't public.
 */
export function DisclosedInline({
  d,
  unit,
}: {
  d: GroupDisclosure;
  unit: "thb" | "count";
}) {
  const t = useTranslations("Disclosure");
  const bandLabel = useBandLabel();
  if (!d.level || d.level === "exact") return null;
  if (d.level === "band" && d.band)
    return (
      <span className="font-bold tabular-nums">{bandLabel(d.band, unit)}</span>
    );
  if (d.level === "growth" && d.growthPct !== null)
    return <GrowthValue pct={d.growthPct} className="font-bold" />;
  return <span className="font-semibold text-positive">{t("badgeValue")}</span>;
}

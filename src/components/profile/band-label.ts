import { useTranslations } from "next-intl";
import type { PublicBand } from "@/lib/data/startup-columns";
import { bandText } from "@/lib/disclosure";

// Client-safe (the Add-project preview renders StartupCard in the browser): no server imports.

/** "฿10k–25k", "ต่ำกว่า ฿1k", "มากกว่า ฿1M" (Design.md §7 Disclosure levels). */
export function useBandLabel() {
  const t = useTranslations("Disclosure");
  return (band: PublicBand, unit: "thb" | "count") => {
    const b = bandText(band, unit);
    if (b.kind === "under") return t("under", { hi: b.hi });
    if (b.kind === "over") return t("over", { lo: b.lo });
    return `${b.lo}–${b.hi}`;
  };
}

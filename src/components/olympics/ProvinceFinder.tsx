"use client";

import { ChevronDownIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import { PROVINCE_LIST, REGION_LIST } from "@/lib/config/provinces";

/**
 * Design.md §5 ProvinceFinder: "จังหวัดของคุณอยู่อันดับไหน?" — a native select grouped by region
 * that opens the province page (works with keyboard and screen readers as-is).
 */
export function ProvinceFinder() {
  const t = useTranslations("Olympics");
  const locale = useLocale();
  const router = useRouter();
  return (
    <label className="block space-y-2">
      <span className="block text-xs font-semibold">{t("finderTitle")}</span>
      <span className="relative block">
        <select
          defaultValue=""
          onChange={(e) =>
            e.target.value && router.push(`/province/${e.target.value}`)
          }
          className="h-9 w-full appearance-none rounded-md border border-input bg-background pr-8 pl-3 text-caption"
        >
          <option value="" disabled>
            {t("finderPlaceholder")}
          </option>
          {REGION_LIST.map((r) => (
            <optgroup key={r.slug} label={localizedName(r, locale)}>
              {PROVINCE_LIST.filter((p) => p.region === r.slug).map((p) => (
                <option key={p.slug} value={p.slug}>
                  {localizedName(p, locale)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDownIcon
          className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-faint"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

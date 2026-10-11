// Option lists for the dropdowns (ChoiceSelect / MultiChoice), shared by every filter and form.

import { localizedName } from "./localized";
import {
  PROVINCE_ALIASES,
  PROVINCE_LIST,
  REGION_LIST,
  type Region,
} from "./provinces";

export type Option = { value: string; label: string; keywords?: string };
export type OptionGroup = { label: string; options: Option[] };

/**
 * The 77 provinces grouped by region (one group per region). With `wholeRegion`, each group
 * starts with the region itself (value = region slug), e.g. "ทั้งภาคเหนือ".
 */
export function provinceGroups(
  locale: string,
  wholeRegion?: (regionName: string, region: Region) => string,
): OptionGroup[] {
  return REGION_LIST.map((r) => ({
    label: localizedName(r, locale),
    options: [
      ...(wholeRegion
        ? [
            {
              value: r.slug,
              label: wholeRegion(localizedName(r, locale), r.slug),
              keywords: `${r.nameTh} ${r.nameEn}`,
            },
          ]
        : []),
      ...PROVINCE_LIST.filter((p) => p.region === r.slug).map((p) => ({
        value: p.slug,
        label: localizedName(p, locale),
        keywords: `${p.nameTh} ${p.nameEn} ${p.slug} ${PROVINCE_ALIASES[p.slug] ?? ""}`,
      })),
    ],
  }));
}

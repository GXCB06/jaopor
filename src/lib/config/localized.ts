// Config entries (categories, provinces, regions, channels) carry both languages; pick one.
type Named = { nameTh: string; nameEn: string };
type Labeled = { labelTh: string; labelEn: string };

export function localizedName(item: Named, locale: string): string {
  return locale === "th" ? item.nameTh : item.nameEn;
}

export function localizedLabel(item: Labeled, locale: string): string {
  return locale === "th" ? item.labelTh : item.labelEn;
}

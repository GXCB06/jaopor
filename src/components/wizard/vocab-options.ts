// Option lists for the VocabCombobox fields (spec 6.9), built from src/lib/config.
import { CHANNEL_LIST, CUSTOM_PREFIX } from "@/lib/config/channels";
import { localizedLabel, localizedName } from "@/lib/config/localized";
import { PROVINCE_LIST, REGION_LIST } from "@/lib/config/provinces";
import {
  STACK_GROUP_LABEL,
  STACK_LIST,
  STORED_STACK_GROUPS,
  type StackItem,
  type StoredStackGroup,
  type TechStack,
} from "@/lib/config/stack";
import type { VocabOption } from "./VocabCombobox";

const STORED = STACK_LIST.filter(
  (i) => i.group !== "built_with",
) as readonly StackItem[];

/** Stack slugs are unique across the stored groups, so the option value is the slug alone. */
export function stackOptions(locale: string): VocabOption[] {
  return STORED.map((i) => ({
    value: i.slug,
    label: i.label,
    group: localizedName(STACK_GROUP_LABEL[i.group], locale),
    simpleIcon: i.simpleIcon,
    lucideIcon: i.lucideIcon,
  }));
}

export function stackToValues(stack: TechStack): string[] {
  return STORED_STACK_GROUPS.flatMap((g) => stack[g] ?? []);
}

export function valuesToStack(values: string[]): TechStack {
  const out: TechStack = {};
  for (const v of values) {
    const item = STORED.find((i) => i.slug === v);
    if (!item) continue;
    const g = item.group as StoredStackGroup;
    (out[g] ??= []).push(v);
  }
  return out;
}

export function channelOptions(locale: string): VocabOption[] {
  return CHANNEL_LIST.map((c) => ({
    value: c.slug,
    label: localizedLabel(c, locale),
    keywords: `${c.labelEn} ${c.labelTh}`,
    simpleIcon: "simpleIcon" in c ? c.simpleIcon : undefined,
    lucideIcon: "lucideIcon" in c ? c.lucideIcon : undefined,
  }));
}

export const toCustomChannel = (text: string) =>
  `${CUSTOM_PREFIX}${text.slice(0, 40)}`;

/** Provinces grouped by region, names in the page language (the other language still matches). */
export function provinceOptions(locale: string): VocabOption[] {
  const collator = new Intl.Collator(locale);
  return REGION_LIST.flatMap((r) =>
    PROVINCE_LIST.filter((p) => p.region === r.slug)
      .map((p) => ({
        value: p.slug as string,
        label: localizedName(p, locale),
        keywords: `${p.nameTh} ${p.nameEn}`,
        group: localizedName(r, locale),
      }))
      .sort((a, b) => collator.compare(a.label, b.label)),
  );
}

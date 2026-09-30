// Read-side helpers that turn stored slugs into what people see. Pure; safe on server and client.
import { getCategory } from "./categories";
import { CUSTOM_PREFIX, getChannel } from "./channels";
import { localizedLabel, localizedName } from "./localized";
import { getProvince, getRegion } from "./provinces";
import {
  STACK_GROUP_LABEL,
  STACK_LIST,
  STACK_CUSTOM_PREFIX,
  STORED_STACK_GROUPS,
  isCustomStackValue,
  type StackItem,
  type StoredStackGroup,
  type TechStack,
} from "./stack";

export function categoryName(slug: string, locale: string): string {
  const c = getCategory(slug);
  return c ? localizedName(c, locale) : slug;
}

/** "มุกดาหาร" / "Mukdahan"; null for no or unknown province. */
export function provinceName(
  slug: string | null | undefined,
  locale: string,
): string | null {
  const p = getProvince(slug);
  return p ? localizedName(p, locale) : null;
}

export function regionName(
  provinceSlug: string | null | undefined,
  locale: string,
): string | null {
  const p = getProvince(provinceSlug);
  return p ? localizedName(getRegion(p.region), locale) : null;
}

/** Stored jsonb → typed stack, dropping anything unknown (the DB trigger already rejects it). */
export function toTechStack(v: unknown): TechStack {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: TechStack = {};
  for (const g of STORED_STACK_GROUPS) {
    const list = (v as Record<string, unknown>)[g];
    if (!Array.isArray(list)) continue;
    const known = list.filter(
      (s): s is string =>
        typeof s === "string" &&
        STACK_LIST.some((i) => i.group === g && i.slug === s),
    );
    if (known.length) out[g] = known;
  }
  const other = (v as Record<string, unknown>).other;
  if (Array.isArray(other)) {
    const custom = other.filter(
      (s): s is string => typeof s === "string" && isCustomStackValue(s),
    );
    if (custom.length) out.other = custom;
  }
  return out;
}

export function stackCount(v: unknown): number {
  return Object.values(toTechStack(v)).reduce(
    (n, l) => n + (l?.length ?? 0),
    0,
  );
}

export type StackGroupView = {
  group: StoredStackGroup | "other";
  label: string;
  items: StackItem[];
};

/** Non-empty groups in display order, each with its items (spec 6.4: empty groups skipped). */
export function stackGroups(v: unknown, locale: string): StackGroupView[] {
  const stack = toTechStack(v);
  const custom: StackGroupView[] = stack.other?.length
    ? [
        {
          group: "other",
          label: localizedName(OTHER_GROUP_LABEL, locale),
          // Custom tools have no logo: the chip falls back to a generic icon.
          items: stack.other.map((s) => ({
            slug: s,
            label: s.slice(STACK_CUSTOM_PREFIX.length),
            group: "frontend" as const,
          })),
        },
      ]
    : [];
  return STORED_STACK_GROUPS.flatMap((g): StackGroupView[] => {
    const slugs = stack[g];
    if (!slugs?.length) return [];
    const items = slugs
      .map((s) => STACK_LIST.find((i) => i.group === g && i.slug === s))
      .filter((i): i is (typeof STACK_LIST)[number] => Boolean(i));
    return [
      { group: g, label: localizedName(STACK_GROUP_LABEL[g], locale), items },
    ];
  }).concat(custom);
}

const OTHER_GROUP_LABEL = { nameTh: "อื่น ๆ", nameEn: "Other" };

/** Stored channel value → label ("facebook-groups" → "กลุ่ม Facebook", "custom:Pantip ads" → "Pantip ads"). */
export function channelLabel(value: string, locale: string): string {
  if (value.startsWith(CUSTOM_PREFIX)) return value.slice(CUSTOM_PREFIX.length);
  const c = getChannel(value);
  return c ? localizedLabel(c, locale) : value;
}

export type GlyphRef = {
  label: string;
  simpleIcon?: string;
  lucideIcon?: StackItem["lucideIcon"];
};

/** Channel value → chip data (custom entries get no icon → generic Tag). */
export function channelChip(value: string, locale: string): GlyphRef {
  const c = value.startsWith(CUSTOM_PREFIX) ? undefined : getChannel(value);
  return {
    label: channelLabel(value, locale),
    simpleIcon: c && "simpleIcon" in c ? (c.simpleIcon as string) : undefined,
    lucideIcon: c && "lucideIcon" in c ? c.lucideIcon : undefined,
  };
}

/** AI build tool slug → chip data ("claude" is the Claude chat app). */
export function aiToolChip(slug: string, locale: string): GlyphRef {
  if (slug === "claude") return { label: "Claude", simpleIcon: "claude" };
  const i = STACK_LIST.find(
    (x) => x.group === "built_with" && x.slug === slug,
  ) as StackItem | undefined;
  if (!i) return { label: slug };
  return {
    label: locale === "th" && i.labelTh ? i.labelTh : i.label,
    simpleIcon: i.simpleIcon,
    lucideIcon: i.lucideIcon,
  };
}

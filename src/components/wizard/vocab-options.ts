// Option lists for the VocabCombobox fields (spec 6.9), built from src/lib/config.
import { CATEGORY_LIST } from "@/lib/config/categories";
import { CHANNEL_LIST, CUSTOM_PREFIX } from "@/lib/config/channels";
import { localizedLabel, localizedName } from "@/lib/config/localized";
import {
  PROVINCE_ALIASES,
  PROVINCE_LIST,
  REGION_LIST,
} from "@/lib/config/provinces";
import {
  STACK_GROUP_LABEL,
  STACK_LIST,
  MAX_CUSTOM_STACK_LABEL,
  STACK_CUSTOM_PREFIX,
  STORED_STACK_GROUPS,
  isCustomStackValue,
  matchStackLabel,
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
  // Grouped headers in the combobox need each group's items to be contiguous.
  const order = (g: string) =>
    STORED_STACK_GROUPS.indexOf(g as StoredStackGroup);
  return [...STORED]
    .sort((a, b) => order(a.group) - order(b.group))
    .map((i) => ({
      value: i.slug,
      label: i.label,
      group: localizedName(STACK_GROUP_LABEL[i.group], locale),
      simpleIcon: i.simpleIcon,
      lucideIcon: i.lucideIcon,
    }));
}

export function stackToValues(stack: TechStack): string[] {
  return [
    ...STORED_STACK_GROUPS.flatMap((g) => stack[g] ?? []),
    ...(stack.other ?? []),
  ];
}

export const toCustomStack = (text: string) =>
  `${STACK_CUSTOM_PREFIX}${text.slice(0, MAX_CUSTOM_STACK_LABEL)}`;

export function valuesToStack(values: string[]): TechStack {
  const out: TechStack = {};
  for (const v of values) {
    if (isCustomStackValue(v)) {
      (out.other ??= []).push(v);
      continue;
    }
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
        keywords: `${p.nameTh} ${p.nameEn} ${PROVINCE_ALIASES[p.slug] ?? ""}`,
        group: localizedName(r, locale),
      }))
      .sort((a, b) => collator.compare(a.label, b.label)),
  );
}

/**
 * GitHub-detected labels (startups.build_stack) → form values: known tools become their slug,
 * anything else (TypeScript, Prisma…) a custom entry. Values already chosen are skipped.
 */
export function suggestedStackValues(
  buildStack: string[],
  current: string[],
): string[] {
  const out: string[] = [];
  for (const label of buildStack) {
    const hit = matchStackLabel(label);
    const v = hit ? hit.slug : toCustomStack(label);
    if (!current.includes(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

/**
 * What people actually type when looking for a category (owner request 2026-10-11: scrolling 37
 * categories took too long). Matched together with the Thai / English names and descriptions.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  ai: "เอไอ แชทบอท chatbot gpt llm agent",
  saas: "ซอฟต์แวร์ subscription สมัครสมาชิก b2b",
  "developer-tools": "dev โปรแกรมเมอร์ api sdk cli devtools",
  fintech: "การเงิน บัญชี ภาษี จ่ายเงิน payment finance accounting ลงทุน",
  marketing: "โฆษณา ads seo การตลาด",
  ecommerce: "ขายของ ร้านค้า ร้านออนไลน์ shop store",
  productivity: "จดโน้ต todo งาน ทำงาน note",
  design: "ออกแบบ กราฟิก figma ui",
  "no-code": "nocode lowcode โนโค้ด",
  analytics: "ข้อมูล dashboard สถิติ data",
  education: "เรียน สอน คอร์ส โรงเรียน ติว course learning",
  health: "สุขภาพ ฟิตเนส ออกกำลัง หมอ คลินิก fitness",
  community: "ชุมชน กลุ่ม forum",
  content: "ครีเอเตอร์ วิดีโอ บล็อก creator video",
  crypto: "คริปโต บล็อกเชน blockchain web3 nft",
  support: "บริการลูกค้า ซัพพอร์ต helpdesk",
  entertainment: "บันเทิง เพลง หนัง music movie",
  games: "เกม game เกมมือถือ",
  "green-tech": "สิ่งแวดล้อม พลังงาน climate",
  iot: "อุปกรณ์ เซนเซอร์ hardware smart home",
  legal: "กฎหมาย สัญญา ทนาย law",
  marketplace: "ตลาด ซื้อขาย platform",
  mobile: "แอปมือถือ app ios android",
  news: "ข่าว สื่อ media",
  "real-estate": "อสังหา บ้าน คอนโด เช่า property",
  hr: "บุคคล รับสมัครงาน หางาน job recruit",
  sales: "ขาย crm ลูกค้า",
  security: "ความปลอดภัย รหัสผ่าน cyber",
  social: "โซเชียล แชท เพื่อน chat",
  travel: "ท่องเที่ยว เที่ยว โรงแรม ตั๋ว hotel trip",
  utilities: "เครื่องมือ tools ยูทิลิตี้",
  "line-oa": "ไลน์ line liff บอทไลน์",
  food: "อาหาร ร้านอาหาร สั่งอาหาร restaurant delivery",
  agritech: "เกษตร ฟาร์ม farm",
  "local-sme": "เอสเอ็มอี ร้านค้าท้องถิ่น ธุรกิจ sme",
  logistics: "ขนส่ง ส่งของ พัสดุ delivery shipping",
  other: "อื่นๆ อื่น ๆ",
};

/** Categories with their icon, searchable in Thai, English and the aliases above. */
export function categoryOptions(locale: string): VocabOption[] {
  return CATEGORY_LIST.map((c) => ({
    value: c.slug,
    label: localizedName(c, locale),
    keywords: `${c.nameTh} ${c.nameEn} ${c.descTh} ${c.descEn} ${c.slug} ${CATEGORY_ALIASES[c.slug] ?? ""}`,
    lucideIcon: c.icon,
  }));
}


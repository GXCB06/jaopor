// Spec §4.4: marketing channels. Stored on startups.marketing_channels as slugs, plus custom
// entries prefixed `custom:` (max 40 chars after the prefix).
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  MessagesSquare,
  Newspaper,
  PenLine,
  Search,
  Send,
  Share2,
  Star,
} from "lucide-react";

export type ChannelDef = {
  slug: string;
  labelTh: string;
  labelEn: string;
  simpleIcon?: string;
  lucideIcon?: LucideIcon;
};

export const CHANNEL_LIST = [
  {
    slug: "line-oa",
    labelTh: "LINE OA",
    labelEn: "LINE OA",
    simpleIcon: "line",
  },
  {
    slug: "line-ads",
    labelTh: "LINE Ads",
    labelEn: "LINE Ads",
    simpleIcon: "line",
  },
  {
    slug: "facebook",
    labelTh: "Facebook",
    labelEn: "Facebook",
    simpleIcon: "facebook",
  },
  {
    slug: "facebook-groups",
    labelTh: "กลุ่ม Facebook",
    labelEn: "Facebook Groups",
    simpleIcon: "facebook",
  },
  {
    slug: "facebook-ads",
    labelTh: "Facebook Ads",
    labelEn: "Facebook Ads",
    simpleIcon: "facebook",
  },
  {
    slug: "instagram",
    labelTh: "Instagram",
    labelEn: "Instagram",
    simpleIcon: "instagram",
  },
  {
    slug: "tiktok",
    labelTh: "TikTok",
    labelEn: "TikTok",
    simpleIcon: "tiktok",
  },
  {
    slug: "tiktok-ads",
    labelTh: "TikTok Ads",
    labelEn: "TikTok Ads",
    simpleIcon: "tiktok",
  },
  {
    slug: "youtube",
    labelTh: "YouTube",
    labelEn: "YouTube",
    simpleIcon: "youtube",
  },
  {
    slug: "youtube-ads",
    labelTh: "YouTube Ads",
    labelEn: "YouTube Ads",
    simpleIcon: "youtube",
  },
  { slug: "x", labelTh: "X", labelEn: "X", simpleIcon: "x" },
  { slug: "x-ads", labelTh: "X Ads", labelEn: "X Ads", simpleIcon: "x" },
  {
    slug: "linkedin",
    labelTh: "LinkedIn",
    labelEn: "LinkedIn",
    lucideIcon: Briefcase,
  },
  {
    slug: "linkedin-ads",
    labelTh: "LinkedIn Ads",
    labelEn: "LinkedIn Ads",
    lucideIcon: Briefcase,
  },
  {
    slug: "google-ads",
    labelTh: "Google Ads",
    labelEn: "Google Ads",
    simpleIcon: "googleads",
  },
  {
    slug: "meta-ads",
    labelTh: "Meta Ads",
    labelEn: "Meta Ads",
    simpleIcon: "meta",
  },
  {
    slug: "pantip",
    labelTh: "Pantip",
    labelEn: "Pantip",
    lucideIcon: MessagesSquare,
  },
  {
    slug: "blockdit",
    labelTh: "Blockdit",
    labelEn: "Blockdit",
    lucideIcon: Newspaper,
  },
  {
    slug: "shopee-lazada-affiliate",
    labelTh: "Shopee / Lazada Affiliate",
    labelEn: "Shopee / Lazada Affiliate",
    simpleIcon: "shopee",
  },
  { slug: "seo", labelTh: "SEO", labelEn: "SEO", lucideIcon: Search },
  { slug: "blog", labelTh: "บล็อก", labelEn: "Blog", lucideIcon: BookOpen },
  {
    slug: "content-marketing",
    labelTh: "Content marketing",
    labelEn: "Content marketing",
    lucideIcon: PenLine,
  },
  {
    slug: "email-marketing",
    labelTh: "อีเมลการตลาด",
    labelEn: "Email marketing",
    lucideIcon: Send,
  },
  {
    slug: "influencer-kol",
    labelTh: "Influencer / KOL",
    labelEn: "Influencer / KOL",
    lucideIcon: Star,
  },
  {
    slug: "word-of-mouth",
    labelTh: "ปากต่อปาก",
    labelEn: "Word of mouth",
    lucideIcon: Share2,
  },
  {
    slug: "events-meetups",
    labelTh: "อีเวนต์ / มีตอัป",
    labelEn: "Events / Meetups",
    lucideIcon: CalendarDays,
  },
] as const satisfies readonly ChannelDef[];

export type Channel = (typeof CHANNEL_LIST)[number]["slug"];

export const CUSTOM_PREFIX = "custom:";
export const MAX_CHANNELS = 10;

const BY_SLUG = new Map<string, ChannelDef>(
  CHANNEL_LIST.map((c) => [c.slug, c]),
);

export function getChannel(slug: string): ChannelDef | undefined {
  return BY_SLUG.get(slug);
}

/** A stored value is a known slug or `custom:<1-40 chars>` (mirrors the DB check). */
export function isChannelValue(v: string): boolean {
  return (
    BY_SLUG.has(v) ||
    (v.startsWith(CUSTOM_PREFIX) &&
      v.length > CUSTOM_PREFIX.length &&
      v.length <= CUSTOM_PREFIX.length + 40)
  );
}

/** Existing free-text channel → slug, else `custom:<text>` (back-fill and custom entries). */
export function toChannelValue(text: string): string {
  // Same normalisation as the migration's `[^[:alnum:]]` (Postgres also drops Thai tone marks).
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const n = norm(text);
  for (const c of CHANNEL_LIST) {
    if ([c.slug, c.labelEn, c.labelTh].some((x) => norm(x) === n))
      return c.slug;
  }
  return `${CUSTOM_PREFIX}${text.trim().slice(0, 40)}`;
}

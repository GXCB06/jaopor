// Phase 10c /feed: URL filters and the "ยอดนิยมสัปดาห์นี้" ranking (pure, shared by the page and
// the /api/feed "โหลดเพิ่ม" route).

import { isCategory } from "./catalog";
import { isProvince } from "./config/provinces";
import { POST_TYPES, type PostType } from "./posts";

export const FEED_VIEWS = ["latest", "following", "popular"] as const;
export type FeedView = (typeof FEED_VIEWS)[number];

export type FeedFilters = {
  view: FeedView;
  type?: PostType;
  province?: string;
  category?: string;
  /** "รอ Feedback จากคุณ": feedback posts I haven't commented on (forces type = feedback). */
  waiting: boolean;
};

export const FEED_PAGE_SIZE = 15;
export const POPULAR_DAYS = 7;
export const WAITING_DAYS = 14;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFeedFilters(sp: Params): FeedFilters {
  const view = one(sp.view);
  const type = one(sp.type);
  const province = one(sp.province);
  const category = one(sp.category);
  const waiting = one(sp.waiting) === "1";
  return {
    view: (FEED_VIEWS as readonly string[]).includes(view ?? "")
      ? (view as FeedView)
      : "latest",
    type: waiting
      ? "feedback"
      : (POST_TYPES as readonly string[]).includes(type ?? "")
        ? (type as PostType)
        : undefined,
    province: isProvince(province) ? province : undefined,
    category: isCategory(category) ? category : undefined,
    waiting,
  };
}

/** The filters as URL query parameters (defaults left out). */
export function feedQuery(
  f: FeedFilters,
  patch: Partial<Record<keyof FeedFilters, string | undefined>> = {},
): Record<string, string> {
  const all: Record<string, string | undefined> = {
    view: f.view === "latest" ? undefined : f.view,
    type: f.waiting ? undefined : f.type,
    province: f.province,
    category: f.category,
    waiting: f.waiting ? "1" : undefined,
    ...patch,
  };
  return Object.fromEntries(
    Object.entries(all).filter((e): e is [string, string] => Boolean(e[1])),
  );
}

/** (likes + 2 × comments) / (hours + 2)^1.5: engagement, decayed by age. */
export function popularScore(
  likes: number,
  comments: number,
  createdAt: string,
  now: number,
): number {
  const hours = Math.max(0, (now - Date.parse(createdAt)) / 3_600_000);
  return (likes + 2 * comments) / Math.pow(hours + 2, 1.5);
}

export function rankPopular<
  T extends { likes: number; comments: number; createdAt: string },
>(posts: T[], now: number): T[] {
  return [...posts].sort(
    (a, b) =>
      popularScore(b.likes, b.comments, b.createdAt, now) -
        popularScore(a.likes, a.comments, a.createdAt, now) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

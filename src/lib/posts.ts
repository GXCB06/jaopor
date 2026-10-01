// Phase 10 product updates: vocabularies and pure helpers shared by the composer, the cards, the
// server actions and the pages. The limits mirror migration feed_posts.

import { publicEnv } from "./public-env";

export const POST_TYPES = [
  "feature",
  "launch",
  "lesson",
  "feedback",
  "milestone",
] as const;
export type PostType = (typeof POST_TYPES)[number];
/** What a person can choose in the composer; milestones only come from the daily job. */
export const MANUAL_POST_TYPES = [
  "feature",
  "launch",
  "lesson",
  "feedback",
] as const satisfies readonly PostType[];
export type ManualPostType = (typeof MANUAL_POST_TYPES)[number];

export const MAX_POST_BODY = 500;
export const MAX_COMMENT_BODY = 500;
export const MAX_POST_IMAGES = 4;
export const EDIT_WINDOW_MS = 15 * 60_000;
export const POST_IMAGE_BUCKET = "post-images";

export function isManualPostType(v: unknown): v is ManualPostType {
  return (MANUAL_POST_TYPES as readonly unknown[]).includes(v);
}

/** Public URL of a file in the `post-images` bucket (`{post_id}/{uuid}.webp`). */
export function postImageUrl(path: string): string {
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${POST_IMAGE_BUCKET}/${path}`;
}

/** Can the author still edit this post (text and new images)? */
export function canEdit(createdAt: string, now = Date.now()): boolean {
  return now - Date.parse(createdAt) < EDIT_WINDOW_MS;
}

/**
 * The link a person typed: trimmed, https added when the scheme is missing, http(s) only.
 * Returns null for anything else (so `javascript:` etc. never reach the database).
 */
export function normalizeLink(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    const out = u.toString();
    return out.length <= 500 ? out : null;
  } catch {
    return null;
  }
}

/** "5 นาทีที่แล้ว" / "5 minutes ago"; dates older than 4 weeks show as a short date. */
export function timeAgo(iso: string, locale: string, now = Date.now()): string {
  const then = Date.parse(iso);
  const sec = Math.round((then - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(sec);
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(sec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(sec / 3600), "hour");
  if (abs < 7 * 86_400) return rtf.format(Math.round(sec / 86_400), "day");
  if (abs < 28 * 86_400)
    return rtf.format(Math.round(sec / (7 * 86_400)), "week");
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(then));
}

/** Map a Postgres error code from a post / comment write to a message key. */
export function postErrorKey(code: string | undefined): string {
  switch (code) {
    case "54000":
      return "limit";
    case "42501":
      return "forbidden";
    case "23514":
      return "invalid";
    case "23505":
      return "duplicate";
    default:
      return "failed";
  }
}

/** The render clock for relative times (one value per request, passed down to the cards). */
export const renderNow = (): number => Date.now();

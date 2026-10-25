// Screenshots + demo video (spec 6.4 step 4 / 6.9). Browser-safe (used by the gallery and the form).
import { publicEnv } from "./public-env";

export const SCREENSHOT_KINDS = ["desktop", "mobile", "line"] as const;
export type ScreenshotKind = (typeof SCREENSHOT_KINDS)[number];
export const MAX_SCREENSHOTS = 8;
export const MAX_SCREENSHOT_INPUT_BYTES = 5 * 1024 * 1024;
export const SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type Screenshot = {
  id: number;
  path: string;
  kind: ScreenshotKind;
  caption: string | null;
  width: number;
  height: number;
  position: number;
};

/** Public URL of a file in the `screenshots` bucket (`{startup_id}/{uuid}.webp|jpg`). */
export function screenshotUrl(path: string): string {
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/screenshots/${path}`;
}

/** Landscape → desktop, portrait → mobile (the owner can switch a phone shot to "line"). */
export function detectKind(width: number, height: number): ScreenshotKind {
  return width / height >= 1.1 ? "desktop" : "mobile";
}

/**
 * Moves the item at `from` to index `to` (drag or ← / → reorder), returning a new array. Returns
 * null when the move is a no-op or out of range, so callers can skip the write.
 */
export function moveShot<T>(
  list: readonly T[],
  from: number,
  to: number,
): T[] | null {
  if (
    from === to ||
    from < 0 ||
    from >= list.length ||
    to < 0 ||
    to >= list.length
  )
    return null;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Longest side capped at `max`, aspect ratio kept. */
export function fitWithin(width: number, height: number, max = 2400) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Same rule as the DB check on startups.demo_video_url. */
export const DEMO_VIDEO_RE =
  /^https:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/|loom\.com\/share\/|tiktok\.com\/@[A-Za-z0-9._]+\/video\/)[A-Za-z0-9_-]/;

export type VideoEmbed = {
  provider: "youtube" | "loom" | "tiktok";
  embedUrl: string;
};

/** Demo video link → privacy-friendly embed URL, or null for anything unsupported. */
export function videoEmbed(url: string | null | undefined): VideoEmbed | null {
  if (!url || url.length > 300 || !DEMO_VIDEO_RE.test(url)) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  const id = (s: string | null | undefined) =>
    s && /^[A-Za-z0-9_-]{6,64}$/.test(s) ? s : null;
  if (host === "youtube.com" || host === "youtu.be") {
    const v =
      host === "youtu.be"
        ? id(u.pathname.slice(1))
        : u.pathname.startsWith("/shorts/")
          ? id(u.pathname.split("/")[2])
          : id(u.searchParams.get("v"));
    return v
      ? {
          provider: "youtube",
          embedUrl: `https://www.youtube-nocookie.com/embed/${v}?autoplay=1`,
        }
      : null;
  }
  if (host === "loom.com") {
    const v = id(u.pathname.split("/")[2]);
    return v
      ? {
          provider: "loom",
          embedUrl: `https://www.loom.com/embed/${v}?autoplay=1`,
        }
      : null;
  }
  if (host === "tiktok.com") {
    const v = u.pathname.split("/")[3];
    return v && /^[0-9]{6,30}$/.test(v)
      ? { provider: "tiktok", embedUrl: `https://www.tiktok.com/embed/v2/${v}` }
      : null;
  }
  return null;
}

/** A video link in a feed post, played in place (Design.md §5 PostCard, owner 2026-10-25). */
export type FeedVideo = {
  provider: "youtube" | "tiktok" | "loom" | "facebook";
  embedUrl: string;
  /** TikTok, Reels and Shorts are 9:16; everything else 16:9. */
  vertical: boolean;
};

/**
 * YouTube (watch, youtu.be, Shorts, Live), TikTok, Loom and Facebook (videos, watch, Reels,
 * fb.watch) links → an embed that loads only when played. Anything else stays a link card.
 * YouTube uses the no-cookie host; the others are the providers' own players.
 */
export function feedVideoEmbed(
  url: string | null | undefined,
): FeedVideo | null {
  if (!url || url.length > 500) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  const id = (s: string | null | undefined) =>
    s && /^[A-Za-z0-9_-]{6,64}$/.test(s) ? s : null;
  const seg = u.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "youtu.be") {
    const shorts = seg[0] === "shorts";
    const v =
      host === "youtu.be"
        ? id(seg[0])
        : shorts || seg[0] === "live"
          ? id(seg[1])
          : id(u.searchParams.get("v"));
    return v
      ? {
          provider: "youtube",
          embedUrl: `https://www.youtube-nocookie.com/embed/${v}?autoplay=1`,
          vertical: shorts,
        }
      : null;
  }
  if (host === "tiktok.com") {
    const v = seg[0]?.startsWith("@") && seg[1] === "video" ? seg[2] : null;
    return v && /^[0-9]{6,30}$/.test(v)
      ? {
          provider: "tiktok",
          embedUrl: `https://www.tiktok.com/embed/v2/${v}`,
          vertical: true,
        }
      : null;
  }
  if (host === "loom.com") {
    const v = seg[0] === "share" ? id(seg[1]) : null;
    return v
      ? {
          provider: "loom",
          embedUrl: `https://www.loom.com/embed/${v}?autoplay=1`,
          vertical: false,
        }
      : null;
  }
  if (host === "facebook.com" || host === "fb.watch") {
    const reel = seg[0] === "reel" && /^[0-9]{6,30}$/.test(seg[1] ?? "");
    const video =
      (seg[1] === "videos" && /^[0-9]{6,30}$/.test(seg[2] ?? "")) ||
      (seg[0] === "watch" &&
        /^[0-9]{6,30}$/.test(u.searchParams.get("v") ?? ""));
    const short = host === "fb.watch" && id(seg[0]) !== null;
    if (!reel && !video && !short) return null;
    const href = `https://${host === "fb.watch" ? "fb.watch" : "www.facebook.com"}${u.pathname}${seg[0] === "watch" ? u.search : ""}`;
    return {
      provider: "facebook",
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(href)}&show_text=false&autoplay=true`,
      vertical: reel,
    };
  }
  return null;
}

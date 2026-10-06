import "server-only";
import {
  parseOpenGraph,
  parseSiteIdentity,
  type LinkPreview,
} from "@/lib/og-parse";
import { hasOwnerSnippet, sameSite } from "@/lib/traffic/pixel";
import { guardedGet } from "./public-url";

// Phase 10b: Open Graph preview of a link in a post, fetched on the server only. Same SSRF guard
// as founder-supplied provider URLs (public https names that resolve to public IPs), re-checked
// on every redirect (max 3). 3 s for the whole fetch, at most 512 KB of HTML read, results kept
// in memory for a day (the post row itself stores the preview, so this only saves refetches).

const TIMEOUT_MS = 3000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const TTL_MS = 86_400_000;
const memo = new Map<string, { at: number; value: LinkPreview | null }>();

/** Up to `max` bytes of the body; `whole` is false when the body was longer (or cut off). */
async function readBytes(
  res: Response,
  max: number,
): Promise<{ bytes: Buffer; whole: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) return { bytes: Buffer.alloc(0), whole: true };
  const chunks: Uint8Array[] = [];
  let size = 0;
  let whole = false;
  try {
    while (size <= max) {
      const { done, value } = await reader.read();
      if (done || !value) {
        whole = true;
        break;
      }
      chunks.push(value);
      size += value.byteLength;
    }
  } catch {
    whole = false; // timed out, too large or reset: keep what arrived, never "whole"
  }
  await reader.cancel().catch(() => {});
  const bytes = Buffer.concat(chunks);
  return { bytes: bytes.subarray(0, max), whole: whole && bytes.length <= max };
}

/**
 * GET a user-supplied URL through the SSRF guard (lib/net/public-url guardedGet: https:443 only,
 * IP checked at connect time, every redirect re-checked, at most 3). http:// is upgraded on the
 * first URL only; a redirect to http is refused. Returns the final response when `typeOk` holds.
 */
async function fetchGuarded(
  link: string,
  signal: AbortSignal,
  accept: string,
  typeOk: (contentType: string) => boolean,
  maxBytes: number,
): Promise<{ res: Response; url: URL } | null> {
  const { response: res, url } = await guardedGet(
    link.replace(/^http:/i, "https:"),
    {
      headers: {
        "user-agent": "JaoPorBot/1.0 (+https://jaopor.vercel.app)",
        accept,
      },
      maxRedirects: MAX_REDIRECTS,
      // Readers stop at their own cap; this one only bounds a body nobody reads to the end.
      maxBytes: maxBytes + 64 * 1024,
      signal,
    },
  );
  if (
    !res.ok ||
    !typeOk((res.headers.get("content-type") ?? "").toLowerCase())
  ) {
    await res.body?.cancel().catch(() => {});
    return null;
  }
  return { res, url };
}

/** The page's HTML (first `maxBytes`) and the URL it was finally read from. */
export async function fetchHtml(
  link: string,
  signal: AbortSignal,
  maxBytes = MAX_BYTES,
): Promise<{ html: string; url: string } | null> {
  const hit = await fetchGuarded(
    link,
    signal,
    "text/html,application/xhtml+xml",
    (t) => t.includes("text/html") || t.includes("application/xhtml+xml"),
    maxBytes,
  );
  if (!hit) return null;
  const { bytes } = await readBytes(hit.res, maxBytes);
  return {
    html: new TextDecoder("utf-8", { fatal: false }).decode(bytes),
    url: hit.url.toString(),
  };
}

/** Preview for `link`, or null when the page can't be read safely within the limits. */
export async function getLinkPreview(
  link: string,
): Promise<LinkPreview | null> {
  const hit = memo.get(link);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  let value: LinkPreview | null = null;
  try {
    const page = await fetchHtml(link, AbortSignal.timeout(TIMEOUT_MS));
    if (page) {
      const p = parseOpenGraph(page.html, page.url);
      value = p.title || p.description || p.image ? p : null;
    }
  } catch {
    value = null; // blocked, timed out, or unreadable: the card shows the bare link
  }
  if (memo.size > 500) memo.clear();
  memo.set(link, { at: Date.now(), value });
  return value;
}

// ---- Add-startup auto-fill (Design.md §5 Add-startup wizard v2) --------------------------------

const ICON_MAX_BYTES = 1024 * 1024;
const ICON_PX = 256;
const identityMemo = new Map<
  string,
  { at: number; value: SiteAutofill | null }
>();

export type SiteAutofill = {
  name: string | null;
  tagline: string | null;
  /** 256 px PNG as a data: URL (uploaded as the logo only if the founder keeps it). */
  logo: string | null;
};

/**
 * SVG icons are rasterised by sharp (librsvg). Only self-contained ones: no DOCTYPE / entities
 * (XML bombs) and no references outside the file (images, external hrefs, CSS imports).
 */
function safeSvg(bytes: Buffer): boolean {
  const text = bytes.toString("utf8");
  return !/<!DOCTYPE|<!ENTITY|<image\b|<foreignObject|<script\b|@import|url\(\s*['"]?(?!#)|href\s*=\s*["'](?!#)/i.test(
    text,
  );
}

async function iconPng(
  url: string,
  signal: AbortSignal,
): Promise<string | null> {
  const hit = await fetchGuarded(
    url,
    signal,
    "image/*",
    (t) => /^image\/(png|jpeg|webp|gif|svg\+xml|avif)/.test(t),
    ICON_MAX_BYTES,
  );
  if (!hit) return null;
  const { bytes, whole } = await readBytes(hit.res, ICON_MAX_BYTES);
  if (!whole || !bytes.length) return null;
  const svg = (hit.res.headers.get("content-type") ?? "").includes("svg");
  if (svg && !safeSvg(bytes)) return null;
  const { default: sharp } = await import("sharp");
  const img = sharp(bytes, {
    limitInputPixels: 4096 * 4096,
    density: svg ? 300 : undefined,
  });
  const meta = await img.metadata();
  // A 16 px favicon blown up to a logo looks broken; leave the logo empty instead.
  if (!svg && Math.min(meta.width ?? 0, meta.height ?? 0) < 48) return null;
  const png = await img
    .resize(ICON_PX, ICON_PX, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Name, one-liner and logo for a project's website, or null when the page can't be read. */
export async function getSiteAutofill(
  link: string,
): Promise<SiteAutofill | null> {
  const hit = identityMemo.get(link);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.value;
  let value: SiteAutofill | null = null;
  try {
    const page = await fetchHtml(link, AbortSignal.timeout(TIMEOUT_MS));
    if (page) {
      const id = parseSiteIdentity(page.html, page.url);
      let logo: string | null = null;
      const signal = AbortSignal.timeout(TIMEOUT_MS);
      for (const icon of id.icons.slice(0, 3)) {
        logo = await iconPng(icon, signal).catch(() => null);
        if (logo || signal.aborted) break;
      }
      value =
        id.name || id.tagline || logo
          ? { name: id.name, tagline: id.tagline, logo }
          : null;
    }
  } catch {
    value = null; // blocked, timed out, or unreadable: the founder fills the fields in
  }
  if (identityMemo.size > 100) identityMemo.clear();
  identityMemo.set(link, { at: Date.now(), value });
  return value;
}

// ---- Owner verified (Design.md §5): is this project's snippet on its own website? ----------

/**
 * Reads the listed website (same SSRF guard and limits as above) and looks for the JaoPor
 * snippet with this project's slug. "unreachable" when the page can't be read (keep the last
 * result); "missing" also when the page we ended on isn't the listed domain (a redirect elsewhere
 * proves nothing about it).
 */
export async function findOwnerSnippet(
  websiteUrl: string,
  projectId: string,
): Promise<"found" | "missing" | "unreachable"> {
  let page: { html: string; url: string } | null;
  try {
    page = await fetchHtml(websiteUrl, AbortSignal.timeout(TIMEOUT_MS * 2));
  } catch {
    return "unreachable";
  }
  if (!page) return "unreachable";
  const listed = new URL(websiteUrl.replace(/^http:/i, "https:")).host;
  if (!sameSite(new URL(page.url).host, listed)) return "missing";
  return hasOwnerSnippet(page.html, projectId) ? "found" : "missing";
}

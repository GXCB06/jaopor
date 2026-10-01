import "server-only";
import { parseOpenGraph, type LinkPreview } from "@/lib/og-parse";
import { assertPublicHttpsUrl } from "./public-url";

// Phase 10b: Open Graph preview of a link in a post, fetched on the server only. Same SSRF guard
// as founder-supplied provider URLs (public https names that resolve to public IPs), re-checked
// on every redirect (max 3). 3 s for the whole fetch, at most 512 KB of HTML read, results kept
// in memory for a day (the post row itself stores the preview, so this only saves refetches).

const TIMEOUT_MS = 3000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const TTL_MS = 86_400_000;
const memo = new Map<string, { at: number; value: LinkPreview | null }>();

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder("utf-8", { fatal: false }).decode(
    Buffer.concat(chunks).subarray(0, MAX_BYTES),
  );
}

async function fetchHtml(
  link: string,
  signal: AbortSignal,
): Promise<{ html: string; url: string } | null> {
  // http links are fetched over https (the guard only allows https).
  let current = link.replace(/^http:/i, "https:");
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicHttpsUrl(current);
    const res = await fetch(url, {
      redirect: "manual",
      signal,
      headers: {
        "user-agent": "JaoPorBot/1.0 (+https://jaopor.vercel.app)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      await res.body?.cancel().catch(() => {});
      if (!next) return null;
      current = new URL(next, url).toString();
      continue;
    }
    if (
      !res.ok ||
      !(res.headers.get("content-type") ?? "").includes("text/html")
    ) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    return { html: await readCapped(res), url: url.toString() };
  }
  return null;
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

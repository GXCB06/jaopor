// Phase 10b link previews: read Open Graph / Twitter / <title> tags from a page's HTML. Pure (no
// network), so the server fetcher in lib/net/link-preview.ts stays small and this stays tested.

export type LinkPreview = {
  title: string | null;
  description: string | null;
  image: string | null;
  domain: string;
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code =
        e[1] === "x" || e[1] === "X"
          ? parseInt(e.slice(2), 16)
          : Number(e.slice(1));
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const clean = (s: string | undefined, max: number): string | null => {
  if (!s) return null;
  const v = decode(s).replace(/\s+/g, " ").trim();
  if (!v) return null;
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
};

/** Attribute map of every <meta> tag in the <head> (property= or name= → content=). */
function metaTags(html: string): Map<string, string> {
  const end = html.search(/<\/head>/i);
  const head = end > 0 ? html.slice(0, end) : html;
  const out = new Map<string, string>();
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attr = (name: string) =>
      new RegExp(
        `\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
        "i",
      ).exec(tag);
    const key = attr("property") ?? attr("name");
    const content = attr("content");
    if (!key || !content) continue;
    const k = (key[2] ?? key[3] ?? key[4]).toLowerCase();
    if (!out.has(k)) out.set(k, content[2] ?? content[3] ?? content[4]);
  }
  return out;
}

/** og:image resolved against the page; https only (the card is shown on an https site). */
function imageUrl(raw: string | undefined, page: URL): string | null {
  if (!raw) return null;
  try {
    const u = new URL(decode(raw.trim()), page);
    if (u.protocol !== "https:") return null;
    const s = u.toString();
    return s.length <= 500 ? s : null;
  } catch {
    return null;
  }
}

export function parseOpenGraph(html: string, pageUrl: string): LinkPreview {
  const page = new URL(pageUrl);
  const meta = metaTags(html);
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  return {
    title: clean(
      meta.get("og:title") ?? meta.get("twitter:title") ?? titleTag,
      120,
    ),
    description: clean(
      meta.get("og:description") ??
        meta.get("twitter:description") ??
        meta.get("description"),
      200,
    ),
    image: imageUrl(meta.get("og:image") ?? meta.get("twitter:image"), page),
    domain: page.hostname.replace(/^www\./, ""),
  };
}

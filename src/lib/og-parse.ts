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

// Add-startup auto-fill (Design.md §5 Add-startup wizard v2): name, one-liner and icon candidates
// for a project's own website. The server fetches the page and the icon; this part stays pure.

export type SiteIdentity = {
  name: string | null;
  tagline: string | null;
  /** Icon URLs to try in order (https, resolved against the page); never .ico (can't be decoded). */
  icons: string[];
};

/** Every <link> tag in the <head> as a lower-cased attribute map. */
function linkTags(html: string): Map<string, string>[] {
  const end = html.search(/<\/head>/i);
  const head = end > 0 ? html.slice(0, end) : html;
  const out: Map<string, string>[] = [];
  for (const [tag] of head.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = new Map<string, string>();
    for (const m of tag.matchAll(
      /\b([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    ))
      attrs.set(m[1].toLowerCase(), decode(m[2] ?? m[3] ?? m[4]).trim());
    out.push(attrs);
  }
  return out;
}

/** Lower-case letters and digits only, for comparing a title part with the domain. */
const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Largest side declared in sizes="180x180 32x32"; "any" (SVG) counts as large. */
function declaredSize(sizes: string | undefined): number | null {
  if (!sizes) return null;
  if (/\bany\b/i.test(sizes)) return 512;
  let best = 0;
  for (const m of sizes.matchAll(/(\d+)x(\d+)/gi))
    best = Math.max(best, Math.min(Number(m[1]), Number(m[2])));
  return best || null;
}

export function parseSiteIdentity(html: string, pageUrl: string): SiteIdentity {
  const page = new URL(pageUrl);
  const meta = metaTags(html);
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const title = clean(meta.get("og:title") ?? titleTag, 200);
  const parts = title
    ? title
        .split(/\s+[|\-–—·:•]\s+|:\s+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  // Name: the site's own name tag, else the title part that matches the domain, else the first.
  const label = squash(page.hostname.replace(/^www\./, "").split(".")[0]);
  const matching = parts.find((p) => {
    const q = squash(p);
    return q.length >= 3 && (q.includes(label) || label.includes(q));
  });
  const fromTitle = matching ?? parts[0];
  const name = clean(
    meta.get("og:site_name") ?? meta.get("application-name") ?? fromTitle,
    80,
  );

  const description = clean(
    meta.get("og:description") ??
      meta.get("description") ??
      meta.get("twitter:description"),
    140,
  );
  // No description: the rest of the title often is the one-liner ("Acme | Invoices in 1 minute").
  const rest = parts
    .filter((p) => p !== fromTitle)
    .sort((a, b) => b.length - a.length)[0];
  const tagline =
    description ?? (rest && rest.length >= 12 ? clean(rest, 140) : null);

  const scored: { url: string; score: number }[] = [];
  for (const l of linkTags(html)) {
    const rel = (l.get("rel") ?? "").toLowerCase().split(/\s+/);
    const href = l.get("href");
    if (!href || rel.includes("mask-icon")) continue;
    const apple = rel.some((r) => r.startsWith("apple-touch-icon"));
    if (!apple && !rel.includes("icon")) continue;
    let url: URL;
    try {
      url = new URL(href, page);
    } catch {
      continue;
    }
    const type = (l.get("type") ?? "").toLowerCase();
    if (
      url.protocol !== "https:" ||
      /\.ico$/i.test(url.pathname) ||
      type.includes("icon") // image/x-icon, image/vnd.microsoft.icon
    )
      continue;
    const svg = /\.svg$/i.test(url.pathname) || type.includes("svg");
    const size = declaredSize(l.get("sizes")) ?? (apple ? 180 : svg ? 512 : 32);
    // Apple touch icons are made to be shown as an app tile: prefer them at equal quality.
    scored.push({ url: url.toString(), score: size + (apple ? 64 : 0) });
  }
  scored.push({
    url: new URL("/apple-touch-icon.png", page).toString(),
    score: 0,
  });
  const icons = [
    ...new Set(
      scored
        .sort((a, b) => b.score - a.score)
        .map((s) => s.url)
        .filter((u) => u.length <= 500),
    ),
  ].slice(0, 4);

  return { name, tagline, icons };
}

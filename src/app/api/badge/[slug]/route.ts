import { getStartupBySlug } from "@/lib/data/startups";
import { badgeValue } from "@/lib/share";
import { BRAND_HEX, CARD_THEME, MARK_PATH } from "@/lib/share-palette";

// Design.md §9 embeddable badge: `<img src="/api/badge/<slug>">` on the founder's site/README.
// Shields-style SVG, monospace so widths are predictable. ?theme=light for light backgrounds.
// Text is ASCII (numbers + fixed English units) and escaped anyway.

export const revalidate = 3600;

const CHAR = 6.6; // 11px monospace ≈ 0.6em per character
const PAD = 10;
const MARK = 18;

const esc = (s: string) =>
  s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

function svg(left: string, right: string, light: boolean) {
  const leftW = Math.round(PAD + MARK + 6 + left.length * CHAR + PAD);
  const rightW = Math.round(PAD + right.length * CHAR + PAD);
  const w = leftW + rightW;
  const c = CARD_THEME[light ? "light" : "dark"];
  const bg = c.bg;
  const panel = light ? "#f4f4f5" : c.card;
  const border = c.border;
  const fg = c.fg;
  const value = c.positive;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="28" viewBox="0 0 ${w} 28" role="img" aria-label="${esc(`${left}: ${right}`)}">
<title>${esc(`${left}: ${right}`)}</title>
<rect x="0.5" y="0.5" width="${w - 1}" height="27" rx="6" fill="${bg}" stroke="${border}"/>
<rect x="${leftW}" y="1" width="${rightW - 1.5}" height="26" rx="5" fill="${panel}"/>
<g transform="translate(${PAD} 5)">
<rect width="${MARK}" height="${MARK}" rx="4.5" fill="${BRAND_HEX}"/>
<path transform="scale(0.75)" d="${MARK_PATH}" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<g font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,'DejaVu Sans Mono',monospace" font-size="11" font-weight="700">
<text x="${PAD + MARK + 6}" y="18" fill="${fg}">${esc(left)}</text>
<text x="${leftW + PAD}" y="18" fill="${right === "listed" ? fg : value}">${esc(right)}</text>
</g>
</svg>`;
}

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/badge/[slug]">,
) {
  const { slug } = await ctx.params;
  const light = new URL(req.url).searchParams.get("theme") === "light";
  const startup = /^[a-z0-9-]{1,50}$/.test(slug)
    ? await getStartupBySlug(slug).catch(() => null)
    : null;
  if (!startup) return new Response("Not found", { status: 404 });

  const value = badgeValue(startup);
  const body = svg(
    value ? "Verified on JaoPor" : "On JaoPor",
    value ?? "listed",
    light,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Content-Type-Options": "nosniff",
      // An SVG opened directly must not run anything.
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}

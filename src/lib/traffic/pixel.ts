// JaoPor snippet (Design.md §5 VerifyPanel): our own visitor counter for sites with no analytics
// account (Vercel, Netlify, GitHub Pages… anything). Privacy by construction: no cookie, the IP is
// never stored; a visitor is an HMAC of (project, IP, user agent) under a key that changes every
// UTC day, so hashes can't be linked across days. Rows are deleted after the daily rollup.
import { createHmac, hkdfSync } from "node:crypto";
import { bareDomain, domainMatches } from "./types";

/** At most this many visitors per network (/24 IPv4, /48 IPv6) per project per day. */
export const NET_CAP = 20;

const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|go-http|axios|node-fetch|okhttp|java\//i;

/** Empty or automated user agents never count. */
export function isBot(userAgent: string | null): boolean {
  return !userAgent || userAgent.length < 10 || BOT_UA.test(userAgent);
}

/** Client IP from the platform headers (Vercel sets x-forwarded-for / x-real-ip). */
export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip")?.trim() || null;
}

/** "203.0.113.7" → "203.0.113"; "2001:db8:1:2::1" → "2001:db8:1". */
export function networkPrefix(ip: string): string {
  if (ip.includes(":"))
    return ip.toLowerCase().split(":").slice(0, 3).join(":");
  return ip.split(".").slice(0, 3).join(".");
}

/** Host of the page that sent the beacon: Origin, else Referer. */
export function sourceHost(headers: Headers): string | null {
  for (const h of ["origin", "referer"]) {
    const v = headers.get(h);
    if (!v || v === "null") continue;
    try {
      return bareDomain(new URL(v).host);
    } catch {
      // Malformed header: try the next one.
    }
  }
  return null;
}

/** The beacon must come from the project's own website (or a subdomain of it). */
export function fromProjectSite(
  headers: Headers,
  websiteHost: string | null,
): boolean {
  const host = sourceHost(headers);
  return !!host && !!websiteHost && domainMatches(host, websiteHost);
}

/** Per-day key derived from the server secret (HKDF), so no salt table is needed. */
export function dayKey(secret: string, day: string): Buffer {
  return Buffer.from(
    hkdfSync("sha256", secret, "jaopor-pixel", `day:${day}`, 32),
  );
}

export function visitorHashes(
  key: Buffer,
  startupId: number,
  ip: string,
  userAgent: string,
): { visitor: Buffer; net: Buffer } {
  const mac = (s: string) => createHmac("sha256", key).update(s).digest();
  return {
    visitor: mac(`v|${startupId}|${ip}|${userAgent}`),
    net: mac(`n|${startupId}|${networkPrefix(ip)}`),
  };
}

/** The line founders paste before </head>. */
export function snippetTag(siteUrl: string, slug: string): string {
  return `<script defer src="${siteUrl}/v.js" data-project="${slug}"></script>`;
}

/** Rows of `pixel_visitors` (one per unique visitor per day) → visitors per day. */
export function countByDay(rows: Array<{ day: string }>): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + 1);
  return byDay;
}

/**
 * Daily snapshots → Visitors (30d) as the sum of daily uniques over the last 30 days including
 * today. The previous 30 days only count once the snippet has been counting that long (`since`),
 * otherwise a half-empty window would fake growth.
 */
export function summarizeSnapshots(
  snaps: Array<{ day: string; visitors: number }>,
  now: Date,
  since: string | null,
): { visitors30d: number; visitorsPrev30d: number } {
  const day = (n: number) =>
    new Date(now.getTime() - n * 86_400_000).toISOString().slice(0, 10);
  const cut = day(29);
  const from = day(59);
  const sum = (xs: typeof snaps) => xs.reduce((a, s) => a + s.visitors, 0);
  const inWindow = snaps.filter((s) => s.day >= from);
  return {
    visitors30d: sum(inWindow.filter((s) => s.day >= cut)),
    visitorsPrev30d:
      since && since <= from ? sum(inWindow.filter((s) => s.day < cut)) : 0,
  };
}

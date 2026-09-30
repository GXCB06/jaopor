// Verified website traffic (unique visitors). Read-only by construction:
// Plausible Stats API keys cannot change sites; Umami share links are view-only tokens;
// Cloudflare tokens must be analytics-only; the JaoPor snippet needs no credential at all.

export type TrafficProviderId = "plausible" | "umami" | "cloudflare" | "jaopor";

export type TrafficReading = {
  /** Unique visitors in the 30 whole UTC days before today. */
  visitors30d: number;
  visitorsPrev30d: number;
  /** Daily unique visitors, oldest first (may be empty if the provider has no daily series). */
  daily: Array<{ day: string; visitors: number }>;
  /** The analytics site's own domain, used to prove it belongs to the project's website. */
  domain: string | null;
};

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const daysAgo = (now: Date, n: number) =>
  new Date(now.getTime() - n * 86_400_000);

/** Strips scheme, `www.` and path: "https://www.Shop.co.th/x" → "shop.co.th". */
export function bareDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
}

/** The analytics domain must be the website itself or one of its subdomains (app.shop.co.th). */
export function domainMatches(
  siteDomain: string,
  websiteHost: string,
): boolean {
  const site = bareDomain(siteDomain);
  const web = bareDomain(websiteHost);
  return site === web || site.endsWith(`.${web}`) || web.endsWith(`.${site}`);
}

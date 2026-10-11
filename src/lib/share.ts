// Share kit helpers (Design.md §9): which verified numbers a share card / badge / post shows.
// Pure: no I/O, so the OG image, the SVG badge and the share dialog all pick the same numbers.
import { bandText } from "./disclosure";
import { formatPct, moneyCompact } from "./format";
import { SOURCE_NAME, isSource, type SourceId } from "./sources/catalog";

export type ShareMetricId =
  "mrr" | "revenue30d" | "visitors30d" | "activeUsers" | "commits";
export type ShareMetric = { id: ShareMetricId; value: string };

type Numbers = {
  /** Demo projects (sample data) never show numbers on share assets. */
  is_demo?: boolean;
  verification_status: string;
  verified_provider: string | null;
  mrr_cents: number | null;
  revenue_30d_cents: number | null;
  visitors_30d: number | null;
  traffic_provider: string | null;
  active_users: number | null;
  build_commits: number | null;
  github_repo: string | null;
  /**
   * R2 disclosure levels (absent = every group exact). Figures are already null below exact;
   * this adds the band / growth forms a visitor may see.
   */
  disclosure?: {
    revenue: Shown;
    traffic: Shown;
    build: Shown;
  };
};

type Shown = {
  level: string | null;
  band: { lo: number; hi: number | null } | null;
  growthPct: number | null;
};

/** "฿10k–25k" / "<฿1k" / ">฿1M" (share assets are short; the page words it in full). */
function bandShort(band: NonNullable<Shown["band"]>, unit: "thb" | "count") {
  const b = bandText(band, unit);
  if (b.kind === "under") return `<${b.hi}`;
  if (b.kind === "over") return `>${b.lo}`;
  return `${b.lo}–${b.hi}`;
}

const compact = (n: number) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

/**
 * Verified numbers only, strongest first: revenue → visitors/users → build proof. R2: a group the
 * owner shows as a range or as growth contributes that form; badge and private add no figure.
 */
export function shareMetrics(s: Numbers, max = 3): ShareMetric[] {
  if (s.is_demo) return [];
  const out: ShareMetric[] = [];
  const revenue = s.verification_status === "verified";
  const rev = s.disclosure?.revenue;
  const traffic = s.disclosure?.traffic;
  if (revenue && s.mrr_cents)
    out.push({ id: "mrr", value: moneyCompact(s.mrr_cents) });
  else if (revenue && rev?.level === "band" && rev.band)
    out.push({ id: "mrr", value: bandShort(rev.band, "thb") });
  if (revenue && s.revenue_30d_cents !== null)
    out.push({ id: "revenue30d", value: moneyCompact(s.revenue_30d_cents) });
  else if (revenue && rev?.level === "growth" && rev.growthPct !== null)
    out.push({
      id: "revenue30d",
      value: formatPct(rev.growthPct, { sign: true }),
    });
  if (s.visitors_30d !== null)
    out.push({ id: "visitors30d", value: compact(s.visitors_30d) });
  else if (traffic?.level === "band" && traffic.band)
    out.push({ id: "visitors30d", value: bandShort(traffic.band, "count") });
  else if (traffic?.level === "growth" && traffic.growthPct !== null)
    out.push({
      id: "visitors30d",
      value: formatPct(traffic.growthPct, { sign: true }),
    });
  if (s.active_users !== null)
    out.push({ id: "activeUsers", value: compact(s.active_users) });
  if (s.build_commits !== null)
    out.push({ id: "commits", value: compact(s.build_commits) });
  return out.slice(0, max);
}

/**
 * Names of the sources behind the verified numbers, e.g. ["Stripe", "GitHub"]. Visitor sources
 * are counted, not verified (Design.md §3 Verified vs counted), so they are not listed.
 */
export function verifiedSources(s: Numbers): string[] {
  if (s.is_demo) return [];
  const ids: SourceId[] = [];
  if (s.verification_status === "verified" && isSource(s.verified_provider))
    ids.push(s.verified_provider);
  // R2: build proof counts at any public level (github_repo is null when it is private).
  if (
    (s.build_commits !== null || Boolean(s.disclosure?.build.level)) &&
    s.github_repo
  )
    ids.push("github");
  return ids.map((id) => SOURCE_NAME[id]);
}

/** English badge text (SVG badges are ASCII so width estimates stay right). */
export function badgeValue(s: Numbers): string | null {
  const m = shareMetrics(s, 1)[0];
  if (!m) {
    // R2 `badge` level: verified, no figure.
    if (s.is_demo) return null;
    if (s.verification_status === "verified") return "verified revenue";
    if (s.disclosure?.build.level && s.github_repo) return "verified build";
    return null;
  }
  const unit: Record<ShareMetricId, string> = {
    mrr: "MRR",
    revenue30d: "revenue/30d",
    visitors30d: "visitors/30d",
    activeUsers: "active users",
    commits: "commits",
  };
  // SVG badges are ASCII-only (width estimates): "฿" → "THB ".
  return `${m.value.replace(/฿/g, "THB ")} ${unit[m.id]}`;
}

export const shareLinks = (url: string, text: string) => ({
  facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  line: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
  x: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
});

export function badgeHtml(
  profileUrl: string,
  badgeUrl: string,
  name: string,
): string {
  const alt = `${name} on JaoPor`.replace(/[<>"&]/g, "");
  return `<a href="${profileUrl}"><img src="${badgeUrl}" alt="${alt}" height="28"></a>`;
}

/** Spec 6.5 "คัดลอกโค้ด README": Markdown image link for GitHub READMEs. */
export function badgeMarkdown(
  profileUrl: string,
  badgeUrl: string,
  name: string,
): string {
  const alt = `${name} on JaoPor`.replace(/[[\]()<>]/g, "");
  return `[![${alt}](${badgeUrl})](${profileUrl})`;
}

/**
 * Spec 6.5 badge card headline: all-time revenue ("TOTAL REVENUE") when revenue is verified,
 * else the strongest verified metric. Null → the card says "not verified yet".
 */
export function badgeHeadline(
  s: Numbers & { revenue_all_time_cents: number | null },
): { id: ShareMetricId | "revenueAllTime"; value: string } | null {
  if (s.is_demo) return null;
  if (s.verification_status === "verified" && s.revenue_all_time_cents)
    return {
      id: "revenueAllTime",
      value: moneyCompact(s.revenue_all_time_cents),
    };
  return shareMetrics(s, 1)[0] ?? null;
}

/**
 * The glyph a project's calendar heatmap is drawn with (spec 6.5): "฿" for THB projects (priced
 * in THB, or Thai projects without a price), "$" otherwise.
 */
export function projectCurrencySymbol(s: {
  pricing_currency: string | null;
  country: string;
}): "฿" | "$" {
  if (s.pricing_currency) return s.pricing_currency === "THB" ? "฿" : "$";
  return s.country === "TH" ? "฿" : "$";
}

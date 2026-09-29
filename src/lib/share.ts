// Share kit helpers (Design.md §9): which verified numbers a share card / badge / post shows.
// Pure: no I/O, so the OG image, the SVG badge and the share dialog all pick the same numbers.
import { moneyCompact } from "./format";
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
};

const compact = (n: number) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

/** Verified numbers only, strongest first: revenue → visitors/users → build proof. */
export function shareMetrics(s: Numbers, max = 3): ShareMetric[] {
  if (s.is_demo) return [];
  const out: ShareMetric[] = [];
  const revenue = s.verification_status === "verified";
  if (revenue && s.mrr_cents)
    out.push({ id: "mrr", value: moneyCompact(s.mrr_cents) });
  if (revenue && s.revenue_30d_cents !== null)
    out.push({ id: "revenue30d", value: moneyCompact(s.revenue_30d_cents) });
  if (s.visitors_30d !== null)
    out.push({ id: "visitors30d", value: compact(s.visitors_30d) });
  if (s.active_users !== null)
    out.push({ id: "activeUsers", value: compact(s.active_users) });
  if (s.build_commits !== null)
    out.push({ id: "commits", value: compact(s.build_commits) });
  return out.slice(0, max);
}

/** Names of the sources behind the verified numbers, e.g. ["Stripe", "Plausible", "GitHub"]. */
export function verifiedSources(s: Numbers): string[] {
  if (s.is_demo) return [];
  const ids: SourceId[] = [];
  if (s.verification_status === "verified" && isSource(s.verified_provider))
    ids.push(s.verified_provider);
  if (s.visitors_30d !== null && isSource(s.traffic_provider))
    ids.push(s.traffic_provider);
  if (s.build_commits !== null && s.github_repo) ids.push("github");
  return ids.map((id) => SOURCE_NAME[id]);
}

/** English badge text (SVG badges are ASCII so width estimates stay right). */
export function badgeValue(s: Numbers): string | null {
  const m = shareMetrics(s, 1)[0];
  if (!m) return null;
  const unit: Record<ShareMetricId, string> = {
    mrr: "MRR",
    revenue30d: "revenue/30d",
    visitors30d: "visitors/30d",
    activeUsers: "active users",
    commits: "commits",
  };
  return `${m.value} ${unit[m.id]}`;
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

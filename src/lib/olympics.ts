// Spec 6.7 Province Olympics (redesign v3, 2026-10-01: Claude Design structure). Shared by the page,
// the province page, the home teaser and the detail-page link.
//
// The season metric is revenue over the last 30 days, so leaders can change every month. Rank
// movement compares with the previous 30 days (startups.revenue_prev_30d_cents / visitors_prev_30d),
// which exist for revenue30d and visitors only; MRR and commits show no movement.
// Ranking runs in TypeScript over the public startup rows (the v1 SQL `province_leaderboard` has no
// 30-day metric); a v2 SQL twin can replace it once the board is large.
import {
  PROVINCE_LIST,
  REGIONS,
  getProvince,
  type ProvinceDef,
  type Region,
} from "@/lib/config/provinces";

export const OLYMPIC_METRICS = [
  "revenue30d",
  "mrr",
  "visitors",
  "commits",
] as const;
export type OlympicMetric = (typeof OLYMPIC_METRICS)[number];
export const DEFAULT_METRIC: OlympicMetric = "revenue30d";

/** Money metrics are USD cents (shown in the visitor's currency); the others are counts. */
export function isMoneyMetric(m: OlympicMetric): boolean {
  return m === "revenue30d" || m === "mrr";
}

/** Metrics with a stored previous period (rank movement and growth). */
export function hasPrevious(m: OlympicMetric): boolean {
  return m === "revenue30d" || m === "visitors";
}

export function parseMetric(v: unknown): OlympicMetric {
  return OLYMPIC_METRICS.includes(v as OlympicMetric)
    ? (v as OlympicMetric)
    : DEFAULT_METRIC;
}

export function parseRegion(v: unknown): Region | null {
  return REGIONS.includes(v as Region) ? (v as Region) : null;
}

export type ProvinceTop = {
  slug: string;
  name: string;
  logo_path: string | null;
  /** Public logo URL, filled in on the server for client components (lib/supabase/public). */
  logo_url?: string | null;
  value: number;
};

export type ProvinceRank = {
  province: string;
  region: Region;
  /** 1-based position on this board. */
  rank: number;
  startups: number;
  total: number;
  /** Previous-period total (null when the metric has none). */
  prevTotal: number | null;
  /** Position by previous-period total (null: wasn't on the board then, or no previous data). */
  prevRank: number | null;
  /** prevRank − rank: positive = climbed. Null when there's nothing to compare. */
  change: number | null;
  /** (total − prevTotal) / prevTotal, null when not computable. */
  growth: number | null;
  top: ProvinceTop[];
};

/** The startup columns the ranking reads (a public-client select). */
export type OlympicSource = {
  slug: string;
  name: string;
  logo_path: string | null;
  province: string | null;
  status: string;
  is_demo: boolean;
  verification_status: string;
  revenue_30d_cents: number | null;
  revenue_prev_30d_cents: number | null;
  mrr_cents: number | null;
  visitors_30d: number | null;
  visitors_prev_30d: number | null;
  build_commits: number | null;
};

export const OLYMPIC_COLUMNS =
  "slug, name, logo_path, province, status, is_demo, verification_status, revenue_30d_cents, revenue_prev_30d_cents, mrr_cents, visitors_30d, visitors_prev_30d, build_commits";

/** A startup's verified value for the metric, or null when it has none (it doesn't count). */
export function metricValue(
  s: OlympicSource,
  metric: OlympicMetric,
): number | null {
  const verified = s.verification_status === "verified";
  switch (metric) {
    case "revenue30d":
      return verified ? s.revenue_30d_cents : null;
    case "mrr":
      return verified ? s.mrr_cents : null;
    case "visitors":
      return s.visitors_30d;
    case "commits":
      return s.build_commits;
  }
}

/** Previous-period value (0 when the source has none yet), null for metrics without one. */
export function previousValue(
  s: OlympicSource,
  metric: OlympicMetric,
): number | null {
  if (metric === "revenue30d")
    return s.verification_status === "verified"
      ? (s.revenue_prev_30d_cents ?? 0)
      : null;
  if (metric === "visitors")
    return s.visitors_30d === null ? null : (s.visitors_prev_30d ?? 0);
  return null;
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0;

type Group = {
  def: ProvinceDef;
  items: ProvinceTop[];
  prev: number;
};

/** Published, non-demo projects with a value; total desc, count desc, slug. */
export function rankProvinces(
  rows: OlympicSource[],
  metric: OlympicMetric,
  region: Region | null = null,
): ProvinceRank[] {
  const groups = new Map<string, Group>();
  for (const s of rows) {
    const def = getProvince(s.province);
    if (!def || s.status !== "published" || s.is_demo) continue;
    if (region && def.region !== region) continue;
    const value = metricValue(s, metric);
    if (value === null) continue;
    const g = groups.get(def.slug) ?? { def, items: [], prev: 0 };
    g.items.push({ slug: s.slug, name: s.name, logo_path: s.logo_path, value });
    g.prev += previousValue(s, metric) ?? 0;
    groups.set(def.slug, g);
  }
  const withPrev = hasPrevious(metric);
  const board = [...groups.values()].map(({ def, items, prev }) => {
    items.sort((a, b) => b.value - a.value || byName(a, b));
    return {
      def,
      startups: items.length,
      total: items.reduce((sum, i) => sum + i.value, 0),
      prev,
      top: items.slice(0, 5),
    };
  });
  const order = <T extends { def: ProvinceDef; startups: number }>(
    key: (x: T) => number,
  ) => {
    return (a: T, b: T) =>
      key(b) - key(a) ||
      b.startups - a.startups ||
      (a.def.slug < b.def.slug ? -1 : 1);
  };

  // Previous ranks: only provinces that already had something in the previous period.
  const prevRank = new Map<string, number>();
  if (withPrev)
    board
      .filter((b) => b.prev > 0)
      .sort(order((x) => x.prev))
      .forEach((b, i) => prevRank.set(b.def.slug, i + 1));

  return board.sort(order((x) => x.total)).map((b, i) => {
    const rank = i + 1;
    const pr = prevRank.get(b.def.slug) ?? null;
    return {
      province: b.def.slug,
      region: b.def.region,
      rank,
      startups: b.startups,
      total: b.total,
      prevTotal: withPrev ? b.prev : null,
      prevRank: pr,
      change: pr === null ? null : pr - rank,
      growth: withPrev && b.prev > 0 ? (b.total - b.prev) / b.prev : null,
      top: b.top,
    };
  });
}

/** Provinces (in the region, if any) with no verified number yet, in config order. */
export function emptyProvinces(
  ranked: ProvinceRank[],
  region: Region | null,
): ProvinceDef[] {
  const seen = new Set(ranked.map((r) => r.province));
  return PROVINCE_LIST.filter(
    (p) => !seen.has(p.slug) && (!region || p.region === region),
  );
}

/** 1-based rank of a province (null when it isn't on the board). */
export function provinceRank(
  ranked: ProvinceRank[],
  province: string | null,
): number | null {
  return ranked.find((r) => r.province === province)?.rank ?? null;
}

/** "Climbing this month": biggest rank gains first (ties: higher rank first), at most `n`. */
export function climbers(ranked: ProvinceRank[], n = 3): ProvinceRank[] {
  return ranked
    .filter((r) => (r.change ?? 0) > 0)
    .sort((a, b) => b.change! - a.change! || a.rank - b.rank)
    .slice(0, n);
}

/** What it takes to pass the province one place up: its total minus ours, plus one unit. */
export function gapToNext(
  ranked: ProvinceRank[],
  province: string,
): { ahead: ProvinceRank; gap: number } | null {
  const i = ranked.findIndex((r) => r.province === province);
  if (i <= 0) return null;
  const ahead = ranked[i - 1];
  return { ahead, gap: ahead.total - ranked[i].total + 1 };
}

export type RegionStanding = {
  region: Region;
  total: number;
  /** Provinces in the region with at least one number / all provinces in the region. */
  provinces: number;
  of: number;
  startups: number;
};

/** Every region (all 6, even empty ones) with its summed total, biggest first then config order. */
export function regionStandings(ranked: ProvinceRank[]): RegionStanding[] {
  const order = (r: Region) => REGIONS.indexOf(r);
  return REGIONS.map((region) => {
    const rows = ranked.filter((r) => r.region === region);
    return {
      region,
      total: rows.reduce((s, r) => s + r.total, 0),
      provinces: rows.length,
      of: PROVINCE_LIST.filter((p) => p.region === region).length,
      startups: rows.reduce((s, r) => s + r.startups, 0),
    };
  }).sort(
    (a, b) =>
      b.total - a.total ||
      b.provinces - a.provinces ||
      order(a.region) - order(b.region),
  );
}

/** Header numbers for a (possibly region-filtered) board. */
export function boardSummary(ranked: ProvinceRank[]): {
  provinces: number;
  startups: number;
  total: number;
} {
  return {
    provinces: ranked.length,
    startups: ranked.reduce((s, r) => s + r.startups, 0),
    total: ranked.reduce((s, r) => s + r.total, 0),
  };
}

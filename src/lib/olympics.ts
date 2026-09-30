// Spec 6.7 Province Olympics: shared by the page, the province page and the detail-page link.
// `rankProvinces` is the TypeScript twin of the SQL `province_leaderboard(metric, region)` (used
// until that migration is applied, and as the spec the tests pin down): keep both in step.
import {
  PROVINCE_LIST,
  REGIONS,
  getProvince,
  type ProvinceDef,
  type Region,
} from "@/lib/config/provinces";

export const OLYMPIC_METRICS = [
  "revenue",
  "mrr",
  "visitors",
  "commits",
] as const;
export type OlympicMetric = (typeof OLYMPIC_METRICS)[number];
export const DEFAULT_METRIC: OlympicMetric = "revenue";

/** Money metrics are USD cents (shown in the visitor's currency); the others are counts. */
export function isMoneyMetric(m: OlympicMetric): boolean {
  return m === "revenue" || m === "mrr";
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
  value: number;
};

export type ProvinceRank = {
  province: string;
  region: Region;
  startups: number;
  total: number;
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
  revenue_all_time_cents: number | null;
  mrr_cents: number | null;
  visitors_30d: number | null;
  build_commits: number | null;
};

export const OLYMPIC_COLUMNS =
  "slug, name, logo_path, province, status, is_demo, verification_status, revenue_all_time_cents, mrr_cents, visitors_30d, build_commits";

/** A startup's verified value for the metric, or null when it has none (it doesn't count). */
export function metricValue(
  s: OlympicSource,
  metric: OlympicMetric,
): number | null {
  const verified = s.verification_status === "verified";
  switch (metric) {
    case "revenue":
      return verified ? s.revenue_all_time_cents : null;
    case "mrr":
      return verified ? s.mrr_cents : null;
    case "visitors":
      return s.visitors_30d;
    case "commits":
      return s.build_commits;
  }
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0;

/** Same rules and order as the SQL: published, non-demo, has a value; total desc, count desc, slug. */
export function rankProvinces(
  rows: OlympicSource[],
  metric: OlympicMetric,
  region: Region | null = null,
): ProvinceRank[] {
  const groups = new Map<string, { def: ProvinceDef; items: ProvinceTop[] }>();
  for (const s of rows) {
    const def = getProvince(s.province);
    if (!def || s.status !== "published" || s.is_demo) continue;
    if (region && def.region !== region) continue;
    const value = metricValue(s, metric);
    if (value === null) continue;
    const g = groups.get(def.slug) ?? { def, items: [] };
    g.items.push({ slug: s.slug, name: s.name, logo_path: s.logo_path, value });
    groups.set(def.slug, g);
  }
  return [...groups.values()]
    .map(({ def, items }) => {
      items.sort((a, b) => b.value - a.value || byName(a, b));
      return {
        province: def.slug,
        region: def.region,
        startups: items.length,
        total: items.reduce((sum, i) => sum + i.value, 0),
        top: items.slice(0, 5),
      };
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.startups - a.startups ||
        (a.province < b.province ? -1 : 1),
    );
}

/** Normalise RPC rows (numeric → string, jsonb → unknown) into ProvinceRank. */
export function fromRpc(
  rows: {
    province: string;
    region_slug: string;
    startups: number;
    total: number | string;
    top: unknown;
  }[],
): ProvinceRank[] {
  return rows.flatMap((r) => {
    const def = getProvince(r.province);
    if (!def) return [];
    const top = Array.isArray(r.top) ? (r.top as ProvinceTop[]) : [];
    return [
      {
        province: def.slug,
        region: def.region,
        startups: Number(r.startups),
        total: Number(r.total),
        top: top.map((t) => ({ ...t, value: Number(t.value) })),
      },
    ];
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
  const i = ranked.findIndex((r) => r.province === province);
  return i === -1 ? null : i + 1;
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

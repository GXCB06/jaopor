// Pure math for the spec 6.4 chart card: slice a daily series into the selected period and the
// previous one, bucket 12 months into weeks, and compute the headline + growth.
import { growthPct } from "./format";

export const CHART_METRICS = ["revenue", "mrr", "visitors"] as const;
export type ChartMetric = (typeof CHART_METRICS)[number];
export const CHART_PERIODS = [7, 30, 365] as const;
export type ChartPeriod = (typeof CHART_PERIODS)[number];

export type ChartPoint = {
  day: string;
  value: number | null;
  previous: number | null;
};

export type ChartWindow = {
  points: ChartPoint[];
  /** Sum of the period (revenue, visitors) or the latest value (MRR). */
  total: number | null;
  growth: number | null;
};

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000)
    .toISOString()
    .slice(0, 10);

const sum = (xs: (number | null)[]) =>
  xs.some((x) => x !== null)
    ? xs.reduce<number>((a, x) => a + (x ?? 0), 0)
    : null;
const last = (xs: (number | null)[]) => {
  for (let i = xs.length - 1; i >= 0; i--) if (xs[i] !== null) return xs[i];
  return null;
};

/**
 * `values[i]` belongs to day `start + i` (oldest first). MRR is a level (latest value, weekly =
 * last of the week); revenue and visitors are flows (summed).
 */
export function chartWindow(
  values: (number | null)[],
  start: string,
  metric: ChartMetric,
  period: ChartPeriod,
): ChartWindow {
  const agg = metric === "mrr" ? last : sum;
  const bucket = period === 365 ? 7 : 1;
  const len = Math.floor(period / bucket) * bucket; // 364 days = 52 weeks
  const n = values.length;
  const curStart = Math.max(0, n - len);
  const cur = values.slice(curStart);
  const prevFrom = n - 2 * len;
  const prev =
    prevFrom >= 0 ? values.slice(prevFrom, n - len) : ([] as (number | null)[]);

  const points: ChartPoint[] = [];
  for (let i = 0; i < cur.length; i += bucket) {
    const p = prev.length ? prev.slice(i, i + bucket) : [];
    points.push({
      day: addDays(start, curStart + i),
      value: agg(cur.slice(i, i + bucket)),
      previous: p.length ? agg(p) : null,
    });
  }
  const total = agg(cur);
  const prevTotal = prev.length ? agg(prev) : null;
  return { points, total, growth: growthPct(total, prevTotal) };
}

/** 7-point trailing average (the "Trend" switch); nulls stay null. */
export function smooth(values: (number | null)[]): (number | null)[] {
  return values.map((v, i) => {
    if (v === null) return null;
    const w = values
      .slice(Math.max(0, i - 6), i + 1)
      .filter((x): x is number => x !== null);
    return Math.round(w.reduce((a, x) => a + x, 0) / w.length);
  });
}

/**
 * Round axis ticks from 0 to at least `max` in ~`segments` steps of 1 / 2 / 2.5 / 5 × 10ⁿ
 * (Design.md §5 RevenueChartCard). Compute them in the unit people read (baht or dollars, not
 * cents), so ฿ ticks read 0 / 250 / 500 rather than converted dollars like ฿252 / ฿504.
 * `integer`: never a fractional step (visitor counts).
 */
export function niceTicks(
  max: number,
  {
    segments = 4,
    integer = false,
  }: { segments?: number; integer?: boolean } = {},
): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / segments;
  const pow = 10 ** Math.floor(Math.log10(raw));
  let step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  if (integer) step = Math.max(1, Math.ceil(step));
  const n = Math.ceil(max / step - 1e-9);
  return Array.from({ length: n + 1 }, (_, i) => Number((i * step).toFixed(6)));
}

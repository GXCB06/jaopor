// Profile revenue dashboard (Design.md §6 "Profile revenue dashboard"): pure windowing of the summed
// daily revenue of a builder's verified works. Values are USD cents; the component converts.

export const REVENUE_RANGES = ["7d", "30d", "12m"] as const;
export type RevenueRange = (typeof REVENUE_RANGES)[number];

export type RevenuePoint = {
  /** YYYY-MM-DD (days) or YYYY-MM (months). */
  key: string;
  value: number | null;
  /** Same position in the previous period of equal length. */
  prev: number | null;
  /** Today / this month: still filling up. */
  partial: boolean;
};

export type RevenueWindow = {
  points: RevenuePoint[];
  total: number;
  /** % vs the previous period over complete days / months only; null without a comparison. */
  growth: number | null;
  /** Largest value or previous value in the window (cents, ≥ 0). */
  max: number;
  unit: "day" | "month";
};

const DAY = 86_400_000;
const dayKey = (start: string, i: number) =>
  new Date(Date.parse(`${start}T00:00:00Z`) + i * DAY)
    .toISOString()
    .slice(0, 10);

function finish(points: RevenuePoint[], unit: "day" | "month"): RevenueWindow {
  let total = 0;
  let cur = 0;
  let prv = 0;
  let hasPrev = false;
  let max = 0;
  for (const p of points) {
    total += p.value ?? 0;
    max = Math.max(max, p.value ?? 0, p.prev ?? 0);
    if (p.partial) continue;
    cur += p.value ?? 0;
    if (p.prev !== null) {
      hasPrev = true;
      prv += p.prev;
    }
  }
  const growth = hasPrev && prv > 0 ? ((cur - prv) / prv) * 100 : null;
  return { points, total, growth, max, unit };
}

/**
 * `daily` is one value per day from `start`, ending yesterday (null = no data yet that day);
 * `today` is today's partial value (null when there is no row for today yet).
 * 7 / 30 days: the last n days, today as the partial last point when known.
 * 12 months: monthly totals, this month (to date) as the partial last point.
 */
export function revenueWindow(
  daily: (number | null)[],
  start: string,
  today: number | null,
  todayKey: string,
  range: RevenueRange,
): RevenueWindow {
  if (range === "12m") return monthWindow(daily, start, today, todayKey);
  const n = range === "7d" ? 7 : 30;
  const full = today === null ? n : n - 1;
  const from = daily.length - full;
  const at = (i: number) => (i >= 0 && i < daily.length ? daily[i] : null);
  const points: RevenuePoint[] = [];
  for (let i = 0; i < n; i++) {
    const idx = from + i;
    const partial = idx === daily.length;
    points.push({
      key: partial ? todayKey : dayKey(start, idx),
      value: partial ? today : at(idx),
      prev: at(idx - n),
      partial,
    });
  }
  return finish(points, "day");
}

function monthWindow(
  daily: (number | null)[],
  start: string,
  today: number | null,
  todayKey: string,
): RevenueWindow {
  const sums = new Map<string, number>();
  const add = (month: string, v: number | null) => {
    if (v === null) return;
    sums.set(month, (sums.get(month) ?? 0) + v);
  };
  daily.forEach((v, i) => add(dayKey(start, i).slice(0, 7), v));
  add(todayKey.slice(0, 7), today);
  const [y, m] = todayKey.split("-").map(Number);
  const monthKey = (back: number) => {
    const d = new Date(Date.UTC(y, m - 1 - back, 1));
    return d.toISOString().slice(0, 7);
  };
  const points: RevenuePoint[] = [];
  for (let back = 11; back >= 0; back--) {
    const key = monthKey(back);
    const prev = monthKey(back + 12);
    points.push({
      key,
      value: sums.get(key) ?? null,
      prev: sums.get(prev) ?? null,
      partial: back === 0,
    });
  }
  return finish(points, "month");
}

/** A round axis maximum ≥ v: 1,600 → 1,600; 1,234 → 1,500; 0 → 1. */
export function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const e = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 1.6, 2, 2.5, 3, 4, 5, 6, 8, 10])
    if (m * e >= v - 1e-9) return m * e;
  return 10 * e;
}

/** "JaoPor + กาแฟบอท"; more than two → "A + B + 3". */
export function worksLabel(names: string[]): string {
  if (names.length <= 2) return names.join(" + ");
  return `${names.slice(0, 2).join(" + ")} + ${names.length - 2}`;
}

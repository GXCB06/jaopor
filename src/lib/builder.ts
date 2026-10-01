// Phase 9b public builder profiles: pure computations (badges, streak, heatmap grid, proof).
// Badges are computed, never stored (spec 9a).

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export type Badge =
  | { key: "pioneer"; n: number }
  | { key: "verified" }
  | { key: "mrr"; level: 1_000 | 10_000 | 100_000 }
  | { key: "streak"; days: number };

/**
 * รุ่นบุกเบิก #N (first 100 users), Verified Builder (≥ 1 verified work), the highest MRR milestone
 * reached (THB, sum of verified works), and a streak badge from 7 days in a row.
 */
export function badges(input: {
  userNumber: number | null;
  verifiedWorks: number;
  mrrThb: number;
  streak: number;
}): Badge[] {
  const out: Badge[] = [];
  if (input.userNumber !== null && input.userNumber <= 100)
    out.push({ key: "pioneer", n: input.userNumber });
  if (input.verifiedWorks > 0) out.push({ key: "verified" });
  const level = ([100_000, 10_000, 1_000] as const).find(
    (l) => input.mrrThb >= l,
  );
  if (level) out.push({ key: "mrr", level });
  if (input.streak >= 7) out.push({ key: "streak", days: input.streak });
  return out;
}

/** Consecutive active days ending today or yesterday (UTC days, "YYYY-MM-DD"). */
export function streak(activeDays: string[], today = new Date()): number {
  const set = new Set(activeDays);
  let d = new Date(`${iso(today)}T00:00:00Z`);
  if (!set.has(iso(d))) d = new Date(d.getTime() - DAY);
  let n = 0;
  while (set.has(iso(d))) {
    n++;
    d = new Date(d.getTime() - DAY);
  }
  return n;
}

export type HeatCell = {
  day: string;
  score: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
};

/**
 * GitHub-style grid: 53 Monday-start weeks × 7 days ending with the week of `end`.
 * Levels split the non-zero scores into quartiles of the max (1..4).
 */
export function heatmapGrid(
  activity: { day: string; score: number }[],
  end: Date,
  today = new Date(),
): HeatCell[][] {
  const scores = new Map(activity.map((a) => [a.day, a.score]));
  const max = Math.max(0, ...activity.map((a) => a.score));
  const endDay = new Date(`${iso(end)}T00:00:00Z`);
  const mondayOffset = (endDay.getUTCDay() + 6) % 7; // 0 = Monday
  const lastMonday = new Date(endDay.getTime() - mondayOffset * DAY);
  const firstMonday = new Date(lastMonday.getTime() - 52 * 7 * DAY);
  const todayIso = iso(today);
  const weeks: HeatCell[][] = [];
  for (let w = 0; w < 53; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = iso(new Date(firstMonday.getTime() + (w * 7 + d) * DAY));
      const score = scores.get(day) ?? 0;
      const level =
        score <= 0 || max === 0
          ? 0
          : (Math.min(4, Math.ceil((score / max) * 4)) as 1 | 2 | 3 | 4);
      col.push({ day, score, level, future: day > todayIso });
    }
    weeks.push(col);
  }
  return weeks;
}

/** Month label positions for the grid: the week index where each month first appears. */
export function monthStarts(
  weeks: HeatCell[][],
): { week: number; month: number }[] {
  const out: { week: number; month: number }[] = [];
  let last = -1;
  weeks.forEach((col, w) => {
    const m = Number(col[0].day.slice(5, 7)) - 1;
    if (m !== last) {
      out.push({ week: w, month: m });
      last = m;
    }
  });
  // Drop a first label squeezed into the very first column when the next follows right away.
  return out.length > 1 && out[1].week - out[0].week < 2 ? out.slice(1) : out;
}

/** Whole months between the earliest date and now (null when there's no date). */
export function monthsBuilding(
  dates: (string | null)[],
  now = new Date(),
): number | null {
  const times = dates
    .filter((d): d is string => Boolean(d))
    .map((d) => Date.parse(d))
    .filter(Number.isFinite);
  if (!times.length) return null;
  const first = new Date(Math.min(...times));
  return Math.max(
    0,
    (now.getUTCFullYear() - first.getUTCFullYear()) * 12 +
      (now.getUTCMonth() - first.getUTCMonth()),
  );
}

/** The current role: the first position without an end date. */
export function currentRole<T extends { end_date: string | null }>(
  positions: T[],
): T | null {
  return positions.find((p) => p.end_date === null) ?? null;
}

/** Sum of activity over the last `days` days (recent-activity "commits this month"). */
export function recentScore(
  activity: { day: string; score: number }[],
  days: number,
  now = new Date(),
): number {
  const since = iso(new Date(now.getTime() - days * DAY));
  return activity
    .filter((a) => a.day >= since)
    .reduce((s, a) => s + a.score, 0);
}

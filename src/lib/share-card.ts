// Pure helpers for the share-card images (Design.md §5 ShareStudio): parse the query, bucket a
// daily series, build SVG paths and heatmap levels. No I/O, so it is unit-tested.
import { isSwatch, type CardTheme, type SwatchId } from "./share-palette";

export const CARD_KINDS = ["badge", "chart", "calendar"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

/** Chart periods in days; calendar periods in months. */
export const CHART_PERIODS = [7, 30, 365] as const;
export const CALENDAR_PERIODS = [3, 6, 12] as const;

export type CardQuery = {
  kind: CardKind;
  theme: CardTheme;
  color: SwatchId;
  period: number;
  locale: "th" | "en";
};

const oneOf = <T extends readonly (string | number)[]>(
  list: T,
  v: unknown,
  fallback: T[number],
): T[number] => (list.includes(v as T[number]) ? (v as T[number]) : fallback);

/** Every parameter is checked against a fixed list; anything else falls back to the default. */
export function parseCardQuery(sp: URLSearchParams): CardQuery {
  const kind = oneOf(CARD_KINDS, sp.get("kind"), "badge");
  const periods = kind === "calendar" ? CALENDAR_PERIODS : CHART_PERIODS;
  const color = sp.get("color");
  return {
    kind,
    theme: sp.get("theme") === "light" ? "light" : "dark",
    color: isSwatch(color) ? color : "indigo",
    // Default: 30 days for the chart, 12 months for the calendar.
    period: oneOf(
      periods,
      Number(sp.get("period")),
      kind === "calendar" ? 12 : 30,
    ),
    locale: sp.get("locale") === "en" ? "en" : "th",
  };
}

export type Point = { day: string; value: number };

/** Sums daily points into calendar months ("2026-09"), oldest first. */
export function bucketMonthly(points: Point[]): Point[] {
  const byMonth = new Map<string, number>();
  for (const p of points) {
    const m = p.day.slice(0, 7);
    byMonth.set(m, (byMonth.get(m) ?? 0) + p.value);
  }
  return [...byMonth].map(([day, value]) => ({ day, value }));
}

/** Line + closed area paths for `values` scaled into a w×h box (y grows downward). */
export function chartPaths(
  values: number[],
  w: number,
  h: number,
): { line: string; area: string; max: number } {
  const max = Math.max(0, ...values);
  if (values.length === 0) return { line: "", area: "", max };
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const y = (v: number) => (max === 0 ? h : h - (v / max) * h);
  const pts = values.map(
    (v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`,
  );
  const line = `M${pts.join(" L")}`;
  const lastX = ((values.length - 1) * step).toFixed(1);
  return { line, area: `${line} L${lastX},${h} L0,${h} Z`, max };
}

/** Heatmap level 0–4 per value: 0 = none, 1–4 = quartiles of the non-zero range. */
export function heatLevels(values: number[]): number[] {
  const max = Math.max(0, ...values);
  return values.map((v) =>
    v <= 0 || max === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)),
  );
}

/**
 * Lays daily points out as GitHub-style week columns (rows Sun–Sat). Leading cells before the
 * first day are null so every column starts on Sunday.
 */
export function weekColumns(points: Point[]): (Point | null)[][] {
  if (points.length === 0) return [];
  const first = new Date(`${points[0].day}T00:00:00Z`).getUTCDay();
  const cells: (Point | null)[] = [...Array(first).fill(null), ...points];
  const cols: (Point | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  return cols;
}

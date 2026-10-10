// Leaderboard rules (UX master audit A1.3): what each board ranks, over which period, which
// projects may appear, and how equal values are ranked. Pure and client-safe, so the board, the
// data layer and the tests share one definition.
//
// Definitions (as of 2026-10-10, matching what the sync stores):
// - mrr         `mrr_cents`          current MRR at the last daily sync; verified revenue only.
// - revenue30d  `revenue_30d_cents`  revenue in the trailing 30 days at the last sync; verified only.
// - visitors    `visitors_30d`       visitors in the trailing 30 days, **counted** (JaoPor script or
//                                    the project's analytics), not verified.
// - commits     `build_commits`      all-time commits on the default branch of the linked public
//                                    repo (GitHub build proof).
// Growth: revenue boards compare revenue (trailing 30 days vs the 30 before); the visitors board
// compares visitors the same way; commits have no growth. MRR has no stored previous period, so
// the MRR board's growth is revenue growth, and the board says so.
//
// Ties: equal values share a rank (1, 1, 3: standard competition ranking, as the project page's
// "อันดับ #X" already counted). Within a tie, rows are listed by name (A→Z): a neutral, visible
// order, never the creation date.

export const BOARD_METRICS = [
  "mrr",
  "revenue30d",
  "visitors",
  "commits",
] as const;
export type BoardMetric = (typeof BOARD_METRICS)[number];

export type BoardDefinition = {
  column: "mrr_cents" | "revenue_30d_cents" | "visitors_30d" | "build_commits";
  /** The period the value covers. */
  period: "current" | "30d" | "all_time";
  /** Verified at the source, or counted (visitors). */
  basis: "verified" | "counted";
  /** Only projects whose revenue connection is verified may appear. */
  verifiedRevenueOnly: boolean;
  /** What the growth column compares, or null when there is none. */
  growth: "revenue30d" | "visitors30d" | null;
};

export const BOARD_DEFINITIONS: Record<BoardMetric, BoardDefinition> = {
  mrr: {
    column: "mrr_cents",
    period: "current",
    basis: "verified",
    verifiedRevenueOnly: true,
    growth: "revenue30d",
  },
  revenue30d: {
    column: "revenue_30d_cents",
    period: "30d",
    basis: "verified",
    verifiedRevenueOnly: true,
    growth: "revenue30d",
  },
  visitors: {
    column: "visitors_30d",
    period: "30d",
    basis: "counted",
    verifiedRevenueOnly: false,
    growth: "visitors30d",
  },
  commits: {
    column: "build_commits",
    period: "all_time",
    basis: "verified",
    verifiedRevenueOnly: false,
    growth: null,
  },
};

/** The project fields the rules read. */
export type BoardCandidate = {
  is_demo: boolean;
  status: string;
  verification_status: string;
} & Partial<Record<BoardDefinition["column"], number | null>>;

/** The value a project is ranked by on a board, or null when it has none. */
export function boardValue(
  row: BoardCandidate,
  metric: BoardMetric,
): number | null {
  const v = row[BOARD_DEFINITIONS[metric].column];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * May this project appear on this board? Published, not a demo (made-up numbers), has a value,
 * and for revenue boards a verified revenue connection (a broken key sets the status to "error").
 */
export function isBoardEligible(
  row: BoardCandidate,
  metric: BoardMetric,
): boolean {
  if (row.is_demo || row.status !== "published") return false;
  if (boardValue(row, metric) === null) return false;
  if (
    BOARD_DEFINITIONS[metric].verifiedRevenueOnly &&
    row.verification_status !== "verified"
  )
    return false;
  return true;
}

export type Ranked<T> = T & {
  /** Competition rank: 1 + the number of rows with a strictly higher value. */
  rank: number;
  /** Another row has the same value (same rank). */
  tied: boolean;
};

/**
 * Ranks rows by value, highest first. Rows without a value are left out (no data ≠ zero).
 * Equal values share a rank; within a tie, rows are ordered by name (A→Z, Thai-aware).
 */
export function rankBoard<T>(
  rows: readonly T[],
  value: (row: T) => number | null,
  name: (row: T) => string,
): Ranked<T>[] {
  const valued = rows
    .map((row) => ({ row, v: value(row) }))
    .filter((x): x is { row: T; v: number } => x.v !== null);
  valued.sort(
    (a, b) =>
      b.v - a.v ||
      name(a.row).localeCompare(name(b.row), "th", {
        numeric: true,
        sensitivity: "base",
      }),
  );
  const counts = new Map<number, number>();
  for (const { v } of valued) counts.set(v, (counts.get(v) ?? 0) + 1);
  let higher = 0;
  let prev: number | null = null;
  let rank = 0;
  return valued.map(({ row, v }, i) => {
    if (v !== prev) {
      rank = higher + 1;
      prev = v;
    }
    higher = i + 1;
    return { ...row, rank, tied: (counts.get(v) ?? 0) > 1 };
  });
}

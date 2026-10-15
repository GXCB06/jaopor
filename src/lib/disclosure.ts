// R2 privacy-first proof (docs/DISCLOSURE_SPEC.md, Design.md §7 "Disclosure levels").
// Pure rules shared by the UI and the tests. The database computes the stored `public_*` columns
// with the same ladders and rounding (migration `disclosure_levels`); keep the two in step.

export const DISCLOSURE_LEVELS = [
  "exact",
  "band",
  "growth",
  "badge",
  "private",
] as const;
export type DisclosureLevel = (typeof DISCLOSURE_LEVELS)[number];

export const METRIC_GROUPS = ["revenue", "users", "traffic", "build"] as const;
export type MetricGroup = (typeof METRIC_GROUPS)[number];

/** `startups.metric_disclosure`: a missing group means `exact` (existing projects don't change). */
export type MetricDisclosure = Partial<Record<MetricGroup, DisclosureLevel>>;

/** The raw columns each group covers (spec §3). Public code reads their `public_*` twins only. */
export const GROUP_COLUMNS = {
  revenue: [
    "mrr_cents",
    "revenue_30d_cents",
    "revenue_prev_30d_cents",
    "revenue_all_time_cents",
    "customers",
    "active_subscriptions",
  ],
  users: ["active_users"],
  traffic: ["visitors_30d", "visitors_prev_30d"],
  build: [
    "build_commits",
    "build_ai_commits",
    "build_stars",
    "build_first_commit_at",
  ],
} as const satisfies Record<MetricGroup, readonly string[]>;

/**
 * A group connected for the first time starts here. Owner decision 2026-10-15: a verified source
 * shows its real numbers and graph by default (was `badge` for the money-like groups, so a freshly
 * verified Stripe looked empty). The owner can still move any group to band / growth / badge /
 * private in the C9 control. Mirrored by the trigger's O1 block (`startups_public_metrics`).
 */
export const DEFAULT_LEVEL_FOR_NEW_CONNECTION: Record<
  MetricGroup,
  DisclosureLevel
> = {
  revenue: "exact",
  users: "exact",
  traffic: "exact",
  build: "exact",
};

export function isDisclosureLevel(v: unknown): v is DisclosureLevel {
  return (
    typeof v === "string" &&
    (DISCLOSURE_LEVELS as readonly string[]).includes(v)
  );
}

export function isMetricGroup(v: unknown): v is MetricGroup {
  return (
    typeof v === "string" && (METRIC_GROUPS as readonly string[]).includes(v)
  );
}

/**
 * The stored `metric_disclosure` after the owner picks `level` for `group`. Returns null when the
 * request is not a known group / level, so a bad input can never reach the (also-validating)
 * database trigger. Only the chosen group changes; every other choice is kept.
 */
export function changedDisclosure(
  current: MetricDisclosure,
  group: unknown,
  level: unknown,
): MetricDisclosure | null {
  if (!isMetricGroup(group) || !isDisclosureLevel(level)) return null;
  return { ...current, [group]: level };
}

/**
 * Reads a stored `metric_disclosure` value. Anything unexpected is dropped, so a bad key can
 * never widen what is shown (the database check rejects it anyway).
 */
export function parseDisclosure(json: unknown): MetricDisclosure {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const out: MetricDisclosure = {};
  for (const [k, v] of Object.entries(json))
    if (isMetricGroup(k) && isDisclosureLevel(v)) out[k] = v;
  return out;
}

export function levelOf(
  disclosure: MetricDisclosure,
  group: MetricGroup,
): DisclosureLevel {
  return disclosure[group] ?? "exact";
}

// ---------------------------------------------------------------------------------------------
// Bands (O5): fixed shared ladders, so a band never narrows to one owner's value.
// ---------------------------------------------------------------------------------------------

/** Revenue per month in THB (spec §3.2). Every band spans at least 2x its lower edge. */
export const MONEY_BAND_EDGES_THB = [
  1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000,
] as const;

/** Users, visitors and commits in their own units: the 1 – 2.5 – 5 – 10 ladder. */
export const COUNT_BAND_EDGES = [
  10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000,
  100_000, 250_000, 500_000, 1_000_000,
] as const;

/** `lo` ≤ value < `hi`; `hi` null = "over lo". */
export type Band = { lo: number; hi: number | null };

export function bandFor(
  value: number | null | undefined,
  edges: readonly number[],
): Band | null {
  if (value === null || value === undefined || !Number.isFinite(value))
    return null;
  if (value < 0) return null;
  if (value < edges[0]) return { lo: 0, hi: edges[0] };
  for (let i = 0; i < edges.length - 1; i++)
    if (value < edges[i + 1]) return { lo: edges[i], hi: edges[i + 1] };
  return { lo: edges[edges.length - 1], hi: null };
}

/**
 * USD cents (how revenue is stored) to THB at a stored daily rate. The rate comes from the
 * `fx_rates` row of the sync day, never from a live call (Design.md §7 Disclosure levels).
 */
export function thbFromUsdCents(
  cents: number | null | undefined,
  usdThb: number | null | undefined,
): number | null {
  if (cents === null || cents === undefined || !usdThb || usdThb <= 0)
    return null;
  return (cents / 100) * usdThb;
}

// ---------------------------------------------------------------------------------------------
// Growth: whole percent, latest period only (spec §7), never a series.
// ---------------------------------------------------------------------------------------------

/** Whole-percent change, or null when there is no previous period above zero. */
export function growthPercent(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined ||
    previous <= 0
  )
    return null;
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.sign(pct) * Math.round(Math.abs(pct));
  return rounded === 0 ? 0 : rounded; // never -0
}

/**
 * The level actually shown: `growth` without a usable previous period falls back to `badge`
 * (spec §3; the owner's chooser says why).
 */
export function effectiveLevel(
  level: DisclosureLevel,
  growth: number | null,
): DisclosureLevel {
  return level === "growth" && growth === null ? "badge" : level;
}

// ---------------------------------------------------------------------------------------------
// Level → surface (spec §6).
// ---------------------------------------------------------------------------------------------

export const SURFACES = [
  "page", // project page, builder profile
  "card", // StartupCard, BuilderCard
  "chart", // revenue / visitor / build history
  "valueBoard", // leaderboards by value
  "growthBoard", // "โตเร็วที่สุด"
  "directorySort", // sort by MRR / visitors / commits
  "search", // search_startups, /api/search
  "share", // OG image, share card, embeddable badge, share text
  "milestone", // "crossed ฿X" feed posts
  "olympics", // province sums
] as const;
export type Surface = (typeof SURFACES)[number];

/** What a surface may show for a group at a level. */
export type Shown = "value" | "band" | "growth" | "badge" | "none";

const DISPLAY: Record<DisclosureLevel, Shown> = {
  exact: "value",
  band: "band",
  growth: "growth",
  badge: "badge",
  private: "none",
};

export function shownOn(level: DisclosureLevel, surface: Surface): Shown {
  switch (surface) {
    case "page":
    case "card":
    case "share":
      return DISPLAY[level];
    case "growthBoard":
      return level === "exact" || level === "growth" ? "growth" : "none";
    case "chart":
    case "valueBoard":
    case "directorySort":
    case "search":
    case "milestone":
    case "olympics":
      return level === "exact" ? "value" : "none";
  }
}

// ---------------------------------------------------------------------------------------------
// Public proof level (O2): a `private` group doesn't raise it. Mirrors `proof_level` otherwise.
// ---------------------------------------------------------------------------------------------

export function publicProofLevel(
  row: {
    is_demo: boolean;
    verification_status: string;
    build_commits: number | null;
    visitors_30d: number | null;
    owner_verified_at: string | null;
  },
  disclosure: MetricDisclosure,
): 0 | 1 | 2 | 3 {
  if (row.is_demo) return 0;
  const open = (g: MetricGroup) => levelOf(disclosure, g) !== "private";
  if (row.verification_status === "verified" && open("revenue")) return 3;
  if (row.build_commits !== null && open("build")) return 2;
  if (
    row.owner_verified_at !== null ||
    (row.visitors_30d !== null && open("traffic"))
  )
    return 1;
  return 0;
}

// ---------------------------------------------------------------------------------------------
// Display: band text (Design.md §7 Disclosure levels). Money bands are THB, counts own units.
// ---------------------------------------------------------------------------------------------

/** 1_000 → "1k", 2_500 → "2.5k", 1_000_000 → "1M"; below 1,000 as is. */
export function compactEdge(n: number): string {
  const fmt = (v: number) => String(Math.round(v * 10) / 10);
  if (n >= 1_000_000) return `${fmt(n / 1_000_000)}M`;
  if (n >= 1_000) return `${fmt(n / 1_000)}k`;
  return String(n);
}

/** How to word a band: a range, "under hi" (starts at 0) or "over lo" (open top). */
export type BandText =
  | { kind: "range"; lo: string; hi: string }
  | { kind: "under"; hi: string }
  | { kind: "over"; lo: string };

export function bandText(
  band: { lo: number; hi: number | null },
  unit: "thb" | "count",
): BandText {
  const f = (n: number) => (unit === "thb" ? "฿" : "") + compactEdge(n);
  if (band.hi === null) return { kind: "over", lo: f(band.lo) };
  if (band.lo === 0) return { kind: "under", hi: f(band.hi) };
  // "฿10k–25k": the symbol once, on the lower edge (Design.md §7 Disclosure levels).
  return { kind: "range", lo: f(band.lo), hi: compactEdge(band.hi) };
}

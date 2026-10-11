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

/** O1: a group connected for the first time starts here. Existing projects stay `exact`. */
export const DEFAULT_LEVEL_FOR_NEW_CONNECTION: Record<
  MetricGroup,
  DisclosureLevel
> = {
  revenue: "badge",
  users: "badge",
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

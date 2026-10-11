import "server-only";
import {
  growthPercent,
  type DisclosureLevel,
  type MetricGroup,
} from "@/lib/disclosure";
import type { Tables } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";

// R2 disclosure levels (docs/DISCLOSURE_SURFACE_AUDIT.md A1, migration 20261011130000).
//
// The one place that knows which startups schema is live:
//   * "legacy": before the migration. Raw metric columns are readable; every group is `exact`
//     (today's behaviour).
//   * "public": after it. anon / authenticated may read only the `public_*` twins, which the
//     database fills from the owner's levels. Hidden values arrive as null.
// Either way, callers get the same StartupRow field names (mrr_cents, visitors_30d, …), now
// holding only what the public may see, plus a `disclosure` summary for band / growth / badge.
// Once the migration is applied everywhere, the legacy branch can be deleted.

export type SchemaMode = "legacy" | "public";

/** Columns anon / authenticated may read in both schemas (no metric values). */
export const STARTUP_BASE_COLUMNS = [
  "id",
  "owner_id",
  "slug",
  "name",
  "website_url",
  "logo_path",
  "tagline",
  "description",
  "category",
  "country",
  "province",
  "founded_on",
  "ai_tools",
  "marketing_channels",
  "audience",
  "value_proposition",
  "problem_solved",
  "pricing_note",
  "team_size",
  "funding",
  "founder_message",
  "status",
  "founding_number",
  "created_at",
  "updated_at",
  "app_store_url",
  "play_store_url",
  "line_url",
  "github_url",
  "looking_for",
  "build_story",
  "is_demo",
  "tech_stack",
  "pricing_amount",
  "pricing_currency",
  "pricing_period",
  "demo_video_url",
  "founder_role",
  "owner_verified_at",
] as const;

/** Raw metric column → its public twin (the migration's grant list). */
export const PUBLIC_TWIN = {
  mrr_cents: "public_mrr_cents",
  revenue_30d_cents: "public_revenue_30d_cents",
  revenue_prev_30d_cents: "public_revenue_prev_30d_cents",
  revenue_all_time_cents: "public_revenue_all_time_cents",
  active_subscriptions: "public_active_subscriptions",
  customers: "public_customers",
  verified_provider: "public_verified_provider",
  last_synced_at: "public_last_synced_at",
  active_users: "public_active_users",
  traffic_provider: "public_traffic_provider",
  traffic_synced_at: "public_traffic_synced_at",
  visitors_30d: "public_visitors_30d",
  visitors_prev_30d: "public_visitors_prev_30d",
  github_repo: "public_github_repo",
  build_synced_at: "public_build_synced_at",
  build_commits: "public_build_commits",
  build_ai_commits: "public_build_ai_commits",
  build_stars: "public_build_stars",
  build_first_commit_at: "public_build_first_commit_at",
  build_stack: "public_build_stack",
  proof_level: "public_proof_level",
} as const;
export type RawMetricColumn = keyof typeof PUBLIC_TWIN | "verification_status";

/** Extra public columns with no raw twin (levels, bands, growth). */
const PUBLIC_EXTRA = [
  "public_revenue_level",
  "public_mrr_band_lo_thb",
  "public_mrr_band_hi_thb",
  "public_revenue_30d_band_lo_thb",
  "public_revenue_30d_band_hi_thb",
  "public_band_fx_day",
  "public_revenue_growth_pct",
  "public_users_level",
  "public_active_users_band_lo",
  "public_active_users_band_hi",
  "public_traffic_level",
  "public_visitors_band_lo",
  "public_visitors_band_hi",
  "public_visitors_growth_pct",
  "public_build_level",
  "public_build_commits_band_lo",
  "public_build_commits_band_hi",
] as const;

/** A range shown at `band` (THB for money, own units otherwise); hi null = "over lo". */
export type PublicBand = { lo: number; hi: number | null };

export type GroupDisclosure = {
  /** Null = nothing public for this group (not connected, or private: visitors can't tell). */
  level: Exclude<DisclosureLevel, "private"> | null;
  band: PublicBand | null;
  growthPct: number | null;
};

export type StartupDisclosure = Record<MetricGroup, GroupDisclosure> & {
  /** Revenue 30-day band (the MRR band is `revenue.band`). */
  revenue30dBand: PublicBand | null;
  /** The fx_rates day a money band was computed with (audit, Design.md §7). */
  bandFxDay: string | null;
};

const TTL_MS = 60_000;
let cached: { mode: SchemaMode; at: number } | null = null;

/** Which startups schema is live (cached for a minute so an apply is picked up without a deploy). */
export async function schemaMode(): Promise<SchemaMode> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.mode;
  const { error } = await createPublicClient()
    .from("startups")
    .select("public_proof_level" as "id")
    .limit(1);
  // 42703 = undefined column: the migration isn't applied yet.
  const mode: SchemaMode =
    error &&
    (error.code === "42703" || /public_proof_level/.test(error.message))
      ? "legacy"
      : "public";
  if (error && mode === "public") throw error;
  cached = { mode, at: Date.now() };
  return mode;
}

/** Test seam: force a mode (null = detect again). */
export function setSchemaModeForTests(mode: SchemaMode | null) {
  cached = mode ? { mode, at: Number.POSITIVE_INFINITY } : null;
}

/** The column to filter / order by for a metric in this mode. */
export function metricColumn(mode: SchemaMode, raw: keyof typeof PUBLIC_TWIN) {
  return mode === "public" ? PUBLIC_TWIN[raw] : raw;
}

/** A comma-separated select list for startups (no embeds). */
export function startupColumns(mode: SchemaMode): string {
  return mode === "public"
    ? [
        ...STARTUP_BASE_COLUMNS,
        ...Object.values(PUBLIC_TWIN),
        ...PUBLIC_EXTRA,
      ].join(", ")
    : "*";
}

/**
 * The PostgREST filter for "revenue is verified and shown" in this mode (directory filter,
 * boards). Public mode: any public revenue level.
 */
export function revenueShownFilter(mode: SchemaMode): {
  column: string;
  op: "eq" | "notNull";
  value?: string;
} {
  return mode === "public"
    ? { column: "public_revenue_level", op: "notNull" }
    : { column: "verification_status", op: "eq", value: "verified" };
}

type Loose = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" ? v : null);
const str = (v: unknown) => (typeof v === "string" ? v : null);
const band = (lo: unknown, hi: unknown): PublicBand | null =>
  typeof lo === "number" ? { lo, hi: num(hi) } : null;
const level = (v: unknown): GroupDisclosure["level"] =>
  v === "exact" || v === "band" || v === "growth" || v === "badge" ? v : null;

/**
 * One row in either schema → the StartupRow field names, holding public values only, plus
 * `disclosure`. Extra keys (embeds such as `owner`) pass through.
 */
export function normalizeStartup<T extends Loose>(
  mode: SchemaMode,
  row: T,
): T & Tables<"startups"> & { disclosure: StartupDisclosure } {
  if (mode === "legacy") {
    const r = row as Loose;
    const has = (v: unknown) => v !== null && v !== undefined;
    const exactIf = (yes: boolean) => (yes ? ("exact" as const) : null);
    return {
      ...row,
      disclosure: {
        revenue: {
          level: exactIf(r.verification_status === "verified"),
          band: null,
          growthPct: growthPercent(
            num(r.revenue_30d_cents),
            num(r.revenue_prev_30d_cents),
          ),
        },
        users: {
          level: exactIf(has(r.active_users)),
          band: null,
          growthPct: null,
        },
        traffic: {
          level: exactIf(has(r.visitors_30d)),
          band: null,
          growthPct: growthPercent(
            num(r.visitors_30d),
            num(r.visitors_prev_30d),
          ),
        },
        build: {
          level: exactIf(has(r.build_commits)),
          band: null,
          growthPct: null,
        },
        revenue30dBand: null,
        bandFxDay: null,
      },
    } as T & Tables<"startups"> & { disclosure: StartupDisclosure };
  }

  const r = row as Loose;
  const out: Loose = { ...row };
  for (const [raw, pub] of Object.entries(PUBLIC_TWIN)) {
    out[raw] = r[pub] ?? (raw === "build_stack" ? [] : null);
    delete out[pub];
  }
  for (const k of PUBLIC_EXTRA) delete out[k];
  const revenueLevel = level(r.public_revenue_level);
  out.verification_status = revenueLevel ? "verified" : "unverified";
  out.metric_disclosure = {};
  out.disclosure = {
    revenue: {
      level: revenueLevel,
      band: band(r.public_mrr_band_lo_thb, r.public_mrr_band_hi_thb),
      growthPct: num(r.public_revenue_growth_pct),
    },
    users: {
      level: level(r.public_users_level),
      band: band(r.public_active_users_band_lo, r.public_active_users_band_hi),
      growthPct: null,
    },
    traffic: {
      level: level(r.public_traffic_level),
      band: band(r.public_visitors_band_lo, r.public_visitors_band_hi),
      growthPct: num(r.public_visitors_growth_pct),
    },
    build: {
      level: level(r.public_build_level),
      band: band(
        r.public_build_commits_band_lo,
        r.public_build_commits_band_hi,
      ),
      growthPct: null,
    },
    revenue30dBand: band(
      r.public_revenue_30d_band_lo_thb,
      r.public_revenue_30d_band_hi_thb,
    ),
    bandFxDay: str(r.public_band_fx_day),
  } satisfies StartupDisclosure;
  return out as T & Tables<"startups"> & { disclosure: StartupDisclosure };
}

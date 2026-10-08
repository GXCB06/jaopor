import type { Screenshot } from "@/lib/media";
import "server-only";
import type { AiTool, Category } from "@/lib/catalog";
import type { Region } from "@/lib/config/provinces";
import type { LookingFor } from "@/lib/links";
import {
  OLYMPIC_COLUMNS,
  rankProvinces,
  type OlympicMetric,
  type OlympicSource,
  type ProvinceRank,
} from "@/lib/olympics";
import type { Tables } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";

// Public read queries (anon role → only published rows). Cookie-free, so pages can be ISR-cached.

export type Owner = Pick<
  Tables<"profiles">,
  "handle" | "display_name" | "avatar_url" | "x_handle" | "headline"
>;
export type StartupRow = Tables<"startups"> & { owner: Owner | null };

// Named FK: startup_members also links startups and profiles (many-to-many), so the plain embed
// is ambiguous (PGRST201).
const SELECT =
  "*, owner:profiles!startups_owner_id_fkey(handle, display_name, avatar_url, x_handle, headline)";

function db() {
  return createPublicClient();
}

/** Design.md §5 LeaderboardCard metrics: each ranks only verified numbers. */
export const BOARD_METRICS = [
  "mrr",
  "revenue30d",
  "visitors",
  "commits",
] as const;
export type BoardMetric = (typeof BOARD_METRICS)[number];

const BOARD_COLUMN = {
  mrr: "mrr_cents",
  revenue30d: "revenue_30d_cents",
  visitors: "visitors_30d",
  commits: "build_commits",
} as const;

export async function getBoard(
  metric: BoardMetric,
  limit = 50,
): Promise<StartupRow[]> {
  const column = BOARD_COLUMN[metric];
  // Demo projects never rank (their numbers are made up; the Olympics board excludes them too).
  let query = db()
    .from("startups")
    .select(SELECT)
    .not(column, "is", null)
    .eq("is_demo", false);
  // Revenue columns only count once the provider connection is verified.
  if (metric === "mrr" || metric === "revenue30d")
    query = query.eq("verification_status", "verified");
  const { data, error } = await query
    .order(column, { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as StartupRow[];
}

/** Projects with verified traffic or build proof, strongest first (home "Top traction" row). */
export async function getTopTraction(limit = 10): Promise<StartupRow[]> {
  const { data, error } = await db()
    .from("startups")
    .select(SELECT)
    .or("visitors_30d.not.is.null,build_commits.not.is.null")
    // Real projects before demos (Design.md §5 Demo projects).
    .order("is_demo", { ascending: true })
    .order("visitors_30d", { ascending: false, nullsFirst: false })
    .order("build_commits", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data as StartupRow[];
}

/** Profile "More startups": same category first, then the newest others. */
export async function getMoreStartups(
  startup: StartupRow,
  limit = 6,
): Promise<StartupRow[]> {
  // Spec 6.4 step 7: same category first, then same province, then the newest.
  const base = () =>
    db()
      .from("startups")
      .select(SELECT)
      .neq("id", startup.id)
      .order("created_at", { ascending: false })
      .limit(limit);
  const [same, local, recent] = await Promise.all([
    base().eq("category", startup.category),
    startup.province ? base().eq("province", startup.province) : null,
    base(),
  ]);
  for (const r of [same, local, recent]) if (r?.error) throw r.error;
  const seen = new Set<number>();
  return [
    ...(same.data as StartupRow[]),
    ...((local?.data ?? []) as StartupRow[]),
    ...(recent.data as StartupRow[]),
  ]
    .filter((s) => !seen.has(s.id) && seen.add(s.id))
    .slice(0, limit);
}

export async function getRecent(limit = 12): Promise<StartupRow[]> {
  const { data, error } = await db()
    .from("startups")
    .select(SELECT)
    // Real projects before demos: once 6 are real, demos leave the home rows by themselves.
    .order("is_demo", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as StartupRow[];
}

export const DIRECTORY_SORTS = [
  "mrr",
  "visitors",
  "commits",
  "newest",
] as const;
export type DirectorySort = (typeof DIRECTORY_SORTS)[number];
/** Project type filter: "app" matches App Store or Google Play. */
export const PROJECT_TYPES = ["website", "app", "line", "github"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export type DirectoryFilters = {
  q?: string;
  category?: Category;
  tool?: AiTool;
  verified?: boolean;
  type?: ProjectType;
  lookingFor?: LookingFor;
  province?: string;
  sort?: DirectorySort;
  page?: number;
};

const SORT_COLUMN = {
  mrr: "mrr_cents",
  visitors: "visitors_30d",
  commits: "build_commits",
  newest: "created_at",
} as const;

export const PAGE_SIZE = 24;

export async function listStartups(
  filters: DirectoryFilters,
): Promise<{ rows: StartupRow[]; total: number }> {
  let query = db().from("startups").select(SELECT, { count: "exact" });
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.province) query = query.eq("province", filters.province);
  if (filters.tool) query = query.contains("ai_tools", [filters.tool]);
  if (filters.verified) query = query.eq("verification_status", "verified");
  if (filters.lookingFor)
    query = query.contains("looking_for", [filters.lookingFor]);
  if (filters.type === "app")
    query = query.or("app_store_url.not.is.null,play_store_url.not.is.null");
  else if (filters.type) query = query.not(`${filters.type}_url`, "is", null);
  if (filters.q) {
    // Strip PostgREST filter syntax characters before building the OR expression.
    const term = filters.q
      .replace(/[%,()*\\]/g, " ")
      .trim()
      .slice(0, 60);
    // Same fields as the search_startups RPC (QuickSearch), so "see all results" matches it.
    if (term)
      query = query.or(
        `name.ilike.%${term}%,slug.ilike.%${term}%,tagline.ilike.%${term}%,description.ilike.%${term}%`,
      );
  }
  const page = Math.max(1, filters.page ?? 1);
  // Round 3 "verified first": verified numbers, then owner verified, then the rest (demos last).
  // "Newest" stays purely chronological.
  if ((filters.sort ?? "mrr") !== "newest")
    query = query.order("proof_level", { ascending: false });
  const { data, error, count } = await query
    .order(SORT_COLUMN[filters.sort ?? "mrr"], {
      ascending: false,
      nullsFirst: false,
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: data as StartupRow[], total: count ?? 0 };
}

export async function getStartupBySlug(
  slug: string,
): Promise<StartupRow | null> {
  const { data, error } = await db()
    .from("startups")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as StartupRow | null;
}

/**
 * A renamed project's current slug for one of its old links (UX audit S-9, migration
 * slug_history), or null. Published projects only (RLS), so a hidden project's old link 404s.
 */
export async function getRenamedSlug(oldSlug: string): Promise<string | null> {
  if (!/^[a-z0-9-]{1,50}$/.test(oldSlug)) return null;
  const { data } = await db()
    .from("startup_slug_history")
    .select("startup:startups(slug)")
    .eq("slug", oldSlug)
    .maybeSingle();
  return data?.startup?.slug ?? null;
}

export type RevenuePoint = { day: string; revenueCents: number };

/** Zero-filled daily revenue for the `days` UTC days up to yesterday, oldest first. */
export async function getRevenueSeries(
  startupId: number,
  days = 60,
): Promise<RevenuePoint[]> {
  // Ends yesterday: today is a partial day (the line would drop to 0).
  const now = Date.now() - 86_400_000;
  const dayAt = (i: number) =>
    new Date(now - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db()
    .from("revenue_snapshots")
    .select("day, revenue_cents")
    .eq("startup_id", startupId)
    .gte("day", dayAt(0))
    .order("day");
  if (error) throw error;
  const byDay = new Map(data.map((s) => [s.day, s.revenue_cents]));
  return Array.from({ length: days }, (_, i) => ({
    day: dayAt(i),
    revenueCents: byDay.get(dayAt(i)) ?? 0,
  }));
}

export type DailyPoint = { day: string; value: number };

/** Zero-filled daily visitors (traffic_snapshots) for the `days` UTC days up to yesterday. */
export async function getVisitorSeries(
  startupId: number,
  days = 60,
): Promise<DailyPoint[]> {
  // Ends yesterday: today is a partial day (the line would drop to 0).
  const now = Date.now() - 86_400_000;
  const dayAt = (i: number) =>
    new Date(now - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db()
    .from("traffic_snapshots")
    .select("day, visitors")
    .eq("startup_id", startupId)
    .gte("day", dayAt(0))
    .order("day");
  if (error) throw error;
  const byDay = new Map(data.map((s) => [s.day, s.visitors]));
  return Array.from({ length: days }, (_, i) => ({
    day: dayAt(i),
    value: byDay.get(dayAt(i)) ?? 0,
  }));
}

/** True when the last successful sync is missing or older than 48 hours. */
export function isSyncStale(lastSyncedAt: string | null): boolean {
  return (
    !lastSyncedAt || Date.now() - Date.parse(lastSyncedAt) > 48 * 60 * 60 * 1000
  );
}

/** 1-based MRR rank among verified startups (null if not verified). */
export async function getRank(startup: StartupRow): Promise<number | null> {
  if (startup.verification_status !== "verified" || startup.mrr_cents === null)
    return null;
  const { count, error } = await db()
    .from("startups")
    .select("id", { count: "exact", head: true })
    .eq("verification_status", "verified")
    // Demo projects carry made-up numbers: they never count towards a real project's rank.
    .eq("is_demo", false)
    .gt("mrr_cents", startup.mrr_cents);
  if (error) throw error;
  return (count ?? 0) + 1;
}

export async function countStartups(): Promise<{
  total: number;
  verified: number;
}> {
  const [all, verified] = await Promise.all([
    db().from("startups").select("id", { count: "exact", head: true }),
    db()
      .from("startups")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified"),
  ]);
  return { total: all.count ?? 0, verified: verified.count ?? 0 };
}

/**
 * Spec 6.4 chart card data: zero-filled daily revenue + visitors and forward-filled MRR for the
 * last `days` UTC days (enough for "12 months vs the previous 12"), as compact arrays.
 */
export type ChartSeries = {
  /** First day (YYYY-MM-DD) of every array below. */
  start: string;
  /** Null before the first snapshot (no data yet ≠ zero), zero-filled after it. */
  revenue: (number | null)[] | null;
  /** Null until the first MRR snapshot; MRR is only snapshotted on sync days. */
  mrr: (number | null)[] | null;
  visitors: (number | null)[] | null;
};

export async function getChartSeries(
  startup: StartupRow,
  days = 730,
): Promise<ChartSeries> {
  // Ends yesterday: today is a partial day and would plunge the line to 0.
  const now = Date.now() - 86_400_000;
  const dayAt = (i: number) =>
    new Date(now - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
  const start = dayAt(0);
  const today = new Date(now + 86_400_000).toISOString().slice(0, 10);
  const hasRevenue = startup.verification_status === "verified";
  const hasTraffic = startup.visitors_30d !== null;

  const [rev, traffic] = await Promise.all([
    hasRevenue
      ? db()
          .from("revenue_snapshots")
          .select("day, revenue_cents, mrr_cents")
          .eq("startup_id", startup.id)
          .gte("day", start)
          .order("day")
          .limit(days + 1)
      : null,
    hasTraffic
      ? db()
          .from("traffic_snapshots")
          .select("day, visitors")
          .eq("startup_id", startup.id)
          .gte("day", start)
          .order("day")
          .limit(days)
      : null,
  ]);
  if (rev?.error) throw rev.error;
  if (traffic?.error) throw traffic.error;

  let revenue: (number | null)[] | null = null;
  let mrr: (number | null)[] | null = null;
  if (rev?.data?.length) {
    const byDay = new Map(rev.data.map((r) => [r.day, r]));
    const firstRev = rev.data[0].day;
    revenue = [];
    mrr = [];
    let last: number | null = null;
    for (let i = 0; i < days; i++) {
      const row = byDay.get(dayAt(i));
      revenue.push(row?.revenue_cents ?? (dayAt(i) < firstRev ? null : 0));
      if (row?.mrr_cents != null) last = row.mrr_cents;
      mrr.push(last);
    }
    // Syncs write the current MRR on today's row: that's the latest level, so show it.
    const todayMrr = byDay.get(today)?.mrr_cents;
    if (todayMrr != null) mrr[days - 1] = todayMrr;
    if (mrr.filter((v) => v !== null).length < 2) mrr = null;
  }

  let visitors: (number | null)[] | null = null;
  if (traffic?.data?.length) {
    const byDay = new Map(traffic.data.map((r) => [r.day, r.visitors]));
    const first = traffic.data[0].day;
    visitors = Array.from(
      { length: days },
      (_, i) => byDay.get(dayAt(i)) ?? (dayAt(i) < first ? null : 0),
    );
  }
  return { start, revenue, mrr, visitors };
}

/** Spec 6.4 step 4: a startup's screenshots in display order (cover first). */
export async function getScreenshots(startupId: number): Promise<Screenshot[]> {
  const { data, error } = await db()
    .from("startup_screenshots")
    .select("id, path, kind, caption, width, height, position")
    .eq("startup_id", startupId)
    .order("position")
    .order("id");
  if (error) throw error;
  return data as Screenshot[];
}

export type SearchHit = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  logo_path: string | null;
  category: string;
  verified: boolean;
  /** Verifying revenue provider id when verified (e.g. "stripe"). */
  provider: string | null;
  is_demo: boolean;
};

/** Spec 6.8: startup hits for QuickSearch (RPC search_startups; published only via RLS). */
export async function searchStartups(q: string, max = 6): Promise<SearchHit[]> {
  const { data, error } = await db().rpc("search_startups", {
    q: q.slice(0, 60),
    max_rows: max,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    logo_path: r.logo_path,
    category: r.category,
    verified: r.verification_status === "verified" && !r.is_demo,
    provider: r.verified_provider,
    is_demo: r.is_demo,
  }));
}

/** Spec 6.8 "ยอดนิยม": what an empty, focused search shows (verified first, then MRR, then new). */
export async function popularStartups(max = 5): Promise<SearchHit[]> {
  const { data, error } = await db()
    .from("startups")
    .select(
      "id, slug, name, tagline, logo_path, category, verification_status, verified_provider, is_demo",
    )
    .order("is_demo", { ascending: true })
    .order("verification_status", { ascending: false })
    .order("mrr_cents", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(max);
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    logo_path: r.logo_path,
    category: r.category,
    verified: r.verification_status === "verified" && !r.is_demo,
    provider: r.verified_provider,
    is_demo: r.is_demo,
  }));
}

/**
 * Spec 6.6: listed (published, non-demo) startups per category slug. Uses the grouped
 * `category_counts()` RPC; until that migration exists it counts the category column here.
 */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  const rpc = await db().rpc("category_counts");
  if (!rpc.error)
    return Object.fromEntries(
      (rpc.data ?? []).map((r) => [r.category, Number(r.startups)]),
    );
  const { data, error } = await db()
    .from("startups")
    .select("category")
    .eq("is_demo", false)
    .limit(5000);
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const r of data) out[r.category] = (out[r.category] ?? 0) + 1;
  return out;
}

/**
 * Spec 6.7 Province Olympics board (v3): ranked in TypeScript from the public startup rows, with
 * previous-period ranks for the 30-day metrics (see lib/olympics.ts).
 */
export async function getProvinceLeaderboard(
  metric: OlympicMetric,
  region: Region | null = null,
): Promise<ProvinceRank[]> {
  const { data, error } = await db()
    .from("startups")
    .select(OLYMPIC_COLUMNS)
    .not("province", "is", null)
    .eq("is_demo", false)
    .limit(5000);
  if (error) throw error;
  return rankProvinces(data as OlympicSource[], metric, region);
}

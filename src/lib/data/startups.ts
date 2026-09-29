import "server-only";
import type { AiTool, Category } from "@/lib/catalog";
import type { Tables } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";

// Public read queries (anon role → only published rows). Cookie-free, so pages can be ISR-cached.

export type Owner = Pick<
  Tables<"profiles">,
  "handle" | "display_name" | "avatar_url" | "x_handle"
>;
export type StartupRow = Tables<"startups"> & { owner: Owner | null };

const SELECT = "*, owner:profiles(handle, display_name, avatar_url, x_handle)";

function db() {
  return createPublicClient();
}

/** Verified startups ranked by MRR (the leaderboard). */
export async function getLeaderboard(limit = 50): Promise<StartupRow[]> {
  const { data, error } = await db()
    .from("startups")
    .select(SELECT)
    .eq("verification_status", "verified")
    .order("mrr_cents", { ascending: false, nullsFirst: false })
    .order("revenue_30d_cents", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data as StartupRow[];
}

export async function getRecent(limit = 12): Promise<StartupRow[]> {
  const { data, error } = await db()
    .from("startups")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as StartupRow[];
}

export type DirectoryFilters = {
  q?: string;
  category?: Category;
  tool?: AiTool;
  verified?: boolean;
  page?: number;
};

export const PAGE_SIZE = 24;

export async function listStartups(
  filters: DirectoryFilters,
): Promise<{ rows: StartupRow[]; total: number }> {
  let query = db().from("startups").select(SELECT, { count: "exact" });
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.tool) query = query.contains("ai_tools", [filters.tool]);
  if (filters.verified) query = query.eq("verification_status", "verified");
  if (filters.q) {
    // Strip PostgREST filter syntax characters before building the OR expression.
    const term = filters.q
      .replace(/[%,()*\\]/g, " ")
      .trim()
      .slice(0, 60);
    if (term) query = query.or(`name.ilike.%${term}%,tagline.ilike.%${term}%`);
  }
  const page = Math.max(1, filters.page ?? 1);
  const { data, error, count } = await query
    .order("mrr_cents", { ascending: false, nullsFirst: false })
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

export type RevenuePoint = { day: string; revenueCents: number };

/** Zero-filled daily revenue for the last `days` UTC days, oldest first. */
export async function getRevenueSeries(
  startupId: number,
  days = 60,
): Promise<RevenuePoint[]> {
  const now = Date.now();
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

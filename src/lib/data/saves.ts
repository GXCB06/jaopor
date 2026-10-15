import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getStartupsByIds, type StartupRow } from "./startups";

// Phase 9d saves ("ที่บันทึกไว้"): the caller's own bookmarks, newest first. RLS on public.saves
// returns only the caller's rows, so the user id is only a filter, not a trust boundary.

export type SavedStartups = {
  rows: StartupRow[];
  /** Total saved, before any project that is no longer published is dropped from `rows`. */
  count: number;
};

export async function getSavedStartups(userId: string): Promise<SavedStartups> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saves")
    .select("startup_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const ids = (data ?? []).map((r) => r.startup_id);
  if (ids.length === 0) return { rows: [], count: 0 };
  const byId = new Map((await getStartupsByIds(ids)).map((s) => [s.id, s]));
  // Keep the save order; a project that is no longer published simply isn't in the map.
  const rows = ids
    .map((id) => byId.get(id))
    .filter((s): s is StartupRow => Boolean(s));
  return { rows, count: ids.length };
}

import { NextResponse } from "next/server";
import { LIVE_ENABLED } from "@/lib/live/identity";
import { createAdminClient } from "@/lib/supabase/admin";

// Phase 8 fallback count: tabs that pinged in the last 90 seconds. Edge-cached for 30 s, so the
// whole site costs one query per half minute however many people poll it.
export async function GET() {
  let count: number | null = null;
  // Live map off (the default since 2026-10-09): no query; the count is unknown.
  if (LIVE_ENABLED)
    try {
      const since = new Date(Date.now() - 90_000).toISOString();
      const { count: n, error } = await createAdminClient()
        .from("live_pings")
        .select("session_hash", { count: "exact", head: true })
        .gte("last_seen", since);
      if (!error) count = n ?? 0;
    } catch {
      count = null;
    }
  return NextResponse.json(
    { count },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
      },
    },
  );
}

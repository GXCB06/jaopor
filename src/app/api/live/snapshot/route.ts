import { NextResponse } from "next/server";
import { isProvince } from "@/lib/config/provinces";
import {
  LIVE_ENABLED,
  avatarFromKey,
  type LiveSnapshotRow,
} from "@/lib/live/identity";
import { createAdminClient } from "@/lib/supabase/admin";

// Live board without Realtime (identity.ts LIVE_MODE "poll"): the tabs that pinged in the last
// 90 s, newest first. Edge-cached for 30 s, so however many people watch, the database answers
// about one query per half minute. Rows carry no browser id, IP or exact place: a short,
// day-scoped key, a path of the validated shape, country / province and device.

const PATH = /^\/[A-Za-z0-9/_-]{0,199}$/;
const MAX = 300;

export async function GET() {
  let visitors: LiveSnapshotRow[] = [];
  if (LIVE_ENABLED)
    try {
      const since = new Date(Date.now() - 90_000).toISOString();
      const { data, error } = await createAdminClient()
        .from("live_pings")
        // "*": avatar columns (c, a) are read when a later migration adds them.
        .select("*")
        .gte("last_seen", since)
        .order("last_seen", { ascending: false })
        .limit(MAX);
      if (!error)
        visitors = (data ?? []).map((r) => {
          const row = r as Record<string, unknown>;
          const k = String(row.session_hash ?? "")
            .replace(/^\\x/, "")
            .slice(0, 12);
          const own =
            Number.isInteger(row.c) && Number.isInteger(row.a)
              ? { c: row.c as number, a: row.a as number }
              : avatarFromKey(k);
          const path = String(row.path ?? "/");
          return {
            k,
            ...own,
            path: PATH.test(path) ? path : "/",
            country:
              typeof row.country === "string" && /^[A-Z]{2}$/.test(row.country)
                ? row.country
                : null,
            province: isProvince(row.province)
              ? (row.province as string)
              : null,
            device: row.device === "mobile" ? "mobile" : "desktop",
            at: Date.parse(String(row.last_seen)) || Date.now(),
          };
        });
    } catch {
      visitors = [];
    }
  return NextResponse.json(
    { visitors },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
      },
    },
  );
}

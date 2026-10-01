import { json, safeEqual } from "@/lib/http";
import { isSource, type SourceId } from "@/lib/sources/catalog";
import { syncSource } from "@/lib/sources/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { drainStorageCleanup } from "@/lib/storage-cleanup";

// Daily re-sync of every active source connection (Vercel Cron → vercel.json).
export const maxDuration = 300;
const CONCURRENCY = 3;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  // Fail closed and explain, instead of throwing a 500, when the secret isn't configured.
  if (!secret)
    return json({ error: "not_configured", missing: "CRON_SECRET" }, 503);
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${secret}`)) {
    return json({ error: "unauthorized" }, 401);
  }

  const admin = createAdminClient();
  const { data: connections, error } = await admin
    .from("provider_connections")
    .select("startup_id, provider")
    .eq("status", "active");
  if (error) return json({ error: "db" }, 500);

  const queue: Array<{ startupId: number; source: SourceId }> = (
    connections ?? []
  ).flatMap((c) =>
    isSource(c.provider)
      ? [{ startupId: c.startup_id, source: c.provider }]
      : [],
  );
  const summary = { total: queue.length, ok: 0, failed: 0 };

  async function worker() {
    for (let job = queue.shift(); job !== undefined; job = queue.shift()) {
      const result = await syncSource(admin, job.startupId, job.source);
      if (result.ok) summary.ok += 1;
      else summary.failed += 1;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  // Phase 9: per-user daily activity (profile heatmap) is a materialized view; refresh it once.
  const refreshed = await admin.rpc("refresh_activity");
  if (refreshed.error)
    console.error("[cron] refresh_activity:", refreshed.error.code);
  // Phase 8: drop stale live-visitor heartbeats.
  await admin.rpc("prune_live_pings");
  // Phase 10: delete post images queued by deleted / hidden posts and deleted accounts.
  await drainStorageCleanup().catch((e: Error) =>
    console.error("[cron] storage cleanup:", e.name),
  );

  return json(summary);
}

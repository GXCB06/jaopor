import { json, safeEqual } from "@/lib/http";
import { syncStartup } from "@/lib/revenue/sync";
import { createAdminClient } from "@/lib/supabase/admin";

// Daily re-sync of every connected startup (Vercel Cron → vercel.json).
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
    .select("startup_id")
    .eq("status", "active");
  if (error) return json({ error: "db" }, 500);

  const queue = [...new Set((connections ?? []).map((c) => c.startup_id))];
  const summary = { total: queue.length, ok: 0, failed: 0 };

  async function worker() {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      const result = await syncStartup(admin, id);
      if (result.ok) summary.ok += 1;
      else summary.failed += 1;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return json(summary);
}

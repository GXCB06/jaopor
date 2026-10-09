import { createHmac, hkdfSync } from "node:crypto";
import { geolocation } from "@vercel/functions";
import { serverEnv } from "@/lib/env";
import { LIVE_ENABLED, isIdentity } from "@/lib/live/identity";
import { coarseGeo } from "@/lib/live/geo";
import { createAdminClient } from "@/lib/supabase/admin";

// Phase 8 heartbeat fallback (live_pings): each open tab pings about once a minute so the visitor
// count keeps working when Supabase Realtime is down or at its connection limit. Stored: an HMAC of
// the random browser id under a key that changes daily, the page path, country / province and
// device. Rows older than 10 minutes are pruned. Always answers 204.

const PATH = /^\/[A-Za-z0-9/_-]{0,199}$/;
let lastPrune = 0;

const done = () =>
  new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  // Live map off (the default since 2026-10-09): accept and drop, no database write.
  if (!LIVE_ENABLED) return done();
  try {
    const body = (await req.json().catch(() => null)) as {
      id?: unknown;
      c?: unknown;
      a?: unknown;
      path?: unknown;
      device?: unknown;
    } | null;
    if (!body || !isIdentity(body)) return done();
    const extra = body as { path?: unknown; device?: unknown };
    const path =
      typeof extra.path === "string" && PATH.test(extra.path)
        ? extra.path
        : "/";
    const day = new Date().toISOString().slice(0, 10);
    const key = Buffer.from(
      hkdfSync(
        "sha256",
        serverEnv.keyEncryptionSecret(),
        "jaopor-live",
        `day:${day}`,
        32,
      ),
    );
    const hash = createHmac("sha256", key).update(body.id).digest();
    const geo = coarseGeo(geolocation(req));

    const admin = createAdminClient();
    await admin.from("live_pings").upsert({
      session_hash: `\\x${hash.toString("hex")}`,
      path,
      country: geo.country,
      province: geo.province,
      device: extra.device === "mobile" ? "mobile" : "desktop",
      last_seen: new Date().toISOString(),
    });
    if (Date.now() - lastPrune > 60_000) {
      lastPrune = Date.now();
      await admin.rpc("prune_live_pings");
    }
  } catch (err) {
    // Missing table (migration not applied yet) or a DB hiccup: the live map simply shows less.
    console.error("[live/ping] failed:", (err as Error).name);
  }
  return done();
}

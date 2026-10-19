import { createHmac, hkdfSync } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// For-sale listing views ("N คนดูประกาศนี้"): one row per (listing, day, viewer hash), the same
// scheme as /api/profile-view. The hash is an HMAC of the browser's random id (or the signed-in
// user's id) under a key that changes daily; no IP is read. The owner's own visits don't count,
// and record_listing_view ignores a listing that isn't public. Always answers 204.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const done = () => new Response(null, { status: 204 });

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      startupId?: unknown;
      vid?: unknown;
    } | null;
    const startupId =
      typeof body?.startupId === "number" ? body.startupId : Number.NaN;
    const vid = typeof body?.vid === "string" ? body.vid : "";
    if (!Number.isSafeInteger(startupId) || startupId <= 0 || !UUID.test(vid))
      return done();

    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = (data?.claims.sub as string | undefined) ?? null;
    const admin = createAdminClient();
    if (userId) {
      const { data: row } = await admin
        .from("startups")
        .select("owner_id")
        .eq("id", startupId)
        .maybeSingle();
      if (row?.owner_id === userId) return done();
    }

    const day = new Date().toISOString().slice(0, 10);
    const key = Buffer.from(
      hkdfSync(
        "sha256",
        serverEnv.keyEncryptionSecret(),
        "jaopor-listing-view",
        `day:${day}`,
        32,
      ),
    );
    const hash = createHmac("sha256", key)
      .update(userId ?? vid)
      .digest();
    await admin.rpc("record_listing_view", {
      p_startup: startupId,
      p_viewer_hash: `\\x${hash.toString("hex")}`,
    });
  } catch (err) {
    console.error("[listing-view] failed:", (err as Error).name);
  }
  return done();
}

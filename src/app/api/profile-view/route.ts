import { createHmac, hkdfSync } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Phase 9b profile views: one row per (profile, day, viewer hash). The hash is an HMAC of the
// browser's random id (or the signed-in user's id) under a key that changes daily; no IP is read.
// The owner's own visits don't count. Always answers 204.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const done = () => new Response(null, { status: 204 });

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      profileId?: unknown;
      vid?: unknown;
    } | null;
    const profileId = typeof body?.profileId === "string" ? body.profileId : "";
    const vid = typeof body?.vid === "string" ? body.vid : "";
    if (!UUID.test(profileId) || !UUID.test(vid)) return done();

    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = (data?.claims.sub as string | undefined) ?? null;
    if (userId === profileId) return done();

    const day = new Date().toISOString().slice(0, 10);
    const key = Buffer.from(
      hkdfSync(
        "sha256",
        serverEnv.keyEncryptionSecret(),
        "jaopor-profile-view",
        `day:${day}`,
        32,
      ),
    );
    const hash = createHmac("sha256", key)
      .update(userId ?? vid)
      .digest();
    await createAdminClient()
      .from("profile_views")
      .upsert(
        {
          profile_id: profileId,
          day,
          viewer_hash: `\\x${hash.toString("hex")}`,
        },
        { onConflict: "profile_id,day,viewer_hash", ignoreDuplicates: true },
      );
  } catch (err) {
    console.error("[profile-view] failed:", (err as Error).name);
  }
  return done();
}

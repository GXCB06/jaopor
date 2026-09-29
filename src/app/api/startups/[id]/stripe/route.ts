import { isSameOriginJson, json } from "@/lib/http";
import {
  ForbiddenError,
  connectProvider,
  syncStartup,
} from "@/lib/revenue/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// POST   { key }  → validate read-only key, store encrypted, first sync   (connect / replace key)
// PATCH  {}       → re-sync now ("Refresh" button), max once per 10 minutes
export const maxDuration = 120;
const REFRESH_COOLDOWN_MS = 10 * 60 * 1000;

async function authorize(
  req: Request,
  ctx: RouteContext<"/api/startups/[id]/stripe">,
) {
  if (!isSameOriginJson(req))
    return { error: json({ error: "bad_request" }, 400) };
  const startupId = Number((await ctx.params).id);
  if (!Number.isSafeInteger(startupId) || startupId <= 0) {
    return { error: json({ error: "not_found" }, 404) };
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: json({ error: "unauthorized" }, 401) };
  return { startupId, userId };
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/startups/[id]/stripe">,
) {
  const auth = await authorize(req, ctx);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as { key?: unknown } | null;
  if (typeof body?.key !== "string" || body.key.length > 300) {
    return json(
      { error: "invalid_key", message: "Paste your Stripe restricted key." },
      400,
    );
  }

  try {
    const result = await connectProvider(createAdminClient(), {
      startupId: auth.startupId,
      userId: auth.userId,
      key: body.key,
    });
    return result.ok
      ? json({ ok: true, metrics: result.metrics })
      : json(
          {
            ok: false,
            error: result.code,
            message: result.message,
            detail: result.detail,
          },
          422,
        );
  } catch (err) {
    if (err instanceof ForbiddenError) return json({ error: "not_found" }, 404);
    console.error("[stripe connect] failed:", (err as Error).name);
    return json({ error: "server" }, 500);
  }
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/startups/[id]/stripe">,
) {
  const auth = await authorize(req, ctx);
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const { data: startup } = await admin
    .from("startups")
    .select("owner_id, last_synced_at")
    .eq("id", auth.startupId)
    .maybeSingle();
  if (!startup || startup.owner_id !== auth.userId)
    return json({ error: "not_found" }, 404);

  const last = startup.last_synced_at ? Date.parse(startup.last_synced_at) : 0;
  const waitMs = last + REFRESH_COOLDOWN_MS - Date.now();
  if (waitMs > 0)
    return json(
      { error: "cooldown", retryAfterSeconds: Math.ceil(waitMs / 1000) },
      429,
    );

  const result = await syncStartup(admin, auth.startupId);
  return result.ok
    ? json({ ok: true, metrics: result.metrics })
    : json({ ok: false, error: result.code, message: result.message }, 422);
}

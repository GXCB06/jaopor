import { isSameOriginJson, json } from "@/lib/http";
import {
  isSource,
  type ConnectInput,
  type SourceId,
} from "@/lib/sources/catalog";
import {
  ForbiddenError,
  connectSource,
  disconnectSource,
  syncSource,
} from "@/lib/sources/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { after } from "next/server";
import { VERIFY_CODES, VERIFY_SOURCES } from "@/lib/analytics/funnel-types";

// /api/startups/:id/sources/:source   source = stripe | revenuecat | plausible | umami | github
// POST   { key?, projectId?, siteId?, shareUrl?, repo? } → validate read-only, store encrypted, first sync
// PATCH  {} → re-sync now ("Refresh"), max once per 10 minutes per source
// DELETE {} → disconnect and remove that kind of verified numbers
export const maxDuration = 120;
const REFRESH_COOLDOWN_MS = 10 * 60 * 1000;
const MAX_FIELD = 500;

const VERIFY_CODE_SET = new Set<string>(VERIFY_CODES);
const VERIFY_SOURCE_SET = new Set<string>(VERIFY_SOURCES);

/**
 * Record one connect attempt in the first-party funnel, after the response is sent. Fire-and-forget:
 * never blocks or changes the connect result; unknown codes fall back to "server". See
 * docs/ADD_STARTUP_ANALYTICS_MIGRATION.md.
 */
function logVerifyResult(
  userId: string,
  startupId: number,
  source: SourceId,
  ok: boolean,
  code: string | null,
) {
  if (!VERIFY_SOURCE_SET.has(source)) return;
  const safeCode = ok ? null : code && VERIFY_CODE_SET.has(code) ? code : "server";
  try {
    after(async () => {
      try {
        await createAdminClient().rpc("log_verify_result", {
          p_user: userId,
          p_startup: startupId,
          p_source: source,
          p_ok: ok,
          ...(safeCode == null ? {} : { p_code: safeCode }),
        });
      } catch (e) {
        console.error("[funnel] verify_result:", (e as Error).name);
      }
    });
  } catch (e) {
    console.error("[funnel] verify_result:", (e as Error).name);
  }
}

type Ctx = RouteContext<"/api/startups/[id]/sources/[source]">;

async function authorize(req: Request, ctx: Ctx) {
  if (!isSameOriginJson(req))
    return { error: json({ error: "bad_request" }, 400) };
  const { id, source } = await ctx.params;
  const startupId = Number(id);
  if (!Number.isSafeInteger(startupId) || startupId <= 0 || !isSource(source))
    return { error: json({ error: "not_found" }, 404) };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: json({ error: "unauthorized" }, 401) };
  return { startupId, userId, source: source as SourceId };
}

function readInput(body: unknown): ConnectInput | null {
  if (typeof body !== "object" || body === null) return null;
  const out: ConnectInput = {};
  for (const k of ["key", "projectId", "siteId", "shareUrl", "repo"] as const) {
    const v = (body as Record<string, unknown>)[k];
    if (v === undefined) continue;
    if (typeof v !== "string" || v.length > MAX_FIELD) return null;
    out[k] = v;
  }
  return out;
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await authorize(req, ctx);
  if ("error" in auth) return auth.error;
  const data = readInput(await req.json().catch(() => null));
  if (!data) return json({ error: "bad_request" }, 400);

  try {
    const result = await connectSource(createAdminClient(), { ...auth, data });
    logVerifyResult(
      auth.userId,
      auth.startupId,
      auth.source,
      result.ok,
      result.ok ? null : result.code,
    );
    return result.ok
      ? json({ ok: true, ownerVerified: result.ownerVerified })
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
    logVerifyResult(auth.userId, auth.startupId, auth.source, false, "server");
    console.error(
      "[source connect]",
      auth.source,
      "failed:",
      (err as Error).name,
    );
    return json({ error: "server" }, 500);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await authorize(req, ctx);
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const { data: startup } = await admin
    .from("startups")
    .select("owner_id")
    .eq("id", auth.startupId)
    .maybeSingle();
  if (!startup || startup.owner_id !== auth.userId)
    return json({ error: "not_found" }, 404);

  const { data: conn } = await admin
    .from("provider_connections")
    .select("last_synced_at")
    .eq("startup_id", auth.startupId)
    .eq("provider", auth.source)
    .maybeSingle();
  const last = conn?.last_synced_at ? Date.parse(conn.last_synced_at) : 0;
  const waitMs = last + REFRESH_COOLDOWN_MS - Date.now();
  if (waitMs > 0)
    return json(
      { error: "cooldown", retryAfterSeconds: Math.ceil(waitMs / 1000) },
      429,
    );

  const result = await syncSource(admin, auth.startupId, auth.source);
  // A waiting JaoPor snippet has never synced, so this cooldown doesn't apply to it; its "check
  // again" is rate-limited per project inside syncSource (checkOwner, shared by every instance).
  return result.ok
    ? json({ ok: true, ownerVerified: result.ownerVerified })
    : json({ ok: false, error: result.code, message: result.message }, 422);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const auth = await authorize(req, ctx);
  if ("error" in auth) return auth.error;
  try {
    await disconnectSource(createAdminClient(), auth);
    return json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) return json({ error: "not_found" }, 404);
    console.error(
      "[source disconnect]",
      auth.source,
      "failed:",
      (err as Error).name,
    );
    return json({ error: "server" }, 500);
  }
}

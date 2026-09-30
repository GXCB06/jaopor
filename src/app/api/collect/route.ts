import { serverEnv } from "@/lib/env";
import { websiteHost } from "@/lib/links";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  NET_CAP,
  clientIp,
  dayKey,
  fromProjectSite,
  isBot,
  visitorHashes,
} from "@/lib/traffic/pixel";

// JaoPor snippet endpoint (public/v.js → navigator.sendBeacon). Counts one unique visitor per
// project per day. Always answers 204 with no body, so it never reveals whether a project exists
// or why a hit was ignored. Nothing about the visitor is stored except two day-scoped HMACs.

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};
const done = () => new Response(null, { status: 204, headers: CORS });

const hex = (b: Buffer) => `\\x${b.toString("hex")}`;

export function OPTIONS() {
  return done();
}

export async function POST(req: Request) {
  try {
    const raw = (await req.text()).slice(0, 200);
    let slug = "";
    try {
      slug = String((JSON.parse(raw) as { p?: unknown }).p ?? "");
    } catch {
      return done();
    }
    const ua = req.headers.get("user-agent");
    const ip = clientIp(req.headers);
    if (!SLUG.test(slug) || isBot(ua) || !ip) return done();

    const admin = createAdminClient();
    const { data: startup } = await admin
      .from("startups")
      .select("id, website_url, is_demo")
      .eq("slug", slug)
      .maybeSingle();
    if (!startup || startup.is_demo) return done();
    // Only visits from the project's own website count (belongs-to-project proof).
    if (!fromProjectSite(req.headers, websiteHost(startup.website_url)))
      return done();

    const { data: conn } = await admin
      .from("provider_connections")
      .select("id, status, config")
      .eq("startup_id", startup.id)
      .eq("provider", "jaopor")
      .maybeSingle();
    if (!conn || (conn.status !== "active" && conn.status !== "pending"))
      return done();

    const day = new Date().toISOString().slice(0, 10);
    const key = dayKey(serverEnv.keyEncryptionSecret(), day);
    const { visitor, net } = visitorHashes(key, startup.id, ip, ua ?? "");

    // One network can add at most NET_CAP visitors per project per day.
    const { count } = await admin
      .from("pixel_visitors")
      .select("visitor_hash", { count: "exact", head: true })
      .eq("startup_id", startup.id)
      .eq("day", day)
      .eq("net_hash", hex(net));
    if ((count ?? 0) >= NET_CAP) return done();

    await admin.from("pixel_visitors").upsert(
      {
        startup_id: startup.id,
        day,
        visitor_hash: hex(visitor),
        net_hash: hex(net),
      },
      { onConflict: "startup_id,day,visitor_hash", ignoreDuplicates: true },
    );

    // First accepted visit proves the snippet is installed on the website.
    if (conn.status === "pending") {
      const config = (conn.config ?? {}) as Record<string, string>;
      await admin
        .from("provider_connections")
        .update({ status: "active", config: { ...config, since: day } })
        .eq("id", conn.id)
        .eq("status", "pending");
      await admin
        .from("startups")
        .update({ traffic_provider: "jaopor" })
        .eq("id", startup.id);
    }
  } catch (err) {
    console.error("[collect] failed:", (err as Error).name);
  }
  return done();
}

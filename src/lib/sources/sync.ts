import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertRepoOwner,
  detectStack,
  fetchCommitActivity,
  fetchBuildProof,
  parseRepo,
} from "@/lib/build/github";
import { decryptSecret, encryptSecret, keyHint } from "@/lib/crypto/keys";
import { serverEnv } from "@/lib/env";
import { websiteHost } from "@/lib/links";
import { findOwnerSnippet } from "@/lib/net/link-preview";
import { fetchPublic } from "@/lib/net/public-url";
import { fetchUsdRates } from "@/lib/revenue/fx";
import { computeMetrics, utcDay } from "@/lib/revenue/metrics";
import { getProvider } from "@/lib/revenue/providers";
import {
  fetchRevenueCatMetrics,
  validateRevenueCatKey,
} from "@/lib/revenue/providers/revenuecat";
import { ProviderError, type ProviderErrorCode } from "@/lib/revenue/types";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  fetchPlausibleTraffic,
  validatePlausibleKey,
} from "@/lib/traffic/plausible";
import { countByDay, summarizeSnapshots } from "@/lib/traffic/pixel";
import {
  fetchCloudflareTraffic,
  validateCloudflareToken,
} from "@/lib/traffic/cloudflare";
import {
  daysAgo,
  domainMatches,
  isoDay,
  type TrafficProviderId,
  type TrafficReading,
} from "@/lib/traffic/types";
import { fetchUmamiTraffic, parseUmamiShareUrl } from "@/lib/traffic/umami";
import {
  SOURCE_KIND,
  sourcesOfKind,
  type ConnectInput,
  type SourceId,
  type SourceKind,
} from "./catalog";

// The one place that turns a founder's read-only credential into verified numbers on `startups`.
// Revenue (Stripe, RevenueCat) → revenue columns + revenue_snapshots; traffic (Plausible, Umami)
// → visitors + traffic_snapshots; build (GitHub) → build_* columns. Server-only (secret key).

type Admin = SupabaseClient<Database>;

export type SourceResult =
  /** ownerVerified: JaoPor snippet only, whether it was found on the website (Owner verified). */
  | { ok: true; ownerVerified?: boolean }
  | {
      ok: false;
      code: ProviderErrorCode | "not_connected";
      message: string;
      detail?: string;
    };

export class ForbiddenError extends Error {}

/** Errors that mean the stored credential itself is unusable (vs. a temporary outage). */
const CREDENTIAL_ERRORS: ProviderErrorCode[] = [
  "invalid_key",
  "not_read_only",
  "missing_permission",
  "not_found",
  "not_owner",
];

type Stored = { secret: string | null; config: Record<string, string> };

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) out.push(item);
  return out;
}

// ---------------------------------------------------------------------------
// Writers: one per kind. Numbers only ever come from here.
// ---------------------------------------------------------------------------

async function writeStripe(admin: Admin, startupId: number, key: string) {
  const now = new Date();
  const [charges, subscriptions, rates] = await Promise.all([
    collect(getProvider("stripe").fetchCharges(key)),
    collect(getProvider("stripe").fetchSubscriptions(key)),
    fetchUsdRates(),
  ]);
  // 60 days of daily rows: the profile chart shows 30 and compares against the 30 before.
  const m = computeMetrics({
    charges,
    subscriptions,
    rates,
    now,
    chartDays: 60,
  });
  const { error } = await admin
    .from("startups")
    .update({
      verification_status: "verified",
      verified_provider: "stripe",
      mrr_cents: m.mrrCents,
      revenue_30d_cents: m.revenue30dCents,
      revenue_prev_30d_cents: m.revenuePrev30dCents,
      revenue_all_time_cents: m.revenueAllTimeCents,
      active_subscriptions: m.activeSubscriptions,
      customers: m.customers,
      active_users: null,
      last_synced_at: now.toISOString(),
    })
    .eq("id", startupId);
  if (error) throw error;
  const today = utcDay(now);
  const { error: snapError } = await admin.from("revenue_snapshots").upsert(
    m.daily.map((d) => ({
      startup_id: startupId,
      day: d.day,
      revenue_cents: d.revenueCents,
      ...(d.day === today ? { mrr_cents: m.mrrCents } : {}),
    })),
    { onConflict: "startup_id,day" },
  );
  if (snapError) throw snapError;
  return m.skippedCurrencies.length
    ? `No FX rate for: ${m.skippedCurrencies.join(", ")} (excluded)`
    : null;
}

async function writeRevenueCat(
  admin: Admin,
  startupId: number,
  key: string,
  projectId: string,
) {
  const now = new Date();
  const m = await fetchRevenueCatMetrics(key, projectId, now);
  const { error } = await admin
    .from("startups")
    .update({
      verification_status: "verified",
      verified_provider: "revenuecat",
      mrr_cents: m.mrrCents,
      revenue_30d_cents: m.revenue30dCents,
      revenue_prev_30d_cents: m.revenuePrev30dCents,
      revenue_all_time_cents: m.revenueAllTimeCents,
      active_subscriptions: m.activeSubscriptions,
      customers: null,
      active_users: m.activeUsers,
      last_synced_at: now.toISOString(),
    })
    .eq("id", startupId);
  if (error) throw error;
  // RevenueCat has no cheap daily series: one row per sync day, so the chart fills in over time.
  const { error: snapError } = await admin.from("revenue_snapshots").upsert(
    [
      {
        startup_id: startupId,
        day: utcDay(new Date(now.getTime() - 86_400_000)),
        revenue_cents: m.revenueYesterdayCents,
      },
    ],
    { onConflict: "startup_id,day" },
  );
  if (snapError) throw snapError;
  return null;
}

async function writeTraffic(
  admin: Admin,
  startupId: number,
  provider: TrafficProviderId,
  reading: TrafficReading,
) {
  const { error } = await admin
    .from("startups")
    .update({
      traffic_provider: provider,
      visitors_30d: reading.visitors30d,
      visitors_prev_30d: reading.visitorsPrev30d || null,
      traffic_synced_at: new Date().toISOString(),
    })
    .eq("id", startupId);
  if (error) throw error;
  if (reading.daily.length) {
    const { error: snapError } = await admin.from("traffic_snapshots").upsert(
      reading.daily.map((d) => ({
        startup_id: startupId,
        day: d.day,
        visitors: d.visitors,
      })),
      { onConflict: "startup_id,day" },
    );
    if (snapError) throw snapError;
  }
  return null;
}

async function writeBuild(admin: Admin, startupId: number, repo: string) {
  const token = serverEnv.githubToken();
  const proof = await fetchBuildProof(repo, token);
  const stack = await detectStack(proof.repo, token);
  const { error } = await admin
    .from("startups")
    .update({
      github_repo: proof.repo,
      build_first_commit_at: proof.firstCommitAt,
      build_commits: proof.commits,
      build_ai_commits: proof.aiCommits,
      build_stars: proof.stars,
      build_stack: stack,
      build_synced_at: new Date().toISOString(),
    })
    .eq("id", startupId);
  if (error) throw error;

  // Phase 9 heatmap: daily commits for the last 52 weeks (best effort; never fails the sync).
  const days = await fetchCommitActivity(proof.repo, token);
  if (days.length) {
    const { error: actErr } = await admin.from("build_activity").upsert(
      days.map((d) => ({
        startup_id: startupId,
        day: d.day,
        commits: d.commits,
      })),
      { onConflict: "startup_id,day" },
    );
    if (actErr) console.error("[sync] build_activity:", actErr.code);
  }
  return null;
}

async function readTraffic(
  source: "plausible" | "umami" | "cloudflare",
  stored: Stored,
): Promise<TrafficReading> {
  if (source === "cloudflare")
    return fetchCloudflareTraffic(
      stored.secret ?? "",
      stored.config.accountId ?? "",
      stored.config.host ?? "",
    );
  return source === "plausible"
    ? fetchPlausibleTraffic(stored.secret ?? "", stored.config.siteId ?? "")
    : fetchUmamiTraffic(stored.secret ?? "", fetchPublic);
}

/**
 * JaoPor snippet rollup: daily unique hashes -> traffic_snapshots (today's partial count is
 * rewritten on the next run), then hashes of finished days are deleted. Visitors (30d) is the
 * sum of daily uniques; the previous period only counts once the snippet has run that long.
 */
async function rollupPixel(
  admin: Admin,
  startupId: number,
  since: string | null,
  now = new Date(),
): Promise<TrafficReading> {
  const today = isoDay(now);
  const { data: rows, error } = await admin
    .from("pixel_visitors")
    .select("day")
    .eq("startup_id", startupId)
    .limit(50_000);
  if (error) throw error;
  const byDay = countByDay(rows ?? []);
  if (byDay.size) {
    const { error: upErr } = await admin.from("traffic_snapshots").upsert(
      [...byDay].map(([day, visitors]) => ({
        startup_id: startupId,
        day,
        visitors,
      })),
      { onConflict: "startup_id,day" },
    );
    if (upErr) throw upErr;
  }
  await admin
    .from("pixel_visitors")
    .delete()
    .eq("startup_id", startupId)
    .lt("day", today);

  const from = isoDay(daysAgo(now, 59));
  const { data: snaps, error: snapErr } = await admin
    .from("traffic_snapshots")
    .select("day, visitors")
    .eq("startup_id", startupId)
    .gte("day", from)
    .order("day");
  if (snapErr) throw snapErr;
  return {
    ...summarizeSnapshots(snaps ?? [], now, since),
    daily: [],
    domain: null,
  };
}

/** Fetches + writes the numbers for one source. Returns a non-fatal note (e.g. skipped FX). */
async function pull(
  admin: Admin,
  startupId: number,
  source: SourceId,
  stored: Stored,
): Promise<string | null> {
  switch (source) {
    case "stripe":
      return writeStripe(admin, startupId, stored.secret ?? "");
    case "revenuecat":
      return writeRevenueCat(
        admin,
        startupId,
        stored.secret ?? "",
        stored.config.projectId ?? "",
      );
    case "jaopor":
      return writeTraffic(
        admin,
        startupId,
        "jaopor",
        await rollupPixel(admin, startupId, stored.config.since ?? null),
      );
    case "plausible":
    case "umami":
    case "cloudflare":
      return writeTraffic(
        admin,
        startupId,
        source,
        await readTraffic(source, stored),
      );
    case "github":
      return writeBuild(admin, startupId, stored.config.repo ?? "");
  }
}

// ---------------------------------------------------------------------------
// Sync (cron + "Refresh")
// ---------------------------------------------------------------------------

function toResult(err: unknown): Extract<SourceResult, { ok: false }> {
  if (err instanceof ProviderError)
    return {
      ok: false,
      code: err.code,
      message: err.message,
      detail: err.detail,
    };
  // Our own message only: never echo raw upstream/DB errors (could contain request details).
  return {
    ok: false,
    code: "upstream",
    message: "Sync failed. We'll retry automatically.",
  };
}

/** At most one website check per project this often (shared by every server instance). */
const OWNER_RECHECK_MS = 20_000;

/**
 * Owner verified (Design.md §5): re-read the website and record whether this project's snippet
 * (its permanent id) is on it. Unreachable keeps the last result. The collect route counts
 * visits only while it is set, so the snippet can't be used for a site the lister doesn't edit.
 *
 * Rate limit: the check first claims a slot on the connection row (compare-and-set on
 * config.ownerCheckedAt), so parallel clicks, instances or cron can't make us fetch the same
 * site more than once per OWNER_RECHECK_MS per project. Never throws.
 */
async function checkOwner(
  admin: Admin,
  startupId: number,
  conn: { id: number; config: Json | null },
): Promise<boolean | "throttled"> {
  const config = (conn.config ?? {}) as Record<string, string>;
  const last = Date.parse(config.ownerCheckedAt ?? "") || 0;
  if (Date.now() - last < OWNER_RECHECK_MS) return "throttled";
  const claim = admin
    .from("provider_connections")
    .update({
      config: { ...config, ownerCheckedAt: new Date().toISOString() },
    })
    .eq("id", conn.id);
  const { data: claimed } = await (config.ownerCheckedAt
    ? claim.eq("config->>ownerCheckedAt", config.ownerCheckedAt)
    : claim.is("config->>ownerCheckedAt", null)
  ).select("id");
  if (!claimed?.length) return "throttled";

  const { data: s } = await admin
    .from("startups")
    .select("website_url, owner_verified_at")
    .eq("id", startupId)
    .maybeSingle();
  if (!s?.website_url) return false;
  const was = s.owner_verified_at !== null;
  try {
    const found = await findOwnerSnippet(s.website_url, String(startupId));
    if (found === "unreachable") return was;
    const now = found === "found";
    if (now !== was)
      await admin
        .from("startups")
        .update({ owner_verified_at: now ? new Date().toISOString() : null })
        .eq("id", startupId)
        // The website may have changed meanwhile: the result was for this address only.
        .eq("website_url", s.website_url);
    return now;
  } catch {
    return was;
  }
}

export async function syncSource(
  admin: Admin,
  startupId: number,
  source: SourceId,
): Promise<SourceResult> {
  const { data: conn } = await admin
    .from("provider_connections")
    .select("id, encrypted_key, config, status")
    .eq("startup_id", startupId)
    .eq("provider", source)
    .maybeSingle();
  if (!conn || conn.status === "revoked")
    return { ok: false, code: "not_connected", message: "Not connected." };
  let ownerVerified: boolean | undefined;
  if (source === "jaopor") {
    const checked = await checkOwner(admin, startupId, conn);
    if (checked === "throttled")
      return {
        ok: false,
        code: "rate_limited",
        message: "Checked a moment ago. Try again in 20 seconds.",
      };
    ownerVerified = checked;
  }
  // Snippet installed but no visit seen yet: nothing else to sync.
  if (conn.status === "pending") return { ok: true, ownerVerified };

  try {
    const stored: Stored = {
      secret: conn.encrypted_key
        ? decryptSecret(conn.encrypted_key, serverEnv.keyEncryptionSecret())
        : null,
      config: (conn.config ?? {}) as Record<string, string>,
    };
    const note = await pull(admin, startupId, source, stored);
    await admin
      .from("provider_connections")
      .update({
        status: "active",
        last_error: note,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", conn.id);
    return { ok: true, ownerVerified };
  } catch (err) {
    const result = toResult(err);
    const broken = CREDENTIAL_ERRORS.includes(result.code as ProviderErrorCode);
    await admin
      .from("provider_connections")
      .update({
        status: broken ? "error" : "active",
        last_error: result.message.slice(0, 500),
      })
      .eq("id", conn.id);
    if (broken && SOURCE_KIND[source] === "revenue")
      await admin
        .from("startups")
        .update({ verification_status: "error" })
        .eq("id", startupId);
    if (!(err instanceof ProviderError))
      console.error(
        "[sync]",
        source,
        startupId,
        "failed:",
        (err as Error).name,
      );
    return result;
  }
}

// ---------------------------------------------------------------------------
// Connect (validate → store → first sync)
// ---------------------------------------------------------------------------

async function ownedStartup(admin: Admin, startupId: number, userId: string) {
  const { data } = await admin
    .from("startups")
    .select("id, owner_id, website_url")
    .eq("id", startupId)
    .maybeSingle();
  if (!data || data.owner_id !== userId) throw new ForbiddenError();
  return data;
}

async function githubLogin(admin: Admin, userId: string): Promise<string> {
  const { data } = await admin.auth.admin.getUserById(userId);
  const identity = data.user?.identities?.find((i) => i.provider === "github");
  const d = identity?.identity_data as
    { user_name?: string; preferred_username?: string } | undefined;
  const login = d?.user_name ?? d?.preferred_username;
  if (!login)
    throw new ProviderError(
      "no_github_identity",
      "Sign in with GitHub once so we can match the repo to your account.",
    );
  return login;
}

function requireWebsite(website: string | null): string {
  const host = websiteHost(website);
  if (!host)
    throw new ProviderError(
      "no_website",
      "Add your website link first: visitors are matched to it.",
    );
  return host;
}

function assertDomain(domain: string | null, host: string) {
  if (!domain || !domainMatches(domain, host))
    throw new ProviderError(
      "domain_mismatch",
      `This analytics site (${domain ?? "unknown"}) is not ${host}.`,
      domain ?? undefined,
    );
}

/** Validates the credential, proves it can't write and belongs to this project, returns what to store. */
async function prepare(
  admin: Admin,
  source: SourceId,
  input: ConnectInput,
  ctx: { userId: string; website: string | null },
): Promise<Stored & { hint: string | null }> {
  const key = input.key?.trim() ?? "";
  switch (source) {
    case "stripe":
      await getProvider("stripe").validateKey(key);
      return { secret: key, config: {}, hint: keyHint(key) };
    case "revenuecat": {
      const projectId = input.projectId?.trim() ?? "";
      await validateRevenueCatKey(key, projectId);
      return { secret: key, config: { projectId }, hint: keyHint(key) };
    }
    case "plausible": {
      const host = requireWebsite(ctx.website);
      const siteId = (input.siteId?.trim() || host).toLowerCase();
      assertDomain(siteId, host);
      await validatePlausibleKey(key);
      // Proves this key can read that site before we store anything.
      await fetchPlausibleTraffic(key, siteId);
      return { secret: key, config: { siteId }, hint: keyHint(key) };
    }
    case "umami": {
      const host = requireWebsite(ctx.website);
      const shareUrl = input.shareUrl?.trim() ?? "";
      const parsed = parseUmamiShareUrl(shareUrl);
      if (!parsed)
        throw new ProviderError(
          "invalid_key",
          "Paste the Umami share link (…/share/…).",
        );
      const reading = await fetchUmamiTraffic(shareUrl, fetchPublic);
      assertDomain(reading.domain, host);
      return {
        secret: shareUrl,
        config: { host: new URL(shareUrl).host },
        hint: null,
      };
    }
    case "cloudflare": {
      const host = requireWebsite(ctx.website);
      const accountId = input.accountId?.trim().toLowerCase() ?? "";
      await validateCloudflareToken(key, accountId);
      // Proves the token can read this site's analytics before we store anything.
      await fetchCloudflareTraffic(key, accountId, host);
      return { secret: key, config: { accountId, host }, hint: keyHint(key) };
    }
    case "jaopor": {
      // No credential: our server finds the snippet on the website (Owner verified), then
      // visits from that website count.
      requireWebsite(ctx.website);
      return { secret: null, config: {}, hint: null };
    }
    case "github": {
      const repo = parseRepo(input.repo ?? "");
      if (!repo)
        throw new ProviderError("not_found", "Paste a GitHub repo link.");
      await assertRepoOwner(
        repo,
        await githubLogin(admin, ctx.userId),
        serverEnv.githubToken(),
      );
      return { secret: null, config: { repo }, hint: null };
    }
  }
}

export async function connectSource(
  admin: Admin,
  input: {
    startupId: number;
    userId: string;
    source: SourceId;
    data: ConnectInput;
  },
): Promise<SourceResult> {
  const startup = await ownedStartup(admin, input.startupId, input.userId);
  let stored: Stored & { hint: string | null };
  try {
    stored = await prepare(admin, input.source, input.data, {
      userId: input.userId,
      website: startup.website_url,
    });
  } catch (err) {
    if (err instanceof ProviderError) return toResult(err);
    throw err;
  }

  // One source of truth per kind: connecting RevenueCat replaces Stripe (and clears its numbers).
  const kind = SOURCE_KIND[input.source];
  const others = sourcesOfKind(kind).filter((s) => s !== input.source);
  const { data: replaced } = await admin
    .from("provider_connections")
    .delete()
    .eq("startup_id", startup.id)
    .in("provider", others)
    .select("id");
  if (replaced?.length) await clearKind(admin, startup.id, kind);

  // Re-connecting the snippet keeps a connection that is already counting (and re-checks it).
  if (input.source === "jaopor") {
    const { data: existing } = await admin
      .from("provider_connections")
      .select("id")
      .eq("startup_id", startup.id)
      .eq("provider", "jaopor")
      .maybeSingle();
    if (existing) return syncSource(admin, startup.id, "jaopor");
  }

  const { error } = await admin.from("provider_connections").upsert(
    {
      startup_id: startup.id,
      provider: input.source,
      encrypted_key: stored.secret
        ? encryptSecret(stored.secret, serverEnv.keyEncryptionSecret())
        : null,
      key_hint: stored.hint,
      config: stored.config as Json,
      status: input.source === "jaopor" ? "pending" : "active",
      last_error: null,
    },
    { onConflict: "startup_id,provider" },
  );
  if (error) throw error;

  return syncSource(admin, startup.id, input.source);
}

// ---------------------------------------------------------------------------
// Disconnect
// ---------------------------------------------------------------------------

async function clearKind(admin: Admin, startupId: number, kind: SourceKind) {
  if (kind === "revenue") {
    await admin
      .from("startups")
      .update({
        verification_status: "unverified",
        verified_provider: null,
        mrr_cents: null,
        revenue_30d_cents: null,
        revenue_prev_30d_cents: null,
        revenue_all_time_cents: null,
        active_subscriptions: null,
        customers: null,
        active_users: null,
        last_synced_at: null,
      })
      .eq("id", startupId);
    await admin.from("revenue_snapshots").delete().eq("startup_id", startupId);
  } else if (kind === "traffic") {
    await admin
      .from("startups")
      .update({
        traffic_provider: null,
        visitors_30d: null,
        visitors_prev_30d: null,
        traffic_synced_at: null,
        // Only the snippet sets it; without a traffic source nothing re-checks it.
        owner_verified_at: null,
      })
      .eq("id", startupId);
    await admin.from("traffic_snapshots").delete().eq("startup_id", startupId);
    await admin.from("pixel_visitors").delete().eq("startup_id", startupId);
  } else {
    await admin
      .from("startups")
      .update({
        github_repo: null,
        build_first_commit_at: null,
        build_commits: null,
        build_ai_commits: null,
        build_stars: null,
        build_stack: [],
        build_synced_at: null,
      })
      .eq("id", startupId);
  }
}

export async function disconnectSource(
  admin: Admin,
  input: { startupId: number; userId: string; source: SourceId },
): Promise<void> {
  const startup = await ownedStartup(admin, input.startupId, input.userId);
  await admin
    .from("provider_connections")
    .delete()
    .eq("startup_id", startup.id)
    .eq("provider", input.source);
  await clearKind(admin, startup.id, SOURCE_KIND[input.source]);
}

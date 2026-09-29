import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret, keyHint } from "@/lib/crypto/keys";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";
import { fetchUsdRates } from "./fx";
import { computeMetrics, utcDay, type RevenueMetrics } from "./metrics";
import { getProvider } from "./providers";
import {
  ProviderError,
  type ProviderErrorCode,
  type ProviderId,
} from "./types";

type Admin = SupabaseClient<Database>;

export type SyncResult =
  | { ok: true; metrics: RevenueMetrics }
  | { ok: false; code: ProviderErrorCode | "not_connected"; message: string };

/** Errors that mean the stored key itself is unusable (vs. a temporary outage). */
const KEY_ERRORS: ProviderErrorCode[] = [
  "invalid_key",
  "not_read_only",
  "missing_permission",
];

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) out.push(item);
  return out;
}

/** Pulls data from the provider, recomputes metrics, writes startups + revenue_snapshots. */
export async function syncStartup(
  admin: Admin,
  startupId: number,
  providerId: ProviderId = "stripe",
): Promise<SyncResult> {
  const { data: conn } = await admin
    .from("provider_connections")
    .select("id, encrypted_key, status")
    .eq("startup_id", startupId)
    .eq("provider", providerId)
    .maybeSingle();
  if (!conn || conn.status === "revoked") {
    return {
      ok: false,
      code: "not_connected",
      message: "No revenue provider connected.",
    };
  }

  const now = new Date();
  try {
    const key = decryptSecret(
      conn.encrypted_key,
      serverEnv.keyEncryptionSecret(),
    );
    const provider = getProvider(providerId);
    const [charges, subscriptions, rates] = await Promise.all([
      collect(provider.fetchCharges(key)),
      collect(provider.fetchSubscriptions(key)),
      fetchUsdRates(),
    ]);
    const metrics = computeMetrics({ charges, subscriptions, rates, now });

    const { error: startupError } = await admin
      .from("startups")
      .update({
        verification_status: "verified",
        verified_provider: providerId,
        mrr_cents: metrics.mrrCents,
        revenue_30d_cents: metrics.revenue30dCents,
        revenue_prev_30d_cents: metrics.revenuePrev30dCents,
        revenue_all_time_cents: metrics.revenueAllTimeCents,
        active_subscriptions: metrics.activeSubscriptions,
        customers: metrics.customers,
        last_synced_at: now.toISOString(),
      })
      .eq("id", startupId);
    if (startupError) throw startupError;

    const today = utcDay(now);
    const { error: snapError } = await admin.from("revenue_snapshots").upsert(
      metrics.daily.map((d) => ({
        startup_id: startupId,
        day: d.day,
        revenue_cents: d.revenueCents,
        ...(d.day === today ? { mrr_cents: metrics.mrrCents } : {}),
      })),
      { onConflict: "startup_id,day" },
    );
    if (snapError) throw snapError;

    await admin
      .from("provider_connections")
      .update({
        status: "active",
        last_error: metrics.skippedCurrencies.length
          ? `No FX rate for: ${metrics.skippedCurrencies.join(", ")} (excluded)`
          : null,
        last_synced_at: now.toISOString(),
      })
      .eq("id", conn.id);

    return { ok: true, metrics };
  } catch (err) {
    const code: ProviderErrorCode =
      err instanceof ProviderError ? err.code : "upstream";
    // Our own messages only — never echo raw upstream/DB errors (could contain request details).
    const message =
      err instanceof ProviderError
        ? err.message
        : "Sync failed. We'll retry automatically.";
    const keyBroken = KEY_ERRORS.includes(code);

    await admin
      .from("provider_connections")
      .update({
        status: keyBroken ? "error" : "active",
        last_error: message.slice(0, 500),
      })
      .eq("id", conn.id);
    if (keyBroken) {
      await admin
        .from("startups")
        .update({ verification_status: "error" })
        .eq("id", startupId);
    }
    if (!(err instanceof ProviderError))
      console.error(
        "[sync] startup",
        startupId,
        "failed:",
        (err as Error).name,
      );
    return { ok: false, code, message };
  }
}

export class ForbiddenError extends Error {}

/** Validates a founder's read-only key, stores it encrypted, and runs the first sync. */
export async function connectProvider(
  admin: Admin,
  input: {
    startupId: number;
    userId: string;
    key: string;
    providerId?: ProviderId;
  },
): Promise<SyncResult> {
  const providerId = input.providerId ?? "stripe";
  const { data: startup } = await admin
    .from("startups")
    .select("id, owner_id")
    .eq("id", input.startupId)
    .maybeSingle();
  if (!startup || startup.owner_id !== input.userId) throw new ForbiddenError();

  const key = input.key.trim();
  try {
    await getProvider(providerId).validateKey(key);
  } catch (err) {
    if (err instanceof ProviderError)
      return { ok: false, code: err.code, message: err.message };
    throw err;
  }

  const { error } = await admin.from("provider_connections").upsert(
    {
      startup_id: startup.id,
      provider: providerId,
      encrypted_key: encryptSecret(key, serverEnv.keyEncryptionSecret()),
      key_hint: keyHint(key),
      status: "active",
      last_error: null,
    },
    { onConflict: "startup_id,provider" },
  );
  if (error) throw error;

  return syncStartup(admin, startup.id, providerId);
}

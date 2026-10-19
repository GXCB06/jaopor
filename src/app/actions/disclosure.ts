"use server";

import {
  changedDisclosure,
  parseDisclosure,
  type MetricDisclosure,
} from "@/lib/disclosure";
import { createClient } from "@/lib/supabase/server";
import { revalidateStartup } from "./revalidate";

// R2 disclosure levels (docs/DISCLOSURE_SURFACE_AUDIT.md C9): the owner-facing "who sees these
// numbers?" control. Every write goes through the owner's own Supabase client, so the row policy
// ("owners update own startups") and the column grant on `metric_disclosure` decide what's allowed;
// the BEFORE trigger validates the value and recomputes every public_* column. Nothing here lets a
// non-owner write: the current levels are read from the owner-only get_my_startup_metrics().

export type DisclosureResult =
  | { ok: true; levels: MetricDisclosure }
  | { ok: false; error: "forbidden" | "invalid" | "server" };

export async function setStartupDisclosure(
  startupId: number,
  group: unknown,
  level: unknown,
): Promise<DisclosureResult> {
  if (!Number.isSafeInteger(startupId) || startupId <= 0)
    return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "forbidden" };

  // The raw `metric_disclosure` column isn't readable by clients, even the owner: read the
  // owner-scoped value through the definer RPC (returns null for anyone but the owner).
  const { data, error: readError } = await supabase.rpc(
    "get_my_startup_metrics",
    { p_startup: startupId },
  );
  // A JSON object for the owner, null for anyone else (the RPC returns jsonb).
  const own =
    data && typeof data === "object" && !Array.isArray(data) ? data : null;
  if (readError) return { ok: false, error: "server" };
  if (!own) return { ok: false, error: "forbidden" };

  const next = changedDisclosure(
    parseDisclosure(own.metric_disclosure),
    group,
    level,
  );
  if (!next) return { ok: false, error: "invalid" };

  // RLS re-checks ownership; the column grant re-checks the field.
  const { error } = await supabase
    .from("startups")
    .update({ metric_disclosure: next })
    .eq("id", startupId);
  if (error) return { ok: false, error: "server" };

  // Purge the cached profile / home / directory pages that showed the old level.
  await revalidateStartup(startupId);
  return { ok: true, levels: next };
}

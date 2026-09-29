import "server-only";
import type { ConnectionInfo } from "@/components/wizard/VerifyPanel";
import { isSource } from "@/lib/sources/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Owner-only views of source connections. provider_connections has no client policies, so these
// read with the secret key: call them ONLY after checking the viewer owns the startup.
// Nothing secret leaves the server: key hints, domains, project ids and repos only.

export async function getConnections(
  startupId: number,
): Promise<ConnectionInfo[]> {
  const { data } = await createAdminClient()
    .from("provider_connections")
    .select("provider, status, last_synced_at, last_error, key_hint, config")
    .eq("startup_id", startupId);
  return (data ?? []).flatMap((c) => {
    if (!isSource(c.provider)) return [];
    const config = (c.config ?? {}) as Record<string, string>;
    const label =
      config.repo ??
      config.siteId ??
      config.host ??
      [config.projectId, c.key_hint].filter(Boolean).join(" · ");
    return [
      {
        source: c.provider,
        status: c.status,
        lastSyncedAt: c.last_synced_at,
        lastError: c.last_error,
        label: label || null,
      },
    ];
  });
}

/** GitHub login of the signed-in user, if they ever signed in with GitHub. */
export async function getGithubLogin(): Promise<string | null> {
  const { data } = await (await createClient()).auth.getUser();
  const identity = data.user?.identities?.find((i) => i.provider === "github");
  const d = identity?.identity_data as
    { user_name?: string; preferred_username?: string } | undefined;
  return d?.user_name ?? d?.preferred_username ?? null;
}

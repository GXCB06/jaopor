import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient } from "@/lib/supabase/public";

// Anonymous projects (Design.md §5 Anonymous projects, migration 20261011126000_anonymous_mode).
// Public rows of an anonymous project hold placeholders; the real identity comes from
// public.startup_identity(), which answers the owner (session client) or the server (secret key)
// and nobody else. Until the migration is applied the switch stays hidden and nothing changes.

export type RealIdentity = {
  slug: string;
  name: string;
  logo_path: string | null;
  website_url: string | null;
  app_store_url: string | null;
  play_store_url: string | null;
  line_url: string | null;
  github_url: string | null;
  github_repo: string | null;
  demo_video_url: string | null;
};

/** Placeholder the database keeps in github_repo while a repo is connected to an anonymous project. */
export const ANON_REPO = "anonymous/project";

// The RPC isn't in the generated types until the migration is applied and types regenerated.
type AnyClient = Pick<SupabaseClient, "rpc" | "from">;
type Rpc = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { code?: string } | null }>;

let ready: { value: boolean; at: number } | null = null;

/** Whether the anonymous-mode migration is live (cached 60 s). */
export async function anonymousModeReady(): Promise<boolean> {
  if (ready && Date.now() - ready.at < 60_000) return ready.value;
  const { error } = await (
    createPublicClient().from("startups") as unknown as {
      select: (c: string) => {
        limit: (n: number) => Promise<{ error: unknown }>;
      };
    }
  )
    .select("is_anonymous")
    .limit(1);
  ready = { value: !error, at: Date.now() };
  return ready.value;
}

/** For tests. */
export function setAnonymousReadyForTests(value: boolean | null) {
  ready = value === null ? null : { value, at: Date.now() };
}

/**
 * The real identity of an anonymous project, or null (not anonymous, not the owner, migration
 * not applied). `client`: the owner's session client, or the admin client on the server.
 */
export async function realIdentity(
  client: AnyClient,
  startupId: number,
): Promise<RealIdentity | null> {
  const { data, error } = await (client.rpc as unknown as Rpc)(
    "startup_identity",
    { p_startup: startupId },
  );
  if (error || !Array.isArray(data) || !data.length) return null;
  return data[0] as RealIdentity;
}

/**
 * Server-side (admin client): the website / repo a connector or the snippet must check. An
 * anonymous project's public row has no website and a placeholder repo, so those come from the
 * stash; any other row is returned as is (no extra query when the website is there).
 */
export async function withRealLinks<
  T extends {
    id: number;
    website_url?: string | null;
    github_repo?: string | null;
  },
>(admin: AnyClient, row: T): Promise<T> {
  const needs =
    ("website_url" in row && !row.website_url) ||
    ("github_repo" in row && row.github_repo === ANON_REPO);
  if (!needs) return row;
  const real = await realIdentity(admin, row.id);
  if (!real) return row;
  return {
    ...row,
    ...("website_url" in row ? { website_url: real.website_url } : {}),
    ...("github_repo" in row ? { github_repo: real.github_repo } : {}),
  };
}

/** The owner's other anonymous projects with a website (one business, one listing). */
export async function ownerAnonymousWebsites(
  admin: AnyClient,
  ownerId: string,
): Promise<{ id: number; name: string; website_url: string }[]> {
  const { data, error } = await (admin.rpc as unknown as Rpc)(
    "owner_anonymous_websites",
    { p_owner: ownerId },
  );
  if (error || !Array.isArray(data)) return [];
  return (
    data as { startup_id: number; name: string; website_url: string }[]
  ).map((r) => ({
    id: r.startup_id,
    name: r.name,
    website_url: r.website_url,
  }));
}

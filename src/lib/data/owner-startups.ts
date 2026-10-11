import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";
import { parseDisclosure, type MetricDisclosure } from "@/lib/disclosure";
import { isAnonymousSlug } from "@/lib/anonymous";
import { realIdentity } from "./anonymous";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PUBLIC_TWIN,
  normalizeStartup,
  schemaMode,
  startupColumns,
  type StartupDisclosure,
} from "./startup-columns";

// R2 (docs/DISCLOSURE_SURFACE_AUDIT.md A5): the signed-in owner's own startups with their real
// numbers. After the disclosure migration the raw columns aren't selectable even by the owner,
// so the real values come from get_my_startup_metrics() (owner_id = auth.uid() only); a confirmed
// member who isn't the owner sees the public values, like any visitor.

export type OwnerStartup = Tables<"startups"> & {
  /** What other people see (levels, bands, growth). */
  disclosure: StartupDisclosure;
  /** The owner's chosen levels ({} = nothing chosen yet; null when this user isn't the owner). */
  levels: MetricDisclosure | null;
  /**
   * Anonymous mode: the row carries the owner's REAL name / logo / links (from startup_identity),
   * but `slug` stays the public placeholder so links work; the real slug is here.
   */
  anonymous: { realSlug: string } | null;
};

type Db = SupabaseClient<Database>;

/** Own startups by id (the caller's session client), newest first. */
export async function getOwnStartups(
  supabase: Db,
  ids: number[],
): Promise<OwnerStartup[]> {
  if (!ids.length) return [];
  const mode = await schemaMode();
  const { data, error } = await (
    supabase.from("startups") as unknown as {
      select: (cols: string) => {
        in: (
          c: string,
          v: number[],
        ) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => Promise<{
            data: Record<string, unknown>[] | null;
            error: Error | null;
          }>;
        };
      };
    }
  )
    .select(startupColumns(mode))
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const normalized = (data ?? []).map((r) => normalizeStartup(mode, r));
  // Anonymous projects: the owner (checked here) gets the real identity via the server.
  const viewer = normalized.some((r) => isAnonymousSlug(r.slug))
    ? (await supabase.auth.getUser()).data.user?.id
    : undefined;
  const rows = await Promise.all(
    normalized.map((r) => withOwnIdentity(viewer, r)),
  );
  if (mode === "legacy")
    return rows.map((r) => ({ ...r, levels: {} }) as unknown as OwnerStartup);

  return Promise.all(
    rows.map(async (r) => {
      const { data: own } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: Record<string, unknown> | null }>
      )("get_my_startup_metrics", { p_startup: r.id });
      if (!own) return { ...r, levels: null } as unknown as OwnerStartup;
      const real: Record<string, unknown> = {};
      for (const raw of [...Object.keys(PUBLIC_TWIN), "verification_status"])
        if (raw in own) real[raw] = own[raw];
      return {
        ...r,
        ...real,
        levels: parseDisclosure(own.metric_disclosure),
      } as unknown as OwnerStartup;
    }),
  );
}

/** Anonymous mode: the owner sees their real identity; the public slug stays for links. */
async function withOwnIdentity<
  T extends { id: number; slug: string; owner_id: string },
>(
  viewer: string | undefined,
  row: T,
): Promise<T & { anonymous: { realSlug: string } | null }> {
  if (!isAnonymousSlug(row.slug) || !viewer || row.owner_id !== viewer)
    return { ...row, anonymous: null };
  const real = await realIdentity(createAdminClient(), row.id);
  if (!real) return { ...row, anonymous: null };
  const { slug: realSlug, ...identity } = real;
  return { ...row, ...identity, anonymous: { realSlug } };
}

/** One own startup (edit page). Null when it doesn't exist or isn't visible to this user. */
export async function getOwnStartup(
  supabase: Db,
  id: number,
): Promise<OwnerStartup | null> {
  const [row] = await getOwnStartups(supabase, [id]);
  return row ?? null;
}

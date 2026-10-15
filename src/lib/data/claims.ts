import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Claim flow ("อ้างสิทธิ์ผลงาน"). Imported listings (`unclaimed`, migration 20261015160000) are
// listed here so the founder they belong to can find and take them over. Read with the secret key:
// listings are meant to be discoverable, but their flag and ownership are not client-writable, so
// nothing here trusts the browser. Only public fields leave the server.

export type ClaimListing = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  website_url: string | null;
  logo_path: string | null;
};

const COLUMNS = "id, slug, name, tagline, website_url, logo_path";

/** PostgREST's `or` filter treats , ( ) * \ as syntax; drop them from user input. */
function searchTerm(query: string): string {
  return query
    .replace(/[%,()*\\]/g, " ")
    .trim()
    .slice(0, 80);
}

/** Imported, unclaimed listings to claim, newest first; optional name/website search. */
export async function searchUnclaimed(query: string): Promise<ClaimListing[]> {
  const base = createAdminClient()
    .from("startups")
    .select(COLUMNS)
    .eq("unclaimed", true)
    .order("created_at", { ascending: false })
    .limit(50);
  const term = searchTerm(query);
  const { data, error } = term
    ? await base.or(`name.ilike.%${term}%,website_url.ilike.%${term}%`)
    : await base;
  if (error) throw error;
  return data ?? [];
}

/** One imported listing by id, only while it is still unclaimed (else null → 404). */
export async function getUnclaimed(id: number): Promise<ClaimListing | null> {
  const { data } = await createAdminClient()
    .from("startups")
    .select(COLUMNS)
    .eq("id", id)
    .eq("unclaimed", true)
    .maybeSingle();
  return data ?? null;
}

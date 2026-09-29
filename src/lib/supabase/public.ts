import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/public-env";
import type { Database } from "./database.types";

/**
 * Anonymous, cookie-free client for public pages. No cookies → pages stay static/ISR-cacheable.
 * Sees exactly what the `anon` role may see (published startups, profiles, snapshots).
 */
export function createPublicClient() {
  return createClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function logoUrl(path: string | null): string | null {
  if (!path) return null;
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/logos/${path}`;
}

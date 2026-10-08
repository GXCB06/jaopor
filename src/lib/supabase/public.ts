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

// Kept here for existing imports; the function itself is browser-safe.
export { logoUrl } from "./logo-url";

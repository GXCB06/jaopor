import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Secret-key client: bypasses RLS. Only for trusted server code (sync jobs, key storage).
 * Never import from a Client Component — `server-only` makes that a build error.
 */
export function createAdminClient() {
  return createClient<Database>(
    serverEnv.supabaseUrl(),
    serverEnv.supabaseSecretKey(),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

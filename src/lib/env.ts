import "server-only";
import { publicEnv } from "./public-env";

// Server-only secrets. Read lazily so `next build` works without them; fail loudly when used.
function required(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return value;
}

export const serverEnv = {
  supabaseUrl: () => publicEnv.supabaseUrl,
  supabaseSecretKey: () => required("SUPABASE_SECRET_KEY"),
  keyEncryptionSecret: () => required("KEY_ENCRYPTION_SECRET"),
  cronSecret: () => required("CRON_SECRET"),
  /** Optional: a read-only (public repos) GitHub token raises the API limit from 60 to 5,000 req/h. */
  githubToken: () => process.env.GITHUB_TOKEN?.trim() || undefined,
};

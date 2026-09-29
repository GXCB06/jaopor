import "server-only";

// Server-only secrets. Read lazily so `next build` works without them; fail loudly when used.
function required(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return value;
}

export const serverEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseSecretKey: () => required("SUPABASE_SECRET_KEY"),
  keyEncryptionSecret: () => required("KEY_ENCRYPTION_SECRET"),
  cronSecret: () => required("CRON_SECRET"),
};

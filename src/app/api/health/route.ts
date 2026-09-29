import { parseKeySecret } from "@/lib/crypto/keys";
import { json } from "@/lib/http";

// Deployment health check. Reports only WHETHER each server secret is set (never values),
// so misconfigured env vars can be diagnosed without log access.
export const dynamic = "force-dynamic";

const REQUIRED = [
  "SUPABASE_SECRET_KEY",
  "KEY_ENCRYPTION_SECRET",
  "CRON_SECRET",
] as const;

export function GET() {
  const secrets = Object.fromEntries(
    REQUIRED.map((name) => [name, Boolean(process.env[name]?.trim())]),
  );
  // Same parser the encryption code uses (base64 or 64 hex chars → exactly 32 bytes).
  const encryptionKeyValid =
    parseKeySecret(process.env.KEY_ENCRYPTION_SECRET) !== null;
  const ok = Object.values(secrets).every(Boolean) && encryptionKeyValid;
  return json(
    {
      ok,
      secrets,
      encryptionKeyValid,
      siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim()),
      region: process.env.VERCEL_REGION ?? null,
    },
    ok ? 200 : 503,
  );
}

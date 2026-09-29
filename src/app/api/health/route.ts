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
  const encryptionKeyValid =
    Buffer.from(process.env.KEY_ENCRYPTION_SECRET?.trim() ?? "", "base64")
      .length === 32;
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

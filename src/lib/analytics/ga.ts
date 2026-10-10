// Google Analytics 4 (gtag). Off by default: the tag renders only when NEXT_PUBLIC_GA_ID holds a
// measurement ID. There is deliberately no built-in default, so a production deploy can never turn
// analytics on silently — the ID is set explicitly (in Vercel) if and when GA is wanted.
//
// Analytics load in production only, mirroring the /v.js self-counter in the root layout: local dev
// and e2e runs then never send hits to the real property. Read as a literal `process.env.X` so Next
// can inline it (see src/lib/public-env.ts).

/**
 * GA4 measurement ID, or null to render nothing.
 * Leave NEXT_PUBLIC_GA_ID unset (or empty, or "off") to keep analytics off.
 */
export function gaMeasurementId(
  raw: string | undefined = process.env.NEXT_PUBLIC_GA_ID,
): string | null {
  const value = (raw ?? "").trim();
  if (!value || /^(off|false|0|no)$/i.test(value)) return null;
  return value;
}

/** Whether to boot analytics at all: production only (mirrors the /v.js visitor snippet). */
export function analyticsEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  raw: string | undefined = process.env.NEXT_PUBLIC_GA_ID,
): boolean {
  return nodeEnv === "production" && gaMeasurementId(raw) !== null;
}

/** The gtag.js bootstrap as a string for an inline <Script> (Next.js requires an `id`). */
export function gaInitScript(id: string): string {
  return (
    `window.dataLayer=window.dataLayer||[];` +
    `function gtag(){dataLayer.push(arguments)}` +
    `gtag("js",new Date());` +
    `gtag("config","${id}");`
  );
}

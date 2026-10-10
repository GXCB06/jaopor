// Google Analytics 4 (gtag) for JaoPor's property. On by default: the tag renders in production
// whenever gaMeasurementId() returns an id (the built-in default below, or NEXT_PUBLIC_GA_ID).
// Set NEXT_PUBLIC_GA_ID to another measurement ID to override, or to "off" (also "", "false",
// "0", "no") to disable analytics without a code change.
//
// Analytics load in production only, mirroring the /v.js self-counter in the root layout: local dev
// and e2e runs then never send hits to the real property. Read as a literal `process.env.X` so Next
// can inline it (see src/lib/public-env.ts).

/** JaoPor's GA4 property (G-JYPJ2RFH4N). Used when NEXT_PUBLIC_GA_ID is unset. */
export const DEFAULT_MEASUREMENT_ID = "G-JYPJ2RFH4N";

/**
 * GA4 measurement ID, or null to render nothing.
 * Unset NEXT_PUBLIC_GA_ID → JaoPor's default. Set it to a value to override, or to
 * empty / "off" / "false" / "0" / "no" to turn analytics off.
 */
export function gaMeasurementId(
  raw: string | undefined = process.env.NEXT_PUBLIC_GA_ID,
): string | null {
  if (raw === undefined) return DEFAULT_MEASUREMENT_ID;
  const value = raw.trim();
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

// Every source of verified numbers (shared by server + client; no secrets here).
// Adding one: /add-payment-provider skill → connector in lib/{revenue,traffic,build} → register
// in lib/sources/sync.ts → DB CHECK in a migration → messages Sources.<id>.* → ProviderStrip.

export const SOURCES = [
  "stripe",
  "revenuecat",
  "polar",
  "jaopor",
  "plausible",
  "umami",
  "cloudflare",
  "ga4",
  "posthog",
  "github",
] as const;
export type SourceId = (typeof SOURCES)[number];

export type SourceKind = "revenue" | "traffic" | "build";

/**
 * The three things a founder can prove, in the order the VerifyPanel chooser shows them
 * (Design.md §5 VerifyPanel chooser): revenue/MRR, visitors, build proof. A metric owns the
 * supported sources for it, so an unsupported one can never appear.
 */
export const METRICS: readonly SourceKind[] = ["revenue", "traffic", "build"];

/** Where a project is right now (the wizard's first choice). Not stored: it only orders the
 *  chooser and picks which metric the "Recommended" badge points at. */
export type ProjectStage = "early" | "revenue";

/**
 * The metric to recommend for a stage: a project with no revenue yet is easiest to prove with
 * build proof (no key needed), one already earning with its revenue. Once a stage is chosen the
 * badge follows it, so switching the stage moves the recommendation without forcing the choice.
 */
export function recommendedMetric(
  stage: ProjectStage | null | undefined,
): SourceKind | undefined {
  if (stage === "early") return "build";
  if (stage === "revenue") return "revenue";
  return undefined;
}

export const SOURCE_KIND: Record<SourceId, SourceKind> = {
  stripe: "revenue",
  revenuecat: "revenue",
  polar: "revenue",
  jaopor: "traffic",
  plausible: "traffic",
  umami: "traffic",
  cloudflare: "traffic",
  ga4: "traffic",
  posthog: "traffic",
  github: "build",
};

export const SOURCE_NAME: Record<SourceId, string> = {
  stripe: "Stripe",
  revenuecat: "RevenueCat",
  polar: "Polar",
  jaopor: "JaoPor",
  plausible: "Plausible",
  umami: "Umami",
  cloudflare: "Cloudflare",
  ga4: "Google Analytics",
  posthog: "PostHog",
  github: "GitHub",
};

export function isSource(v: unknown): v is SourceId {
  return typeof v === "string" && (SOURCES as readonly string[]).includes(v);
}

export function sourcesOfKind(kind: SourceKind): SourceId[] {
  return SOURCES.filter((s) => SOURCE_KIND[s] === kind);
}

/**
 * Sources whose proof is bound to an asset the listing already carries — its website (analytics
 * snippet / share link) or its GitHub repo — so proving it also proves who owns the listing.
 * Revenue keys are excluded: holding a payment key shows you took a payment, not which listing is
 * yours. Used by the claim flow (an imported listing can only be claimed with these).
 */
export const CLAIM_SOURCES: readonly SourceId[] = [
  "jaopor",
  "plausible",
  "umami",
  "cloudflare",
  "ga4",
  "posthog",
  "github",
];

export function isClaimSource(v: unknown): v is SourceId {
  return (
    typeof v === "string" && (CLAIM_SOURCES as readonly string[]).includes(v)
  );
}

/** What the connect form sends, per source. Everything is optional here; each connector validates. */
export type ConnectInput = {
  key?: string;
  projectId?: string;
  accountId?: string;
  siteId?: string;
  shareUrl?: string;
  repo?: string;
  /** Google Analytics 4 Property ID (or a GA URL containing it). */
  propertyId?: string;
  /** PostHog region host (us.posthog.com or eu.posthog.com). */
  host?: string;
};

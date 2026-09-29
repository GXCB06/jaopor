// Every source of verified numbers (shared by server + client; no secrets here).
// Adding one: /add-payment-provider skill → connector in lib/{revenue,traffic,build} → register
// in lib/sources/sync.ts → DB CHECK in a migration → messages Sources.<id>.* → ProviderStrip.

export const SOURCES = [
  "stripe",
  "revenuecat",
  "plausible",
  "umami",
  "github",
] as const;
export type SourceId = (typeof SOURCES)[number];

export type SourceKind = "revenue" | "traffic" | "build";

export const SOURCE_KIND: Record<SourceId, SourceKind> = {
  stripe: "revenue",
  revenuecat: "revenue",
  plausible: "traffic",
  umami: "traffic",
  github: "build",
};

export const SOURCE_NAME: Record<SourceId, string> = {
  stripe: "Stripe",
  revenuecat: "RevenueCat",
  plausible: "Plausible",
  umami: "Umami",
  github: "GitHub",
};

export function isSource(v: unknown): v is SourceId {
  return typeof v === "string" && (SOURCES as readonly string[]).includes(v);
}

export function sourcesOfKind(kind: SourceKind): SourceId[] {
  return SOURCES.filter((s) => SOURCE_KIND[s] === kind);
}

/** What the connect form sends, per source. Everything is optional here; each connector validates. */
export type ConnectInput = {
  key?: string;
  projectId?: string;
  siteId?: string;
  shareUrl?: string;
  repo?: string;
};

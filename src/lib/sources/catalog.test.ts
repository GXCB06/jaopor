import { describe, expect, it } from "vitest";
import {
  CLAIM_SOURCES,
  isClaimSource,
  METRICS,
  SOURCE_KIND,
  SOURCE_NAME,
  SOURCES,
  recommendedMetric,
  sourcesOfKind,
  type SourceId,
} from "@/lib/sources/catalog";

// Item 4 (UX audit A2): the VerifyPanel chooser groups sources by the metric a founder wants to
// prove. These tests pin the mapping so an unsupported source can never appear under a metric.

describe("sources catalog — metric mapping", () => {
  it("lists exactly the three metrics, in chooser order", () => {
    expect(METRICS).toEqual(["revenue", "traffic", "build"]);
  });

  it("maps revenue to the payment providers only", () => {
    expect(sourcesOfKind("revenue")).toEqual(["stripe", "revenuecat", "polar"]);
  });

  it("maps traffic to the visitor counters only", () => {
    expect(sourcesOfKind("traffic")).toEqual([
      "jaopor",
      "plausible",
      "umami",
      "cloudflare",
      "ga4",
      "posthog",
    ]);
  });

  it("maps build proof to GitHub only", () => {
    expect(sourcesOfKind("build")).toEqual(["github"]);
  });

  it("gives every source a metric listed in METRICS", () => {
    for (const source of SOURCES) {
      expect(METRICS).toContain(SOURCE_KIND[source]);
    }
  });

  it("covers every source exactly once across the metrics", () => {
    const grouped = METRICS.flatMap((m) => sourcesOfKind(m));
    expect([...grouped].sort()).toEqual([...SOURCES].sort());
  });

  it("lists Google Analytics as a visitor source (counted, never revenue)", () => {
    expect(SOURCE_KIND.ga4).toBe("traffic");
    expect(SOURCE_NAME.ga4).toBe("Google Analytics");
    const all: readonly string[] = SOURCES;
    expect(all).not.toContain("google-analytics" as SourceId);
  });

  it("lists PostHog as a visitor source (counted, never revenue)", () => {
    expect(SOURCE_KIND.posthog).toBe("traffic");
    expect(SOURCE_NAME.posthog).toBe("PostHog");
  });
});

// The wizard's "Recommended" badge: derived from the chosen stage, never a separate choice.
describe("sources catalog — recommended metric per stage", () => {
  it("recommends build proof while there is no revenue yet", () => {
    expect(recommendedMetric("early")).toBe("build");
  });

  it("recommends revenue once the project earns", () => {
    expect(recommendedMetric("revenue")).toBe("revenue");
  });

  it("recommends nothing before a stage is chosen", () => {
    expect(recommendedMetric(null)).toBeUndefined();
    expect(recommendedMetric(undefined)).toBeUndefined();
  });
});

// Claim flow: only proofs of control over the listing's own site or repo can claim an imported
// listing. A payment key proves you took a payment; an analytics account proves nothing (anyone can
// add any domain to their own Plausible / GA4 / PostHog …) — security review 2026-10-18.
describe("sources catalog — claim sources", () => {
  it("accepts only the site snippet and the listing's own repo", () => {
    expect(CLAIM_SOURCES).toEqual(["jaopor", "github"]);
  });

  it("never lets an analytics account claim a listing", () => {
    for (const s of [
      "plausible",
      "umami",
      "cloudflare",
      "ga4",
      "posthog",
    ] as const)
      expect(isClaimSource(s)).toBe(false);
  });

  it("never lets a revenue source claim a listing", () => {
    for (const s of sourcesOfKind("revenue"))
      expect(isClaimSource(s)).toBe(false);
  });

  it("isClaimSource rejects unknown strings", () => {
    expect(isClaimSource("stripe")).toBe(false);
    expect(isClaimSource("nope")).toBe(false);
    for (const s of CLAIM_SOURCES) expect(isClaimSource(s)).toBe(true);
  });
});

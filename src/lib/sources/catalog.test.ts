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

// Claim flow: only asset-bound proofs (the listing's site or its repo) can claim an imported
// listing — a payment key proves you took a payment, not which listing is yours.
describe("sources catalog — claim sources", () => {
  it("offers the asset-bound sources only", () => {
    expect(CLAIM_SOURCES).toEqual([
      "jaopor",
      "plausible",
      "umami",
      "cloudflare",
      "ga4",
      "github",
    ]);
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

import { describe, expect, it } from "vitest";
import {
  METRICS,
  SOURCE_KIND,
  SOURCES,
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
    expect(sourcesOfKind("revenue")).toEqual(["stripe", "revenuecat"]);
  });

  it("maps traffic to the visitor counters only", () => {
    expect(sourcesOfKind("traffic")).toEqual([
      "jaopor",
      "plausible",
      "umami",
      "cloudflare",
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

  it("never lists Google Analytics (no connector)", () => {
    const all: readonly string[] = SOURCES;
    expect(all).not.toContain("ga4");
    expect(all).not.toContain("google-analytics" as SourceId);
  });
});

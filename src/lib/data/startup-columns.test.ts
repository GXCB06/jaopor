import { describe, expect, it } from "vitest";
import {
  PUBLIC_TWIN,
  metricColumn,
  normalizeStartup,
  revenueShownFilter,
  startupColumns,
} from "./startup-columns";

// R2 compatibility layer: the same StartupRow field names before and after the disclosure
// migration, holding only what visitors may see.

describe("startupColumns / metricColumn", () => {
  it("legacy reads everything as today; public never asks for a raw metric column", () => {
    expect(startupColumns("legacy")).toBe("*");
    const cols = startupColumns("public").split(", ");
    for (const raw of [
      ...Object.keys(PUBLIC_TWIN),
      "verification_status",
      "metric_disclosure",
    ])
      expect(cols).not.toContain(raw);
    expect(cols).toContain("public_mrr_cents");
    expect(cols).toContain("public_revenue_level");
    expect(cols).toContain("owner_id");
  });

  it("filters and sorts on the public twin after the migration", () => {
    expect(metricColumn("legacy", "mrr_cents")).toBe("mrr_cents");
    expect(metricColumn("public", "mrr_cents")).toBe("public_mrr_cents");
    expect(metricColumn("public", "proof_level")).toBe("public_proof_level");
    expect(revenueShownFilter("public")).toEqual({
      column: "public_revenue_level",
      op: "notNull",
    });
    expect(revenueShownFilter("legacy")).toEqual({
      column: "verification_status",
      op: "eq",
      value: "verified",
    });
  });
});

describe("normalizeStartup", () => {
  it("legacy: unchanged values, every group with data is exact", () => {
    const r = normalizeStartup("legacy", {
      id: 1,
      verification_status: "verified",
      mrr_cents: 6900,
      revenue_30d_cents: 5900,
      revenue_prev_30d_cents: 5000,
      visitors_30d: 9,
      visitors_prev_30d: 6,
      active_users: null,
      build_commits: null,
    });
    expect(r.mrr_cents).toBe(6900);
    expect(r.disclosure.revenue).toEqual({
      level: "exact",
      band: null,
      growthPct: 18,
    });
    expect(r.disclosure.traffic.level).toBe("exact");
    expect(r.disclosure.users.level).toBeNull();
    expect(r.disclosure.build.level).toBeNull();
  });

  it("public, exact: twins mapped back to the usual names", () => {
    const r = normalizeStartup("public", {
      id: 1,
      public_revenue_level: "exact",
      public_mrr_cents: 6900,
      public_verified_provider: "stripe",
      public_proof_level: 3,
      public_revenue_growth_pct: 18,
    });
    expect(r.verification_status).toBe("verified");
    expect(r.mrr_cents).toBe(6900);
    expect(r.verified_provider).toBe("stripe");
    expect(r.proof_level).toBe(3);
    expect(r.disclosure.revenue.growthPct).toBe(18);
    expect("public_mrr_cents" in r).toBe(false);
  });

  it("public, band: no amount, the band in THB", () => {
    const r = normalizeStartup("public", {
      id: 1,
      public_revenue_level: "band",
      public_mrr_cents: null,
      public_mrr_band_lo_thb: 1000,
      public_mrr_band_hi_thb: 5000,
      public_band_fx_day: "2026-10-11",
    });
    expect(r.verification_status).toBe("verified");
    expect(r.mrr_cents).toBeNull();
    expect(r.disclosure.revenue.band).toEqual({ lo: 1000, hi: 5000 });
    expect(r.disclosure.bandFxDay).toBe("2026-10-11");
  });

  it("public, private: indistinguishable from not connected", () => {
    const r = normalizeStartup("public", {
      id: 1,
      public_revenue_level: null,
      public_verified_provider: null,
      public_build_stack: null,
    });
    expect(r.verification_status).toBe("unverified");
    expect(r.verified_provider).toBeNull();
    expect(r.disclosure.revenue.level).toBeNull();
    expect(r.build_stack).toEqual([]);
  });

  it("keeps embeds such as the owner", () => {
    const owner = { handle: "gxcb06" };
    expect(normalizeStartup("public", { id: 1, owner }).owner).toBe(owner);
  });
});

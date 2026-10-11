import { describe, expect, it } from "vitest";
import {
  COUNT_BAND_EDGES,
  DEFAULT_LEVEL_FOR_NEW_CONNECTION,
  DISCLOSURE_LEVELS,
  MONEY_BAND_EDGES_THB,
  SURFACES,
  bandFor,
  bandText,
  compactEdge,
  effectiveLevel,
  growthPercent,
  levelOf,
  parseDisclosure,
  publicProofLevel,
  shownOn,
  thbFromUsdCents,
  type DisclosureLevel,
  type Shown,
  type Surface,
} from "./disclosure";

describe("parseDisclosure / levelOf", () => {
  it("a missing group is exact, so existing projects don't change", () => {
    expect(levelOf({}, "revenue")).toBe("exact");
    expect(levelOf(parseDisclosure(null), "build")).toBe("exact");
  });

  it("keeps known groups and levels, drops everything else", () => {
    expect(
      parseDisclosure({
        revenue: "badge",
        traffic: "band",
        users: "secret",
        mrr: "private",
        build: 3,
      }),
    ).toEqual({ revenue: "badge", traffic: "band" });
    expect(parseDisclosure(["revenue"])).toEqual({});
    expect(parseDisclosure("exact")).toEqual({});
  });

  it("O1 defaults: money-like groups start hidden, counts start exact", () => {
    expect(DEFAULT_LEVEL_FOR_NEW_CONNECTION).toEqual({
      revenue: "badge",
      users: "badge",
      traffic: "exact",
      build: "exact",
    });
  });
});

describe("bandFor", () => {
  it.each([
    [0, { lo: 0, hi: 1_000 }],
    [999.99, { lo: 0, hi: 1_000 }],
    [1_000, { lo: 1_000, hi: 5_000 }], // a value on an edge belongs to the band above
    [12_400, { lo: 10_000, hi: 25_000 }],
    [999_999, { lo: 500_000, hi: 1_000_000 }],
    [1_000_000, { lo: 1_000_000, hi: null }],
    [42_000_000, { lo: 1_000_000, hi: null }],
  ])("money %s THB → %j", (value, band) => {
    expect(bandFor(value, MONEY_BAND_EDGES_THB)).toEqual(band);
  });

  it.each([
    [9, { lo: 0, hi: 10 }],
    [10, { lo: 10, hi: 25 }],
    [117, { lo: 100, hi: 250 }],
    [2_500, { lo: 2_500, hi: 5_000 }],
    [2_000_000, { lo: 1_000_000, hi: null }],
  ])("count %s → %j", (value, band) => {
    expect(bandFor(value, COUNT_BAND_EDGES)).toEqual(band);
  });

  it("no band without a value (null, negative, not finite)", () => {
    for (const v of [null, undefined, -1, Number.NaN, Infinity])
      expect(bandFor(v, MONEY_BAND_EDGES_THB)).toBeNull();
  });

  it("every money band above the first spans at least 2x its lower edge", () => {
    const e = MONEY_BAND_EDGES_THB;
    for (let i = 0; i < e.length - 1; i++)
      expect(e[i + 1] / e[i]).toBeGreaterThanOrEqual(2);
  });

  it("ladders are strictly increasing", () => {
    for (const e of [MONEY_BAND_EDGES_THB, COUNT_BAND_EDGES])
      for (let i = 1; i < e.length; i++) expect(e[i]).toBeGreaterThan(e[i - 1]);
  });
});

describe("thbFromUsdCents", () => {
  it("converts at the stored daily rate", () => {
    expect(thbFromUsdCents(6_900, 33.5)).toBeCloseTo(2_311.5);
  });
  it("no rate or no value → no THB amount (no band)", () => {
    expect(thbFromUsdCents(6_900, null)).toBeNull();
    expect(thbFromUsdCents(6_900, 0)).toBeNull();
    expect(thbFromUsdCents(null, 33.5)).toBeNull();
  });
});

describe("growthPercent", () => {
  it.each([
    [118, 100, 18],
    [100, 100, 0],
    [50, 100, -50],
    [100.4, 100, 0],
    [100.5, 100, 1], // half rounds away from zero
    [99.5, 100, -1],
    [99.6, 100, 0], // never -0
  ])("%s vs %s → %s%%", (cur, prev, pct) => {
    expect(Object.is(growthPercent(cur, prev), pct)).toBe(true);
  });

  it("no previous period above zero → no growth", () => {
    expect(growthPercent(100, 0)).toBeNull();
    expect(growthPercent(100, null)).toBeNull();
    expect(growthPercent(null, 100)).toBeNull();
    expect(growthPercent(100, -5)).toBeNull();
  });
});

describe("effectiveLevel", () => {
  it("growth without a usable previous period falls back to badge", () => {
    expect(effectiveLevel("growth", null)).toBe("badge");
    expect(effectiveLevel("growth", 12)).toBe("growth");
  });
  it("other levels never change", () => {
    for (const l of DISCLOSURE_LEVELS.filter((l) => l !== "growth"))
      expect(effectiveLevel(l, null)).toBe(l);
  });
});

describe("shownOn (spec §6 level → surface matrix)", () => {
  // Rows: surface; columns: exact, band, growth, badge, private.
  const MATRIX: Record<Surface, [Shown, Shown, Shown, Shown, Shown]> = {
    page: ["value", "band", "growth", "badge", "none"],
    card: ["value", "band", "growth", "badge", "none"],
    share: ["value", "band", "growth", "badge", "none"],
    chart: ["value", "none", "none", "none", "none"],
    valueBoard: ["value", "none", "none", "none", "none"],
    growthBoard: ["growth", "none", "growth", "none", "none"],
    directorySort: ["value", "none", "none", "none", "none"],
    search: ["value", "none", "none", "none", "none"],
    milestone: ["value", "none", "none", "none", "none"],
    olympics: ["value", "none", "none", "none", "none"],
  };

  it("covers every surface", () => {
    expect(Object.keys(MATRIX).sort()).toEqual([...SURFACES].sort());
  });

  for (const surface of SURFACES)
    it.each(DISCLOSURE_LEVELS.map((l, i) => [l, MATRIX[surface][i]] as const))(
      `${surface}: %s → %s`,
      (level, shown) => {
        expect(shownOn(level as DisclosureLevel, surface)).toBe(shown);
      },
    );

  it("private shows nothing anywhere, not even a badge (O2)", () => {
    for (const s of SURFACES) expect(shownOn("private", s)).toBe("none");
  });

  it("only exact ever exposes a value or a series", () => {
    for (const s of SURFACES)
      for (const l of DISCLOSURE_LEVELS.filter((l) => l !== "exact"))
        expect(shownOn(l, s)).not.toBe("value");
  });
});

describe("publicProofLevel (O2: private doesn't count)", () => {
  const base = {
    is_demo: false,
    verification_status: "verified",
    build_commits: 10,
    visitors_30d: 100,
    owner_verified_at: null,
  };
  it("matches proof_level when nothing is private", () => {
    expect(publicProofLevel(base, {})).toBe(3);
    expect(publicProofLevel({ ...base, is_demo: true }, {})).toBe(0);
  });
  it("steps down past each private group", () => {
    expect(publicProofLevel(base, { revenue: "private" })).toBe(2);
    expect(
      publicProofLevel(base, { revenue: "private", build: "private" }),
    ).toBe(1);
    expect(
      publicProofLevel(base, {
        revenue: "private",
        build: "private",
        traffic: "private",
      }),
    ).toBe(0);
  });
  it("hidden-but-not-private levels still count (badge, band, growth)", () => {
    expect(publicProofLevel(base, { revenue: "badge" })).toBe(3);
  });
  it("the owner-verified site check is not a metric group and always counts", () => {
    expect(
      publicProofLevel(
        {
          ...base,
          verification_status: "unverified",
          build_commits: null,
          owner_verified_at: "2026-10-01T00:00:00Z",
        },
        { traffic: "private" },
      ),
    ).toBe(1);
  });
});

describe("bandText / compactEdge", () => {
  it.each([
    [999, "999"],
    [1_000, "1k"],
    [2_500, "2.5k"],
    [25_000, "25k"],
    [1_000_000, "1M"],
  ])("%s → %s", (n, s) => {
    expect(compactEdge(n)).toBe(s);
  });

  it("words money and count bands", () => {
    expect(bandText({ lo: 10_000, hi: 25_000 }, "thb")).toEqual({
      kind: "range",
      lo: "฿10k",
      hi: "25k",
    });
    expect(bandText({ lo: 0, hi: 1_000 }, "thb")).toEqual({
      kind: "under",
      hi: "฿1k",
    });
    expect(bandText({ lo: 1_000_000, hi: null }, "thb")).toEqual({
      kind: "over",
      lo: "฿1M",
    });
    expect(bandText({ lo: 100, hi: 250 }, "count")).toEqual({
      kind: "range",
      lo: "100",
      hi: "250",
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  boardSummary,
  climbers,
  emptyProvinces,
  gapToNext,
  parseMetric,
  parseRegion,
  provinceRank,
  rankProvinces,
  regionStandings,
  type OlympicSource,
} from "./olympics";

const row = (over: Partial<OlympicSource>): OlympicSource => ({
  slug: "x",
  name: "X",
  logo_path: null,
  province: "bangkok",
  status: "published",
  is_demo: false,
  verification_status: "verified",
  revenue_30d_cents: null,
  revenue_prev_30d_cents: null,
  mrr_cents: null,
  visitors_30d: null,
  visitors_prev_30d: null,
  build_commits: null,
  ...over,
});

const ROWS = [
  row({
    slug: "a",
    name: "A",
    province: "bangkok",
    mrr_cents: 500,
    build_commits: 10,
  }),
  row({
    slug: "b",
    name: "B",
    province: "bangkok",
    mrr_cents: 300,
    build_commits: 5,
  }),
  row({ slug: "c", name: "C", province: "chiang-mai", mrr_cents: 900 }),
  // Unverified: MRR doesn't count, commits do.
  row({
    slug: "d",
    name: "D",
    province: "khon-kaen",
    verification_status: "unverified",
    mrr_cents: 9999,
    build_commits: 50,
  }),
  // Demo and draft never count.
  row({
    slug: "e",
    name: "E",
    province: "phuket",
    is_demo: true,
    mrr_cents: 10_000,
  }),
  row({
    slug: "f",
    name: "F",
    province: "trang",
    status: "draft",
    mrr_cents: 10_000,
  }),
  // Unknown province is ignored.
  row({ slug: "g", name: "G", province: "atlantis", mrr_cents: 10_000 }),
];

describe("rankProvinces", () => {
  it("sums verified values per province, biggest first", () => {
    const r = rankProvinces(ROWS, "mrr");
    expect(r.map((p) => [p.rank, p.province, p.total, p.startups])).toEqual([
      [1, "chiang-mai", 900, 1],
      [2, "bangkok", 800, 2],
    ]);
    expect(r[1].top.map((t) => t.slug)).toEqual(["a", "b"]);
    // MRR has no previous period: no movement, no growth.
    expect(r[0]).toMatchObject({ prevTotal: null, change: null, growth: null });
  });

  it("counts synced traffic/commits without revenue verification", () => {
    expect(rankProvinces(ROWS, "commits").map((p) => p.province)).toEqual([
      "khon-kaen",
      "bangkok",
    ]);
  });

  it("filters by region", () => {
    expect(rankProvinces(ROWS, "mrr", "north").map((p) => p.province)).toEqual([
      "chiang-mai",
    ]);
  });

  it("keeps the top 5 and breaks ties by count then slug", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      row({ slug: `s${i}`, name: `S${i}`, province: "nan", build_commits: i }),
    );
    const r = rankProvinces(
      [...many, row({ slug: "t", province: "yala", build_commits: 21 })],
      "commits",
    );
    expect(r[0].province).toBe("nan"); // 21 = 21, more startups wins
    expect(r[0].top.map((t) => t.value)).toEqual([6, 5, 4, 3, 2]);
  });
});

describe("30-day season: movement and growth", () => {
  const season = [
    // Bangkok led last month, Phuket overtakes it now; Nan is new.
    row({
      slug: "bk",
      province: "bangkok",
      revenue_30d_cents: 500,
      revenue_prev_30d_cents: 900,
    }),
    row({
      slug: "pk",
      province: "phuket",
      revenue_30d_cents: 800,
      revenue_prev_30d_cents: 400,
    }),
    row({
      slug: "nn",
      province: "nan",
      revenue_30d_cents: 100,
      revenue_prev_30d_cents: null,
    }),
    // Unverified revenue never counts.
    row({
      slug: "zz",
      province: "yala",
      verification_status: "unverified",
      revenue_30d_cents: 9999,
    }),
  ];

  it("ranks by the last 30 days and compares with the 30 before", () => {
    const r = rankProvinces(season, "revenue30d");
    expect(
      r.map((p) => [p.province, p.rank, p.prevRank, p.change, p.growth]),
    ).toEqual([
      ["phuket", 1, 2, 1, 1],
      ["bangkok", 2, 1, -1, (500 - 900) / 900],
      ["nan", 3, null, null, null],
    ]);
  });

  it("lists climbers and the gap to the next place", () => {
    const r = rankProvinces(season, "revenue30d");
    expect(climbers(r).map((p) => p.province)).toEqual(["phuket"]);
    expect(gapToNext(r, "nan")).toMatchObject({
      ahead: { province: "bangkok" },
      gap: 401,
    });
    expect(gapToNext(r, "phuket")).toBeNull();
  });

  it("visitors use visitors_prev_30d", () => {
    const r = rankProvinces(
      [row({ province: "nan", visitors_30d: 30, visitors_prev_30d: 10 })],
      "visitors",
    );
    expect(r[0]).toMatchObject({
      prevTotal: 10,
      prevRank: 1,
      change: 0,
      growth: 2,
    });
  });
});

describe("helpers", () => {
  it("lists the provinces with no numbers", () => {
    const ranked = rankProvinces(ROWS, "mrr");
    expect(emptyProvinces(ranked, null)).toHaveLength(75);
    expect(emptyProvinces(ranked, "north").map((p) => p.slug)).not.toContain(
      "chiang-mai",
    );
    expect(provinceRank(ranked, "bangkok")).toBe(2);
    expect(provinceRank(ranked, "trang")).toBeNull();
  });

  it("parses URL params with safe defaults", () => {
    expect(parseMetric("visitors")).toBe("visitors");
    expect(parseMetric("drop table")).toBe("revenue30d");
    expect(parseRegion("south")).toBe("south");
    expect(parseRegion(["south"])).toBeNull();
  });
});

describe("region standings", () => {
  it("lists all 6 regions, biggest first, with province coverage", () => {
    const r = regionStandings(rankProvinces(ROWS, "commits"));
    expect(r).toHaveLength(6);
    expect(r[0]).toEqual({
      region: "northeast",
      total: 50,
      provinces: 1,
      of: 20,
      startups: 1,
    });
    expect(r[1].region).toBe("central");
    expect(r.slice(2).map((x) => x.region)).toEqual([
      "north",
      "east",
      "west",
      "south",
    ]);
  });

  it("summarises a board", () => {
    expect(boardSummary(rankProvinces(ROWS, "mrr"))).toEqual({
      provinces: 2,
      startups: 3,
      total: 1700,
    });
  });
});

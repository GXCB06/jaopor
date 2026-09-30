import { describe, expect, it } from "vitest";
import {
  emptyProvinces,
  fromRpc,
  parseMetric,
  parseRegion,
  provinceRank,
  rankProvinces,
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
  revenue_all_time_cents: null,
  mrr_cents: null,
  visitors_30d: null,
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
    expect(r.map((p) => [p.province, p.total, p.startups])).toEqual([
      ["chiang-mai", 900, 1],
      ["bangkok", 800, 2],
    ]);
    expect(r[1].top.map((t) => t.slug)).toEqual(["a", "b"]);
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
    expect(parseMetric("drop table")).toBe("revenue");
    expect(parseRegion("south")).toBe("south");
    expect(parseRegion(["south"])).toBeNull();
  });

  it("normalises RPC rows", () => {
    expect(
      fromRpc([
        {
          province: "mukdahan",
          region_slug: "northeast",
          startups: 1,
          total: "46",
          top: [{ slug: "j", name: "J", logo_path: null, value: "46" }],
        },
        { province: "nowhere", region_slug: "x", startups: 1, total: 1, top: [] },
      ]),
    ).toEqual([
      {
        province: "mukdahan",
        region: "northeast",
        startups: 1,
        total: 46,
        top: [{ slug: "j", name: "J", logo_path: null, value: 46 }],
      },
    ]);
  });
});

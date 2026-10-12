import { describe, expect, it } from "vitest";
import {
  buildLandingPayload,
  toLandingSeries,
  toPublicProject,
  type LandingSource,
} from "./public-landing";

const src = (over: Partial<LandingSource> = {}): LandingSource => ({
  id: 1,
  slug: "acme",
  name: "Acme",
  tagline: "Invoices for cats",
  logo_path: null,
  category: "saas",
  province: "มุกดาหาร",
  is_demo: false,
  status: "published",
  verification_status: "verified",
  verified_provider: "stripe",
  traffic_provider: "plausible",
  github_repo: "acme/app",
  mrr_cents: 230_000,
  revenue_30d_cents: 198_000,
  revenue_prev_30d_cents: 99_000,
  visitors_30d: 1200,
  visitors_prev_30d: 600,
  build_commits: 321,
  last_synced_at: "2026-10-12T01:00:00Z",
  traffic_synced_at: "2026-10-12T02:00:00Z",
  build_synced_at: null,
  created_at: "2026-10-01T00:00:00Z",
  owner: { handle: "gxcb06", display_name: "GXCB06", avatar_url: null },
  ...over,
});

const lists = (rows: LandingSource[]) => ({
  mrr: rows,
  revenue30d: rows,
  visitors: rows,
  commits: rows,
});

const payload = (rows: LandingSource[], recent = rows) =>
  buildLandingPayload({
    recent,
    lists: lists(rows),
    counts: { total: 3, verified: 1 },
    categories: { saas: 2 },
    thbPerUsd: 35,
    now: new Date("2026-10-12T03:00:00Z"),
  });

describe("toPublicProject", () => {
  it("labels revenue verified, visitors counted, build verified", () => {
    const p = toPublicProject(src());
    expect(p.proof.revenue).toEqual({ basis: "verified", source: "Stripe" });
    expect(p.proof.visitors?.basis).toBe("counted");
    expect(p.proof.build).toEqual({ basis: "verified", source: "GitHub" });
    expect(p.growthPct).toBe(100);
    expect(p.syncedAt).toBe("2026-10-12T02:00:00Z");
    expect(p.path).toBe("/startup/acme");
  });

  it("keeps missing numbers null and gives no proof for them", () => {
    const p = toPublicProject(
      src({
        mrr_cents: null,
        revenue_30d_cents: null,
        visitors_30d: null,
        build_commits: null,
        verification_status: "unverified",
        last_synced_at: null,
        traffic_synced_at: null,
      }),
    );
    expect(p.mrrCents).toBeNull();
    expect(p.visitors30d).toBeNull();
    expect(p.commits).toBeNull();
    expect(p.proof).toEqual({ revenue: null, visitors: null, build: null });
    expect(p.syncedAt).toBeNull();
  });

  it("an unverified connection never earns the verified revenue label", () => {
    const p = toPublicProject(src({ verification_status: "error" }));
    expect(p.proof.revenue).toBeNull();
  });

  it("hides the name and logo of an anonymous project, keeps a stable mask", () => {
    const row = src({
      slug: "anon-0123456789",
      name: "Anonymous",
      logo_path: "x/real-logo.png",
    });
    const p = toPublicProject(row);
    expect(p.anonymous).toBe(true);
    expect(p.name).toBeNull();
    expect(p.logo).toBeNull();
    expect(p.mask).toBeTruthy();
    expect(p.mask).toBe(toPublicProject(row).mask);
    expect(JSON.stringify(p)).not.toContain("real-logo");
  });
});

describe("buildLandingPayload", () => {
  it("never includes demo or unpublished projects", () => {
    const real = src({ id: 1, slug: "real" });
    const demo = src({ id: 2, slug: "demo", is_demo: true });
    const draft = src({ id: 3, slug: "draft", status: "draft" });
    const out = payload([real, demo, draft]);
    expect(out.recent.map((p) => p.slug)).toEqual(["real"]);
    for (const b of out.boards)
      expect(b.rows.map((r) => r.project.slug)).toEqual(["real"]);
  });

  it("ranks each board by its own value with competition ranks", () => {
    const a = src({ id: 1, slug: "a", name: "A", mrr_cents: 500 });
    const b = src({ id: 2, slug: "b", name: "B", mrr_cents: 500 });
    const c = src({ id: 3, slug: "c", name: "C", mrr_cents: 100 });
    const mrr = payload([c, b, a]).boards.find((x) => x.metric === "mrr")!;
    expect(mrr.rows.map((r) => [r.project.slug, r.rank, r.tied])).toEqual([
      ["a", 1, true],
      ["b", 1, true],
      ["c", 3, false],
    ]);
    expect(mrr.basis).toBe("verified");
    expect(
      payload([a]).boards.find((x) => x.metric === "visitors")!.basis,
    ).toBe("counted");
  });

  it("carries no private fields", () => {
    const json = JSON.stringify(payload([src()]));
    for (const key of [
      "owner_id",
      "avatar_url",
      "api_key",
      "email",
      "revenue_all_time",
    ])
      expect(json).not.toContain(key);
  });

  it("limits recent and board sizes", () => {
    const rows = Array.from({ length: 9 }, (_, i) =>
      src({ id: i, slug: `p${i}`, name: `P${i}`, mrr_cents: 1000 - i }),
    );
    const out = payload(rows);
    expect(out.recent).toHaveLength(6);
    expect(out.boards[0].rows).toHaveLength(5);
    expect(out.counts).toEqual({ projects: 3, withVerifiedRevenue: 1 });
    expect(out.thbPerUsd).toBe(35);
  });
});

describe("toLandingSeries", () => {
  const mrr = (vals: (number | null)[]) => ({ start: "2026-09-01", mrr: vals });

  it("keeps the last N days from the first real value, with its start date", () => {
    const s = toLandingSeries("acme", mrr([null, null, 100, 100, 250]), 30);
    expect(s).toEqual({
      slug: "acme",
      metric: "mrr",
      start: "2026-09-03",
      values: [100, 100, 250],
    });
  });

  it("windows to the last `days` entries", () => {
    const vals = Array.from({ length: 10 }, (_, i) => 100 + i);
    const s = toLandingSeries("acme", mrr(vals), 3);
    expect(s?.values).toEqual([107, 108, 109]);
    expect(s?.start).toBe("2026-09-08");
  });

  it("falls back to daily revenue when MRR has no history yet", () => {
    const s = toLandingSeries(
      "acme",
      { start: "2026-09-01", mrr: null, revenue: [null, 0, 40, 0, 90] },
      30,
    );
    expect(s).toEqual({
      slug: "acme",
      metric: "revenue",
      start: "2026-09-02",
      values: [0, 40, 0, 90],
    });
  });

  it("returns null without history or with fewer than two points", () => {
    expect(toLandingSeries("a", null)).toBeNull();
    expect(toLandingSeries("a", { start: "2026-09-01", mrr: null })).toBeNull();
    expect(toLandingSeries("a", mrr([null, null, null]))).toBeNull();
    expect(toLandingSeries("a", mrr([null, 5]))).toBeNull();
  });
});

describe("buildLandingPayload series", () => {
  it("carries the series, or null when none", () => {
    const base = {
      recent: [],
      lists: { mrr: [], revenue30d: [], visitors: [], commits: [] },
      counts: { total: 0, verified: 0 },
      categories: {},
      thbPerUsd: null,
    };
    expect(buildLandingPayload(base).topMrrSeries).toBeNull();
    const series = {
      slug: "a",
      metric: "mrr" as const,
      start: "2026-09-01",
      values: [1, 2],
    };
    expect(
      buildLandingPayload({ ...base, topMrrSeries: series }).topMrrSeries,
    ).toEqual(series);
  });
});

import { describe, expect, it } from "vitest";
import { chartWindow, smooth } from "./chart-window";

const days = (n: number, f: (i: number) => number | null) =>
  Array.from({ length: n }, (_, i) => f(i));

describe("chartWindow", () => {
  it("sums flows over the period and compares with the previous one", () => {
    // 60 days: first 30 at 10, last 30 at 15
    const v = days(60, (i) => (i < 30 ? 10 : 15));
    const w = chartWindow(v, "2026-08-01", "revenue", 30);
    expect(w.points).toHaveLength(30);
    expect(w.points[0]).toEqual({ day: "2026-08-31", value: 15, previous: 10 });
    expect(w.total).toBe(450);
    expect(w.growth).toBeCloseTo(50);
  });

  it("uses the latest value for MRR and forward-filled levels", () => {
    const v = days(14, (i) => (i < 3 ? null : 100 + i));
    const w = chartWindow(v, "2026-09-01", "mrr", 7);
    expect(w.total).toBe(113);
    expect(w.points[0].previous).toBeNull(); // day 0 of the previous week had no MRR yet
    expect(w.growth).toBeCloseTo(((113 - 106) / 106) * 100);
  });

  it("buckets 12 months into 52 weekly points", () => {
    const v = days(730, () => 1);
    const w = chartWindow(v, "2024-10-01", "visitors", 365);
    expect(w.points).toHaveLength(52);
    expect(w.points.every((p) => p.value === 7 && p.previous === 7)).toBe(true);
    expect(w.total).toBe(364);
    expect(w.growth).toBe(0);
  });

  it("has no growth without enough history", () => {
    const w = chartWindow(
      days(20, () => 5),
      "2026-09-01",
      "revenue",
      30,
    );
    expect(w.total).toBe(100);
    expect(w.growth).toBeNull();
    expect(w.points.every((p) => p.previous === null)).toBe(true);
  });
});

describe("smooth", () => {
  it("averages the trailing 7 values and keeps gaps", () => {
    expect(smooth([7, 7, 14, null])).toEqual([7, 7, 9, null]);
  });
});

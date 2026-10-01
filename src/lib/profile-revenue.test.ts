import { describe, expect, it } from "vitest";
import { niceCeil, revenueWindow, worksLabel } from "./profile-revenue";

// 60 days from 2026-08-03 to 2026-10-01 (yesterday); today = 2026-10-02.
const start = "2026-08-03";
const daily = Array.from({ length: 60 }, (_, i) => (i + 1) * 100);

describe("revenueWindow (days)", () => {
  it("30 days with today: 29 full days + today as the partial point", () => {
    const w = revenueWindow(daily, start, 50, "2026-10-02", "30d");
    expect(w.points).toHaveLength(30);
    expect(w.points[0]).toMatchObject({ key: "2026-09-03", value: 3200 });
    expect(w.points[28]).toMatchObject({ key: "2026-10-01", value: 6000 });
    expect(w.points[29]).toMatchObject({
      key: "2026-10-02",
      value: 50,
      partial: true,
    });
    // previous period: same positions 30 days earlier
    expect(w.points[0].prev).toBe(200);
    expect(w.total).toBe(daily.slice(31).reduce((s, v) => s + v, 0) + 50);
  });

  it("without today: the last n full days, nothing partial", () => {
    const w = revenueWindow(daily, start, null, "2026-10-02", "7d");
    expect(w.points.map((p) => p.key)).toEqual([
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
    ]);
    expect(w.points.some((p) => p.partial)).toBe(false);
    expect(w.max).toBe(6000);
  });

  it("growth compares complete days only (today's partial value is left out)", () => {
    const flat = Array.from({ length: 60 }, () => 100);
    const w = revenueWindow(flat, start, 1, "2026-10-02", "30d");
    expect(w.growth).toBe(0);
    const up = [...Array(30).fill(100), ...Array(30).fill(150)];
    expect(revenueWindow(up, start, null, "2026-10-02", "30d").growth).toBe(50);
  });

  it("no previous data → no growth; days before the first data stay null", () => {
    const young = [...Array(55).fill(null), 10, 20, 30, 40, 50];
    const w = revenueWindow(young, start, null, "2026-10-02", "7d");
    expect(w.points.map((p) => p.value)).toEqual([
      null,
      null,
      10,
      20,
      30,
      40,
      50,
    ]);
    expect(w.growth).toBeNull();
    expect(w.total).toBe(150);
  });
});

describe("revenueWindow (12 months)", () => {
  it("monthly totals with this month to date as the partial point", () => {
    const w = revenueWindow(daily, start, 50, "2026-10-02", "12m");
    expect(w.points).toHaveLength(12);
    expect(w.points[0].key).toBe("2025-11");
    expect(w.points[11]).toMatchObject({ key: "2026-10", partial: true });
    // August: days 2026-08-03..31 = values 100..2900
    const aug = Array.from({ length: 29 }, (_, i) => (i + 1) * 100).reduce(
      (s, v) => s + v,
      0,
    );
    expect(w.points[9]).toMatchObject({ key: "2026-08", value: aug });
    expect(w.points[11].value).toBe(6050); // October 1 (yesterday) + today so far
    expect(w.points[0].value).toBeNull();
    expect(w.growth).toBeNull(); // nothing a year earlier
  });
});

describe("helpers", () => {
  it("niceCeil rounds an axis maximum up", () => {
    expect(niceCeil(1600)).toBe(1600);
    expect(niceCeil(1234)).toBe(1500);
    expect(niceCeil(87)).toBe(100);
    expect(niceCeil(0)).toBe(1);
  });
  it("worksLabel shortens long lists", () => {
    expect(worksLabel(["A"])).toBe("A");
    expect(worksLabel(["A", "B"])).toBe("A + B");
    expect(worksLabel(["A", "B", "C", "D"])).toBe("A + B + 2");
  });
});

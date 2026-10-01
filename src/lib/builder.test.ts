import { describe, expect, it } from "vitest";
import {
  badges,
  currentRole,
  heatmapGrid,
  monthStarts,
  monthsBuilding,
  streak,
} from "./builder";

describe("badges", () => {
  it("computes pioneer, verified, the highest MRR milestone and streak", () => {
    expect(
      badges({ userNumber: 3, verifiedWorks: 1, mrrThb: 12_000, streak: 9 }),
    ).toEqual([
      { key: "pioneer", n: 3 },
      { key: "verified" },
      { key: "mrr", level: 10_000 },
      { key: "streak", days: 9 },
    ]);
    expect(
      badges({ userNumber: 101, verifiedWorks: 0, mrrThb: 500, streak: 6 }),
    ).toEqual([]);
  });
});

describe("streak", () => {
  const today = new Date("2026-10-01T09:00:00Z");
  it("counts back from today, or from yesterday when today is empty", () => {
    expect(streak(["2026-10-01", "2026-09-30", "2026-09-28"], today)).toBe(2);
    expect(streak(["2026-09-30", "2026-09-29"], today)).toBe(2);
    expect(streak(["2026-09-28"], today)).toBe(0);
  });
});

describe("heatmapGrid", () => {
  it("is 53 Monday-start weeks ending with the given week, with quartile levels", () => {
    const end = new Date("2026-10-01T00:00:00Z"); // a Thursday
    const g = heatmapGrid(
      [
        { day: "2026-09-29", score: 8 },
        { day: "2026-09-30", score: 2 },
      ],
      end,
      end,
    );
    expect(g).toHaveLength(53);
    expect(g.every((c) => c.length === 7)).toBe(true);
    const last = g[52];
    expect(last[0].day).toBe("2026-09-28"); // Monday
    expect(last[1]).toMatchObject({ day: "2026-09-29", level: 4 });
    expect(last[2]).toMatchObject({ day: "2026-09-30", level: 1 });
    expect(last[4].future).toBe(true);
    expect(monthStarts(g).at(-1)).toEqual({ week: 49, month: 8 });
  });
});

describe("misc", () => {
  it("months building and current role", () => {
    expect(
      monthsBuilding(
        ["2025-08-15", null, "2026-01-01"],
        new Date("2026-10-01"),
      ),
    ).toBe(14);
    expect(monthsBuilding([null])).toBeNull();
    expect(
      currentRole([
        { title: "Dev", end_date: "2024-01-01" },
        { title: "Founder", end_date: null },
      ])?.title,
    ).toBe("Founder");
  });
});

describe("sumSeries", () => {
  it("adds works day by day and keeps 'no data yet' as null", async () => {
    const { sumSeries } = await import("./builder");
    const a = { start: "2026-09-01", revenue: [null, 100, 200], mrr: null };
    const b = {
      start: "2026-09-01",
      revenue: [null, null, 50],
      mrr: [10, 10, 20],
    };
    expect(sumSeries([a, b])).toEqual({
      start: "2026-09-01",
      revenue: [null, 100, 250],
      mrr: [10, 10, 20],
      visitors: null,
    });
    expect(sumSeries([])).toBeNull();
    expect(
      sumSeries([{ start: "x", revenue: null, mrr: null }])?.revenue,
    ).toBeNull();
  });
});

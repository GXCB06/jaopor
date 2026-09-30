import { describe, expect, it } from "vitest";
import {
  bucketMonthly,
  chartPaths,
  heatLevels,
  parseCardQuery,
  weekColumns,
} from "./share-card";

describe("parseCardQuery", () => {
  it("accepts known values", () => {
    const q = parseCardQuery(
      new URLSearchParams(
        "kind=chart&theme=light&color=teal&period=7&locale=en",
      ),
    );
    expect(q).toEqual({
      kind: "chart",
      theme: "light",
      color: "teal",
      period: 7,
      locale: "en",
    });
  });

  it("falls back on anything unexpected (no caller-supplied colours)", () => {
    const q = parseCardQuery(
      new URLSearchParams("kind=evil&theme=x&color=%23ff0000&period=90"),
    );
    expect(q).toEqual({
      kind: "badge",
      theme: "dark",
      color: "indigo",
      period: 30,
      locale: "th",
    });
  });

  it("accepts the spec's 12 swatches only (old ids fall back)", () => {
    expect(parseCardQuery(new URLSearchParams("color=rose")).color).toBe("rose");
    expect(parseCardQuery(new URLSearchParams("color=violet")).color).toBe("indigo");
  });

  it("uses month periods for the calendar", () => {
    expect(
      parseCardQuery(new URLSearchParams("kind=calendar&period=6")).period,
    ).toBe(6);
    expect(
      parseCardQuery(new URLSearchParams("kind=calendar&period=30")).period,
    ).toBe(12);
  });
});

describe("bucketMonthly", () => {
  it("sums by month in order", () => {
    expect(
      bucketMonthly([
        { day: "2026-08-30", value: 1 },
        { day: "2026-08-31", value: 2 },
        { day: "2026-09-01", value: 5 },
      ]),
    ).toEqual([
      { day: "2026-08", value: 3 },
      { day: "2026-09", value: 5 },
    ]);
  });
});

describe("chartPaths", () => {
  it("scales to the box and closes the area", () => {
    const { line, area, max } = chartPaths([0, 5, 10], 100, 50);
    expect(max).toBe(10);
    expect(line).toBe("M0.0,50.0 L50.0,25.0 L100.0,0.0");
    expect(area.endsWith("L100.0,50 L0,50 Z")).toBe(true);
  });

  it("draws a flat baseline when everything is zero", () => {
    expect(chartPaths([0, 0], 10, 4).line).toBe("M0.0,4.0 L10.0,4.0");
  });
});

describe("heatLevels", () => {
  it("maps to 0–4", () => {
    expect(heatLevels([0, 1, 2, 3, 4, 8])).toEqual([0, 1, 1, 2, 2, 4]);
    expect(heatLevels([0, 0])).toEqual([0, 0]);
  });
});

describe("weekColumns", () => {
  it("pads so columns start on Sunday", () => {
    // 2026-09-29 is a Tuesday → two leading empty cells.
    const cols = weekColumns([
      { day: "2026-09-29", value: 1 },
      { day: "2026-09-30", value: 2 },
    ]);
    expect(cols).toHaveLength(1);
    expect(cols[0].slice(0, 3)).toEqual([
      null,
      null,
      { day: "2026-09-29", value: 1 },
    ]);
  });
});

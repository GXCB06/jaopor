import { describe, expect, it } from "vitest";
import {
  BOARD_DEFINITIONS,
  BOARD_METRICS,
  boardValue,
  isBoardEligible,
  rankBoard,
  type BoardCandidate,
} from "./leaderboard";

const row = (over: Partial<BoardCandidate> = {}): BoardCandidate => ({
  is_demo: false,
  status: "published",
  verification_status: "verified",
  mrr_cents: 1000,
  revenue_30d_cents: 2000,
  visitors_30d: 50,
  build_commits: 10,
  ...over,
});

describe("board definitions (time windows)", () => {
  it("each board names its column, period, basis and growth", () => {
    expect(BOARD_DEFINITIONS.mrr).toMatchObject({
      column: "mrr_cents",
      period: "current",
      basis: "verified",
      growth: "revenue30d",
    });
    expect(BOARD_DEFINITIONS.revenue30d).toMatchObject({
      column: "revenue_30d_cents",
      period: "30d",
      basis: "verified",
    });
    expect(BOARD_DEFINITIONS.visitors).toMatchObject({
      column: "visitors_30d",
      period: "30d",
      basis: "counted",
      growth: "visitors30d",
    });
    expect(BOARD_DEFINITIONS.commits).toMatchObject({
      column: "build_commits",
      period: "all_time",
      growth: null,
    });
  });
  it("only the revenue boards require verified revenue", () => {
    expect(
      BOARD_METRICS.filter((m) => BOARD_DEFINITIONS[m].verifiedRevenueOnly),
    ).toEqual(["mrr", "revenue30d"]);
  });
});

describe("isBoardEligible", () => {
  it("revenue boards: verified revenue only (unverified, error, pending excluded)", () => {
    expect(isBoardEligible(row(), "mrr")).toBe(true);
    for (const s of ["unverified", "error", "pending"]) {
      expect(isBoardEligible(row({ verification_status: s }), "mrr")).toBe(
        false,
      );
      expect(
        isBoardEligible(row({ verification_status: s }), "revenue30d"),
      ).toBe(false);
    }
  });
  it("visitors and commits don't depend on revenue verification", () => {
    const unverified = row({ verification_status: "unverified" });
    expect(isBoardEligible(unverified, "visitors")).toBe(true);
    expect(isBoardEligible(unverified, "commits")).toBe(true);
  });
  it("demos, private and moderator-hidden projects never rank", () => {
    for (const m of BOARD_METRICS) {
      expect(isBoardEligible(row({ is_demo: true }), m)).toBe(false);
      expect(isBoardEligible(row({ status: "private" }), m)).toBe(false);
      expect(isBoardEligible(row({ status: "hidden" }), m)).toBe(false);
    }
  });
  it("missing data is not zero: no value → not on the board", () => {
    expect(isBoardEligible(row({ mrr_cents: null }), "mrr")).toBe(false);
    expect(isBoardEligible(row({ visitors_30d: null }), "visitors")).toBe(
      false,
    );
    expect(isBoardEligible(row({ build_commits: undefined }), "commits")).toBe(
      false,
    );
    expect(boardValue(row({ mrr_cents: Number.NaN }), "mrr")).toBe(null);
  });
  it("a real zero is a value", () => {
    expect(isBoardEligible(row({ mrr_cents: 0 }), "mrr")).toBe(true);
  });
});

describe("rankBoard", () => {
  type R = { name: string; v: number | null };
  const rank = (rows: R[]) =>
    rankBoard(
      rows,
      (r) => r.v,
      (r) => r.name,
    ).map((r) => `${r.rank}${r.tied ? "=" : ""} ${r.name}`);

  it("sorts highest first", () => {
    expect(
      rank([
        { name: "B", v: 5 },
        { name: "A", v: 9 },
        { name: "C", v: 1 },
      ]),
    ).toEqual(["1 A", "2 B", "3 C"]);
  });
  it("equal values share a rank (1, 1, 3) and are listed by name, not by age", () => {
    expect(
      rank([
        { name: "Zeta", v: 10 },
        { name: "Alpha", v: 10 },
        { name: "Mid", v: 4 },
      ]),
    ).toEqual(["1= Alpha", "1= Zeta", "3 Mid"]);
  });
  it("ties lower down keep competition ranks", () => {
    expect(
      rank([
        { name: "A", v: 9 },
        { name: "B", v: 5 },
        { name: "C", v: 5 },
        { name: "D", v: 5 },
        { name: "E", v: 2 },
      ]),
    ).toEqual(["1 A", "2= B", "2= C", "2= D", "5 E"]);
  });
  it("rows without a value are left out", () => {
    expect(
      rank([
        { name: "A", v: null },
        { name: "B", v: 3 },
      ]),
    ).toEqual(["1 B"]);
  });
  it("Thai names sort Thai-aware and numbers naturally within a tie", () => {
    expect(
      rank([
        { name: "แอป 10", v: 1 },
        { name: "แอป 2", v: 1 },
        { name: "กขค", v: 1 },
      ]),
    ).toEqual(["1= กขค", "1= แอป 2", "1= แอป 10"]);
  });
  it("is stable for the same input and doesn't mutate it", () => {
    const input: R[] = [
      { name: "B", v: 1 },
      { name: "A", v: 1 },
    ];
    rank(input);
    expect(input.map((r) => r.name)).toEqual(["B", "A"]);
    expect(rank(input)).toEqual(rank([...input].reverse()));
  });
  it("an empty board is empty", () => {
    expect(rank([])).toEqual([]);
  });
});

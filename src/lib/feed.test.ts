import { describe, expect, it } from "vitest";
import { feedQuery, parseFeedFilters, popularScore, rankPopular } from "./feed";

describe("feed filters", () => {
  it("parses known values and drops unknown ones", () => {
    expect(
      parseFeedFilters({
        view: "popular",
        type: "lesson",
        province: "mukdahan",
        category: "saas",
      }),
    ).toEqual({
      view: "popular",
      type: "lesson",
      province: "mukdahan",
      category: "saas",
      waiting: false,
    });
    expect(
      parseFeedFilters({ view: "x", type: "y", province: "atlantis" }),
    ).toEqual({
      view: "latest",
      type: undefined,
      province: undefined,
      category: undefined,
      waiting: false,
    });
  });

  it("waiting forces the feedback type", () => {
    expect(parseFeedFilters({ waiting: "1", type: "lesson" }).type).toBe(
      "feedback",
    );
  });

  it("round-trips through the URL without defaults", () => {
    const f = parseFeedFilters({ view: "latest", type: "launch" });
    expect(feedQuery(f)).toEqual({ type: "launch" });
    expect(feedQuery(f, { type: undefined })).toEqual({});
    expect(feedQuery(parseFeedFilters({ waiting: "1" }))).toEqual({
      waiting: "1",
    });
  });
});

describe("popular ranking", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  it("weights comments double and decays with age", () => {
    expect(popularScore(2, 0, "2026-10-07T12:00:00Z", now)).toBeCloseTo(
      popularScore(0, 1, "2026-10-07T12:00:00Z", now),
    );
    expect(popularScore(10, 0, "2026-10-07T10:00:00Z", now)).toBeGreaterThan(
      popularScore(10, 0, "2026-10-05T12:00:00Z", now),
    );
  });

  it("a fresh post with a little engagement beats an old one with a bit more", () => {
    const ranked = rankPopular(
      [
        {
          id: "old",
          likes: 12,
          comments: 2,
          createdAt: "2026-10-01T12:00:00Z",
        },
        { id: "new", likes: 3, comments: 1, createdAt: "2026-10-07T09:00:00Z" },
        {
          id: "none",
          likes: 0,
          comments: 0,
          createdAt: "2026-10-07T11:00:00Z",
        },
      ],
      now,
    );
    expect(ranked.map((p) => p.id)).toEqual(["new", "old", "none"]);
  });
});

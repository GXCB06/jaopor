import { describe, expect, it } from "vitest";
import { MISSIONS, serverMissions } from "./missions";

const none = {
  publishedStartups: 0,
  verifiedStartups: 0,
  headline: null,
  province: null,
  skills: 0,
  posts: 0,
  follows: 0,
};

describe("serverMissions", () => {
  it("is all open for a brand-new account", () => {
    expect(Object.values(serverMissions(none)).some(Boolean)).toBe(false);
  });

  it("needs headline, province and a skill for a complete profile", () => {
    expect(
      serverMissions({ ...none, headline: "Dev", province: "bangkok" }).profile,
    ).toBe(false);
    expect(
      serverMissions({
        ...none,
        headline: "  ",
        province: "bangkok",
        skills: 2,
      }).profile,
    ).toBe(false);
    expect(
      serverMissions({
        ...none,
        headline: "Dev",
        province: "bangkok",
        skills: 1,
      }).profile,
    ).toBe(true);
  });

  it("counts 3 follows, a post, a published and a verified project", () => {
    const m = serverMissions({
      ...none,
      publishedStartups: 1,
      verifiedStartups: 1,
      posts: 1,
      follows: 3,
    });
    expect([m.firstStartup, m.verify, m.firstPost, m.follow3]).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(serverMissions({ ...none, follows: 2 }).follow3).toBe(false);
  });

  it("has seven missions in a fixed order", () => {
    expect(MISSIONS).toHaveLength(7);
    expect(MISSIONS[0]).toBe("firstStartup");
  });
});

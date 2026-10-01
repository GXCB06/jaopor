import { describe, expect, it } from "vitest";
import {
  cleanLookingFor,
  handleProblem,
  normalizeSocial,
  setupChecklist,
  suggestHandle,
} from "./profile";

describe("handles", () => {
  it("validates shape and reserved words", () => {
    expect(handleProblem("chawankorn")).toBeNull();
    expect(handleProblem("Ab")).toBe("invalid");
    expect(handleProblem("has space")).toBe("invalid");
    expect(handleProblem("dashboard")).toBe("reserved");
  });
  it("suggests a handle from a name", () => {
    expect(suggestHandle("Chawankorn B.")).toBe("chawankorn_b");
    expect(suggestHandle("ชวันกร")).toBe("");
    expect(suggestHandle("admin")).toBe("");
  });
});

describe("social links", () => {
  it("normalises to https and refuses non-web schemes", () => {
    expect(normalizeSocial("github.com/me")).toBe("https://github.com/me");
    expect(normalizeSocial("http://x.co/me/")).toBe("https://x.co/me");
    expect(normalizeSocial("javascript:alert(1)")).toBeNull();
    expect(normalizeSocial("")).toBeNull();
  });
});

describe("looking_for", () => {
  it("keeps only known values", () => {
    expect(
      cleanLookingFor({
        roles: ["engineering", "hacker", "engineering"],
        offer: "  equity + mentoring ",
        commitment: "full_time",
        deal: "free beer",
        location: "remote",
      }),
    ).toEqual({
      roles: ["engineering"],
      offer: "equity + mentoring",
      commitment: "full_time",
      location: "remote",
    });
  });
});

describe("setup checklist", () => {
  it("computes the 6 items", () => {
    expect(
      setupChecklist({
        startups: 1,
        province: "nan",
        verifiedStartups: 0,
        skills: 2,
        screenshots: 3,
      }),
    ).toEqual({
      account: true,
      firstStartup: true,
      province: true,
      verify: false,
      skillsStatus: true,
      screenshots: true,
    });
  });
});

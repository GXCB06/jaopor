import { describe, expect, it } from "vitest";
import { postLoginPath, safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("accepts internal paths, with query", () => {
    expect(safeNextPath("/th/startup/jaopor")).toBe("/th/startup/jaopor");
    expect(safeNextPath("/en/feed?view=following")).toBe(
      "/en/feed?view=following",
    );
  });
  it("refuses anything that could leave the site", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "evil.example",
      "",
      null,
      undefined,
      `/${"a".repeat(600)}`,
    ])
      expect(safeNextPath(bad)).toBeNull();
  });
  it("refuses the login and onboarding pages (no loops)", () => {
    expect(safeNextPath("/th/login")).toBeNull();
    expect(safeNextPath("/login?next=/th")).toBeNull();
    expect(safeNextPath("/en/onboarding")).toBeNull();
    expect(safeNextPath("/th/loginx")).toBe("/th/loginx");
  });
});

describe("postLoginPath", () => {
  const base = {
    locale: "th",
    next: null,
    hasHandle: true,
    hasStartups: false,
  };
  it("new users go through onboarding, then where they were", () => {
    expect(
      postLoginPath({ ...base, hasHandle: false, next: "/th/startup/jaopor" }),
    ).toBe("/th/onboarding?next=%2Fth%2Fstartup%2Fjaopor");
    expect(postLoginPath({ ...base, hasHandle: false })).toBe("/th/onboarding");
  });
  it("returning users go back where they were", () => {
    expect(postLoginPath({ ...base, next: "/th/new" })).toBe("/th/new");
  });
  it("without next: dashboard only for people with a startup", () => {
    expect(postLoginPath({ ...base, hasStartups: true })).toBe("/th/dashboard");
    expect(postLoginPath(base)).toBe("/th/startups?welcome=1");
    expect(postLoginPath({ ...base, locale: "en" })).toBe(
      "/en/startups?welcome=1",
    );
  });
  it("an unsafe next is ignored", () => {
    expect(postLoginPath({ ...base, next: "//evil.example" })).toBe(
      "/th/startups?welcome=1",
    );
  });
});

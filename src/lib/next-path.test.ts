import { describe, expect, it } from "vitest";
import { loginReason, postLoginPath, safeNextPath } from "./next-path";

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

describe("loginReason", () => {
  it("adding a project", () => {
    expect(loginReason("/th/new")).toBe("add");
    expect(loginReason("/new?x=1")).toBe("add");
    expect(loginReason("/th/newsletter")).toBeNull();
  });
  it("a contact request to a builder", () => {
    expect(loginReason("/th/u/gxcb06?contact=1&topic=cofounder")).toBe(
      "contact",
    );
    expect(loginReason("/en/u/gxcb06?contact=1")).toBe("contact");
    expect(loginReason("/th/u/gxcb06")).toBeNull();
    expect(loginReason("/th/u/gxcb06?contact=0")).toBeNull();
  });
  it("nothing for unsafe or other paths", () => {
    expect(loginReason("//evil.example/u/x?contact=1")).toBeNull();
    expect(loginReason(null)).toBeNull();
    expect(loginReason("/th/startups")).toBeNull();
  });
});

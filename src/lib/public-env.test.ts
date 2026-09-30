import { describe, expect, it } from "vitest";
import { resolveSiteUrl, toOrigin } from "./public-env";

describe("toOrigin (env URL normalization)", () => {
  it("accepts full URLs and strips paths", () => {
    expect(toOrigin("https://mrrmafia.vercel.app/")).toBe(
      "https://mrrmafia.vercel.app",
    );
    expect(toOrigin("http://localhost:3000/th")).toBe("http://localhost:3000");
  });

  it("adds https:// when the protocol is missing (common dashboard mistake)", () => {
    expect(toOrigin("mrr-mafia-gxcb06s-projects.vercel.app")).toBe(
      "https://mrr-mafia-gxcb06s-projects.vercel.app",
    );
  });

  it("treats empty, whitespace and unparseable values as missing", () => {
    expect(toOrigin(undefined)).toBeUndefined();
    expect(toOrigin("")).toBeUndefined();
    expect(toOrigin("   ")).toBeUndefined();
    expect(toOrigin("https://")).toBeUndefined();
    expect(toOrigin("not a url at all")).toBeUndefined();
  });
});

describe("resolveSiteUrl", () => {
  it("prefers Vercel's production domain over a stale NEXT_PUBLIC_SITE_URL", () => {
    expect(
      resolveSiteUrl({
        productionUrl: "jaopor.vercel.app",
        siteUrl: "https://mrr-mafia.vercel.app",
      }),
    ).toBe("https://jaopor.vercel.app");
  });

  it("falls back to NEXT_PUBLIC_SITE_URL, then localhost", () => {
    expect(resolveSiteUrl({ siteUrl: "jaopor.com" })).toBe(
      "https://jaopor.com",
    );
    expect(resolveSiteUrl({ productionUrl: " ", siteUrl: "" })).toBe(
      "http://localhost:3000",
    );
  });
});

import { describe, expect, it } from "vitest";
import { atPathTarget } from "./at-path";

describe("atPathTarget", () => {
  it("rewrites @handles with or without a locale", () => {
    expect(atPathTarget("/@Chawankorn", "th")).toBe("/th/u/chawankorn");
    expect(atPathTarget("/en/@jao_por/", "th")).toBe("/en/u/jao_por");
  });
  it("leaves everything else alone", () => {
    expect(atPathTarget("/th/startups", "th")).toBeNull();
    expect(atPathTarget("/@ab", "th")).toBeNull();
    expect(atPathTarget("/@a/b", "th")).toBeNull();
    expect(atPathTarget("/fr/@someone", "th")).toBeNull();
  });
});

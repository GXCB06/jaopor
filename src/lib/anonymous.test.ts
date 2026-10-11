import { describe, expect, it } from "vitest";
import { anonymousMask, isAnonymousSlug } from "./anonymous";

describe("isAnonymousSlug", () => {
  it("matches only the reserved placeholder shape", () => {
    expect(isAnonymousSlug("anon-0a1b2c3d4e")).toBe(true);
    expect(isAnonymousSlug("anon-0a1b2c3d4")).toBe(false);
    expect(isAnonymousSlug("anon-0A1B2C3D4E")).toBe(false);
    expect(isAnonymousSlug("anon-0a1b2c3d4e-x")).toBe(false);
    expect(isAnonymousSlug("anonymous")).toBe(false);
    expect(isAnonymousSlug(null)).toBe(false);
  });
});

describe("anonymousMask", () => {
  it("is a stable made-up word from the slug alone", () => {
    const a = anonymousMask("anon-0a1b2c3d4e");
    expect(a).toBe(anonymousMask("anon-0a1b2c3d4e"));
    expect(a).toMatch(/^[A-Z][a-z]{5,9}$/);
    expect(anonymousMask("anon-ffffffffff")).not.toBe(a);
  });
});

import { describe, expect, it } from "vitest";
import { isAnonymousSlug } from "./anonymous";

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

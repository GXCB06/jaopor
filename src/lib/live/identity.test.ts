import { describe, expect, it } from "vitest";
import { ANIMALS, COLORS, avatarFromKey, liveMode } from "./identity";

describe("liveMode", () => {
  it("defaults to the cheap poll board; 1 = Realtime; 0 = off", () => {
    expect(liveMode(undefined)).toBe("poll");
    expect(liveMode("poll")).toBe("poll");
    expect(liveMode("1")).toBe("realtime");
    expect(liveMode("realtime")).toBe("realtime");
    expect(liveMode("0")).toBe("off");
    expect(liveMode("off")).toBe("off");
  });
});

describe("avatarFromKey", () => {
  it("is stable and always a valid avatar", () => {
    for (const k of ["000000000000", "ffffffffffff", "a1b2c3d4e5f6", "zz"]) {
      const v = avatarFromKey(k);
      expect(v).toEqual(avatarFromKey(k));
      expect(v.c).toBeGreaterThanOrEqual(0);
      expect(v.c).toBeLessThan(COLORS.length);
      expect(v.a).toBeGreaterThanOrEqual(0);
      expect(v.a).toBeLessThan(ANIMALS.length);
    }
  });
});

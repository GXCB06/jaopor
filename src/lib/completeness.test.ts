import { describe, expect, it } from "vitest";
import { completenessPct, KEY_WEIGHTS, REST_WEIGHT } from "./completeness";

const none = {
  verified: false,
  screenshots: false,
  description: false,
  province: false,
  rest: [false, false, false, false],
};

describe("completenessPct", () => {
  it("weights sum to 100", () => {
    const keys = Object.values(KEY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(keys + REST_WEIGHT).toBe(100);
  });

  it("empty is 0 and full is 100", () => {
    expect(completenessPct(none)).toBe(0);
    expect(
      completenessPct({
        verified: true,
        screenshots: true,
        description: true,
        province: true,
        rest: [true, true],
      }),
    ).toBe(100);
  });

  it("verifying counts more than every minor field together", () => {
    const verifiedOnly = completenessPct({ ...none, verified: true });
    const allMinor = completenessPct({
      ...none,
      rest: [true, true, true, true],
    });
    expect(verifiedOnly).toBe(30);
    expect(allMinor).toBe(25);
    expect(verifiedOnly).toBeGreaterThan(allMinor);
  });

  it("minor fields share their weight", () => {
    expect(
      completenessPct({ ...none, rest: [true, false, false, false] }),
    ).toBe(6);
  });
});

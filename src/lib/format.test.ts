import { describe, expect, it } from "vitest";
import { money, moneyCompact, moneyFull } from "./format";

describe("money (USD / THB switch)", () => {
  it("defaults to USD, compact and full", () => {
    expect(money(430_000)).toBe("$4.3K");
    expect(money(430_000, { full: true })).toBe("$4,300");
    expect(money(430_000)).toBe(moneyCompact(430_000));
    expect(money(1_490_300, { full: true })).toBe(moneyFull(1_490_300));
  });

  it("converts to baht at the given rate", () => {
    expect(money(185_000, { currency: "thb", thbPerUsd: 32.5 })).toBe("฿60.1K");
    expect(
      money(185_000, { currency: "thb", thbPerUsd: 32.5, full: true }),
    ).toBe("฿60,125");
    expect(money(1_000, { currency: "thb", thbPerUsd: 32.5 })).toBe("฿325");
  });

  it("falls back to USD without a rate (never a guessed baht number)", () => {
    expect(money(185_000, { currency: "thb", thbPerUsd: null })).toBe("$1.9K");
  });

  it("shows a dash for missing values", () => {
    expect(money(null, { currency: "thb", thbPerUsd: 32.5 })).toBe("—");
  });
});

import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatMoney,
  formatMultiple,
  formatPct,
  money,
  moneyCompact,
  moneyFull,
} from "./format";

describe("money (USD / THB switch)", () => {
  it("defaults to USD, compact and full", () => {
    expect(money(430_000)).toBe("$4.3k");
    expect(money(430_000, { full: true })).toBe("$4,300");
    expect(money(430_000)).toBe(moneyCompact(430_000));
    expect(money(1_490_300, { full: true })).toBe(moneyFull(1_490_300));
  });

  it("converts to baht at the given rate", () => {
    expect(money(185_000, { currency: "thb", thbPerUsd: 32.5 })).toBe("฿60.1k");
    expect(
      money(185_000, { currency: "thb", thbPerUsd: 32.5, full: true }),
    ).toBe("฿60,125");
    expect(money(1_000, { currency: "thb", thbPerUsd: 32.5 })).toBe("฿325");
  });

  it("falls back to USD without a rate (never a guessed baht number)", () => {
    expect(money(185_000, { currency: "thb", thbPerUsd: null })).toBe("$1.9k");
  });

  it("shows a dash for missing values", () => {
    expect(money(null, { currency: "thb", thbPerUsd: 32.5 })).toBe("—");
  });
});

describe("spec 2.3 formats", () => {
  it("formatCompact", () => {
    expect(formatCompact(950)).toBe("950");
    expect(formatCompact(1_234)).toBe("1.2k");
    expect(formatCompact(12_000)).toBe("12k");
    expect(formatCompact(3_569_654)).toBe("3.6M");
    expect(formatCompact(999_950)).toBe("1M");
    expect(formatCompact(2_500_000_000)).toBe("2.5B");
    expect(formatCompact(null)).toBe("—");
  });

  it("formatMoney", () => {
    expect(formatMoney(990, "thb")).toBe("฿990");
    expect(formatMoney(1_200, "usd", { compact: true })).toBe("$1.2k");
    expect(formatMoney(3_569_654)).toBe("$3,569,654");
    expect(formatMoney(-1_500, "usd", { compact: true })).toBe("-$1.5k");
    expect(formatMoney(undefined)).toBe("—");
  });

  it("formatPct and formatMultiple", () => {
    expect(formatPct(19, { arrow: true })).toBe("↑ 19%");
    expect(formatPct(-4.46, { arrow: true })).toBe("↓ 4.5%");
    expect(formatPct(8.44)).toBe("8.4%");
    expect(formatPct(1234, { sign: true })).toBe("+1,234%");
    expect(formatMultiple(1.94)).toBe("1.9x");
  });
});

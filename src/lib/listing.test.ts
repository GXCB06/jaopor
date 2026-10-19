import { describe, expect, it } from "vitest";
import {
  ASKING_PRICE_MAX_THB,
  askingPriceUsd,
  listingMultiple,
  parseAskingPrice,
} from "./listing";

describe("parseAskingPrice", () => {
  it("accepts whole baht with commas, spaces or a ฿ sign", () => {
    expect(parseAskingPrice("1,500,000")).toBe(1_500_000);
    expect(parseAskingPrice(" ฿ 250000 ")).toBe(250_000);
    expect(parseAskingPrice("1")).toBe(1);
    expect(parseAskingPrice(String(ASKING_PRICE_MAX_THB))).toBe(
      ASKING_PRICE_MAX_THB,
    );
  });

  it("refuses empty, zero, decimals, negatives, words and anything over the cap", () => {
    for (const bad of [
      "",
      "0",
      "1.5",
      "-100",
      "1.5M",
      "abc",
      "1e6",
      String(ASKING_PRICE_MAX_THB + 1),
      "99999999999",
    ])
      expect(parseAskingPrice(bad), bad).toBeNull();
  });
});

describe("listingMultiple", () => {
  // MRR $1,000 (100,000 cents) at ฿35/USD = ฿35,000 a month = ฿420,000 a year.
  const base = {
    priceThb: 4_200_000,
    revenueLevel: "exact" as const,
    mrrCents: 100_000,
    isDemo: false,
    thbPerUsd: 35,
  };

  it("divides the price by MRR × 12 in baht, one decimal", () => {
    expect(listingMultiple(base)).toEqual({ kind: "value", value: 10 });
    expect(listingMultiple({ ...base, priceThb: 1_000_000 })).toEqual({
      kind: "value",
      value: 2.4, // 1,000,000 / 420,000 = 2.38…
    });
  });

  it("caps above 100× and floors below 0.1×", () => {
    expect(listingMultiple({ ...base, priceThb: 50_000_000 })).toEqual({
      kind: "over",
      value: 100,
    });
    expect(listingMultiple({ ...base, priceThb: 10_000 })).toEqual({
      kind: "under",
      value: 0.1,
    });
  });

  it("shows nothing unless verified MRR is public at exact and above zero", () => {
    expect(listingMultiple({ ...base, revenueLevel: "band" })).toBeNull();
    expect(listingMultiple({ ...base, revenueLevel: "growth" })).toBeNull();
    expect(listingMultiple({ ...base, revenueLevel: "badge" })).toBeNull();
    expect(listingMultiple({ ...base, revenueLevel: null })).toBeNull();
    expect(listingMultiple({ ...base, mrrCents: null })).toBeNull();
    expect(listingMultiple({ ...base, mrrCents: 0 })).toBeNull();
  });

  it("shows nothing for demo projects or without a THB rate", () => {
    expect(listingMultiple({ ...base, isDemo: true })).toBeNull();
    expect(listingMultiple({ ...base, thbPerUsd: null })).toBeNull();
    expect(listingMultiple({ ...base, thbPerUsd: 0 })).toBeNull();
  });
});

describe("askingPriceUsd", () => {
  it("converts at the given rate, or null without one", () => {
    expect(askingPriceUsd(3_500_000, 35)).toBe(100_000);
    expect(askingPriceUsd(3_500_000, null)).toBeNull();
  });
});

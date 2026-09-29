import { describe, expect, it } from "vitest";
import { computeMetrics } from "./metrics";
import type { NormalizedCharge, NormalizedSubscription } from "./types";

const NOW = new Date("2026-09-29T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const rates = { usd: 1, thb: 33.57, jpy: 156.88 };

const charge = (
  n: number,
  amountMinor: number,
  currency = "usd",
  customerRef: string | null = null,
): NormalizedCharge => ({
  occurredAt: daysAgo(n),
  amountMinor,
  currency,
  customerRef,
});

const sub = (
  items: NormalizedSubscription["items"],
  status: NormalizedSubscription["status"] = "active",
  customerRef = "cus_x",
): NormalizedSubscription => ({ status, customerRef, items });

describe("computeMetrics", () => {
  it("splits revenue into last 30 days, previous 30 days and all-time", () => {
    const m = computeMetrics({
      charges: [
        charge(1, 1000),
        charge(29, 2000),
        charge(31, 4000),
        charge(59, 8000),
        charge(200, 16000),
      ],
      subscriptions: [],
      rates,
      now: NOW,
    });
    expect(m.revenue30dCents).toBe(3000);
    expect(m.revenuePrev30dCents).toBe(12000);
    expect(m.revenueAllTimeCents).toBe(31000);
  });

  it("normalizes subscription intervals to monthly MRR and ignores trials", () => {
    const m = computeMetrics({
      charges: [],
      subscriptions: [
        sub([
          {
            unitAmountMinor: 2900,
            currency: "usd",
            quantity: 1,
            interval: "month",
            intervalCount: 1,
          },
        ]),
        sub([
          {
            unitAmountMinor: 12000,
            currency: "usd",
            quantity: 1,
            interval: "year",
            intervalCount: 1,
          },
        ]),
        sub([
          {
            unitAmountMinor: 3000,
            currency: "usd",
            quantity: 2,
            interval: "month",
            intervalCount: 3,
          },
        ]),
        sub(
          [
            {
              unitAmountMinor: 9900,
              currency: "usd",
              quantity: 1,
              interval: "month",
              intervalCount: 1,
            },
          ],
          "trialing",
        ),
      ],
      rates,
      now: NOW,
    });
    // 29 + 120/12 + (30*2)/3 = 29 + 10 + 20 = $59
    expect(m.mrrCents).toBe(5900);
    expect(m.activeSubscriptions).toBe(3);
  });

  it("converts currencies to USD, including zero-decimal ones", () => {
    const m = computeMetrics({
      charges: [charge(1, 33_570_00, "thb"), charge(2, 15688, "jpy")],
      subscriptions: [],
      rates,
      now: NOW,
    });
    // ฿33,570.00 → $1,000.00 ; ¥15,688 → $100.00
    expect(m.revenue30dCents).toBe(110_000);
  });

  it("reports currencies without an FX rate instead of guessing", () => {
    const m = computeMetrics({
      charges: [charge(1, 5000, "vnd")],
      subscriptions: [],
      rates,
      now: NOW,
    });
    expect(m.revenue30dCents).toBe(0);
    expect(m.skippedCurrencies).toEqual(["vnd"]);
  });

  it("counts distinct customers across charges and paying subscriptions", () => {
    const m = computeMetrics({
      charges: [
        charge(1, 100, "usd", "cus_a"),
        charge(2, 100, "usd", "cus_a"),
        charge(3, 100, "usd", "cus_b"),
      ],
      subscriptions: [sub([], "active", "cus_c"), sub([], "trialing", "cus_d")],
      rates,
      now: NOW,
    });
    expect(m.customers).toBe(3);
  });

  it("returns a zero-filled 30-day daily series ending today", () => {
    const m = computeMetrics({
      charges: [charge(0, 500), charge(0, 250), charge(5, 100)],
      subscriptions: [],
      rates,
      now: NOW,
    });
    expect(m.daily).toHaveLength(30);
    expect(m.daily.at(-1)).toEqual({ day: "2026-09-29", revenueCents: 750 });
    expect(m.daily.at(-6)).toEqual({ day: "2026-09-24", revenueCents: 100 });
    expect(m.daily[0].day).toBe("2026-08-31");
  });

  it("ignores future-dated and non-positive charges", () => {
    const m = computeMetrics({
      charges: [charge(-1, 1000), charge(1, 0), charge(1, -50)],
      subscriptions: [],
      rates,
      now: NOW,
    });
    expect(m.revenueAllTimeCents).toBe(0);
  });
});

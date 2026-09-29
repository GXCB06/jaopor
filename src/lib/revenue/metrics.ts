// Provider-agnostic metrics engine. Pure functions → unit-tested in metrics.test.ts.
import { toUsdCents, type UsdRates } from "./fx";
import type {
  BillingInterval,
  NormalizedCharge,
  NormalizedSubscription,
} from "./types";

const DAY_MS = 86_400_000;

/** Monthly multiplier for one billing interval (a yearly plan counts 1/12 of its price per month). */
const PER_MONTH: Record<BillingInterval, number> = {
  day: 365 / 12,
  week: 52 / 12,
  month: 1,
  year: 1 / 12,
};

export type RevenueMetrics = {
  mrrCents: number;
  revenue30dCents: number;
  revenuePrev30dCents: number;
  revenueAllTimeCents: number;
  activeSubscriptions: number;
  customers: number;
  /** USD cents per UTC day (YYYY-MM-DD) for the last `chartDays` days, oldest first, zero-filled. */
  daily: Array<{ day: string; revenueCents: number }>;
  /** Currencies we could not convert (no FX rate) — surfaced so numbers are never silently wrong. */
  skippedCurrencies: string[];
};

export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeMetrics(input: {
  charges: Iterable<NormalizedCharge>;
  subscriptions: Iterable<NormalizedSubscription>;
  rates: UsdRates;
  now: Date;
  chartDays?: number;
}): RevenueMetrics {
  const { rates, now } = input;
  const chartDays = input.chartDays ?? 30;
  const skipped = new Set<string>();

  const nowMs = now.getTime();
  const start30 = nowMs - 30 * DAY_MS;
  const start60 = nowMs - 60 * DAY_MS;
  const chartStart = utcDay(new Date(nowMs - (chartDays - 1) * DAY_MS));

  let revenue30d = 0;
  let revenuePrev30d = 0;
  let revenueAllTime = 0;
  const customers = new Set<string>();
  const daily = new Map<string, number>();

  for (const charge of input.charges) {
    const t = charge.occurredAt.getTime();
    if (t > nowMs || charge.amountMinor <= 0) continue;
    const cents = toUsdCents(charge.amountMinor, charge.currency, rates);
    if (cents === null) {
      skipped.add(charge.currency.toLowerCase());
      continue;
    }
    revenueAllTime += cents;
    if (t > start30) revenue30d += cents;
    else if (t > start60) revenuePrev30d += cents;
    const day = utcDay(charge.occurredAt);
    if (day >= chartStart) daily.set(day, (daily.get(day) ?? 0) + cents);
    if (charge.customerRef) customers.add(charge.customerRef);
  }

  let mrr = 0;
  let activeSubscriptions = 0;
  for (const sub of input.subscriptions) {
    // Paying subscriptions only: trials and other states don't count toward MRR.
    if (sub.status !== "active" && sub.status !== "past_due") continue;
    activeSubscriptions += 1;
    if (sub.customerRef) customers.add(sub.customerRef);
    for (const item of sub.items) {
      const cents = toUsdCents(
        item.unitAmountMinor * item.quantity,
        item.currency,
        rates,
      );
      if (cents === null) {
        skipped.add(item.currency.toLowerCase());
        continue;
      }
      mrr +=
        (cents * PER_MONTH[item.interval]) / Math.max(1, item.intervalCount);
    }
  }

  const days: RevenueMetrics["daily"] = [];
  for (let i = chartDays - 1; i >= 0; i -= 1) {
    const day = utcDay(new Date(nowMs - i * DAY_MS));
    days.push({ day, revenueCents: daily.get(day) ?? 0 });
  }

  return {
    mrrCents: Math.round(mrr),
    revenue30dCents: revenue30d,
    revenuePrev30dCents: revenuePrev30d,
    revenueAllTimeCents: revenueAllTime,
    activeSubscriptions,
    customers: customers.size,
    daily: days,
    skippedCurrencies: [...skipped].sort(),
  };
}

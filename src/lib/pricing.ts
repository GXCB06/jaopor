// Structured pricing (spec §5): amount + currency + period, plus a free-text note.
import { formatMoney } from "./format";

export const PRICING_CURRENCIES = ["THB", "USD"] as const;
export const PRICING_PERIODS = ["month", "year", "once", "free"] as const;
export type PricingCurrency = (typeof PRICING_CURRENCIES)[number];
export type PricingPeriod = (typeof PRICING_PERIODS)[number];

type PricingRow = {
  pricing_amount: number | null;
  pricing_currency: string | null;
  pricing_period: string | null;
};

type Labels = {
  free: string;
  perMonth: (price: string) => string;
  perYear: (price: string) => string;
  oneTime: (price: string) => string;
};

/** "฿990 / เดือน", "$49 / year", "ฟรี"; null when no structured price is set. */
export function formatPricing(row: PricingRow, labels: Labels): string | null {
  if (row.pricing_period === "free") return labels.free;
  if (
    row.pricing_amount === null ||
    row.pricing_currency === null ||
    row.pricing_period === null
  )
    return null;
  const price = formatMoney(
    Number(row.pricing_amount),
    row.pricing_currency === "USD" ? "usd" : "thb",
  );
  if (row.pricing_period === "month") return labels.perMonth(price);
  if (row.pricing_period === "year") return labels.perYear(price);
  return labels.oneTime(price);
}

export function hasPricing(
  row: PricingRow & { pricing_note: string | null },
): boolean {
  return Boolean(row.pricing_period || row.pricing_note);
}

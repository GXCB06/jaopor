// Currency conversion to USD cents. Rates: ECB reference rates via Frankfurter (free, no key).
// v1 simplification: every amount is converted at the sync-day rate (not the historical rate).

/** Stripe's zero-decimal currencies: amounts are already whole units. */
const ZERO_DECIMAL = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

/** Units of each currency per 1 USD, keyed lowercase. Always contains usd = 1. */
export type UsdRates = Record<string, number>;

export function minorUnitsPerMajor(currency: string): number {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? 1 : 100;
}

/** Converts an amount in minor units of `currency` to USD cents; null if the currency has no rate. */
export function toUsdCents(
  amountMinor: number,
  currency: string,
  rates: UsdRates,
): number | null {
  const cur = currency.toLowerCase();
  const rate = rates[cur];
  if (!rate) return null;
  const major = amountMinor / minorUnitsPerMajor(cur);
  return Math.round((major / rate) * 100);
}

const FX_URL = "https://api.frankfurter.dev/v1/latest?from=USD";

export async function fetchUsdRates(
  fetchImpl: typeof fetch = fetch,
): Promise<UsdRates> {
  const res = await fetchImpl(FX_URL, {
    next: { revalidate: 60 * 60 * 6 },
  } as RequestInit);
  if (!res.ok) throw new Error(`FX rates unavailable (${res.status})`);
  const body = (await res.json()) as { rates: Record<string, number> };
  const rates: UsdRates = { usd: 1 };
  for (const [code, value] of Object.entries(body.rates))
    rates[code.toLowerCase()] = value;
  return rates;
}

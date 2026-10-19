import "server-only";
import { fetchUsdRatesDated } from "@/lib/revenue/fx";

/**
 * THB per 1 USD for display (Design.md §3 Currency). ECB rate via Frankfurter, cached 6 h by the
 * fetch cache. Null when unavailable: pages then show USD only instead of a guessed baht number.
 */
export async function getThbPerUsd(): Promise<number | null> {
  return (await getThbPerUsdDated())?.rate ?? null;
}

/** The same rate plus the day it is from, for amounts shown as "≈ … estimate at the {date} rate". */
export async function getThbPerUsdDated(): Promise<{
  rate: number;
  date: string | null;
} | null> {
  try {
    const { rates, date } = await fetchUsdRatesDated();
    const rate = rates.thb;
    return rate && rate > 0 ? { rate, date } : null;
  } catch {
    return null;
  }
}

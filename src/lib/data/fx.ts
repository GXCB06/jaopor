import "server-only";
import { fetchUsdRates } from "@/lib/revenue/fx";

/**
 * THB per 1 USD for display (Design.md §3 Currency). ECB rate via Frankfurter, cached 6 h by the
 * fetch cache. Null when unavailable: pages then show USD only instead of a guessed baht number.
 */
export async function getThbPerUsd(): Promise<number | null> {
  try {
    const rate = (await fetchUsdRates()).thb;
    return rate && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

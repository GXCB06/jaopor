// Money + number formatting (Design.md §3: compact on cards, full on profiles, tabular-nums in UI).

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 430_000 cents → "$4.3K" */
export function moneyCompact(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  const dollars = cents / 100;
  if (Math.abs(dollars) < 1000)
    return `$${Math.round(dollars).toLocaleString("en-US")}`;
  return `$${compact.format(dollars)}`;
}

/** 1_490_300 cents → "$14,903" */
export function moneyFull(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

/**
 * USD cents shown in the visitor's currency (Design.md §3 Currency). THB converts at `thbPerUsd`;
 * without a rate it falls back to USD. 430_000 → "$4.3K" / "฿142K" (compact), "$4,300" (full).
 */
export function money(
  cents: number | null | undefined,
  {
    currency = "usd",
    thbPerUsd,
    full = false,
  }: {
    currency?: "usd" | "thb";
    thbPerUsd?: number | null;
    full?: boolean;
  } = {},
): string {
  if (cents === null || cents === undefined) return "—";
  if (currency === "usd" || !thbPerUsd)
    return full ? moneyFull(cents) : moneyCompact(cents);
  const baht = (cents / 100) * thbPerUsd;
  if (full || Math.abs(baht) < 1000)
    return `฿${Math.round(baht).toLocaleString("en-US")}`;
  return `฿${compact.format(baht)}`;
}

/** USD cents → "≈ ฿154K" using units-of-THB-per-USD. */
export function thbApprox(
  cents: number | null | undefined,
  thbPerUsd: number | undefined,
): string | null {
  if (cents === null || cents === undefined || !thbPerUsd) return null;
  const baht = (cents / 100) * thbPerUsd;
  return `≈ ฿${baht < 1000 ? Math.round(baht).toLocaleString("en-US") : compact.format(baht)}`;
}

/** Percent change current vs previous; null when there's no meaningful base. */
export function growthPct(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function formatPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${Math.abs(pct) >= 100 ? Math.round(pct).toLocaleString("en-US") : pct.toFixed(1)}%`;
}

export function formatInt(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : n.toLocaleString("en-US");
}

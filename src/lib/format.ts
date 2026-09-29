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

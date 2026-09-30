// Money + number formatting (Design.md §3: compact on cards, full on profiles, tabular-nums in UI).

// Spec 2.3: `฿990`, `$1.2k`, `$3,569,654`, `↑ 19%`, `1.9x`. Amounts in the money helpers are USD cents.

const DEFAULT_LOCALE = "en-US";
const SYMBOL = { usd: "$", thb: "฿" } as const;
export type Currency = keyof typeof SYMBOL;

/** 1234 → "1.2k", 12_000 → "12k", 3_569_654 → "3.6M". Under 1,000 it's the plain rounded number. */
export function formatCompact(
  n: number | null | undefined,
  locale = DEFAULT_LOCALE,
): string {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  if (abs < 1000) return Math.round(n).toLocaleString(locale);
  const units = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"],
  ] as const;
  for (let i = 0; i < units.length; i++) {
    const [size, suffix] = units[i];
    if (abs < size) continue;
    let v = Math.round((n / size) * 10) / 10;
    // 999,950 rounds up to 1000k: promote to the next unit ("1M") instead.
    if (Math.abs(v) >= 1000 && i > 0) {
      v = Math.round((n / units[i - 1][0]) * 10) / 10;
      return `${v.toLocaleString(locale, { maximumFractionDigits: 1 })}${units[i - 1][1]}`;
    }
    return `${v.toLocaleString(locale, { maximumFractionDigits: 1 })}${suffix}`;
  }
  return String(n);
}

/** Major-unit amount: (990,"thb") → "฿990"; (1200,"usd",{compact}) → "$1.2k"; (3569654) → "$3,569,654". */
export function formatMoney(
  amount: number | null | undefined,
  currency: Currency = "usd",
  {
    compact = false,
    locale = DEFAULT_LOCALE,
  }: { compact?: boolean; locale?: string } = {},
): string {
  if (amount === null || amount === undefined) return "—";
  const body = compact
    ? formatCompact(amount, locale)
    : Math.round(amount).toLocaleString(locale);
  return body.startsWith("-")
    ? `-${SYMBOL[currency]}${body.slice(1)}`
    : `${SYMBOL[currency]}${body}`;
}

/** 430_000 cents → "$4.3k" */
export function moneyCompact(cents: number | null | undefined): string {
  return formatMoney(
    cents === null || cents === undefined ? cents : cents / 100,
    "usd",
    {
      compact: true,
    },
  );
}

/** 1_490_300 cents → "$14,903" */
export function moneyFull(cents: number | null | undefined): string {
  return formatMoney(
    cents === null || cents === undefined ? cents : cents / 100,
    "usd",
  );
}

/**
 * USD cents shown in the visitor's currency (Design.md §3 Currency). THB converts at `thbPerUsd`;
 * without a rate it falls back to USD. 430_000 → "$4.3k" / "฿142k" (compact), "$4,300" (full).
 */
export function money(
  cents: number | null | undefined,
  {
    currency = "usd",
    thbPerUsd,
    full = false,
  }: {
    currency?: Currency;
    thbPerUsd?: number | null;
    full?: boolean;
  } = {},
): string {
  if (cents === null || cents === undefined) return "—";
  if (currency === "usd" || !thbPerUsd)
    return full ? moneyFull(cents) : moneyCompact(cents);
  const baht = (cents / 100) * thbPerUsd;
  return formatMoney(baht, "thb", { compact: !full && Math.abs(baht) >= 1000 });
}

/** USD cents → "≈ ฿154k" using units-of-THB-per-USD. */
export function thbApprox(
  cents: number | null | undefined,
  thbPerUsd: number | undefined,
): string | null {
  if (cents === null || cents === undefined || !thbPerUsd) return null;
  const baht = (cents / 100) * thbPerUsd;
  return `≈ ${formatMoney(baht, "thb", { compact: Math.abs(baht) >= 1000 })}`;
}

/** Percent change current vs previous; null when there's no meaningful base. */
export function growthPct(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * 19 → "19%", 8.44 → "8.4%", 1234 → "1,234%". `arrow` gives "↑ 19%" / "↓ 4.5%"; `sign` gives "+19%".
 * Under 10 keeps one decimal, 10-99 rounds, 100+ groups thousands.
 */
export function formatPct(
  pct: number,
  { arrow = false, sign = false }: { arrow?: boolean; sign?: boolean } = {},
  locale = DEFAULT_LOCALE,
): string {
  const abs = Math.abs(pct);
  const body =
    abs >= 100
      ? Math.round(abs).toLocaleString(locale)
      : abs.toFixed(abs >= 10 ? 0 : 1);
  const prefix = arrow
    ? pct >= 0
      ? "↑ "
      : "↓ "
    : pct < 0
      ? "-"
      : sign && pct > 0
        ? "+"
        : "";
  return `${prefix}${body}%`;
}

/** 1.94 → "1.9x" */
export function formatMultiple(x: number): string {
  return `${(Math.round(x * 10) / 10).toFixed(1)}x`;
}

export function formatInt(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : n.toLocaleString("en-US");
}

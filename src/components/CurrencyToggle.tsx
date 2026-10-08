"use client";

import { useTranslations } from "next-intl";
import { applyCurrency, useCurrency } from "@/lib/currency";

/** Design.md §3 Currency: header switch between ฿ THB and $ USD. */
export function CurrencyToggle() {
  const t = useTranslations("Nav");
  const currency = useCurrency();
  const next = currency === "thb" ? "usd" : "thb";
  return (
    <button
      type="button"
      onClick={() => applyCurrency(next)}
      aria-label={t(next === "thb" ? "currencyThb" : "currencyUsd")}
      title={t(next === "thb" ? "currencyThb" : "currencyUsd")}
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border bg-card px-2 text-xs font-semibold tabular-nums transition-colors hover:bg-accent"
    >
      {currency === "thb" ? "฿" : "$"}
      <span className="ml-1 hidden xl:inline">
        {currency === "thb" ? "THB" : "USD"}
      </span>
    </button>
  );
}

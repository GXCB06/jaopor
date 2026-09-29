// Client side of the currency switch (Design.md §3 Currency): the toggle and client charts read
// html[data-currency], which the <head> script in currency-script.ts sets before paint.
import { useSyncExternalStore } from "react";
import { CURRENCY_STORAGE_KEY, type Currency } from "./currency-script";

export function applyCurrency(currency: Currency) {
  document.documentElement.dataset.currency = currency;
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  } catch {
    // Blocked storage: the switch still applies for this page view.
  }
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-currency"],
  });
  return () => observer.disconnect();
}

export function useCurrency(): Currency {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.currency === "thb" ? "thb" : "usd"),
    () => "usd",
  );
}

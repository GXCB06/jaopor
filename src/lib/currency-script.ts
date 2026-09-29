// Server-safe half of the currency switch (Design.md §3 Currency), used by the root layout.
export const CURRENCY_STORAGE_KEY = "currency";
export type Currency = "usd" | "thb";

/**
 * Runs before first paint: sets html[data-currency] from localStorage, else by page language
 * (Thai pages → THB). CSS then shows only the matching <Money> span.
 */
export const currencyInitScript = `try{var d=document.documentElement;var c=localStorage.getItem("${CURRENCY_STORAGE_KEY}");if(c!=="usd"&&c!=="thb"){c=d.lang==="th"?"thb":"usd"}d.dataset.currency=c}catch(e){}`;

// For-sale listing v1 (Design.md "Proposal — For-sale listing"). Pure helpers, safe on the client.
// The database decides whether a listing is public (trigger startups_public_listing); these only
// parse the owner's input and work out the revenue multiple shown next to the price.

import type { DisclosureLevel } from "@/lib/disclosure";

/** Same bounds as the startups CHECK constraints. */
export const ASKING_PRICE_MAX_THB = 1_000_000_000;
export const SALE_NOTE_MAX = 280;

/** What visitors may see of a listing (the `public_*` copies), or null when it isn't public. */
export type PublicListing = {
  priceThb: number;
  note: string | null;
  listedAt: string | null;
};

/**
 * The owner's asking price as typed ("1,500,000", "฿ 1500000") → whole baht, or null when it isn't
 * a whole number from 1 to 1,000,000,000.
 */
export function parseAskingPrice(input: string): number | null {
  const s = input.replace(/[\s,฿]/g, "");
  if (!/^\d{1,10}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= ASKING_PRICE_MAX_THB ? n : null;
}

/** "≈ N× annualized MRR": a value with one decimal, or a bound past either end. */
export type ListingMultiple =
  | { kind: "value"; value: number }
  | { kind: "over"; value: 100 }
  | { kind: "under"; value: 0.1 };

/**
 * Asking price ÷ (MRR × 12), owner decision 2026-10-19. Only for a real (non-demo) project whose
 * verified MRR is public at `exact` and above zero, and only with a THB rate: at any other level
 * the price could be used to back out the hidden revenue, so there is no multiple at all.
 * `mrrCents` is the public MRR in USD cents (null when not exact).
 */
export function listingMultiple(input: {
  priceThb: number;
  revenueLevel: Exclude<DisclosureLevel, "private"> | null;
  mrrCents: number | null;
  isDemo: boolean;
  thbPerUsd: number | null;
}): ListingMultiple | null {
  const { priceThb, revenueLevel, mrrCents, isDemo, thbPerUsd } = input;
  if (isDemo || revenueLevel !== "exact") return null;
  if (mrrCents === null || !(mrrCents > 0)) return null;
  if (thbPerUsd === null || !(thbPerUsd > 0) || !(priceThb > 0)) return null;
  const annualizedThb = (mrrCents / 100) * thbPerUsd * 12;
  const m = priceThb / annualizedThb;
  if (!Number.isFinite(m)) return null;
  if (m > 100) return { kind: "over", value: 100 };
  const rounded = Math.round(m * 10) / 10;
  if (rounded < 0.1) return { kind: "under", value: 0.1 };
  return { kind: "value", value: rounded };
}

/** The asking price in USD at today's rate, for the "≈ $Y estimate" line (null without a rate). */
export function askingPriceUsd(
  priceThb: number,
  thbPerUsd: number | null,
): number | null {
  return thbPerUsd && thbPerUsd > 0 ? priceThb / thbPerUsd : null;
}

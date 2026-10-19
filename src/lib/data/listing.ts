import "server-only";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// For-sale listing reads that need the server key (migration 20261019123207_for_sale_listing).
// The functions are callable by the server key only; callers decide who may see the result
// (anyone for a public listing's counts, the owner for their own raw fields, moderators).

export type ListingStats = { views: number; interested: number };

/**
 * Views (one per viewer per day) and distinct interested buyers since the current listing began.
 * Null when it can't be read (e.g. no server key on a local dev machine): the chips just hide.
 */
export async function getListingStats(
  startupId: number,
): Promise<ListingStats | null> {
  try {
    const { data, error } = await createAdminClient().rpc("listing_stats", {
      p_startup: startupId,
    });
    const row = data?.[0];
    if (error || !row) return null;
    return { views: Number(row.views), interested: Number(row.interested) };
  } catch {
    return null;
  }
}

/** The owner's view of their listing, including a moderator's hide and its reason. */
export type OwnerListing = {
  forSale: boolean;
  priceThb: number | null;
  note: string | null;
  listedAt: string | null;
  hidden: boolean;
  hiddenAt: string | null;
  hiddenReason: string | null;
};

/** Raw listing fields for a project. The caller must have checked that the viewer may see them. */
export async function getOwnerListing(
  startupId: number,
): Promise<OwnerListing | null> {
  try {
    const { data, error } = await createAdminClient().rpc("listing_for_owner", {
      p_startup: startupId,
    });
    if (error || !data || typeof data !== "object" || Array.isArray(data))
      return null;
    const r = data as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v : null);
    return {
      forSale: r.for_sale === true,
      priceThb:
        typeof r.asking_price_thb === "number" ? r.asking_price_thb : null,
      note: str(r.sale_note),
      listedAt: str(r.listed_for_sale_at),
      hidden: r.sale_hidden === true,
      hiddenAt: str(r.hidden_at),
      hiddenReason: str(r.hidden_reason),
    };
  } catch {
    return null;
  }
}

/** Moderators are an allow-list of user ids in MODERATOR_USER_IDS (owner decision 2026-10-19). */
export function isModerator(userId: string | null | undefined): boolean {
  return Boolean(
    userId && serverEnv.moderatorUserIds().includes(userId.toLowerCase()),
  );
}

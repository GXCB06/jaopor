"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import {
  getOwnerListing,
  isModerator,
  type OwnerListing,
} from "@/lib/data/listing";
import { SALE_NOTE_MAX, parseAskingPrice } from "@/lib/listing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// For-sale listing v1 (Design.md "Proposal — For-sale listing"). The database enforces the rules
// (column grants, the public-listing trigger, the buy-request check, server-key-only functions);
// these actions validate input, translate errors into keys and purge the cached pages.

export type ListingResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const validId = (id: number) => Number.isSafeInteger(id) && id > 0;

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** Every page that can show the listing: the project, its directories and the home rows. */
function purge(p: {
  slug: string;
  category: string | null;
  province: string | null;
}) {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/startup/${p.slug}`, "layout");
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/startups`);
    if (p.category) revalidatePath(`/${locale}/category/${p.category}`);
    if (p.province) revalidatePath(`/${locale}/province/${p.province}`);
  }
}

/**
 * The owner's switch, price and note (edit page, "เปิดขายผลงาน"). Turning it off keeps the price
 * and note as a draft; only the public copies empty out.
 */
export async function saveListing(
  startupId: number,
  input: { forSale: boolean; price: string; note: string },
): Promise<ListingResult> {
  if (!validId(startupId)) return { ok: false, error: "forbidden" };
  const priceText = input.price.trim();
  const price = priceText ? parseAskingPrice(priceText) : null;
  if (priceText && price === null) return { ok: false, error: "price" };
  if (input.forSale && price === null)
    return { ok: false, error: "priceRequired" };
  const note = input.note.trim();
  if (note.length > SALE_NOTE_MAX) return { ok: false, error: "note" };

  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  const { data, error } = await supabase
    .from("startups")
    .update({
      for_sale: input.forSale,
      asking_price_thb: price,
      sale_note: note || null,
    })
    .eq("id", startupId)
    .eq("owner_id", user.id)
    .select("slug, category, province");
  if (error)
    return {
      ok: false,
      error: error.code === "23514" ? "priceRequired" : "failed",
    };
  const row = data?.[0];
  if (!row) return { ok: false, error: "forbidden" };
  purge(row);
  return { ok: true };
}

/** "ติดต่อผู้ขาย": a contact request with topic `buy` that names the listing. */
export async function sendBuyRequest(
  startupId: number,
  toId: string,
  message: string,
): Promise<ListingResult> {
  if (!validId(startupId) || !UUID.test(toId))
    return { ok: false, error: "invalid" };
  const text = message.trim().slice(0, 500);
  if (!text) return { ok: false, error: "empty" };
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  if (user.id === toId) return { ok: false, error: "self" };
  const { error } = await supabase.from("contact_requests").insert({
    from_id: user.id,
    to_id: toId,
    topic: "buy",
    message: text,
    startup_id: startupId,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "pending" };
    if (error.code === "54000") return { ok: false, error: "limit" };
    // 42501: blocked, or the listing is no longer public.
    if (error.code === "42501") return { ok: false, error: "unavailable" };
    return { ok: false, error: "failed" };
  }
  return { ok: true };
}

export type ModeratorView =
  { moderator: false } | { moderator: true; listing: OwnerListing | null };

/** For the project page's moderator control: nothing unless the viewer is on the allow-list. */
export async function getModeratorView(
  startupId: number,
): Promise<ModeratorView> {
  if (!validId(startupId)) return { moderator: false };
  const { user } = await me();
  if (!isModerator(user?.id)) return { moderator: false };
  return { moderator: true, listing: await getOwnerListing(startupId) };
}

/** Moderator hide (with a reason) or restore. Hides the listing only; the project page stays. */
export async function moderateListing(
  startupId: number,
  hide: boolean,
  reason: string,
): Promise<ListingResult> {
  if (!validId(startupId)) return { ok: false, error: "invalid" };
  const { user } = await me();
  if (!user || !isModerator(user.id)) return { ok: false, error: "forbidden" };
  const text = reason.trim();
  if (hide && (text.length < 1 || text.length > 500))
    return { ok: false, error: "reason" };
  const admin = createAdminClient();
  const { error } = await admin.rpc("moderate_listing", {
    p_startup: startupId,
    p_hide: hide,
    p_reason: hide ? text : "",
    p_moderator: user.id,
  });
  if (error) return { ok: false, error: "failed" };
  const { data: row } = await admin
    .from("startups")
    .select("slug, category, province")
    .eq("id", startupId)
    .maybeSingle();
  if (row) purge(row);
  return { ok: true };
}

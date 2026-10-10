// What a project's "กำลังหา" (looking for) box lets a visitor do (UX master audit A1.1).
// Product asks (users / feedback / testers) open the product; people asks (co-founder, investor,
// buyer) open a contact request to the founder, reusing the builder-profile request flow
// (`contact_requests.topic`). Pure, so it is unit-tested.

import { LOOKING_FOR, type LookingFor } from "./links";

/** Contact request topics, as in the `contact_requests.topic` CHECK constraint. */
export const REQUEST_TOPICS = ["cofounder", "job", "collab", "other"] as const;
export type RequestTopic = (typeof REQUEST_TOPICS)[number];

export function isRequestTopic(v: unknown): v is RequestTopic {
  return (
    typeof v === "string" && (REQUEST_TOPICS as readonly string[]).includes(v)
  );
}

const PRODUCT_ASKS: readonly LookingFor[] = ["users", "feedback", "testers"];

export type LookingForAction =
  | { kind: "contact"; topic: RequestTopic; href: string }
  | { kind: "try"; href: string };

/**
 * The founder's profile with the request form open on a topic. Signed-out visitors are sent
 * through sign-in by the profile page and come back to this same URL.
 */
export function contactPath(handle: string, topic: RequestTopic): string {
  return `/u/${encodeURIComponent(handle)}?contact=1&topic=${topic}`;
}

/**
 * Actions for a project's asks, most specific first:
 * - co-founder → a co-founder request to the founder;
 * - investor / buyer → a general request ("other") to the founder;
 * - users / feedback / testers → try the product (its first link).
 * No founder handle → no contact action; no product link → no try action.
 */
export function lookingForActions(
  asks: readonly string[],
  opts: { founderHandle: string | null; productUrl: string | null },
): LookingForAction[] {
  const known = asks.filter((a): a is LookingFor =>
    (LOOKING_FOR as readonly string[]).includes(a),
  );
  const out: LookingForAction[] = [];
  if (opts.founderHandle) {
    if (known.includes("cofounder"))
      out.push({
        kind: "contact",
        topic: "cofounder",
        href: contactPath(opts.founderHandle, "cofounder"),
      });
    else if (known.includes("investor") || known.includes("buyer"))
      out.push({
        kind: "contact",
        topic: "other",
        href: contactPath(opts.founderHandle, "other"),
      });
  }
  if (opts.productUrl && known.some((a) => PRODUCT_ASKS.includes(a)))
    out.push({ kind: "try", href: opts.productUrl });
  return out;
}

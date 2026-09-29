// Stripe connector over the REST API (no SDK → tiny, mockable, explicit error handling).
// Accepts ONLY restricted keys (rk_…) and proves they cannot write before we store them.
import {
  ProviderError,
  type BillingInterval,
  type KeyValidation,
  type NormalizedCharge,
  type NormalizedSubscription,
  type RevenueProvider,
} from "../types";

const API = "https://api.stripe.com/v1";
const MAX_PAGES = 500; // 50k objects — plenty for v1; bounded so a sync can't run forever
const RETRIES = 3;

type Fetch = typeof fetch;

type StripeList<T> = { data: T[]; has_more: boolean };
type StripeErrorBody = {
  error?: { type?: string; code?: string; message?: string };
};

type StripeCharge = {
  id: string;
  amount: number;
  amount_refunded: number;
  currency: string;
  created: number;
  status: string;
  paid: boolean;
  customer: string | { id: string } | null;
};

type StripeSubscription = {
  id: string;
  status: string;
  customer: string | { id: string } | null;
  items: {
    data: Array<{
      quantity?: number | null;
      price: {
        unit_amount: number | null;
        currency: string;
        recurring: { interval: BillingInterval; interval_count: number } | null;
      };
    }>;
  };
};

const KEY_FORMAT = /^rk_(live|test)_[A-Za-z0-9]{10,}$/;

/** Endpoints we POST an unknown parameter to. A read-only key gets 403 (no permission);
 *  a write-capable key gets 400 (param rejected) — nothing is ever created either way. */
const WRITE_PROBES = [
  "/customers",
  "/refunds",
  "/payment_intents",
  "/subscriptions",
  "/payouts",
];

function customerId(c: StripeCharge["customer"]): string | null {
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

export function createStripeProvider(
  fetchImpl: Fetch = fetch,
): RevenueProvider {
  async function request(
    key: string,
    method: "GET" | "POST",
    path: string,
    body?: string,
  ) {
    for (let attempt = 0; ; attempt += 1) {
      const res = await fetchImpl(`${API}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${key}`,
          ...(body
            ? { "Content-Type": "application/x-www-form-urlencoded" }
            : {}),
        },
        body,
        signal: AbortSignal.timeout(20_000),
      });
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        continue;
      }
      const json = (await res.json().catch(() => ({}))) as unknown;
      return { status: res.status, json };
    }
  }

  function fail(status: number, json: unknown, context: string): never {
    const err = (json as StripeErrorBody).error;
    if (status === 401)
      throw new ProviderError(
        "invalid_key",
        "Stripe rejected this key (revoked or wrong).",
      );
    if (status === 403) {
      throw new ProviderError(
        "missing_permission",
        `The restricted key needs Read access for ${context}.`,
      );
    }
    if (status === 429)
      throw new ProviderError(
        "rate_limited",
        "Stripe rate limit — try again shortly.",
      );
    throw new ProviderError(
      "upstream",
      `Stripe error (${status}) ${err?.code ?? ""}`.trim(),
    );
  }

  async function* list<T extends { id: string }>(
    key: string,
    path: string,
    context: string,
  ) {
    let startingAfter: string | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const sep = path.includes("?") ? "&" : "?";
      const cursor = startingAfter
        ? `&starting_after=${encodeURIComponent(startingAfter)}`
        : "";
      const { status, json } = await request(
        key,
        "GET",
        `${path}${sep}limit=100${cursor}`,
      );
      if (status !== 200) fail(status, json, context);
      const body = json as StripeList<T>;
      for (const item of body.data) yield item;
      if (!body.has_more || body.data.length === 0) return;
      startingAfter = body.data[body.data.length - 1].id;
    }
    throw new ProviderError(
      "upstream",
      `Too many ${context} for v1 sync (> ${MAX_PAGES * 100}).`,
    );
  }

  return {
    id: "stripe",

    async validateKey(rawKey: string): Promise<KeyValidation> {
      const key = rawKey.trim();
      if (/^sk_(live|test)_/.test(key)) {
        throw new ProviderError(
          "not_read_only",
          "This is a secret key with full access. Create a restricted key with read-only permissions instead.",
        );
      }
      if (!KEY_FORMAT.test(key)) {
        throw new ProviderError(
          "invalid_key",
          "Paste a Stripe restricted key (starts with rk_live_ or rk_test_).",
        );
      }

      // 1) The permissions we actually need.
      for (const [path, context] of [
        ["/charges?limit=1", "Charges"],
        ["/subscriptions?limit=1", "Subscriptions"],
      ] as const) {
        const { status, json } = await request(key, "GET", path);
        if (status !== 200) fail(status, json, context);
      }

      // 2) Prove it cannot write (see WRITE_PROBES).
      for (const path of WRITE_PROBES) {
        const { status, json } = await request(
          key,
          "POST",
          path,
          "mrrmafia_read_only_probe=1",
        );
        if (status === 403) continue;
        if (status === 400) {
          throw new ProviderError(
            "not_read_only",
            "This key can write to Stripe. Set every permission to Read (or None) and try again.",
          );
        }
        fail(status, json, "the read-only check");
      }

      return {
        accountName: null,
        mode: key.startsWith("rk_live_") ? "live" : "test",
      };
    },

    async *fetchCharges(key: string): AsyncIterable<NormalizedCharge> {
      for await (const c of list<StripeCharge>(key, "/charges", "Charges")) {
        if (c.status !== "succeeded" || !c.paid) continue;
        const net = c.amount - (c.amount_refunded ?? 0);
        if (net <= 0) continue;
        yield {
          occurredAt: new Date(c.created * 1000),
          amountMinor: net,
          currency: c.currency,
          customerRef: customerId(c.customer),
        };
      }
    },

    async *fetchSubscriptions(
      key: string,
    ): AsyncIterable<NormalizedSubscription> {
      // Default list excludes canceled subscriptions.
      for await (const s of list<StripeSubscription>(
        key,
        "/subscriptions",
        "Subscriptions",
      )) {
        const status =
          s.status === "active" ||
          s.status === "past_due" ||
          s.status === "trialing"
            ? s.status
            : "other";
        yield {
          status,
          customerRef: customerId(s.customer),
          items: s.items.data
            .filter((i) => i.price.recurring && i.price.unit_amount !== null)
            .map((i) => ({
              unitAmountMinor: i.price.unit_amount ?? 0,
              currency: i.price.currency,
              quantity: i.quantity ?? 1,
              interval: i.price.recurring!.interval,
              intervalCount: i.price.recurring!.interval_count || 1,
            })),
        };
      }
    },
  };
}

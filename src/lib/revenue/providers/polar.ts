// Polar connector over the REST API (/add-payment-provider). Accepts ONLY an Organization Access
// Token (OAT) created with read scopes, and proves it cannot write before we store it.
// Docs: https://polar.sh/docs/api-reference (base https://api.polar.sh/v1, Authorization: Bearer).
import {
  ProviderError,
  type BillingInterval,
  type KeyValidation,
  type NormalizedCharge,
  type NormalizedSubscription,
  type RevenueProvider,
} from "../types";

const API = "https://api.polar.sh/v1";
const MAX_PAGES = 500; // 50k objects — plenty for v1; bounded so a sync can't run forever
const RETRIES = 3;

type Fetch = typeof fetch;

type PolarPage<T> = {
  items: T[];
  pagination?: { total_count: number; max_page: number };
};

type PolarOrder = {
  id: string;
  created_at: string;
  status: string;
  paid: boolean;
  net_amount: number;
  refunded_amount: number;
  currency: string;
  customer_id: string | null;
};

type PolarSubscription = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  recurring_interval: BillingInterval;
  recurring_interval_count: number | null;
  customer_id: string | null;
};

// Organization Access Tokens are prefixed `polar_oat_`. Personal access tokens (polar_pat_) are
// account-wide and cannot be scoped read-only, so we refuse them.
const OAT_FORMAT = /^polar_oat_\S+$/;

/**
 * Write-access probes: an EMPTY update (PATCH, body `{}`, no changes) to an object id that cannot
 * exist. Polar is FastAPI, so the scope check runs as a security dependency BEFORE the body or the
 * resource lookup:
 * - 403 → the token has no write scope for that resource (what we want)
 * - 404 (not found) or 422 (body validated) → it got past the scope check → the token CAN write
 * Nothing is created or changed either way.
 */
const WRITE_PROBES: Array<{ path: string; resource: string }> = [
  { path: "/products/00000000-0000-4000-8000-000000000000", resource: "Products" },
  { path: "/customers/00000000-0000-4000-8000-000000000000", resource: "Customers" },
  {
    path: "/subscriptions/00000000-0000-4000-8000-000000000000",
    resource: "Subscriptions",
  },
];

export function createPolarProvider(fetchImpl: Fetch = fetch): RevenueProvider {
  async function request(
    key: string,
    method: "GET" | "PATCH",
    path: string,
    body?: string,
  ) {
    for (let attempt = 0; ; attempt += 1) {
      const res = await fetchImpl(`${API}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
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

  function fail(status: number, context: string): never {
    if (status === 401)
      throw new ProviderError(
        "invalid_key",
        "Polar rejected this token (revoked or wrong).",
      );
    if (status === 403)
      throw new ProviderError(
        "missing_permission",
        `This token needs Read access for ${context}.`,
        context,
      );
    if (status === 429)
      throw new ProviderError(
        "rate_limited",
        "Polar rate limit — try again shortly.",
      );
    throw new ProviderError("upstream", `Polar error (${status}).`);
  }

  async function* list<T>(key: string, path: string, context: string) {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const { status, json } = await request(
        key,
        "GET",
        `${path}?page=${page}&limit=100`,
      );
      if (status !== 200) fail(status, context);
      const body = json as PolarPage<T>;
      const items = body.items ?? [];
      for (const item of items) yield item;
      if (items.length === 0 || page >= (body.pagination?.max_page ?? 0)) return;
    }
    throw new ProviderError(
      "upstream",
      `Too many ${context.toLowerCase()} for v1 sync (> ${MAX_PAGES * 100}).`,
    );
  }

  return {
    id: "polar",

    async validateKey(rawKey: string): Promise<KeyValidation> {
      const key = rawKey.trim();
      if (!OAT_FORMAT.test(key)) {
        throw new ProviderError(
          "invalid_key",
          "Paste a Polar Organization Access Token (starts with polar_oat_).",
        );
      }

      // 1) The read scopes we actually need.
      for (const [path, context] of [
        ["/orders/?limit=1", "Orders"],
        ["/subscriptions/?limit=1", "Subscriptions"],
      ] as const) {
        const { status } = await request(key, "GET", path);
        if (status !== 200) fail(status, context);
      }

      // 2) Prove it cannot write (see WRITE_PROBES).
      const writable: string[] = [];
      for (const { path, resource } of WRITE_PROBES) {
        const { status } = await request(key, "PATCH", path, "{}");
        if (status === 403) continue;
        if (status === 404 || status === 422) {
          writable.push(resource);
          continue;
        }
        fail(status, "the read-only check");
      }
      if (writable.length) {
        throw new ProviderError(
          "not_read_only",
          `This token can write to Polar (${writable.join(", ")}). Create the token with read scopes only.`,
          writable.join(", "),
        );
      }

      return { accountName: null, mode: "live" };
    },

    async *fetchCharges(key: string): AsyncIterable<NormalizedCharge> {
      for await (const o of list<PolarOrder>(key, "/orders/", "Orders")) {
        if (!o.paid) continue;
        // net_amount is after discounts but before taxes: revenue excludes tax. Minus refunds.
        const net = o.net_amount - (o.refunded_amount ?? 0);
        if (net <= 0) continue;
        yield {
          occurredAt: new Date(o.created_at),
          amountMinor: net,
          currency: o.currency,
          customerRef: o.customer_id ?? null,
        };
      }
    },

    async *fetchSubscriptions(
      key: string,
    ): AsyncIterable<NormalizedSubscription> {
      for await (const s of list<PolarSubscription>(
        key,
        "/subscriptions/",
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
          customerRef: s.customer_id ?? null,
          items: [
            {
              unitAmountMinor: s.amount,
              currency: s.currency,
              quantity: 1,
              interval: s.recurring_interval,
              intervalCount: s.recurring_interval_count ?? 1,
            },
          ],
        };
      }
    },
  };
}

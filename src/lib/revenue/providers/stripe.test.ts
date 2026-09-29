import { describe, expect, it } from "vitest";
import { ProviderError } from "../types";
import { createStripeProvider } from "./stripe";

type Handler = (
  method: string,
  path: string,
) => { status: number; body?: unknown };

function mockFetch(handler: Handler) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url.pathname}${url.search}`);
    const { status, body } = handler(method, url.pathname + url.search);
    return new Response(JSON.stringify(body ?? {}), { status });
  }) as typeof fetch;
  return { impl, calls };
}

const READ_ONLY: Handler = (method) =>
  method === "GET"
    ? { status: 200, body: { data: [], has_more: false } }
    : { status: 403 };

// Fake keys are assembled at runtime so no key-shaped literal lands in git (secret scanners).
const fakeKey = (prefix: "rk" | "sk" | "pk", mode: "live" | "test") =>
  [prefix, mode, "FAKE0000000000000000"].join("_");
const RK = fakeKey("rk", "test");

async function codeOf(p: Promise<unknown>) {
  try {
    await p;
    return "resolved";
  } catch (e) {
    return e instanceof ProviderError ? e.code : "other";
  }
}

describe("stripe.validateKey", () => {
  it("accepts a restricted key that can read but not write", async () => {
    const { impl, calls } = mockFetch(READ_ONLY);
    await expect(createStripeProvider(impl).validateKey(RK)).resolves.toEqual({
      accountName: null,
      mode: "test",
    });
    // write probes only ever POST an unknown parameter
    expect(calls.filter((c) => c.startsWith("POST"))).toHaveLength(5);
  });

  it("rejects full-access secret keys without calling Stripe", async () => {
    const { impl, calls } = mockFetch(READ_ONLY);
    expect(
      await codeOf(
        createStripeProvider(impl).validateKey(fakeKey("sk", "live")),
      ),
    ).toBe("not_read_only");
    expect(calls).toHaveLength(0);
  });

  it("rejects publishable keys and junk", async () => {
    const { impl } = mockFetch(READ_ONLY);
    expect(
      await codeOf(
        createStripeProvider(impl).validateKey(fakeKey("pk", "test")),
      ),
    ).toBe("invalid_key");
    expect(await codeOf(createStripeProvider(impl).validateKey("hello"))).toBe(
      "invalid_key",
    );
  });

  it("rejects a restricted key that has write access", async () => {
    const { impl } = mockFetch((method, path) =>
      method === "GET"
        ? { status: 200, body: { data: [], has_more: false } }
        : path.startsWith("/v1/refunds")
          ? { status: 400, body: { error: { type: "invalid_request_error" } } }
          : { status: 403 },
    );
    expect(await codeOf(createStripeProvider(impl).validateKey(RK))).toBe(
      "not_read_only",
    );
  });

  it("reports a missing read permission", async () => {
    const { impl } = mockFetch((_m, path) =>
      path.startsWith("/v1/subscriptions")
        ? { status: 403 }
        : { status: 200, body: { data: [], has_more: false } },
    );
    expect(await codeOf(createStripeProvider(impl).validateKey(RK))).toBe(
      "missing_permission",
    );
  });

  it("reports a revoked key", async () => {
    const { impl } = mockFetch(() => ({ status: 401 }));
    expect(await codeOf(createStripeProvider(impl).validateKey(RK))).toBe(
      "invalid_key",
    );
  });
});

describe("stripe.fetchCharges / fetchSubscriptions", () => {
  it("paginates and nets out refunds, skipping failed charges", async () => {
    const page1 = {
      has_more: true,
      data: [
        {
          id: "ch_1",
          amount: 1000,
          amount_refunded: 200,
          currency: "usd",
          created: 1_790_000_000,
          status: "succeeded",
          paid: true,
          customer: "cus_a",
        },
        {
          id: "ch_2",
          amount: 500,
          amount_refunded: 0,
          currency: "usd",
          created: 1_790_000_100,
          status: "failed",
          paid: false,
          customer: null,
        },
      ],
    };
    const page2 = {
      has_more: false,
      data: [
        {
          id: "ch_3",
          amount: 700,
          amount_refunded: 700,
          currency: "thb",
          created: 1_790_000_200,
          status: "succeeded",
          paid: true,
          customer: "cus_b",
        },
      ],
    };
    const { impl, calls } = mockFetch((_m, path) => ({
      status: 200,
      body: path.includes("starting_after=ch_2") ? page2 : page1,
    }));
    const out = [];
    for await (const c of createStripeProvider(impl).fetchCharges(RK))
      out.push(c);
    expect(out).toEqual([
      {
        occurredAt: new Date(1_790_000_000_000),
        amountMinor: 800,
        currency: "usd",
        customerRef: "cus_a",
      },
    ]);
    expect(calls).toHaveLength(2);
  });

  it("normalizes subscription items and skips metered/tiered items without a unit amount", async () => {
    const { impl } = mockFetch(() => ({
      status: 200,
      body: {
        has_more: false,
        data: [
          {
            id: "sub_1",
            status: "active",
            customer: { id: "cus_a" },
            items: {
              data: [
                {
                  quantity: 2,
                  price: {
                    unit_amount: 1500,
                    currency: "usd",
                    recurring: { interval: "month", interval_count: 1 },
                  },
                },
                {
                  quantity: 1,
                  price: {
                    unit_amount: null,
                    currency: "usd",
                    recurring: { interval: "month", interval_count: 1 },
                  },
                },
              ],
            },
          },
          {
            id: "sub_2",
            status: "incomplete",
            customer: "cus_b",
            items: { data: [] },
          },
        ],
      },
    }));
    const out = [];
    for await (const s of createStripeProvider(impl).fetchSubscriptions(RK))
      out.push(s);
    expect(out).toEqual([
      {
        status: "active",
        customerRef: "cus_a",
        items: [
          {
            unitAmountMinor: 1500,
            currency: "usd",
            quantity: 2,
            interval: "month",
            intervalCount: 1,
          },
        ],
      },
      { status: "other", customerRef: "cus_b", items: [] },
    ]);
  });
});

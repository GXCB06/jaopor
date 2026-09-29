import { describe, expect, it } from "vitest";
import { fetchBuildProof, lastPage, parseRepo } from "@/lib/build/github";
import {
  fetchRevenueCatMetrics,
  validateRevenueCatKey,
} from "@/lib/revenue/providers/revenuecat";
import { ProviderError } from "@/lib/revenue/types";
import {
  fetchPlausibleTraffic,
  validatePlausibleKey,
} from "@/lib/traffic/plausible";
import { domainMatches } from "@/lib/traffic/types";
import { fetchUmamiTraffic, parseUmamiShareUrl } from "@/lib/traffic/umami";

type Route = (url: string, init?: RequestInit) => Response | undefined;

/** Fake fetch: first route that returns a Response wins; records every call. */
function fakeFetch(...routes: Route[]) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    for (const r of routes) {
      const res = r(url, init);
      if (res) return res;
    }
    return new Response("not mocked", { status: 500 });
  }) as typeof fetch;
  return { impl, calls };
}
const ok = (body: unknown, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), { status: 200, headers });
const status = (s: number, body = "{}") => new Response(body, { status: s });
const has =
  (part: string, res: () => Response): Route =>
  (url) =>
    url.includes(part) ? res() : undefined;

const RC_KEY = "sk_abcdefghijklmnopqrstuvwx";

async function code(p: Promise<unknown>) {
  try {
    await p;
    return "resolved";
  } catch (e) {
    return e instanceof ProviderError ? `${e.code}:${e.detail ?? ""}` : "other";
  }
}

describe("RevenueCat", () => {
  const overview = () =>
    ok({
      metrics: [
        { id: "mrr", value: 1234.5 },
        { id: "active_subscriptions", value: 42 },
        { id: "active_users", value: 900 },
      ],
    });

  it("accepts a charts-only key (403 on customers + apps)", async () => {
    const f = fakeFetch(
      has("metrics/overview", overview),
      has("/customers", () => status(403)),
      has("/apps", () => status(403)),
    );
    expect(await code(validateRevenueCatKey(RC_KEY, "proj123", f.impl))).toBe(
      "resolved",
    );
    expect(
      f.calls.every((c) => !c.init?.method || c.init.method === "GET"),
    ).toBe(true);
  });

  it("rejects a key that can read customers or project config", async () => {
    const f = fakeFetch(
      has("metrics/overview", overview),
      has("/customers", () => ok({ items: [] })),
      has("/apps", () => ok({ items: [] })),
    );
    expect(await code(validateRevenueCatKey(RC_KEY, "proj123", f.impl))).toBe(
      "not_read_only:Customer information, Project configuration",
    );
  });

  it("fails closed when a probe answers something unexpected", async () => {
    const f = fakeFetch(
      has("metrics/overview", overview),
      has("/customers", () => status(404)),
    );
    expect(await code(validateRevenueCatKey(RC_KEY, "proj123", f.impl))).toBe(
      "not_found:",
    );
  });

  it("rejects non-secret keys before calling the API", async () => {
    const f = fakeFetch();
    expect(
      await code(validateRevenueCatKey("appl_xyz", "proj123", f.impl)),
    ).toBe("invalid_key:");
    expect(f.calls).toHaveLength(0);
  });

  it("converts overview + revenue ranges to cents", async () => {
    const f = fakeFetch(has("metrics/overview", overview), (url) => {
      if (!url.includes("metrics/revenue")) return undefined;
      const start = new URL(url).searchParams.get("start_date");
      const end = new URL(url).searchParams.get("end_date");
      if (start === "2017-01-01") return ok({ value: 50000 });
      if (start === end) return ok({ value: 12.34 });
      if (start === "2026-08-30") return ok({ value: 2000 });
      return ok({ value: 1500 });
    });
    const m = await fetchRevenueCatMetrics(
      RC_KEY,
      "proj123",
      new Date("2026-09-29T12:00:00Z"),
      f.impl,
    );
    expect(m).toEqual({
      mrrCents: 123450,
      revenue30dCents: 200000,
      revenuePrev30dCents: 150000,
      revenueAllTimeCents: 5000000,
      revenueYesterdayCents: 1234,
      activeSubscriptions: 42,
      activeUsers: 900,
    });
  });
});

describe("Plausible", () => {
  const KEY = "plausible_key_abcdefghijklmnop";

  it("refuses Sites API keys", async () => {
    const f = fakeFetch(has("/api/v1/sites", () => ok({ sites: [] })));
    expect(await code(validatePlausibleKey(KEY, f.impl))).toBe(
      "not_read_only:Sites API",
    );
  });

  it("accepts Stats API keys (Sites API refused)", async () => {
    const f = fakeFetch(has("/api/v1/sites", () => status(401)));
    expect(await code(validatePlausibleKey(KEY, f.impl))).toBe("resolved");
  });

  it("reads unique visitors and the daily series", async () => {
    const f = fakeFetch((url, init) => {
      if (!url.endsWith("/api/v2/query")) return undefined;
      const body = JSON.parse(String(init?.body)) as {
        dimensions?: string[];
        date_range: string[];
      };
      if (body.dimensions)
        return ok({
          results: [
            { dimensions: ["2026-09-27"], metrics: [10] },
            { dimensions: ["2026-09-28"], metrics: [12] },
          ],
        });
      return ok({
        results: [
          { metrics: [body.date_range[0] === "2026-08-30" ? 300 : 250] },
        ],
      });
    });
    const r = await fetchPlausibleTraffic(
      KEY,
      "shop.co.th",
      new Date("2026-09-29T12:00:00Z"),
      f.impl,
    );
    expect(r.visitors30d).toBe(300);
    expect(r.visitorsPrev30d).toBe(250);
    expect(r.daily).toEqual([
      { day: "2026-09-27", visitors: 10 },
      { day: "2026-09-28", visitors: 12 },
    ]);
  });

  it("maps 'site not found' to not_found", async () => {
    const f = fakeFetch(
      has("/api/v2/query", () =>
        status(400, '{"error":"Site does not exist"}'),
      ),
    );
    expect(
      await code(fetchPlausibleTraffic(KEY, "x.com", new Date(), f.impl)),
    ).toBe("not_found:");
  });
});

describe("Umami share links", () => {
  it("parses cloud and self-hosted share URLs", () => {
    expect(
      parseUmamiShareUrl(
        "https://cloud.umami.is/share/AbCdEf123456/shop.co.th",
      ),
    ).toEqual({ apiBase: "https://cloud.umami.is/api", slug: "AbCdEf123456" });
    expect(
      parseUmamiShareUrl("https://stats.me.dev/analytics/share/Xyz12345"),
    ).toEqual({
      apiBase: "https://stats.me.dev/analytics/api",
      slug: "Xyz12345",
    });
    expect(parseUmamiShareUrl("http://cloud.umami.is/share/AbCdEf123456")).toBe(
      null,
    );
    expect(parseUmamiShareUrl("https://cloud.umami.is/websites/1")).toBe(null);
  });

  it("reads visitors (v3 numbers) with the share token", async () => {
    const f = fakeFetch(
      has("/api/share/", () => ok({ websiteId: "w1", token: "t0k" })),
      has("/stats", () => ok({ visitors: 480, comparison: { visitors: 400 } })),
      has("/pageviews", () =>
        ok({ sessions: [{ x: "2026-09-28 00:00:00", y: 17 }] }),
      ),
      has("/websites/w1", () => ok({ domain: "shop.co.th" })),
    );
    const r = await fetchUmamiTraffic(
      "https://cloud.umami.is/share/AbCdEf123456",
      f.impl,
      new Date("2026-09-29T12:00:00Z"),
    );
    expect(r).toEqual({
      visitors30d: 480,
      visitorsPrev30d: 400,
      daily: [{ day: "2026-09-28", visitors: 17 }],
      domain: "shop.co.th",
    });
    const authed = f.calls.filter((c) => c.url.includes("/websites/"));
    expect(
      authed.every(
        (c) =>
          (c.init?.headers as Record<string, string>)["x-umami-share-token"] ===
          "t0k",
      ),
    ).toBe(true);
  });

  it("reads Umami v2 { value, prev } stats", async () => {
    const f = fakeFetch(
      has("/api/share/", () => ok({ websiteId: "w1", token: "t" })),
      has("/stats", () => ok({ visitors: { value: 5, prev: 3 } })),
      has("/pageviews", () => ok({ sessions: [] })),
      has("/websites/w1", () => ok({ domain: "a.b" })),
    );
    const r = await fetchUmamiTraffic(
      "https://cloud.umami.is/share/AbCdEf123456",
      f.impl,
    );
    expect([r.visitors30d, r.visitorsPrev30d]).toEqual([5, 3]);
  });
});

describe("domainMatches", () => {
  it.each([
    ["shop.co.th", "https://www.shop.co.th", true],
    ["app.shop.co.th", "shop.co.th", true],
    ["evil.com", "shop.co.th", false],
    ["notshop.co.th", "shop.co.th", false],
  ])("%s vs %s → %s", (site, web, expected) => {
    expect(domainMatches(site, web)).toBe(expected);
  });
});

describe("GitHub build proof", () => {
  it("parses repo links", () => {
    expect(parseRepo("https://github.com/me/app.git")).toBe("me/app");
    expect(parseRepo("me/app")).toBe("me/app");
    expect(parseRepo("https://github.com/me")).toBe(null);
  });

  it("reads the last page from the Link header", () => {
    expect(
      lastPage(
        '<https://api.github.com/x?per_page=1&page=2>; rel="next", <https://api.github.com/x?per_page=1&page=731>; rel="last"',
      ),
    ).toBe(731);
    expect(lastPage(null)).toBe(null);
  });

  it("counts commits, first commit and Claude co-authored commits", async () => {
    const f = fakeFetch(
      has("/search/commits", () => ok({ total_count: 500 })),
      has("page=731", () =>
        ok([{ commit: { author: { date: "2026-09-01T03:00:00Z" } } }]),
      ),
      has("/commits?per_page=1", () =>
        ok([{ commit: { author: { date: "2026-09-28T03:00:00Z" } } }], {
          link: '<https://api.github.com/r?per_page=1&page=731>; rel="last"',
        }),
      ),
      has("/repos/me/app", () =>
        ok({ full_name: "Me/app", stargazers_count: 12 }),
      ),
    );
    const p = await fetchBuildProof("me/app", undefined, f.impl);
    expect(p).toEqual({
      repo: "Me/app",
      firstCommitAt: "2026-09-01T03:00:00.000Z",
      commits: 731,
      aiCommits: 500,
      stars: 12,
    });
  });
});
